/**
 * Web Adapters - IndexedDB/Dexie-based service adapters for standalone web app
 */

export { IndexedDBVocabularyAdapter } from "./IndexedDBVocabularyAdapter";
export { IndexedDBCollectionAdapter } from "./IndexedDBCollectionAdapter";
export { IndexedDBPracticeAdapter } from "./IndexedDBPracticeAdapter";
export { IndexedDBLearningSettingsAdapter } from "./IndexedDBLearningSettingsAdapter";
export { IndexedDBCSVAdapter } from "./IndexedDBCSVAdapter";
export { BrowserNotificationAdapter } from "./BrowserNotificationAdapter";
export { NoOpGDriveAdapter } from "./NoOpGDriveAdapter";
export { db, ChamLangDatabase } from "./database";
export * from "./sync";
