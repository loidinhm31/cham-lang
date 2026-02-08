/**
 * IndexedDB Sync Storage for cham-lang
 *
 * Tracks pending changes, applies remote changes, and manages sync checkpoints.
 */

import {
  db,
  SYNC_META_KEYS,
  type IDBCollection,
  type IDBVocabulary,
} from "../database";
import type {
  Checkpoint,
  PullRecord,
  SyncRecord,
} from "@cham-lang/shared/types";

/** Convert a date value (ISO string, unix timestamp, or Date) to unix timestamp in seconds.
 *  Used for push data fields where the server schema expects integer type. */
function toUnixTimestamp(value: string | number | Date | undefined): number {
  if (!value) return Math.floor(Date.now() / 1000);
  if (typeof value === "string")
    return Math.floor(new Date(value).getTime() / 1000);
  if (typeof value === "number")
    return value < 1e10 ? value : Math.floor(value / 1000);
  return Math.floor(new Date(value).getTime() / 1000);
}

/** Convert a date value (ISO string, unix timestamp, or Date) to an ISO string.
 *  Used on pull side to normalize server data back to local ISO string format. */
function toISODateString(value: string | number | Date | undefined): string {
  if (!value) return new Date().toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    const ms = value < 1e10 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  return new Date(value).toISOString();
}

export class IndexedDBSyncStorage {
  // =========================================================================
  // Pending Changes
  // =========================================================================

  async getPendingChanges(userId?: string): Promise<SyncRecord[]> {
    const records: SyncRecord[] = [];

    // Get unsynced collections (skip shared collections - don't push someone else's collection)
    const collections = await db.collections.toArray();
    for (const collection of collections) {
      if (collection.synced_at === undefined || collection.synced_at === null) {
        if (collection.shared_by) continue;
        records.push({
          tableName: "collections",
          rowId: collection.id,
          data: {
            id: collection.id,
            name: collection.name,
            description: collection.description,
            language: collection.language,
            ownerId: userId ?? null,
            sharedBy: collection.shared_by ?? null,
            isPublic: collection.is_public,
            wordCount: collection.word_count,
            createdAt: toUnixTimestamp(collection.created_at),
            updatedAt: toUnixTimestamp(collection.updated_at),
            syncVersion: collection.sync_version || 1,
          },
          version: collection.sync_version || 1,
          deleted: false,
        });
      }
    }

    // Get unsynced vocabularies
    const vocabularies = await db.vocabularies.toArray();
    for (const vocab of vocabularies) {
      if (vocab.synced_at === undefined || vocab.synced_at === null) {
        records.push({
          tableName: "vocabularies",
          rowId: vocab.id,
          data: {
            id: vocab.id,
            word: vocab.word,
            wordType: vocab.word_type,
            level: vocab.level,
            ipa: vocab.ipa,
            audioUrl: vocab.audio_url,
            concept: vocab.concept,
            language: vocab.language,
            collectionId: vocab.collection_id,
            definitions: vocab.definitions,
            exampleSentences: vocab.example_sentences,
            topics: vocab.topics,
            tags: vocab.tags,
            relatedWords: vocab.related_words,
            createdAt: toUnixTimestamp(vocab.created_at),
            updatedAt: toUnixTimestamp(vocab.updated_at),
            syncVersion: vocab.sync_version || 1,
          },
          version: vocab.sync_version || 1,
          deleted: false,
        });
      }
    }

    // Get unsynced topics
    const topics = await db.topics.toArray();
    for (const topic of topics) {
      if (topic.synced_at === undefined || topic.synced_at === null) {
        records.push({
          tableName: "topics",
          rowId: topic.id,
          data: {
            id: topic.id,
            name: topic.name,
            createdAt: toUnixTimestamp(topic.created_at),
            syncVersion: topic.sync_version || 1,
          },
          version: topic.sync_version || 1,
          deleted: false,
        });
      }
    }

    // Get unsynced tags
    const tags = await db.tags.toArray();
    for (const tag of tags) {
      if (tag.synced_at === undefined || tag.synced_at === null) {
        records.push({
          tableName: "tags",
          rowId: tag.id,
          data: {
            id: tag.id,
            name: tag.name,
            createdAt: toUnixTimestamp(tag.created_at),
            syncVersion: tag.sync_version || 1,
          },
          version: tag.sync_version || 1,
          deleted: false,
        });
      }
    }

    // Get unsynced user learning languages
    const langs = await db.userLearningLanguages.toArray();
    for (const lang of langs) {
      if (lang.synced_at === undefined || lang.synced_at === null) {
        records.push({
          tableName: "userLearningLanguages",
          rowId: lang.id,
          data: {
            id: lang.id,
            language: lang.language,
            createdAt: toUnixTimestamp(lang.created_at),
            syncVersion: lang.sync_version || 1,
          },
          version: lang.sync_version || 1,
          deleted: false,
        });
      }
    }

    // Get unsynced collection shared users
    const sharedUsers = await db.collectionSharedUsers.toArray();
    for (const su of sharedUsers) {
      if (su.synced_at === undefined || su.synced_at === null) {
        records.push({
          tableName: "collectionSharedUsers",
          rowId: su.id,
          data: {
            id: su.id,
            collectionId: su.collection_id,
            userId: su.user_id,
            permission: su.permission,
            createdAt: toUnixTimestamp(su.created_at),
            syncVersion: su.sync_version || 1,
          },
          version: su.sync_version || 1,
          deleted: false,
        });
      }
    }

    // Get unsynced practice progress
    const practiceProgress = await db.practiceProgress.toArray();
    for (const pp of practiceProgress) {
      if (pp.synced_at === undefined || pp.synced_at === null) {
        records.push({
          tableName: "practiceProgress",
          rowId: pp.id,
          data: {
            id: pp.id,
            language: pp.language,
            totalSessions: pp.total_sessions,
            totalWordsPracticed: pp.total_words_practiced,
            currentStreak: pp.current_streak,
            longestStreak: pp.longest_streak,
            lastPracticeDate: toUnixTimestamp(pp.last_practice_date),
            createdAt: toUnixTimestamp(pp.created_at),
            updatedAt: toUnixTimestamp(pp.updated_at),
            syncVersion: pp.sync_version || 1,
          },
          version: pp.sync_version || 1,
          deleted: false,
        });
      }
    }

    // Get pending deletes
    const pendingDeletes = await db._pendingChanges.toArray();
    for (const change of pendingDeletes) {
      records.push({
        tableName: change.tableName,
        rowId: change.recordId,
        data: {},
        version: change.syncVersion,
        deleted: true,
      });
    }

    return records;
  }

