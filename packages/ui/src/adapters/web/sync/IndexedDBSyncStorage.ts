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

export class IndexedDBSyncStorage {
  // =========================================================================
  // Pending Changes
  // =========================================================================

  async getPendingChanges(): Promise<SyncRecord[]> {
    const records: SyncRecord[] = [];

    // Get unsynced collections
    const collections = await db.collections.toArray();
    for (const collection of collections) {
      if (collection.synced_at === undefined || collection.synced_at === null) {
        const now = Math.floor(Date.now() / 1000);
        records.push({
          tableName: "collections",
          rowId: collection.id,
          data: {
            id: collection.id,
            name: collection.name,
            description: collection.description,
            language: collection.language,
            ownerId: collection.owner_id || "local",
            isPublic: collection.is_public,
            wordCount: collection.word_count,
            createdAt:
              typeof collection.created_at === "string"
                ? Math.floor(new Date(collection.created_at).getTime() / 1000)
                : collection.created_at,
            updatedAt:
              typeof collection.updated_at === "string"
                ? Math.floor(new Date(collection.updated_at).getTime() / 1000)
                : now,
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
        const vNow = Math.floor(Date.now() / 1000);
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
            userId: vocab.user_id || "local",
            createdAt:
              typeof vocab.created_at === "string"
                ? Math.floor(new Date(vocab.created_at).getTime() / 1000)
                : vocab.created_at,
            updatedAt:
              typeof vocab.updated_at === "string"
                ? Math.floor(new Date(vocab.updated_at).getTime() / 1000)
                : vNow,
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
            createdAt:
              typeof topic.created_at === "string"
                ? Math.floor(new Date(topic.created_at).getTime() / 1000)
                : topic.created_at,
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
            createdAt:
              typeof tag.created_at === "string"
                ? Math.floor(new Date(tag.created_at).getTime() / 1000)
                : tag.created_at,
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
            userId: (lang as any).user_id || "local",
            language: lang.language,
            createdAt:
              typeof lang.created_at === "string"
                ? Math.floor(new Date(lang.created_at).getTime() / 1000)
                : lang.created_at,
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
            createdAt:
              typeof su.created_at === "string"
                ? Math.floor(new Date(su.created_at).getTime() / 1000)
                : su.created_at,
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
            userId: "local",
            language: pp.language,
            totalSessions: pp.total_sessions,
            totalWordsPracticed: pp.total_words_practiced,
            currentStreak: pp.current_streak,
            longestStreak: pp.longest_streak,
            lastPracticeDate:
              typeof pp.last_practice_date === "string"
                ? Math.floor(new Date(pp.last_practice_date).getTime() / 1000)
                : pp.last_practice_date,
            createdAt:
              typeof pp.created_at === "string"
                ? Math.floor(new Date(pp.created_at).getTime() / 1000)
                : pp.created_at,
            updatedAt:
              typeof pp.updated_at === "string"
                ? Math.floor(new Date(pp.updated_at).getTime() / 1000)
                : pp.updated_at,
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

    // Apply non-deleted (inserts/updates)
    for (const record of nonDeleted) {
      if (record.tableName === "collections") {
        await this.applyCollectionChange(record, now);
      } else if (record.tableName === "vocabularies") {
        await this.applyVocabularyChange(record, now);
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
        await db.vocabularies.delete(record.rowId);
      } else if (record.tableName === "collections") {
        // Delete vocabularies in collection first
        await db.vocabularies
          .where("collection_id")
          .equals(record.rowId)
          .delete();
        await db.collections.delete(record.rowId);
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
  }

  private async applyCollectionChange(
    record: PullRecord,
    now: number,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = record.data as any;
    const existing = await db.collections.get(record.rowId);

    const collectionData: IDBCollection = {
      id: record.rowId,
      name: String(data.name || ""),
      description: String(data.description || ""),
      language: String(data.language || ""),
      owner_id: "local",
      shared_with: [],
      is_public: Boolean(data.isPublic),
      word_count: Number(data.wordCount || 0),
      created_at: String(data.createdAt || new Date().toISOString()),
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
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = record.data as any;
    const existing = await db.vocabularies.get(record.rowId);

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
      user_id: "local",
      created_at: String(data.createdAt || new Date().toISOString()),
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
      created_at: String(data.createdAt || new Date().toISOString()),
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
      created_at: String(data.createdAt || new Date().toISOString()),
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
      user_id: "local",
      language: String(data.language || ""),
      created_at: String(data.createdAt || new Date().toISOString()),
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
      user_id: String(data.userId || "local"),
      created_at: String(data.createdAt || new Date().toISOString()),
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
      last_practice_date: String(
        data.lastPracticeDate || new Date().toISOString(),
      ),
      created_at: String(data.createdAt || new Date().toISOString()),
      updated_at: String(data.updatedAt || new Date().toISOString()),
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
