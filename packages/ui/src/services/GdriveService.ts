/**
 * GDrive Service
 * Direct passthrough to the platform adapter via ServiceFactory
 */

import {
  getGDriveService,
  type GoogleAuthResponse,
  type BackupInfo,
} from "@cham-lang/ui/adapters";

export class GdriveService {
  /**
   * Check if Google Drive sync is supported on this platform
   */
  static isSupported(): boolean {
    return getGDriveService().isSupported();
  }

  /**
   * Sign in with Google OAuth
   */
  static async signIn(): Promise<GoogleAuthResponse> {
    return getGDriveService().signIn();
  }

  /**
   * Sign out from Google
   */
  static async signOut(): Promise<void> {
    return getGDriveService().signOut();
  }

  /**
   * Refresh the access token
   */
  static async refreshToken(): Promise<GoogleAuthResponse> {
    return getGDriveService().refreshToken();
  }

  /**
   * Backup database to Google Drive
   */
  static async backupToGDrive(accessToken: string): Promise<string> {
    return getGDriveService().backupToGDrive(accessToken);
  }

  /**
   * Restore database from Google Drive
   */
  static async restoreFromGDrive(accessToken: string): Promise<string> {
    return getGDriveService().restoreFromGDrive(accessToken);
  }

  /**
   * Get backup information from Google Drive
   */
  static async getBackupInfo(accessToken: string): Promise<BackupInfo | null> {
    return getGDriveService().getBackupInfo(accessToken);
  }

  /**
   * Clear local database
   */
  static async clearLocalDatabase(): Promise<string> {
    return getGDriveService().clearLocalDatabase();
  }

  /**
   * Check if remote version differs from local
   */
  static async checkVersionDifference(accessToken: string): Promise<boolean> {
    return getGDriveService().checkVersionDifference(accessToken);
  }
}