  async getPendingChangesCount(): Promise<number> {
    const unsyncedVocabs = await db.vocabularies
      .filter((v) => v.synced_at === undefined || v.synced_at === null)
      .count();
    const unsyncedCollections = await db.collections
      .filter((c) => c.synced_at === undefined || c.synced_at === null)
      .count();
    const unsyncedTopics = await db.topics
      .filter((t) => t.synced_at === undefined || t.synced_at === null)
      .count();
    const unsyncedTags = await db.tags
      .filter((t) => t.synced_at === undefined || t.synced_at === null)
      .count();
    const unsyncedLangs = await db.userLearningLanguages
      .filter((l) => l.synced_at === undefined || l.synced_at === null)
      .count();
    const unsyncedShared = await db.collectionSharedUsers
      .filter((s) => s.synced_at === undefined || s.synced_at === null)
      .count();
    const unsyncedProgress = await db.practiceProgress
      .filter((p) => p.synced_at === undefined || p.synced_at === null)
      .count();
    const pendingDeletes = await db._pendingChanges.count();
    return (
      unsyncedVocabs +
      unsyncedCollections +
      unsyncedTopics +
      unsyncedTags +
      unsyncedLangs +
      unsyncedShared +
      unsyncedProgress +
      pendingDeletes
    );
  }

  // =========================================================================
  // Mark Synced
  // =========================================================================

