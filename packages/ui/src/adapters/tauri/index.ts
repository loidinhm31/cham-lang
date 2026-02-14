/**
 * Tauri Adapters - Platform-specific adapters for Tauri desktop/mobile
 *
 * These adapters provide platform-specific functionality that requires native access:
 * - TauriGDriveAdapter: Native Google OAuth for Google Drive backup
 * - TauriNotificationAdapter: Native OS notifications
 *
 * Note: Data storage now uses IndexedDB on all platforms (see web/IndexedDB* adapters).
 */

export { TauriNotificationAdapter } from "./TauriNotificationAdapter";
export { TauriGDriveAdapter } from "./TauriGDriveAdapter";
