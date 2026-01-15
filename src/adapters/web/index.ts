/**
 * Web Adapters - Export all Web service adapters and database
 */

export { db, generateId, now, ChamLangDB } from "./db";
export type {
  CollectionRecord,
  VocabularyRecord,
  PracticeSessionRecord,
  UserPracticeProgressRecord,
  LearningSettingsRecord,
} from "./db";

export { WebVocabularyAdapter } from "./WebVocabularyAdapter";
export { WebCollectionAdapter } from "./WebCollectionAdapter";
export { WebPracticeAdapter } from "./WebPracticeAdapter";
export { WebLearningSettingsAdapter } from "./WebLearningSettingsAdapter";
export { WebNotificationAdapter } from "./WebNotificationAdapter";
export { WebCSVAdapter } from "./WebCSVAdapter";

// Migration utilities
export { DatabaseMigration, databaseMigration } from "./DatabaseMigration";
export type { SQLiteBackupData, MigrationResult } from "./DatabaseMigration";

// Google Drive adapter
export { WebGDriveAdapter } from "./WebGDriveAdapter";
