/**
 * IndexedDB Sync Storage for cham-lang
 *
 * Tracks pending changes, applies remote changes, and manages sync checkpoints.
 * Uses camelCase field names throughout - matches sync protocol directly.
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
import { getAuthService } from "@cham-lang/ui/adapters";

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
      if (collection.syncedAt === undefined || collection.syncedAt === null) {
        if (collection.sharedBy) continue;
        records.push({
          tableName: "collections",
          rowId: collection.id,
          data: {
            id: collection.id,
            name: collection.name,
            description: collection.description,
            language: collection.language,
            ownerId: userId ?? null,
            sharedBy: collection.sharedBy ?? null,
            isPublic: collection.isPublic,
            wordCount: collection.wordCount,
            createdAt: toUnixTimestamp(collection.createdAt),
            updatedAt: toUnixTimestamp(collection.updatedAt),
            syncVersion: collection.syncVersion || 1,
          },
          version: collection.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // Get unsynced vocabularies
    const vocabularies = await db.vocabularies.toArray();
    for (const vocab of vocabularies) {
      if (vocab.syncedAt === undefined || vocab.syncedAt === null) {
        records.push({
          tableName: "vocabularies",
          rowId: vocab.id,
          data: {
            id: vocab.id,
            word: vocab.word,
            wordType: vocab.wordType,
            level: vocab.level,
            ipa: vocab.ipa,
            audioUrl: vocab.audioUrl,
            concept: vocab.concept,
            language: vocab.language,
            collectionId: vocab.collectionId,
            definitions: vocab.definitions,
            exampleSentences: vocab.exampleSentences,
            topics: vocab.topics,
            tags: vocab.tags,
            relatedWords: vocab.relatedWords,
            createdAt: toUnixTimestamp(vocab.createdAt),
            updatedAt: toUnixTimestamp(vocab.updatedAt),
            syncVersion: vocab.syncVersion || 1,
          },
          version: vocab.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // Get unsynced topics
    const topics = await db.topics.toArray();
    for (const topic of topics) {
      if (topic.syncedAt === undefined || topic.syncedAt === null) {
        records.push({
          tableName: "topics",
          rowId: topic.id,
          data: {
            id: topic.id,
            name: topic.name,
            createdAt: toUnixTimestamp(topic.createdAt),
            syncVersion: topic.syncVersion || 1,
          },
          version: topic.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // Get unsynced tags
    const tags = await db.tags.toArray();
    for (const tag of tags) {
      if (tag.syncedAt === undefined || tag.syncedAt === null) {
        records.push({
          tableName: "tags",
          rowId: tag.id,
          data: {
            id: tag.id,
            name: tag.name,
            createdAt: toUnixTimestamp(tag.createdAt),
            syncVersion: tag.syncVersion || 1,
          },
          version: tag.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // Get unsynced user learning languages
    const langs = await db.userLearningLanguages.toArray();
    for (const lang of langs) {
      if (lang.syncedAt === undefined || lang.syncedAt === null) {
        records.push({
          tableName: "userLearningLanguages",
          rowId: lang.id,
          data: {
            id: lang.id,
            language: lang.language,
            createdAt: toUnixTimestamp(lang.createdAt),
            syncVersion: lang.syncVersion || 1,
          },
          version: lang.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // Get unsynced collection shared users
    const sharedUsers = await db.collectionSharedUsers.toArray();
    for (const su of sharedUsers) {
      if (su.syncedAt === undefined || su.syncedAt === null) {
        records.push({
          tableName: "collectionSharedUsers",
          rowId: su.id,
          data: {
            id: su.id,
            collectionId: su.collectionId,
            userId: su.userId,
            permission: su.permission,
            createdAt: toUnixTimestamp(su.createdAt),
            syncVersion: su.syncVersion || 1,
          },
          version: su.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // Get unsynced practice progress
    const practiceProgress = await db.practiceProgress.toArray();
    for (const pp of practiceProgress) {
      if (pp.syncedAt === undefined || pp.syncedAt === null) {
        records.push({
          tableName: "practiceProgress",
          rowId: pp.id,
          data: {
            id: pp.id,
            language: pp.language,
            totalSessions: pp.totalSessions,
            totalWordsPracticed: pp.totalWordsPracticed,
            currentStreak: pp.currentStreak,
            longestStreak: pp.longestStreak,
            lastPracticeDate: toUnixTimestamp(pp.lastPracticeDate),
            createdAt: toUnixTimestamp(pp.createdAt),
            updatedAt: toUnixTimestamp(pp.updatedAt),
            syncVersion: pp.syncVersion || 1,
          },
          version: pp.syncVersion || 1,
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
      .filter((v) => v.syncedAt === undefined || v.syncedAt === null)
      .count();
    const unsyncedCollections = await db.collections
      .filter((c) => c.syncedAt === undefined || c.syncedAt === null)
      .count();
    const unsyncedTopics = await db.topics
      .filter((t) => t.syncedAt === undefined || t.syncedAt === null)
      .count();
    const unsyncedTags = await db.tags
      .filter((t) => t.syncedAt === undefined || t.syncedAt === null)
      .count();
    const unsyncedLangs = await db.userLearningLanguages
      .filter((l) => l.syncedAt === undefined || l.syncedAt === null)
      .count();
    const unsyncedShared = await db.collectionSharedUsers
      .filter((s) => s.syncedAt === undefined || s.syncedAt === null)
      .count();
    const unsyncedProgress = await db.practiceProgress
      .filter((p) => p.syncedAt === undefined || p.syncedAt === null)
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
            syncedAt: now,
            syncVersion: (collection.syncVersion || 1) + 1,
          });
        }
      } else if (tableName === "vocabularies") {
        const vocab = await db.vocabularies.get(rowId);
        if (vocab) {
          await db.vocabularies.update(rowId, {
            syncedAt: now,
            syncVersion: (vocab.syncVersion || 1) + 1,
          });
        }
      } else if (tableName === "topics") {
        const topic = await db.topics.get(rowId);
        if (topic) {
          await db.topics.update(rowId, {
            syncedAt: now,
            syncVersion: (topic.syncVersion || 1) + 1,
          });
        }
      } else if (tableName === "tags") {
        const tag = await db.tags.get(rowId);
        if (tag) {
          await db.tags.update(rowId, {
            syncedAt: now,
            syncVersion: (tag.syncVersion || 1) + 1,
          });
        }
      } else if (tableName === "userLearningLanguages") {
        const lang = await db.userLearningLanguages.get(rowId);
        if (lang) {
          await db.userLearningLanguages.update(rowId, {
            syncedAt: now,
            syncVersion: (lang.syncVersion || 1) + 1,
          });
        }
      } else if (tableName === "collectionSharedUsers") {
        const su = await db.collectionSharedUsers.get(rowId);
        if (su) {
          await db.collectionSharedUsers.update(rowId, {
            syncedAt: now,
            syncVersion: (su.syncVersion || 1) + 1,
          });
        }
      } else if (tableName === "practiceProgress") {
        const pp = await db.practiceProgress.get(rowId);
        if (pp) {
          await db.practiceProgress.update(rowId, {
            syncedAt: now,
            syncVersion: (pp.syncVersion || 1) + 1,
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
        // Track new collectionId
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newCollectionId = String((record.data as any).collectionId || "");
        if (newCollectionId) affectedCollectionIds.add(newCollectionId);
        // Track old collectionId (for moves)
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
        // Get collectionId before deleting
        const existing = await db.vocabularies.get(record.rowId);
        if (existing?.collectionId) {
          affectedCollectionIds.add(existing.collectionId);
        }
        await db.vocabularies.delete(record.rowId);
      } else if (record.tableName === "collections") {
        // Delete vocabularies in collection first
        await db.vocabularies
          .where("collectionId")
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

    // Recalculate wordCount for affected collections
    for (const collectionId of affectedCollectionIds) {
      const collection = await db.collections.get(collectionId);
      if (collection) {
        const count = await db.vocabularies
          .where("collectionId")
          .equals(collectionId)
          .count();
        await db.collections.update(collectionId, { wordCount: count });
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

    // Derive sharedBy from ownerId in sync data:
    // If ownerId is present and differs from current user -> sharedBy = ownerId
    // Otherwise -> sharedBy = undefined (user's own collection)
    let sharedBy: string | undefined;
    const ownerId = data.ownerId ? String(data.ownerId) : undefined;
    if (ownerId) {
      try {
        const authService = getAuthService();
        const tokens = await authService.getTokens();
        if (tokens.userId && tokens.userId !== ownerId) {
          sharedBy = ownerId;
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
      sharedBy,
      sharedWith: [],
      isPublic: Boolean(data.isPublic),
      wordCount: Number(data.wordCount || 0),
      createdAt: toISODateString(data.createdAt),
      updatedAt: toISODateString(data.updatedAt),
      syncVersion: record.version,
      syncedAt: now,
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
    const oldCollectionId = existing?.collectionId;

    const vocabData: IDBVocabulary = {
      id: record.rowId,
      word: String(data.word || ""),
      wordType: String(data.wordType || "n/a"),
      level: String(data.level || ""),
      ipa: String(data.ipa || ""),
      audioUrl: data.audioUrl ? String(data.audioUrl) : undefined,
      concept: data.concept ? String(data.concept) : undefined,
      definitions: Array.isArray(data.definitions) ? data.definitions : [],
      exampleSentences: Array.isArray(data.exampleSentences)
        ? data.exampleSentences
        : [],
      topics: Array.isArray(data.topics) ? data.topics : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
      relatedWords: Array.isArray(data.relatedWords) ? data.relatedWords : [],
      language: String(data.language || ""),
      collectionId: String(data.collectionId || ""),
      createdAt: toISODateString(data.createdAt),
      updatedAt: toISODateString(data.updatedAt),
      syncVersion: record.version,
      syncedAt: now,
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
      createdAt: toISODateString(data.createdAt),
      syncVersion: record.version,
      syncedAt: now,
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
      createdAt: toISODateString(data.createdAt),
      syncVersion: record.version,
      syncedAt: now,
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
      createdAt: toISODateString(data.createdAt),
      syncVersion: record.version,
      syncedAt: now,
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
      collectionId: String(data.collectionId || ""),
      userId: String(data.userId || ""),
      permission: String(data.permission || "viewer"),
      createdAt: toISODateString(data.createdAt),
      syncVersion: record.version,
      syncedAt: now,
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
      totalSessions: Number(data.totalSessions || 0),
      totalWordsPracticed: Number(data.totalWordsPracticed || 0),
      currentStreak: Number(data.currentStreak || 0),
      longestStreak: Number(data.longestStreak || 0),
      lastPracticeDate: toISODateString(data.lastPracticeDate),
      createdAt: toISODateString(data.createdAt),
      updatedAt: toISODateString(data.updatedAt),
      syncVersion: record.version,
      syncedAt: now,
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
