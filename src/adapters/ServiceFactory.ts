/**
 * Service Factory
 * Returns the correct service implementation based on platform detection
 */

import { isTauri } from "@/utils/platform";

// Interfaces
import type { IVocabularyService } from "./interfaces/IVocabularyService";
import type { ICollectionService } from "./interfaces/ICollectionService";
import type { IPracticeService } from "./interfaces/IPracticeService";
import type { ILearningSettingsService } from "./interfaces/ILearningSettingsService";
import type { INotificationService } from "./interfaces/INotificationService";
import type { ICSVService } from "./interfaces/ICSVService";
import type { IGDriveService } from "./interfaces/IGDriveService";

// Tauri Adapters
import { TauriVocabularyAdapter } from "./tauri/TauriVocabularyAdapter";
import { TauriCollectionAdapter } from "./tauri/TauriCollectionAdapter";
import { TauriPracticeAdapter } from "./tauri/TauriPracticeAdapter";
import { TauriLearningSettingsAdapter } from "./tauri/TauriLearningSettingsAdapter";
import { TauriNotificationAdapter } from "./tauri/TauriNotificationAdapter";
import { TauriCSVAdapter } from "./tauri/TauriCSVAdapter";
import { TauriGDriveAdapter } from "./tauri/TauriGDriveAdapter";

// Web Adapters
import { WebVocabularyAdapter } from "./web/WebVocabularyAdapter";
import { WebCollectionAdapter } from "./web/WebCollectionAdapter";
import { WebPracticeAdapter } from "./web/WebPracticeAdapter";
import { WebLearningSettingsAdapter } from "./web/WebLearningSettingsAdapter";
import { WebNotificationAdapter } from "./web/WebNotificationAdapter";
import { WebCSVAdapter } from "./web/WebCSVAdapter";
import { WebGDriveAdapter } from "./web/WebGDriveAdapter";

// Singleton instances (lazy initialized)
let vocabularyService: IVocabularyService | null = null;
let collectionService: ICollectionService | null = null;
let practiceService: IPracticeService | null = null;
let learningSettingsService: ILearningSettingsService | null = null;
let notificationService: INotificationService | null = null;
let csvService: ICSVService | null = null;
let gdriveService: IGDriveService | null = null;

/**
 * Get the Vocabulary Service for the current platform
 */
export const getVocabularyService = (): IVocabularyService => {
  if (!vocabularyService) {
    vocabularyService = isTauri()
      ? new TauriVocabularyAdapter()
      : new WebVocabularyAdapter();
  }
  return vocabularyService;
};

/**
 * Get the Collection Service for the current platform
 */
export const getCollectionService = (): ICollectionService => {
  if (!collectionService) {
    collectionService = isTauri()
      ? new TauriCollectionAdapter()
      : new WebCollectionAdapter();
  }
  return collectionService;
};

/**
 * Get the Practice Service for the current platform
 */
export const getPracticeService = (): IPracticeService => {
  if (!practiceService) {
    practiceService = isTauri()
      ? new TauriPracticeAdapter()
      : new WebPracticeAdapter();
  }
  return practiceService;
};

/**
 * Get the Learning Settings Service for the current platform
 */
export const getLearningSettingsService = (): ILearningSettingsService => {
  if (!learningSettingsService) {
    learningSettingsService = isTauri()
      ? new TauriLearningSettingsAdapter()
      : new WebLearningSettingsAdapter();
  }
  return learningSettingsService;
};

/**
 * Get the Notification Service for the current platform
 */
export const getNotificationService = (): INotificationService => {
  if (!notificationService) {
    notificationService = isTauri()
      ? new TauriNotificationAdapter()
      : new WebNotificationAdapter();
  }
  return notificationService;
};

/**
 * Get the CSV Service for the current platform
 */
export const getCSVService = (): ICSVService => {
  if (!csvService) {
    csvService = isTauri() ? new TauriCSVAdapter() : new WebCSVAdapter();
  }
  return csvService;
};

/**
 * Get the Google Drive Service for the current platform
 */
export const getGDriveService = (): IGDriveService => {
  if (!gdriveService) {
    gdriveService = isTauri()
      ? new TauriGDriveAdapter()
      : new WebGDriveAdapter();
  }
  return gdriveService;
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
};
