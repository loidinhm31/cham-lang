/**
 * Service Factory
 * Returns the correct service implementation based on platform detection
 */

import { isOpenedFromDesktop, isTauri } from "@cham-lang/ui/utils";

// Interfaces
import type {
  IAuthService,
  ICollectionService,
  ICSVService,
  IGDriveService,
  ILearningSettingsService,
  INotificationService,
  IPracticeService,
  ISyncService,
  IVocabularyService,
} from "@cham-lang/ui/adapters/factory/interfaces";

// Tauri Adapters
// Sync & Auth Adapters
import {
  TauriAuthAdapter,
  TauriCollectionAdapter,
  TauriCSVAdapter,
  TauriGDriveAdapter,
  TauriLearningSettingsAdapter,
  TauriNotificationAdapter,
  TauriPracticeAdapter,
  TauriSyncAdapter,
  TauriVocabularyAdapter,
} from "@cham-lang/ui/adapters/tauri";

// HTTP Adapters (communicate with desktop SQLite backend via HTTP)
import {
  HttpCollectionAdapter,
  HttpCSVAdapter,
  HttpGDriveAdapter,
  HttpLearningSettingsAdapter,
  HttpNotificationAdapter,
  HttpPracticeAdapter,
  HttpVocabularyAdapter,
} from "@cham-lang/ui/adapters/http";

// IndexedDB Adapters (standalone web app)
import {
  BrowserNotificationAdapter,
  IndexedDBCollectionAdapter,
  IndexedDBCSVAdapter,
  IndexedDBLearningSettingsAdapter,
  IndexedDBPracticeAdapter,
  IndexedDBSyncAdapter,
  IndexedDBVocabularyAdapter,
  NoOpGDriveAdapter,
} from "@cham-lang/ui/adapters/web";
import { env } from "@cham-lang/shared/utils";
import { QmServerAuthAdapter } from "@cham-lang/ui/adapters/shared";

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
    else {
      collectionService = new IndexedDBCollectionAdapter();
    }
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
    else {
      csvService = new IndexedDBCSVAdapter();
    }
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
