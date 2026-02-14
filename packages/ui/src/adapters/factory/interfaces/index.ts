/**
 * Adapter Interfaces - Export all service interfaces
 */

export type { IVocabularyService } from "./IVocabularyService";
export type { ICollectionService } from "./ICollectionService";
export type { IPracticeService } from "./IPracticeService";
export type {
  ILearningSettingsService,
  UpdateLearningSettingsRequest,
} from "./ILearningSettingsService";
export type {
  INotificationService,
  DailyReminderRequest,
  ScheduleNotificationRequest,
} from "./INotificationService";
export type {
  ICSVService,
  ExportCSVRequest,
  ImportCSVRequest,
  SimpleImportRequest,
  ImportResult,
} from "./ICSVService";
export type {
  IGDriveService,
  GoogleAuthResponse,
  BackupInfo,
  VersionMetadata,
} from "./IGDriveService";
export type { ISyncService } from "./ISyncService";
export type { IAuthService, RequiredSyncConfig } from "./IAuthService";
