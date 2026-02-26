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

    // Dexie cannot efficiently query `syncedAt === undefined` via index (IDB stores
    // undefined as "not present", making range queries on it unreliable). Full table
    // scans here are acceptable for typical vocabulary sizes (~thousands of records).
    // If performance becomes an issue, replace syncedAt with a dedicated `dirty: 0|1`
    // indexed boolean field and use .where('dirty').equals(1).
    const isUnsynced = (r: { syncedAt?: number }) =>
      r.syncedAt === undefined || r.syncedAt === null;

    // Collections
    const collections = await db.collections.toArray();
    for (const collection of collections) {
      if (!isUnsynced(collection)) continue;
      if (collection.deleted) {
        records.push({
          tableName: "collections",
          rowId: collection.id,
          data: {},
          version: collection.syncVersion || 1,
          deleted: true,
        });
      } else {
        records.push({
          tableName: "collections",
          rowId: collection.id,
          data: {
            id: collection.id,
            name: collection.name,
            description: collection.description,
            language: collection.language,
            ownerId: collection.sharedBy ?? userId ?? null,
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

    // Vocabularies
    const vocabularies = await db.vocabularies.toArray();
    for (const vocab of vocabularies) {
      if (!isUnsynced(vocab)) continue;
      if (vocab.deleted) {
        records.push({
          tableName: "vocabularies",
          rowId: vocab.id,
          data: {},
          version: vocab.syncVersion || 1,
          deleted: true,
        });
      } else {
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

    // Topics
    const topics = await db.topics.toArray();
    for (const topic of topics) {
      if (!isUnsynced(topic)) continue;
      if (topic.deleted) {
        records.push({ tableName: "topics", rowId: topic.id, data: {}, version: topic.syncVersion || 1, deleted: true });
      } else {
        records.push({
          tableName: "topics",
          rowId: topic.id,
          data: { id: topic.id, name: topic.name, createdAt: toUnixTimestamp(topic.createdAt), syncVersion: topic.syncVersion || 1 },
          version: topic.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // Tags
    const tags = await db.tags.toArray();
    for (const tag of tags) {
      if (!isUnsynced(tag)) continue;
      if (tag.deleted) {
        records.push({ tableName: "tags", rowId: tag.id, data: {}, version: tag.syncVersion || 1, deleted: true });
      } else {
        records.push({
          tableName: "tags",
          rowId: tag.id,
          data: { id: tag.id, name: tag.name, createdAt: toUnixTimestamp(tag.createdAt), syncVersion: tag.syncVersion || 1 },
          version: tag.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // User learning languages
    const langs = await db.userLearningLanguages.toArray();
    for (const lang of langs) {
      if (!isUnsynced(lang)) continue;
      if (lang.deleted) {
        records.push({ tableName: "userLearningLanguages", rowId: lang.id, data: {}, version: lang.syncVersion || 1, deleted: true });
      } else {
        records.push({
          tableName: "userLearningLanguages",
          rowId: lang.id,
          data: { id: lang.id, language: lang.language, createdAt: toUnixTimestamp(lang.createdAt), syncVersion: lang.syncVersion || 1 },
          version: lang.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // Collection shared users
    const sharedUsers = await db.collectionSharedUsers.toArray();
    for (const su of sharedUsers) {
      if (!isUnsynced(su)) continue;
      if (su.deleted) {
        records.push({ tableName: "collectionSharedUsers", rowId: su.id, data: {}, version: su.syncVersion || 1, deleted: true });
      } else {
        records.push({
          tableName: "collectionSharedUsers",
          rowId: su.id,
          data: { id: su.id, collectionId: su.collectionId, userId: su.userId, createdAt: toUnixTimestamp(su.createdAt), syncVersion: su.syncVersion || 1 },
          version: su.syncVersion || 1,
          deleted: false,
        });
      }
    }

    // Practice progress
    const practiceProgress = await db.practiceProgress.toArray();
    for (const pp of practiceProgress) {
      if (!isUnsynced(pp)) continue;
      if (pp.deleted) {
        records.push({ tableName: "practiceProgress", rowId: pp.id, data: {}, version: pp.syncVersion || 1, deleted: true });
      } else {
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

    // Legacy _pendingChanges drain (backward compat — pre-soft-delete hard-delete records)
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

    /** Build update payload: soft-deleted records only stamp syncedAt (version already
     *  incremented on delete); live records also bump syncVersion. */
    const payload = (deleted: 0 | 1 | boolean | undefined, currentVersion: number) =>
      deleted
        ? { syncedAt: now }
        : { syncedAt: now, syncVersion: currentVersion + 1 };

    for (const { tableName, rowId } of syncedRecords) {
      if (tableName === "collections") {
        const r = await db.collections.get(rowId);
        if (r) await db.collections.update(rowId, payload(r.deleted, r.syncVersion || 1));
      } else if (tableName === "vocabularies") {
        const r = await db.vocabularies.get(rowId);
        if (r) await db.vocabularies.update(rowId, payload(r.deleted, r.syncVersion || 1));
      } else if (tableName === "topics") {
        const r = await db.topics.get(rowId);
        if (r) await db.topics.update(rowId, payload(r.deleted, r.syncVersion || 1));
      } else if (tableName === "tags") {
        const r = await db.tags.get(rowId);
        if (r) await db.tags.update(rowId, payload(r.deleted, r.syncVersion || 1));
      } else if (tableName === "userLearningLanguages") {
        const r = await db.userLearningLanguages.get(rowId);
        if (r) await db.userLearningLanguages.update(rowId, payload(r.deleted, r.syncVersion || 1));
      } else if (tableName === "collectionSharedUsers") {
        const r = await db.collectionSharedUsers.get(rowId);
        if (r) await db.collectionSharedUsers.update(rowId, payload(r.deleted, r.syncVersion || 1));
      } else if (tableName === "practiceProgress") {
        const r = await db.practiceProgress.get(rowId);
        if (r) await db.practiceProgress.update(rowId, payload(r.deleted, r.syncVersion || 1));
      }

      // Drain legacy _pendingChanges (pre-soft-delete hard-delete records)
      await db._pendingChanges.where("recordId").equals(rowId).delete();
    }
  }

  // =========================================================================
  // Apply Remote Changes
  // =========================================================================

  async applyRemoteChanges(records: PullRecord[]): Promise<void> {
    // Sort before entering transaction to avoid non-IDB async work inside
    const nonDeleted = records.filter((r) => !r.deleted);
    const deleted = records.filter((r) => r.deleted);

    const upsertOrder: Record<string, number> = {
      topics: 0, tags: 1, collections: 2, userLearningLanguages: 3,
      collectionSharedUsers: 4, vocabularies: 5, wordProgress: 6,
      learningSettings: 7, practiceSessions: 8, practiceProgress: 9,
    };
    const deleteOrder: Record<string, number> = {
      practiceProgress: 0, practiceSessions: 1, wordProgress: 2,
      collectionSharedUsers: 3, vocabularies: 4, userLearningLanguages: 5,
      collections: 6, learningSettings: 7, topics: 8, tags: 9,
    };
    nonDeleted.sort((a, b) => (upsertOrder[a.tableName] ?? 10) - (upsertOrder[b.tableName] ?? 10));
    deleted.sort((a, b) => (deleteOrder[a.tableName] ?? 10) - (deleteOrder[b.tableName] ?? 10));

    // Resolve auth info before the transaction — avoids non-IDB async inside IDB tx
    let currentUserId: string | undefined;
    try {
      const authService = getAuthService();
      const tokens = await authService.getTokens();
      currentUserId = tokens.userId;
    } catch {
      // Unauthenticated — treat all collections as own
    }

    await db.transaction(
      "rw",
      [
        db.vocabularies, db.collections, db.topics, db.tags,
        db.userLearningLanguages, db.collectionSharedUsers,
        db.practiceProgress, db._pendingChanges,
      ],
      async () => {
        const now = Math.floor(Date.now() / 1000);
        const affectedCollectionIds = new Set<string>();

        for (const record of nonDeleted) {
          if (record.tableName === "collections") {
            await this.applyCollectionChange(record, now, currentUserId);
          } else if (record.tableName === "vocabularies") {
            const oldCollectionId = await this.applyVocabularyChange(record, now);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const newCollectionId = String((record.data as any).collectionId || "");
            if (newCollectionId) affectedCollectionIds.add(newCollectionId);
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

        for (const record of deleted) {
          if (record.tableName === "vocabularies") {
            const existing = await db.vocabularies.get(record.rowId);
            if (existing?.collectionId) affectedCollectionIds.add(existing.collectionId);
            if (existing && !existing.deleted) {
              await db.vocabularies.update(record.rowId, { deleted: 1, deletedAt: now });
            }
          } else if (record.tableName === "collections") {
            // Soft-delete all vocabs in the collection
            await db.vocabularies
              .where("collectionId")
              .equals(record.rowId)
              .filter((v) => !v.deleted)
              .modify({ deleted: 1, deletedAt: now });
            const collection = await db.collections.get(record.rowId);
            if (collection && !collection.deleted) {
              await db.collections.update(record.rowId, { deleted: 1, deletedAt: now });
            }
            affectedCollectionIds.delete(record.rowId);
          } else if (record.tableName === "topics") {
            const existing = await db.topics.get(record.rowId);
            if (existing && !existing.deleted) {
              await db.topics.update(record.rowId, { deleted: 1, deletedAt: now });
            }
          } else if (record.tableName === "tags") {
            const existing = await db.tags.get(record.rowId);
            if (existing && !existing.deleted) {
              await db.tags.update(record.rowId, { deleted: 1, deletedAt: now });
            }
          } else if (record.tableName === "userLearningLanguages") {
            const existing = await db.userLearningLanguages.get(record.rowId);
            if (existing && !existing.deleted) {
              await db.userLearningLanguages.update(record.rowId, { deleted: 1, deletedAt: now });
            }
          } else if (record.tableName === "collectionSharedUsers") {
            const existing = await db.collectionSharedUsers.get(record.rowId);
            if (existing && !existing.deleted) {
              await db.collectionSharedUsers.update(record.rowId, { deleted: 1, deletedAt: now });
            }
          } else if (record.tableName === "practiceProgress") {
            const existing = await db.practiceProgress.get(record.rowId);
            if (existing && !existing.deleted) {
              await db.practiceProgress.update(record.rowId, { deleted: 1, deletedAt: now });
            }
          }
          await db._pendingChanges.where("recordId").equals(record.rowId).delete();
        }

        // Recalculate wordCount for affected (non-deleted) collections
        for (const collectionId of affectedCollectionIds) {
          const collection = await db.collections.get(collectionId);
          if (collection && !collection.deleted) {
            const count = await db.vocabularies
              .where("collectionId")
              .equals(collectionId)
              .filter((v) => !v.deleted)
              .count();
            await db.collections.update(collectionId, { wordCount: count });
          }
        }
      },
    );
  }

  private async applyCollectionChange(
    record: PullRecord,
    now: number,
    currentUserId?: string,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = record.data as any;
    const existing = await db.collections.get(record.rowId);

    // Derive sharedBy from ownerId: if ownerId differs from current user -> sharedBy = ownerId
    let sharedBy: string | undefined;
    const ownerId = data.ownerId ? String(data.ownerId) : undefined;
    if (ownerId && currentUserId && currentUserId !== ownerId) {
      sharedBy = ownerId;
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

  /**
   * Remove soft-deleted records that have been confirmed synced and are older
   * than the server TTL window (default 60 days). Call after a successful sync
   * to prevent unbounded IDB growth.
   */
  async purgeConfirmedDeletes(ttlDays = 60): Promise<void> {
    const cutoff = Date.now() - ttlDays * 24 * 60 * 60 * 1000;

    await db.transaction(
      "rw",
      [
        db.vocabularies, db.collections, db.topics, db.tags,
        db.userLearningLanguages, db.collectionSharedUsers, db.practiceProgress,
      ],
      async () => {
        const isPurgeable = (r: { deleted?: 0 | 1; syncedAt?: number; deletedAt?: number }) =>
          r.deleted === 1 && r.syncedAt !== undefined && (r.deletedAt ?? 0) < cutoff;

        await db.vocabularies.filter(isPurgeable).delete();
        await db.collections.filter(isPurgeable).delete();
        await db.topics.filter(isPurgeable).delete();
        await db.tags.filter(isPurgeable).delete();
        await db.userLearningLanguages.filter(isPurgeable).delete();
        await db.collectionSharedUsers.filter(isPurgeable).delete();
        await db.practiceProgress.filter(isPurgeable).delete();
      },
    );
  }
}
