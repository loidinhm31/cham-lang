/**
 * Service Factory
 * Returns the correct service implementation based on platform detection
 */

import { isTauri, isOpenedFromDesktop } from "@cham-lang/ui/utils";

// Interfaces
import type { IVocabularyService } from "./interfaces";
import type { ICollectionService } from "./interfaces";
import type { IPracticeService } from "./interfaces";
import type { ILearningSettingsService } from "./interfaces";
import type { INotificationService } from "./interfaces";
import type { ICSVService } from "./interfaces";
import type { IGDriveService } from "./interfaces";
import type { ISyncService } from "./interfaces";
import type { IAuthService } from "./interfaces";

// Tauri Adapters
import { TauriVocabularyAdapter } from "../tauri/TauriVocabularyAdapter";
import { TauriCollectionAdapter } from "../tauri/TauriCollectionAdapter";
import { TauriPracticeAdapter } from "../tauri/TauriPracticeAdapter";
import { TauriLearningSettingsAdapter } from "../tauri/TauriLearningSettingsAdapter";
import { TauriNotificationAdapter } from "../tauri/TauriNotificationAdapter";
import { TauriCSVAdapter } from "../tauri/TauriCSVAdapter";
import { TauriGDriveAdapter } from "../tauri/TauriGDriveAdapter";

// HTTP Adapters (communicate with desktop SQLite backend via HTTP)
import { HttpVocabularyAdapter } from "../http/HttpVocabularyAdapter";
import { HttpCollectionAdapter } from "../http/HttpCollectionAdapter";
import { HttpPracticeAdapter } from "../http/HttpPracticeAdapter";
import { HttpLearningSettingsAdapter } from "../http/HttpLearningSettingsAdapter";
import { HttpNotificationAdapter } from "../http/HttpNotificationAdapter";
import { HttpCSVAdapter } from "../http/HttpCSVAdapter";
import { HttpGDriveAdapter } from "../http/HttpGDriveAdapter";

// IndexedDB Adapters (standalone web app)
import { IndexedDBVocabularyAdapter } from "../web/IndexedDBVocabularyAdapter";
import { IndexedDBCollectionAdapter } from "../web/IndexedDBCollectionAdapter";
import { IndexedDBPracticeAdapter } from "../web/IndexedDBPracticeAdapter";
import { IndexedDBLearningSettingsAdapter } from "../web/IndexedDBLearningSettingsAdapter";
import { IndexedDBCSVAdapter } from "../web/IndexedDBCSVAdapter";
import { BrowserNotificationAdapter } from "../web/BrowserNotificationAdapter";
import { NoOpGDriveAdapter } from "../web/NoOpGDriveAdapter";

// Sync & Auth Adapters
import { TauriSyncAdapter } from "../tauri/TauriSyncAdapter";
import { TauriAuthAdapter } from "../tauri/TauriAuthAdapter";
import { IndexedDBSyncAdapter } from "../web/sync/IndexedDBSyncAdapter";
import { QmServerAuthAdapter } from "../shared/QmServerAuthAdapter";
import { env } from "@cham-lang/shared/utils";

// Singleton instances (lazy initialized)
let vocabularyService: IVocabularyService | null = null;
let collectionService: ICollectionService | null = null;
let practiceService: IPracticeService | null = null;
let learningSettingsService: ILearningSettingsService | null = null;
let notificationService: INotificationService | null = null;
let csvService: ICSVService | null = null;
let gdriveService: IGDriveService | null = null;
let syncService: ISyncService | null = null;
let authService: IAuthService | null = null;

/**
 * Determine which adapter set to use:
 * - "tauri": Running in Tauri webview (native desktop/mobile)
 * - "http": Browser opened from desktop app (HTTP to embedded Axum server)
 * - "indexeddb": Standalone web app (IndexedDB/Dexie for local storage)
 */
const getAdapterType = (): "tauri" | "http" | "indexeddb" => {
  if (isTauri()) return "tauri";
  if (isOpenedFromDesktop()) return "http";
  return "indexeddb";
};

/**
 * Get the Vocabulary Service for the current platform
 */
export const getVocabularyService = (): IVocabularyService => {
  if (!vocabularyService) {
    const type = getAdapterType();
    if (type === "tauri") vocabularyService = new TauriVocabularyAdapter();
    else if (type === "http") vocabularyService = new HttpVocabularyAdapter();
    else vocabularyService = new IndexedDBVocabularyAdapter();
  }
  return vocabularyService;
};

