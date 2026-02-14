/**
 * Web Google Drive Adapter
 * Implements IGDriveService using Google Identity Services (GIS) for browser OAuth
 * and exports/imports IndexedDB data as JSON for backup
 */

import type {
  IGDriveService,
  GoogleAuthResponse,
  BackupInfo,
} from "@cham-lang/ui/adapters/factory/interfaces";
import {
  exportDatabaseToJSON,
  importDatabaseFromJSON,
  clearAllTables,
  validateBackup,
  type ChamLangBackup,
} from "./dexieBackupUtils";

// OAuth configuration from environment
const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || "";

// Google Drive API endpoints
const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

// Backup file name for web mode
const BACKUP_FILE_NAME = "chamlang_backup.json";
const BACKUP_MIME_TYPE = "application/json";

// Google Drive app data folder (private to this app)
const APP_DATA_FOLDER = "appDataFolder";

/**
 * Google Identity Services token client interface
 */
interface TokenClient {
  requestAccessToken(options?: { prompt?: string }): void;
  callback: (response: TokenResponse) => void;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
}

/**
 * Load Google Identity Services library dynamically
 */
function loadGISLibrary(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () =>
        reject(new Error("Failed to load Google Identity Services")),
      );
      return;
    }

    // Load the script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

/**
 * Web Google Drive Adapter
 * Uses Google Identity Services for OAuth and Google Drive API for backup/restore
 */
export class WebGDriveAdapter implements IGDriveService {
  private tokenClient: TokenClient | null = null;

  /**
   * Initialize the GIS token client
   */
  private async initializeTokenClient(): Promise<TokenClient> {
    if (this.tokenClient) {
      return this.tokenClient;
    }

    await loadGISLibrary();

    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      throw new Error("Google Identity Services not loaded");
    }