  async markSynced(
    syncedRecords: Array<{ tableName: string; rowId: string }>,
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    for (const { tableName, rowId } of syncedRecords) {
      if (tableName === "collections") {
        const collection = await db.collections.get(rowId);
        if (collection) {
          await db.collections.update(rowId, {
            synced_at: now,
            sync_version: (collection.sync_version || 1) + 1,
          });
        }
      } else if (tableName === "vocabularies") {
        const vocab = await db.vocabularies.get(rowId);
        if (vocab) {
          await db.vocabularies.update(rowId, {
            synced_at: now,
            sync_version: (vocab.sync_version || 1) + 1,
          });
        }
      } else if (tableName === "topics") {
        const topic = await db.topics.get(rowId);
        if (topic) {
          await db.topics.update(rowId, {
            synced_at: now,
            sync_version: (topic.sync_version || 1) + 1,
          });
        }
      } else if (tableName === "tags") {
        const tag = await db.tags.get(rowId);
        if (tag) {
          await db.tags.update(rowId, {
            synced_at: now,
            sync_version: (tag.sync_version || 1) + 1,
          });
        }
      } else if (tableName === "userLearningLanguages") {
        const lang = await db.userLearningLanguages.get(rowId);
        if (lang) {
          await db.userLearningLanguages.update(rowId, {
            synced_at: now,
            sync_version: (lang.sync_version || 1) + 1,
          });
        }
      } else if (tableName === "collectionSharedUsers") {
        const su = await db.collectionSharedUsers.get(rowId);
        if (su) {
          await db.collectionSharedUsers.update(rowId, {
            synced_at: now,
            sync_version: (su.sync_version || 1) + 1,
          });
        }
      } else if (tableName === "practiceProgress") {
        const pp = await db.practiceProgress.get(rowId);
        if (pp) {
          await db.practiceProgress.update(rowId, {
            synced_at: now,
            sync_version: (pp.sync_version || 1) + 1,
          });
        }
      }

      // Remove from pending changes (for deletes)
      await db._pendingChanges.where("recordId").equals(rowId).delete();
    }
  }

  // =========================================================================
  // Apply Remote Changes
  // =========================================================================

  async applyRemoteChanges(records: PullRecord[]): Promise<void> {
    // Separate by deleted status
    const nonDeleted = records.filter((r) => !r.deleted);
    const deleted = records.filter((r) => r.deleted);

    // Sort non-deleted: parents first
    nonDeleted.sort((a, b) => {
      const order: Record<string, number> = {
        topics: 0,
        tags: 1,
        collections: 2,
        userLearningLanguages: 3,
        collectionSharedUsers: 4,
        vocabularies: 5,
        wordProgress: 6,
        learningSettings: 7,
        practiceSessions: 8,
        practiceProgress: 9,
      };
      return (order[a.tableName] ?? 10) - (order[b.tableName] ?? 10);
    });

    // Sort deleted: children first, parents last
    deleted.sort((a, b) => {
      const order: Record<string, number> = {
        practiceProgress: 0,
        practiceSessions: 1,
        wordProgress: 2,
        collectionSharedUsers: 3,
        vocabularies: 4,
        userLearningLanguages: 5,
        collections: 6,
        learningSettings: 7,
        topics: 8,
        tags: 9,
      };
      return (order[a.tableName] ?? 10) - (order[b.tableName] ?? 10);
    });

    const now = Math.floor(Date.now() / 1000);

    // Track affected collection IDs for word count recalculation
    const affectedCollectionIds = new Set<string>();

    // Apply non-deleted (inserts/updates)
    for (const record of nonDeleted) {
      if (record.tableName === "collections") {
        await this.applyCollectionChange(record, now);
      } else if (record.tableName === "vocabularies") {
        const oldCollectionId = await this.applyVocabularyChange(record, now);
        // Track new collection_id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newCollectionId = String((record.data as any).collectionId || "");
        if (newCollectionId) affectedCollectionIds.add(newCollectionId);
        // Track old collection_id (for moves)
        if (oldCollectionId && oldCollectionId !== newCollectionId) {
          affectedCollectionIds.add(oldCollectionId);
        }
      } else if (record.tableName === "topics") {
        await this.applyTopicChange(record, now);
      } else if (record.tableName === "tags") {
        await this.applyTagChange(record, now);
      } else if (record.tableName === "userLearningLanguages") {
        await this.applyUserLearningLanguageChange(record, now);
      } else if (record.tableName === "collectionSharedUsers") {
        await this.applyCollectionSharedUserChange(record, now);
      } else if (record.tableName === "practiceProgress") {
        await this.applyPracticeProgressChange(record, now);
      }
    }

    // Apply deleted
    for (const record of deleted) {
      if (record.tableName === "vocabularies") {
        // Get collection_id before deleting
        const existing = await db.vocabularies.get(record.rowId);
        if (existing?.collection_id) {
          affectedCollectionIds.add(existing.collection_id);
        }
        await db.vocabularies.delete(record.rowId);
      } else if (record.tableName === "collections") {
        // Delete vocabularies in collection first
        await db.vocabularies
          .where("collection_id")
          .equals(record.rowId)
          .delete();
        await db.collections.delete(record.rowId);
        // No point recalculating for a deleted collection
        affectedCollectionIds.delete(record.rowId);
      } else if (record.tableName === "topics") {
        await db.topics.delete(record.rowId);
      } else if (record.tableName === "tags") {
        await db.tags.delete(record.rowId);
      } else if (record.tableName === "userLearningLanguages") {
        await db.userLearningLanguages.delete(record.rowId);
      } else if (record.tableName === "collectionSharedUsers") {
        await db.collectionSharedUsers.delete(record.rowId);
      } else if (record.tableName === "practiceProgress") {
        await db.practiceProgress.delete(record.rowId);
      }
      // Clean up any pending changes for this record
      await db._pendingChanges.where("recordId").equals(record.rowId).delete();
    }

    // Recalculate word_count for affected collections
    for (const collectionId of affectedCollectionIds) {
      const collection = await db.collections.get(collectionId);
      if (collection) {
        const count = await db.vocabularies
          .where("collection_id")
          .equals(collectionId)
          .count();
        await db.collections.update(collectionId, { word_count: count });
      }
    }
  }

