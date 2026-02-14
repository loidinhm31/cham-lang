/**
 * GDrive Service
 * Uses platform adapter for cross-platform compatibility
 * Lazy service access + error handling pattern
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
    try {
      const service = getGDriveService();
      return service.isSupported();
    } catch (error) {
      console.error("Error checking GDrive support:", error);
      return false;
    }
  }

  /**
   * Sign in with Google OAuth
   */
  static async signIn(): Promise<GoogleAuthResponse> {
    try {
      const service = getGDriveService();
      return await service.signIn();
    } catch (error) {
      console.error("Error signing in to GDrive:", error);
      throw GdriveService.handleError(error);
    }
  }

  /**
   * Sign out from Google
   */
  static async signOut(): Promise<void> {
    try {
      const service = getGDriveService();
      await service.signOut();
    } catch (error) {
      console.error("Error signing out from GDrive:", error);
      throw GdriveService.handleError(error);
    }
  }

  /**
   * Refresh the access token
   */
  static async refreshToken(): Promise<GoogleAuthResponse> {
    try {
      const service = getGDriveService();
      return await service.refreshToken();
    } catch (error) {
      console.error("Error refreshing GDrive token:", error);
      throw GdriveService.handleError(error);
    }
  }

  /**
   * Backup database to Google Drive
   */
  static async backupToGDrive(accessToken: string): Promise<string> {
    try {
      const service = getGDriveService();
      return await service.backupToGDrive(accessToken);
    } catch (error) {
      console.error("Error backing up to GDrive:", error);
      throw GdriveService.handleError(error);
    }
  }

  /**
   * Restore database from Google Drive
   */
  static async restoreFromGDrive(accessToken: string): Promise<string> {
    try {
      const service = getGDriveService();
      return await service.restoreFromGDrive(accessToken);
    } catch (error) {
      console.error("Error restoring from GDrive:", error);
      throw GdriveService.handleError(error);
    }
  }

  /**
   * Get backup information from Google Drive
   */
  static async getBackupInfo(accessToken: string): Promise<BackupInfo | null> {
    try {
      const service = getGDriveService();
      return await service.getBackupInfo(accessToken);
    } catch (error) {
      console.error("Error getting backup info:", error);
      return null;
    }
  }

  /**
   * Clear local database
   */
  static async clearLocalDatabase(): Promise<string> {
    try {
      const service = getGDriveService();
      return await service.clearLocalDatabase();
    } catch (error) {
      console.error("Error clearing local database:", error);
      throw GdriveService.handleError(error);
    }
  }

  /**
   * Check if remote version differs from local
   */
  static async checkVersionDifference(accessToken: string): Promise<boolean> {
    try {
      const service = getGDriveService();
      return await service.checkVersionDifference(accessToken);
    } catch (error) {
      console.error("Error checking version difference:", error);
      return false;
    }
  }

  private static handleError(error: unknown): Error {
    if (typeof error === "string") return new Error(error);
    return error instanceof Error ? error : new Error("Unknown error occurred");
  }
}
