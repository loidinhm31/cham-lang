/**
 * Dexie Database Backup/Restore Utilities
 * Handles export and import of IndexedDB data as JSON for Google Drive backup
 */

import {
  db,
  type IDBVocabulary,
  type IDBCollection,
  type IDBPracticeSession,
  type IDBWordProgress,
  type IDBPracticeProgress,
  type IDBLearningSettings,
  type IDBTopic,
  type IDBTag,
  type IDBUserLearningLanguage,
  type IDBCollectionSharedUser,
  type SyncMeta,
  type PendingChange,
} from "./database";

/**
 * Backup format for Cham Lang data
 */
export interface ChamLangBackup {
  version: number;
  exportedAt: string;
  platform: "web" | "tauri";
  tables: {
    vocabularies: IDBVocabulary[];
    collections: IDBCollection[];
    practiceSessions: IDBPracticeSession[];
    wordProgress: IDBWordProgress[];
    practiceProgress: IDBPracticeProgress[];
    learningSettings: IDBLearningSettings[];
    topics: IDBTopic[];
    tags: IDBTag[];
    userLearningLanguages: IDBUserLearningLanguage[];
    collectionSharedUsers: IDBCollectionSharedUser[];
    _syncMeta: SyncMeta[];
    _pendingChanges: PendingChange[];
  };
}

// Current backup format version
const BACKUP_VERSION = 1;

/**
 * Export all Dexie tables to a JSON backup object
 */
export async function exportDatabaseToJSON(): Promise<ChamLangBackup> {
  const [
    vocabularies,
    collections,
    practiceSessions,
    wordProgress,
    practiceProgress,
    learningSettings,
    topics,
    tags,
    userLearningLanguages,
    collectionSharedUsers,
    syncMeta,
    pendingChanges,
  ] = await Promise.all([
    db.vocabularies.toArray(),
    db.collections.toArray(),
    db.practiceSessions.toArray(),
    db.wordProgress.toArray(),
    db.practiceProgress.toArray(),
    db.learningSettings.toArray(),
    db.topics.toArray(),
    db.tags.toArray(),
    db.userLearningLanguages.toArray(),
    db.collectionSharedUsers.toArray(),
    db._syncMeta.toArray(),
    db._pendingChanges.toArray(),
  ]);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    platform: "web",
    tables: {
      vocabularies,
      collections,
      practiceSessions,
      wordProgress,
      practiceProgress,
      learningSettings,
      topics,
      tags,
      userLearningLanguages,
      collectionSharedUsers,
      _syncMeta: syncMeta,
      _pendingChanges: pendingChanges,
    },
  };
}

/**
 * Import a JSON backup into Dexie, replacing all existing data
 */
export async function importDatabaseFromJSON(
  backup: ChamLangBackup,
): Promise<void> {
  // Validate backup structure first
  if (!validateBackup(backup)) {
    throw new Error("Invalid backup format");
  }

  // Clear all tables and import new data in a transaction
  await db.transaction(
    "rw",
    [
      db.vocabularies,
      db.collections,
      db.practiceSessions,
      db.wordProgress,
      db.practiceProgress,
      db.learningSettings,
      db.topics,
      db.tags,
      db.userLearningLanguages,
      db.collectionSharedUsers,
      db._syncMeta,
      db._pendingChanges,
    ],
    async () => {
      // Clear all tables
      await Promise.all([
        db.vocabularies.clear(),
        db.collections.clear(),
        db.practiceSessions.clear(),
        db.wordProgress.clear(),
        db.practiceProgress.clear(),
        db.learningSettings.clear(),
        db.topics.clear(),
        db.tags.clear(),
        db.userLearningLanguages.clear(),
        db.collectionSharedUsers.clear(),
        db._syncMeta.clear(),
        db._pendingChanges.clear(),
      ]);

      // Bulk insert all data
      const { tables } = backup;

      await Promise.all([
        tables.vocabularies.length > 0 &&
          db.vocabularies.bulkAdd(tables.vocabularies),
        tables.collections.length > 0 &&
          db.collections.bulkAdd(tables.collections),
        tables.practiceSessions.length > 0 &&
          db.practiceSessions.bulkAdd(tables.practiceSessions),
        tables.wordProgress.length > 0 &&
          db.wordProgress.bulkAdd(tables.wordProgress),
        tables.practiceProgress.length > 0 &&
          db.practiceProgress.bulkAdd(tables.practiceProgress),
        tables.learningSettings.length > 0 &&
          db.learningSettings.bulkAdd(tables.learningSettings),
        tables.topics.length > 0 && db.topics.bulkAdd(tables.topics),
        tables.tags.length > 0 && db.tags.bulkAdd(tables.tags),
        tables.userLearningLanguages.length > 0 &&
          db.userLearningLanguages.bulkAdd(tables.userLearningLanguages),
        tables.collectionSharedUsers.length > 0 &&
          db.collectionSharedUsers.bulkAdd(tables.collectionSharedUsers),
        tables._syncMeta.length > 0 && db._syncMeta.bulkAdd(tables._syncMeta),
        tables._pendingChanges.length > 0 &&
          db._pendingChanges.bulkAdd(tables._pendingChanges),
      ]);
    },
  );
}