  private async applyCollectionChange(
    record: PullRecord,
    now: number,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = record.data as any;
    const existing = await db.collections.get(record.rowId);

    // Derive shared_by from ownerId in sync data:
    // If ownerId is present and differs from current user -> shared_by = ownerId
    // Otherwise -> shared_by = undefined (user's own collection)
    let shared_by: string | undefined;
    const ownerId = data.ownerId ? String(data.ownerId) : undefined;
    if (ownerId) {
      try {
        const { getAuthService } = await import("@cham-lang/ui/adapters");
        const authService = getAuthService();
        const tokens = await authService.getTokens();
        if (tokens.userId && tokens.userId !== ownerId) {
          shared_by = ownerId;
        }
      } catch {
        // If auth service is unavailable, treat as own collection
      }
    }

    const collectionData: IDBCollection = {
      id: record.rowId,
      name: String(data.name || ""),
      description: String(data.description || ""),
      language: String(data.language || ""),
      shared_by,
      shared_with: [],
      is_public: Boolean(data.isPublic),
      word_count: Number(data.wordCount || 0),
      created_at: toISODateString(data.createdAt),
      updated_at: new Date().toISOString(),
      sync_version: record.version,
      synced_at: now,
    };

    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.collections.update(record.rowId, collectionData as any);
    } else {
      await db.collections.add(collectionData);
    }
  }

  private async applyVocabularyChange(
    record: PullRecord,
    now: number,
  ): Promise<string | undefined> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = record.data as any;
    const existing = await db.vocabularies.get(record.rowId);
    const oldCollectionId = existing?.collection_id;

    const vocabData: IDBVocabulary = {
      id: record.rowId,
      word: String(data.word || ""),
      word_type: String(data.wordType || "n/a"),
      level: String(data.level || ""),
      ipa: String(data.ipa || ""),
      audio_url: data.audioUrl ? String(data.audioUrl) : undefined,
      concept: data.concept ? String(data.concept) : undefined,
      definitions: Array.isArray(data.definitions) ? data.definitions : [],
      example_sentences: Array.isArray(data.exampleSentences)
        ? data.exampleSentences
        : [],
      topics: Array.isArray(data.topics) ? data.topics : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
      related_words: Array.isArray(data.relatedWords) ? data.relatedWords : [],
      language: String(data.language || ""),
      collection_id: String(data.collectionId || ""),
      created_at: toISODateString(data.createdAt),
      updated_at: new Date().toISOString(),
      sync_version: record.version,
      synced_at: now,
    };

    if (existing) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.vocabularies.update(record.rowId, vocabData as any);
    } else {
      await db.vocabularies.add(vocabData);
    }

    return oldCollectionId;
  }

  private async applyTopicChange(
    record: PullRecord,
    now: number,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = record.data as any;
    const existing = await db.topics.get(record.rowId);
    const topicData = {
      id: record.rowId,
      name: String(data.name || ""),
      created_at: toISODateString(data.createdAt),
      sync_version: record.version,
      synced_at: now,
    };
    if (existing) {
      await db.topics.update(record.rowId, topicData);
    } else {
      await db.topics.add(topicData);
    }
  }

  private async applyTagChange(record: PullRecord, now: number): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = record.data as any;
    const existing = await db.tags.get(record.rowId);
    const tagData = {
      id: record.rowId,
      name: String(data.name || ""),
      created_at: toISODateString(data.createdAt),
      sync_version: record.version,
      synced_at: now,
    };
    if (existing) {
      await db.tags.update(record.rowId, tagData);
    } else {
      await db.tags.add(tagData);
    }
  }

  private async applyUserLearningLanguageChange(
    record: PullRecord,
    now: number,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = record.data as any;
    const existing = await db.userLearningLanguages.get(record.rowId);
    const langData = {
      id: record.rowId,
      language: String(data.language || ""),
      created_at: toISODateString(data.createdAt),
      sync_version: record.version,
      synced_at: now,
    };
    if (existing) {
      await db.userLearningLanguages.update(record.rowId, langData);
    } else {
      await db.userLearningLanguages.add(langData);
    }
  }

  private async applyCollectionSharedUserChange(
    record: PullRecord,
    now: number,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = record.data as any;
    const existing = await db.collectionSharedUsers.get(record.rowId);
    const suData = {
      id: record.rowId,
      collection_id: String(data.collectionId || ""),
      user_id: String(data.userId || ""),
      permission: String(data.permission || "viewer"),
      created_at: toISODateString(data.createdAt),
      sync_version: record.version,
      synced_at: now,
    };
    if (existing) {
      await db.collectionSharedUsers.update(record.rowId, suData);
    } else {
      await db.collectionSharedUsers.add(suData);
    }
  }

  private async applyPracticeProgressChange(
    record: PullRecord,
    now: number,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = record.data as any;
    const existing = await db.practiceProgress.get(record.rowId);
    const ppData = {
      id: record.rowId,
      language: String(data.language || ""),
      total_sessions: Number(data.totalSessions || 0),
      total_words_practiced: Number(data.totalWordsPracticed || 0),
      current_streak: Number(data.currentStreak || 0),
      longest_streak: Number(data.longestStreak || 0),
      last_practice_date: toISODateString(data.lastPracticeDate),
      created_at: toISODateString(data.createdAt),
      updated_at: toISODateString(data.updatedAt),
      sync_version: record.version,
      synced_at: now,
    };
    if (existing) {
      await db.practiceProgress.update(record.rowId, ppData);
    } else {
      await db.practiceProgress.add(ppData);
    }
  }

  // =========================================================================
  // Checkpoint Management
  // =========================================================================

  async getCheckpoint(): Promise<Checkpoint | undefined> {
    const updatedAt = await db.getSyncMeta(
      SYNC_META_KEYS.CHECKPOINT_UPDATED_AT,
    );
    const id = await db.getSyncMeta(SYNC_META_KEYS.CHECKPOINT_ID);

    if (updatedAt && id) {
      return { updatedAt, id };
    }
    return undefined;
  }

  async saveCheckpoint(checkpoint: Checkpoint): Promise<void> {
    await db.setSyncMeta(
      SYNC_META_KEYS.CHECKPOINT_UPDATED_AT,
      checkpoint.updatedAt as string,
    );
    await db.setSyncMeta(SYNC_META_KEYS.CHECKPOINT_ID, checkpoint.id);
  }

  async getLastSyncAt(): Promise<number | undefined> {
    const val = await db.getSyncMeta(SYNC_META_KEYS.LAST_SYNC_AT);
    return val ? parseInt(val, 10) : undefined;
  }

  async saveLastSyncAt(timestamp: string | number): Promise<void> {
    const val =
      typeof timestamp === "number" ? timestamp.toString() : timestamp;
    await db.setSyncMeta(SYNC_META_KEYS.LAST_SYNC_AT, val);
  }
}
