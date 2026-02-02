import type {
  IGDriveService,
  GoogleAuthResponse,
  BackupInfo,
} from "@cham-lang/shared/services";

/**
 * No-op Google Drive adapter for standalone web mode.
 * GDrive sync requires Tauri OAuth plugin and is not available in browser.
 */
export class NoOpGDriveAdapter implements IGDriveService {
  async signIn(): Promise<GoogleAuthResponse> {
    throw new Error(
      "Google Drive sync is not available in standalone web mode. Use the desktop app for cloud backup.",
    );
  }

  async signOut(): Promise<void> {
    // No-op
  }

  async refreshToken(): Promise<GoogleAuthResponse> {
    throw new Error(
      "Google Drive sync is not available in standalone web mode",
    );
  }

  async backupToGDrive(_accessToken: string): Promise<string> {
    throw new Error(
      "Google Drive sync is not available in standalone web mode",
    );
  }

  async restoreFromGDrive(_accessToken: string): Promise<string> {
    throw new Error(
      "Google Drive sync is not available in standalone web mode",
    );
  }

  async getBackupInfo(_accessToken: string): Promise<BackupInfo | null> {
    return null;
  }

  async checkVersionDifference(_accessToken: string): Promise<boolean> {
    return false;
  }

  async clearLocalDatabase(): Promise<string> {
    // Could clear IndexedDB here if needed
    return "Not supported in web mode";
  }

  isSupported(): boolean {
    return false;
  }
}