/**
 * Get the Collection Service for the current platform
 */
export const getCollectionService = (): ICollectionService => {
  if (!collectionService) {
    const type = getAdapterType();
    if (type === "tauri") collectionService = new TauriCollectionAdapter();
    else if (type === "http") collectionService = new HttpCollectionAdapter();
    else collectionService = new IndexedDBCollectionAdapter();
  }
  return collectionService;
};

/**
 * Get the Practice Service for the current platform
 */
export const getPracticeService = (): IPracticeService => {
  if (!practiceService) {
    const type = getAdapterType();
    if (type === "tauri") practiceService = new TauriPracticeAdapter();
    else if (type === "http") practiceService = new HttpPracticeAdapter();
    else practiceService = new IndexedDBPracticeAdapter();
  }
  return practiceService;
};

/**
 * Get the Learning Settings Service for the current platform
 */
export const getLearningSettingsService = (): ILearningSettingsService => {
  if (!learningSettingsService) {
    const type = getAdapterType();
    if (type === "tauri")
      learningSettingsService = new TauriLearningSettingsAdapter();
    else if (type === "http")
      learningSettingsService = new HttpLearningSettingsAdapter();
    else learningSettingsService = new IndexedDBLearningSettingsAdapter();
  }
  return learningSettingsService;
};

/**
 * Get the Notification Service for the current platform
 */
export const getNotificationService = (): INotificationService => {
  if (!notificationService) {
    const type = getAdapterType();
    if (type === "tauri") notificationService = new TauriNotificationAdapter();
    else if (type === "http")
      notificationService = new HttpNotificationAdapter();
    else notificationService = new BrowserNotificationAdapter();
  }
  return notificationService;
};

/**
 * Get the CSV Service for the current platform
 */
export const getCSVService = (): ICSVService => {
  if (!csvService) {
    const type = getAdapterType();
    if (type === "tauri") csvService = new TauriCSVAdapter();
    else if (type === "http") csvService = new HttpCSVAdapter();
    else csvService = new IndexedDBCSVAdapter();
  }
  return csvService;
};

/**
 * Get the Google Drive Service for the current platform
 */
export const getGDriveService = (): IGDriveService => {
  if (!gdriveService) {
    const type = getAdapterType();
    if (type === "tauri") gdriveService = new TauriGDriveAdapter();
    else if (type === "http") gdriveService = new HttpGDriveAdapter();
    else gdriveService = new NoOpGDriveAdapter();
  }
  return gdriveService;
};

/**
 * Get the Auth Service for the current platform
 */
export const getAuthService = (): IAuthService => {
  if (!authService) {
    const type = getAdapterType();
    if (type === "tauri") authService = new TauriAuthAdapter();
    else authService = new QmServerAuthAdapter();
  }
  return authService;
};

/**
 * Get the Sync Service for the current platform
 */
export const getSyncService = (): ISyncService => {
  if (!syncService) {
    const type = getAdapterType();
    if (type === "tauri") {
      syncService = new TauriSyncAdapter();
    } else {
      // For web (indexeddb and http), use IndexedDB sync with auth token provider
      const auth = getAuthService();
      syncService = new IndexedDBSyncAdapter({
        serverUrl: env.serverUrl,
        appId: env.appId,
        apiKey: env.apiKey,
        getTokens: () => auth.getTokens(),
        saveTokens: auth.saveTokensExternal
          ? (a, r, u) => auth.saveTokensExternal!(a, r, u)
          : undefined,
      });
    }
  }
  return syncService;
};

/**
 * Get all services as an object (useful for context providers)
 */
export const getAllServices = () => ({
  vocabulary: getVocabularyService(),
  collection: getCollectionService(),
  practice: getPracticeService(),
  learningSettings: getLearningSettingsService(),
  notification: getNotificationService(),
  csv: getCSVService(),
  gdrive: getGDriveService(),
  sync: getSyncService(),
  auth: getAuthService(),
});

/**
 * Reset all service instances (useful for testing)
 */
export const resetServices = (): void => {
  vocabularyService = null;
  collectionService = null;
  practiceService = null;
  learningSettingsService = null;
  notificationService = null;
  csvService = null;
  gdriveService = null;
  syncService = null;
  authService = null;
};