    // Create a placeholder callback - will be replaced during signIn
    const tokenClient: TokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.appdata",
      ].join(" "),
      callback: () => {}, // Will be replaced
    });

    this.tokenClient = tokenClient;
    return tokenClient;
  }

  /**
   * Sign in with Google OAuth using GIS popup flow
   */
  async signIn(): Promise<GoogleAuthResponse> {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error(
        "Google OAuth is not configured. Please set VITE_GOOGLE_CLIENT_ID.",
      );
    }

    const tokenClient = await this.initializeTokenClient();

    return new Promise((resolve, reject) => {
      tokenClient.callback = async (response: TokenResponse) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }

        try {
          // Fetch user info to get email
          const userInfoResponse = await fetch(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            {
              headers: {
                Authorization: `Bearer ${response.access_token}`,
              },
            },
          );

          let email: string | undefined;
          if (userInfoResponse.ok) {
            const userInfo = await userInfoResponse.json();
            email = userInfo.email;
          }

          // Store access token in localStorage for session persistence
          localStorage.setItem("gdrive_access_token", response.access_token);
          localStorage.setItem(
            "gdrive_token_expiry",
            String(Date.now() + response.expires_in * 1000),
          );
          if (email) {
            localStorage.setItem("gdrive_email", email);
          }

          resolve({
            accessToken: response.access_token,
            // Note: GIS doesn't provide refresh tokens in browser flow
            // User will need to re-authenticate when token expires
            email,
          });
        } catch (error) {
          reject(error);
        }
      };

      // Request access token (opens Google sign-in popup)
      tokenClient.requestAccessToken({ prompt: "consent" });
    });
  }

  /**
   * Sign out from Google
   */
  async signOut(): Promise<void> {
    const accessToken = localStorage.getItem("gdrive_access_token");

    // Revoke the token if we have one
    if (accessToken) {
      try {
        const google = (window as any).google;
        if (google?.accounts?.oauth2?.revoke) {
          google.accounts.oauth2.revoke(accessToken);
        }
      } catch (error) {
        console.error("Error revoking token:", error);
      }
    }

    // Clear stored tokens
    localStorage.removeItem("gdrive_access_token");
    localStorage.removeItem("gdrive_token_expiry");
    localStorage.removeItem("gdrive_email");
  }

  /**
   * Refresh the access token
   * Note: GIS browser flow doesn't support refresh tokens, so we need to re-authenticate
   */
  async refreshToken(): Promise<GoogleAuthResponse> {
    // Check if existing token is still valid
    const expiry = localStorage.getItem("gdrive_token_expiry");
    const accessToken = localStorage.getItem("gdrive_access_token");

    if (accessToken && expiry && Date.now() < parseInt(expiry, 10)) {
      return {
        accessToken,
        email: localStorage.getItem("gdrive_email") || undefined,
      };
    }

    // Token expired, need to re-authenticate
    // Try silent refresh first using prompt: '' (no prompt)
    const tokenClient = await this.initializeTokenClient();

    return new Promise((resolve, reject) => {
      tokenClient.callback = async (response: TokenResponse) => {
        if (response.error) {
          // Silent refresh failed, user needs to sign in again
          reject(
            new Error(
              "Session expired. Please sign in again with Google Drive.",
            ),
          );
          return;
        }

        try {
          const email = localStorage.getItem("gdrive_email") || undefined;

          localStorage.setItem("gdrive_access_token", response.access_token);
          localStorage.setItem(
            "gdrive_token_expiry",
            String(Date.now() + response.expires_in * 1000),
          );

          resolve({
            accessToken: response.access_token,
            email,
          });
        } catch (error) {
          reject(error);
        }
      };

      // Try silent refresh (no prompt)
      tokenClient.requestAccessToken({ prompt: "" });
    });
  }

  /**
   * Find existing backup file in Google Drive
   */
  private async findBackupFile(
    accessToken: string,
  ): Promise<{ id: string; modifiedTime: string; size: string } | null> {
    const query = encodeURIComponent(
      `name='${BACKUP_FILE_NAME}' and '${APP_DATA_FOLDER}' in parents and trashed=false`,
    );
    const response = await fetch(
      `${DRIVE_API_BASE}/files?spaces=${APP_DATA_FOLDER}&q=${query}&fields=files(id,name,modifiedTime,size)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to search Google Drive");
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  }

  /**
   * Backup database to Google Drive
   */
  async backupToGDrive(accessToken: string): Promise<string> {
    // Export database to JSON
    const backup = await exportDatabaseToJSON();
    const backupJSON = JSON.stringify(backup, null, 2);
    const blob = new Blob([backupJSON], { type: BACKUP_MIME_TYPE });

    // Check if backup file already exists
    const existingFile = await this.findBackupFile(accessToken);

    let response: Response;

    if (existingFile) {
      // Update existing file
      response = await fetch(
        `${DRIVE_UPLOAD_API}/files/${existingFile.id}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": BACKUP_MIME_TYPE,
          },
          body: blob,
        },
      );
    } else {
      // Create new file in appDataFolder
      const metadata = {
        name: BACKUP_FILE_NAME,
        mimeType: BACKUP_MIME_TYPE,
        parents: [APP_DATA_FOLDER],
      };

      const formData = new FormData();
      formData.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" }),
      );
      formData.append("file", blob);

      response = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error?.message || "Failed to upload backup to Google Drive",
      );
    }

    const result = await response.json();
    return `Backup successful! File: ${result.name}`;
  }

  /**
   * Restore database from Google Drive
   */
  async restoreFromGDrive(accessToken: string): Promise<string> {
    // Find backup file
    const backupFile = await this.findBackupFile(accessToken);

    if (!backupFile) {
      throw new Error(
        "No backup found in Google Drive. Please create a backup first.",
      );
    }

    // Download file content
    const response = await fetch(
      `${DRIVE_API_BASE}/files/${backupFile.id}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.error?.message || "Failed to download backup from Google Drive",
      );
    }

    const backupData = await response.json();

    // Validate backup structure
    if (!validateBackup(backupData)) {
      throw new Error(
        "Invalid backup format. The backup file may be corrupted.",
      );
    }

    // Import into database
    await importDatabaseFromJSON(backupData as ChamLangBackup);

    const stats = (backupData as ChamLangBackup).tables;
    const vocabCount = stats.vocabularies.length;
    const collectionCount = stats.collections.length;

    return `Restore successful! Restored ${vocabCount} vocabularies and ${collectionCount} collections.`;
  }

  /**
   * Get backup information from Google Drive
   */
  async getBackupInfo(accessToken: string): Promise<BackupInfo | null> {
    try {
      const backupFile = await this.findBackupFile(accessToken);

      if (!backupFile) {
        return null;
      }

      // Format the modified time
      const modifiedDate = new Date(backupFile.modifiedTime);
      const formattedTime = modifiedDate.toLocaleString();

      // Convert size to KB
      const sizeKB = Math.round(parseInt(backupFile.size, 10) / 1024);

      return {
        fileName: BACKUP_FILE_NAME,
        modifiedTime: formattedTime,
        sizeKB,
      };
    } catch (error) {
      console.error("Failed to get backup info:", error);
      return null;
    }
  }

  /**
   * Check if remote version differs from local
   * For web, we compare the backup timestamp with local data
   */
  async checkVersionDifference(accessToken: string): Promise<boolean> {
    try {
      const backupInfo = await this.getBackupInfo(accessToken);
      // If no backup exists, there's no difference to sync
      if (!backupInfo) {
        return false;
      }
      // For now, just indicate if a backup exists
      // More sophisticated version checking could be implemented
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear local database
   */
  async clearLocalDatabase(): Promise<string> {
    await clearAllTables();
    return "Local database cleared successfully";
  }

  /**
   * Check if this platform supports Google Drive sync
   */
  isSupported(): boolean {
    return !!GOOGLE_CLIENT_ID;
  }
}
