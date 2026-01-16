/**
 * Google Drive Service Interface
 * Defines the contract for Google Drive backup/restore operations
 */

/**
 * Google OAuth response containing tokens
 */
export interface GoogleAuthResponse {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  email?: string;
}

/**
 * Backup information from Google Drive
 */
export interface BackupInfo {
  fileName: string;
  modifiedTime: string;
  sizeKB: number;
}

/**
 * Version metadata for sync
 */
export interface VersionMetadata {
  version: number;
  lastUpdated: number;
  device: string;
}

/**
 * Google Drive Service Interface
 */
export interface IGDriveService {
  /**
   * Sign in with Google OAuth
   * @returns Google auth response with tokens
   */
  signIn(): Promise<GoogleAuthResponse>;

  /**
   * Sign out from Google
   */
  signOut(): Promise<void>;

  /**
   * Refresh the access token
   * @returns New Google auth response
   */
  refreshToken(): Promise<GoogleAuthResponse>;

  /**
   * Backup database to Google Drive
   * @param accessToken The access token for API calls
   * @returns Success message
   */
  backupToGDrive(accessToken: string): Promise<string>;

  /**
   * Restore database from Google Drive
   * @param accessToken The access token for API calls
   * @returns Success message
   */
  restoreFromGDrive(accessToken: string): Promise<string>;

  /**
   * Get backup information from Google Drive
   * @param accessToken The access token for API calls
   * @returns Backup info or null if not found
   */
  getBackupInfo(accessToken: string): Promise<BackupInfo | null>;

  /**
   * Check if remote version differs from local
   * @param accessToken The access token for API calls
   * @returns True if versions differ
   */
  checkVersionDifference(accessToken: string): Promise<boolean>;

  /**
   * Clear local database
   * @returns Success message
   */
  clearLocalDatabase(): Promise<string>;

  /**
   * Check if this platform supports Google Drive sync
   * @returns True if supported
   */
  isSupported(): boolean;
}
