/**
 * Service Factory
 * Uses setter/getter pattern for service initialization
 *
 * ARCHITECTURE:
 * - Services are set externally via setters (e.g., in ChamLangApp.tsx)
 * - Getters throw if service not initialized (enforces explicit setup)
 * - Platform-specific adapters: GDrive (native OAuth), Notifications (native)
 * - All data storage uses IndexedDB adapters across all platforms
 */

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
import { serviceLogger } from "@cham-lang/ui/utils";

// Singleton instances (set via setters)
let vocabularyService: IVocabularyService | null = null;
let collectionService: ICollectionService | null = null;
let practiceService: IPracticeService | null = null;
let learningSettingsService: ILearningSettingsService | null = null;
let notificationService: INotificationService | null = null;
let csvService: ICSVService | null = null;
let gdriveService: IGDriveService | null = null;
let syncService: ISyncService | null = null;
let authService: IAuthService | null = null;

// ============= Setters =============

export const setVocabularyService = (service: IVocabularyService): void => {
  vocabularyService = service;
  serviceLogger.factory("Set VocabularyService");
};

export const setCollectionService = (service: ICollectionService): void => {
  collectionService = service;
  serviceLogger.factory("Set CollectionService");
};

export const setPracticeService = (service: IPracticeService): void => {
  practiceService = service;
  serviceLogger.factory("Set PracticeService");
};

export const setLearningSettingsService = (
  service: ILearningSettingsService,
): void => {
  learningSettingsService = service;
  serviceLogger.factory("Set LearningSettingsService");
};

export const setNotificationService = (service: INotificationService): void => {
  notificationService = service;
  serviceLogger.factory("Set NotificationService");
};

export const setCSVService = (service: ICSVService): void => {
  csvService = service;
  serviceLogger.factory("Set CSVService");
};

export const setGDriveService = (service: IGDriveService): void => {
  gdriveService = service;
  serviceLogger.factory("Set GDriveService");
};

export const setSyncService = (service: ISyncService): void => {
  syncService = service;
  serviceLogger.factory("Set SyncService");
};

export const setAuthService = (service: IAuthService): void => {
  authService = service;
  serviceLogger.factory("Set AuthService");
};

// ============= Getters =============

/**
 * Get the Vocabulary Service
 * @throws Error if service not initialized
 */
export const getVocabularyService = (): IVocabularyService => {
  if (!vocabularyService) {
    throw new Error(
      "VocabularyService not initialized. Call setVocabularyService first.",
    );
  }
  return vocabularyService;
};

/**
 * Get the Collection Service
 * @throws Error if service not initialized
 */
export const getCollectionService = (): ICollectionService => {
  if (!collectionService) {
    throw new Error(
      "CollectionService not initialized. Call setCollectionService first.",
    );
  }
  return collectionService;
};

/**
 * Get the Practice Service
 * @throws Error if service not initialized
 */
export const getPracticeService = (): IPracticeService => {
  if (!practiceService) {
    throw new Error(
      "PracticeService not initialized. Call setPracticeService first.",
    );
  }
  return practiceService;
};

/**
 * Get the Learning Settings Service
 * @throws Error if service not initialized
 */
export const getLearningSettingsService = (): ILearningSettingsService => {
  if (!learningSettingsService) {
    throw new Error(
      "LearningSettingsService not initialized. Call setLearningSettingsService first.",
    );
  }
  return learningSettingsService;
};

/**
 * Get the Notification Service
 * @throws Error if service not initialized
 */
export const getNotificationService = (): INotificationService => {
  if (!notificationService) {
    throw new Error(
      "NotificationService not initialized. Call setNotificationService first.",
    );
  }
  return notificationService;
};

/**
 * Get the CSV Service
 * @throws Error if service not initialized
 */
export const getCSVService = (): ICSVService => {
  if (!csvService) {
    throw new Error("CSVService not initialized. Call setCSVService first.");
  }
  return csvService;
};

/**
 * Get the Google Drive Service
 * @throws Error if service not initialized
 */
export const getGDriveService = (): IGDriveService => {
  if (!gdriveService) {
    throw new Error(
      "GdriveService not initialized. Call setGDriveService first.",
    );
  }
  return gdriveService;
};

/**
 * Get the Auth Service
 * @throws Error if service not initialized
 */
export const getAuthService = (): IAuthService => {
  if (!authService) {
    throw new Error("AuthService not initialized. Call setAuthService first.");
  }
  return authService;
};

/**
 * Get the Sync Service
 * @throws Error if service not initialized
 */
export const getSyncService = (): ISyncService => {
  if (!syncService) {
    throw new Error("SyncService not initialized. Call setSyncService first.");
  }
  return syncService;
};

export const getSyncServiceOptional = (): ISyncService | null => {
  return syncService;
};

export const getAuthServiceOptional = (): IAuthService | null => {
  return authService;
};

// ============= Utilities =============

/**
 * Get all services as an object (useful for context providers)
 * @throws Error if any required service is not initialized
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
 * Reset all service instances (useful for testing or logout)
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
  serviceLogger.factory("Reset all services");
};
