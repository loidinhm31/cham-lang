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
        records.push({
          tableName: "collections",
          rowId: collection.id,
          data: {
            name: collection.name,
            description: collection.description,
            language: collection.language,
            isPublic: collection.is_public,
            wordCount: collection.word_count,
            createdAt: collection.created_at,
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
            word: vocab.word,
            wordType: vocab.word_type,
            level: vocab.level,
            ipa: vocab.ipa,
            audioUrl: vocab.audio_url,
            concept: vocab.concept,
            language: vocab.language,
            collectionSyncUuid: vocab.collection_id,
            definitions: vocab.definitions,
            exampleSentences: vocab.example_sentences,
            topics: vocab.topics,
            tags: vocab.tags,
            relatedWords: vocab.related_words,
            createdAt: vocab.created_at,
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
          data: { name: topic.name, createdAt: topic.created_at },
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
          data: { name: tag.name, createdAt: tag.created_at },
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
          tableName: "user_learning_languages",
          rowId: lang.id,
          data: { language: lang.language, createdAt: lang.created_at },
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
          tableName: "collection_shared_users",
          rowId: su.id,
          data: {
            collectionId: su.collection_id,
            userId: su.user_id,
            createdAt: su.created_at,
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
          tableName: "practice_progress",
          rowId: pp.id,
          data: {
            language: pp.language,
            totalSessions: pp.total_sessions,
            totalWordsPracticed: pp.total_words_practiced,
            currentStreak: pp.current_streak,
            longestStreak: pp.longest_streak,
            lastPracticeDate: pp.last_practice_date,
            createdAt: pp.created_at,
            updatedAt: pp.updated_at,
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
      } else if (tableName === "user_learning_languages") {
        const lang = await db.userLearningLanguages.get(rowId);
        if (lang) {
          await db.userLearningLanguages.update(rowId, {
            synced_at: now,
            sync_version: (lang.sync_version || 1) + 1,
          });
        }
      } else if (tableName === "collection_shared_users") {
        const su = await db.collectionSharedUsers.get(rowId);
        if (su) {
          await db.collectionSharedUsers.update(rowId, {
            synced_at: now,
            sync_version: (su.sync_version || 1) + 1,
          });
        }
      } else if (tableName === "practice_progress") {
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
        user_learning_languages: 3,
        collection_shared_users: 4,
        vocabularies: 5,
        word_progress: 6,
        learning_settings: 7,
        practice_sessions: 8,
        practice_progress: 9,
      };
      return (order[a.tableName] ?? 10) - (order[b.tableName] ?? 10);
    });

    // Sort deleted: children first, parents last
    deleted.sort((a, b) => {
      const order: Record<string, number> = {
        practice_progress: 0,
        practice_sessions: 1,
        word_progress: 2,
        collection_shared_users: 3,
        vocabularies: 4,
        user_learning_languages: 5,
        collections: 6,
        learning_settings: 7,
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
      } else if (record.tableName === "user_learning_languages") {
        await this.applyUserLearningLanguageChange(record, now);
      } else if (record.tableName === "collection_shared_users") {
        await this.applyCollectionSharedUserChange(record, now);
      } else if (record.tableName === "practice_progress") {
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
      } else if (record.tableName === "user_learning_languages") {
        await db.userLearningLanguages.delete(record.rowId);
      } else if (record.tableName === "collection_shared_users") {
        await db.collectionSharedUsers.delete(record.rowId);
      } else if (record.tableName === "practice_progress") {
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
      collection_id: String(data.collectionSyncUuid || ""),
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
