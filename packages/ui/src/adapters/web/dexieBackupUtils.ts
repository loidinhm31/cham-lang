/**
 * Dexie Database Backup/Restore Utilities
 * Handles export and import of IndexedDB data as JSON for Google Drive backup
 */

import {
  getDb,
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
    getDb().vocabularies.toArray(),
    getDb().collections.toArray(),
    getDb().practiceSessions.toArray(),
    getDb().wordProgress.toArray(),
    getDb().practiceProgress.toArray(),
    getDb().learningSettings.toArray(),
    getDb().topics.toArray(),
    getDb().tags.toArray(),
    getDb().userLearningLanguages.toArray(),
    getDb().collectionSharedUsers.toArray(),
    getDb()._syncMeta.toArray(),
    getDb()._pendingChanges.toArray(),
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
  await getDb().transaction(
    "rw",
    [
      getDb().vocabularies,
      getDb().collections,
      getDb().practiceSessions,
      getDb().wordProgress,
      getDb().practiceProgress,
      getDb().learningSettings,
      getDb().topics,
      getDb().tags,
      getDb().userLearningLanguages,
      getDb().collectionSharedUsers,
      getDb()._syncMeta,
      getDb()._pendingChanges,
    ],
    async () => {
      // Clear all tables
      await Promise.all([
        getDb().vocabularies.clear(),
        getDb().collections.clear(),
        getDb().practiceSessions.clear(),
        getDb().wordProgress.clear(),
        getDb().practiceProgress.clear(),
        getDb().learningSettings.clear(),
        getDb().topics.clear(),
        getDb().tags.clear(),
        getDb().userLearningLanguages.clear(),
        getDb().collectionSharedUsers.clear(),
        getDb()._syncMeta.clear(),
        getDb()._pendingChanges.clear(),
      ]);

      // Bulk insert all data
      const { tables } = backup;

      await Promise.all([
        tables.vocabularies.length > 0 &&
          getDb().vocabularies.bulkAdd(tables.vocabularies),
        tables.collections.length > 0 &&
          getDb().collections.bulkAdd(tables.collections),
        tables.practiceSessions.length > 0 &&
          getDb().practiceSessions.bulkAdd(tables.practiceSessions),
        tables.wordProgress.length > 0 &&
          getDb().wordProgress.bulkAdd(tables.wordProgress),
        tables.practiceProgress.length > 0 &&
          getDb().practiceProgress.bulkAdd(tables.practiceProgress),
        tables.learningSettings.length > 0 &&
          getDb().learningSettings.bulkAdd(tables.learningSettings),
        tables.topics.length > 0 && getDb().topics.bulkAdd(tables.topics),
        tables.tags.length > 0 && getDb().tags.bulkAdd(tables.tags),
        tables.userLearningLanguages.length > 0 &&
          getDb().userLearningLanguages.bulkAdd(tables.userLearningLanguages),
        tables.collectionSharedUsers.length > 0 &&
          getDb().collectionSharedUsers.bulkAdd(tables.collectionSharedUsers),
        tables._syncMeta.length > 0 && getDb()._syncMeta.bulkAdd(tables._syncMeta),
        tables._pendingChanges.length > 0 &&
          getDb()._pendingChanges.bulkAdd(tables._pendingChanges),
      ]);
    },
  );
}

/**
 * Clear all tables in the database
 */
export async function clearAllTables(): Promise<void> {
  await getDb().transaction(
    "rw",
    [
      getDb().vocabularies,
      getDb().collections,
      getDb().practiceSessions,
      getDb().wordProgress,
      getDb().practiceProgress,
      getDb().learningSettings,
      getDb().topics,
      getDb().tags,
      getDb().userLearningLanguages,
      getDb().collectionSharedUsers,
      getDb()._syncMeta,
      getDb()._pendingChanges,
    ],
    async () => {
      await Promise.all([
        getDb().vocabularies.clear(),
        getDb().collections.clear(),
        getDb().practiceSessions.clear(),
        getDb().wordProgress.clear(),
        getDb().practiceProgress.clear(),
        getDb().learningSettings.clear(),
        getDb().topics.clear(),
        getDb().tags.clear(),
        getDb().userLearningLanguages.clear(),
        getDb().collectionSharedUsers.clear(),
        getDb()._syncMeta.clear(),
        getDb()._pendingChanges.clear(),
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
    getDb().vocabularies.count(),
    getDb().collections.count(),
    getDb().practiceSessions.count(),
    getDb().wordProgress.count(),
    getDb().practiceProgress.count(),
    getDb().learningSettings.count(),
    getDb().topics.count(),
    getDb().tags.count(),
    getDb().userLearningLanguages.count(),
    getDb().collectionSharedUsers.count(),
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