/**
 * Clear all tables in the database
 */
export async function clearAllTables(): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.vocabularies,
      db.collections,
      db.practiceSessions,
      db.wordProgress,
      db.practiceProgress,
      db.learningSettings,
      db.topics,
      db.tags,
      db.userLearningLanguages,
      db.collectionSharedUsers,
      db._syncMeta,
      db._pendingChanges,
    ],
    async () => {
      await Promise.all([
        db.vocabularies.clear(),
        db.collections.clear(),
        db.practiceSessions.clear(),
        db.wordProgress.clear(),
        db.practiceProgress.clear(),
        db.learningSettings.clear(),
        db.topics.clear(),
        db.tags.clear(),
        db.userLearningLanguages.clear(),
        db.collectionSharedUsers.clear(),
        db._syncMeta.clear(),
        db._pendingChanges.clear(),
      ]);
    },
  );
}

/**
 * Validate that a backup object has the correct structure
 */
export function validateBackup(data: unknown): data is ChamLangBackup {
  if (!data || typeof data !== "object") {
    return false;
  }

  const backup = data as Record<string, unknown>;

  // Check required top-level fields
  if (typeof backup.version !== "number") {
    return false;
  }
  if (typeof backup.exportedAt !== "string") {
    return false;
  }
  if (backup.platform !== "web" && backup.platform !== "tauri") {
    return false;
  }
  if (!backup.tables || typeof backup.tables !== "object") {
    return false;
  }

  const tables = backup.tables as Record<string, unknown>;

  // Check all required tables exist and are arrays
  const requiredTables = [
    "vocabularies",
    "collections",
    "practiceSessions",
    "wordProgress",
    "practiceProgress",
    "learningSettings",
    "topics",
    "tags",
    "userLearningLanguages",
    "collectionSharedUsers",
    "_syncMeta",
    "_pendingChanges",
  ];

  for (const tableName of requiredTables) {
    if (!Array.isArray(tables[tableName])) {
      return false;
    }
  }

  return true;
}

/**
 * Get database statistics for display
 */
export async function getDatabaseStats(): Promise<{
  totalRecords: number;
  tableStats: Record<string, number>;
}> {
  const [
    vocabularyCount,
    collectionCount,
    practiceSessionCount,
    wordProgressCount,
    practiceProgressCount,
    learningSettingsCount,
    topicCount,
    tagCount,
    userLearningLanguageCount,
    collectionSharedUserCount,
  ] = await Promise.all([
    db.vocabularies.count(),
    db.collections.count(),
    db.practiceSessions.count(),
    db.wordProgress.count(),
    db.practiceProgress.count(),
    db.learningSettings.count(),
    db.topics.count(),
    db.tags.count(),
    db.userLearningLanguages.count(),
    db.collectionSharedUsers.count(),
  ]);

  const tableStats = {
    vocabularies: vocabularyCount,
    collections: collectionCount,
    practiceSessions: practiceSessionCount,
    wordProgress: wordProgressCount,
    practiceProgress: practiceProgressCount,
    learningSettings: learningSettingsCount,
    topics: topicCount,
    tags: tagCount,
    userLearningLanguages: userLearningLanguageCount,
    collectionSharedUsers: collectionSharedUserCount,
  };

  const totalRecords = Object.values(tableStats).reduce(
    (sum, count) => sum + count,
    0,
  );

  return { totalRecords, tableStats };
}
