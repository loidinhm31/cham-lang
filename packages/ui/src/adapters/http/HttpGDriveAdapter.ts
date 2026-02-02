/**
 * HTTP Google Drive Adapter (Stub)
 * Google Drive sync is desktop-only, not supported in web browser mode
 */

import type {
  IGDriveService,
  GoogleAuthResponse,
  BackupInfo,
} from "@cham-lang/shared/services";

export class HttpGDriveAdapter implements IGDriveService {
  isSupported(): boolean {
    return false;
  }

  async signIn(): Promise<GoogleAuthResponse> {
    throw new Error(
      "Google Drive auth is not supported in browser mode. Please use the desktop app.",
    );
  }

  async signOut(): Promise<void> {
    throw new Error(
      "Google Drive auth is not supported in browser mode. Please use the desktop app.",
    );
  }

  async refreshToken(): Promise<GoogleAuthResponse> {
    throw new Error(
      "Google Drive auth is not supported in browser mode. Please use the desktop app.",
    );
  }

  async backupToGDrive(_accessToken: string): Promise<string> {
    throw new Error(
      "Google Drive backup is not supported in browser mode. Please use the desktop app.",
    );
  }

  async restoreFromGDrive(_accessToken: string): Promise<string> {
    throw new Error(
      "Google Drive restore is not supported in browser mode. Please use the desktop app.",
    );
  }

  async getBackupInfo(_accessToken: string): Promise<BackupInfo | null> {
    throw new Error(
      "Google Drive info is not supported in browser mode. Please use the desktop app.",
    );
  }

  async checkVersionDifference(_accessToken: string): Promise<boolean> {
    throw new Error(
      "Version check is not supported in browser mode. Please use the desktop app.",
    );
  }

  async clearLocalDatabase(): Promise<string> {
    throw new Error(
      "Database clear is not supported in browser mode. Please use the desktop app.",
    );
  }
}
