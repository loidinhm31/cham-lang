/**
 * Adapters - Main export file
 */

// Interfaces
export type { IVocabularyService } from "./interfaces/IVocabularyService";
export type { ICollectionService } from "./interfaces/ICollectionService";
export type { IPracticeService } from "./interfaces/IPracticeService";
export type {
  ILearningSettingsService,
  UpdateLearningSettingsRequest,
} from "./interfaces/ILearningSettingsService";
export type {
  INotificationService,
  DailyReminderRequest,
  ScheduleNotificationRequest,
} from "./interfaces/INotificationService";
export type {
  ICSVService,
  ExportCSVRequest,
  ImportCSVRequest,
  SimpleImportRequest,
  ImportResult,
} from "./interfaces/ICSVService";

// Service Factory
export {
  getVocabularyService,
  getCollectionService,
  getPracticeService,
  getLearningSettingsService,
  getNotificationService,
  getCSVService,
  getAllServices,
  resetServices,
} from "./ServiceFactory";
