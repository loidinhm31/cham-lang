/**
 * Tauri Google Drive Adapter
 * Implements IGDriveService using Tauri OAuth plugin for authentication
 * and IndexedDB (Dexie) for data backup/restore
 *
 * Note: Uses native OAuth plugin for refresh token support, but backs up
 * IndexedDB data (not SQLite) since all platforms now use IndexedDB.
 */

import {
  signIn as tauriSignIn,
  signOut as tauriSignOut,
  refreshToken as tauriRefreshToken,
} from "@choochmeque/tauri-plugin-google-auth-api";
import {
  BackupInfo,
  GoogleAuthResponse,
  IGDriveService,
} from "@cham-lang/ui/adapters/factory/interfaces";
import {
  exportDatabaseToJSON,
  importDatabaseFromJSON,
  clearAllTables,
  validateBackup,
  type ChamLangBackup,
} from "@cham-lang/ui/adapters/web";

// OAuth configuration from environment
const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET =
  (import.meta as any).env.VITE_GOOGLE_CLIENT_SECRET || "";

// Google Drive API endpoints
const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

// Backup file name (JSON format for IndexedDB data)
const BACKUP_FILE_NAME = "chamlang_backup.json";
const BACKUP_MIME_TYPE = "application/json";

// Google Drive app data folder (private to this app)
const APP_DATA_FOLDER = "appDataFolder";

/**
 * Success HTML for OAuth popup
 */
const SUCCESS_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In Successful</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh; padding: 20px;
        }
        .container {
            background: white; border-radius: 16px; padding: 48px 40px;
            text-align: center; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 400px; width: 100%;
        }
        .checkmark {
            width: 80px; height: 80px; border-radius: 50%;
            background: #10b981; margin: 0 auto 24px;
            display: flex; align-items: center; justify-content: center;
        }
        .checkmark svg { width: 48px; height: 48px; stroke: white; stroke-width: 3; fill: none; }
        h1 { color: #1f2937; font-size: 28px; font-weight: 700; margin-bottom: 12px; }
        p { color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 16px; }
        .close-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; border: none; border-radius: 8px;
            padding: 14px 32px; font-size: 16px; font-weight: 600;
            cursor: pointer; width: 100%;
        }
        .brand { font-size: 18px; font-weight: 700; color: #667eea; margin-top: 24px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="checkmark"><svg viewBox="0 0 52 52"><polyline points="14,26 22,34 38,18"/></svg></div>
        <h1>Sign In Successful!</h1>
        <p>You can close this window and return to the app.</p>
        <button class="close-btn" onclick="window.close()">Close Window</button>
        <div class="brand">Cham Lang</div>
    </div>
    <script>setTimeout(() => window.close(), 5000);</script>
</body>
</html>
`;

export class TauriGDriveAdapter implements IGDriveService {
  /**
   * Sign in with Google OAuth using Tauri plugin
   */
  async signIn(): Promise<GoogleAuthResponse> {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error(
        "Google OAuth is not configured. Please set VITE_GOOGLE_CLIENT_ID.",
      );
    }

    const response = await tauriSignIn({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      scopes: [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive.appdata",
      ],
      successHtmlResponse: SUCCESS_HTML,
    });

    let email: string | undefined;
    if (response.idToken) {
      try {
        const payload = JSON.parse(atob(response.idToken.split(".")[1]));
        email = payload.email;
      } catch (e) {
        console.error("Failed to parse ID token:", e);
      }
    }

    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      idToken: response.idToken,
      email,
    };
  }

  /**
   * Sign out using Tauri plugin
   */
  async signOut(): Promise<void> {
    await tauriSignOut();
  }

  /**
   * Refresh token using Tauri plugin with fallback to manual refresh
   */
  async refreshToken(): Promise<GoogleAuthResponse> {
    try {
      const response = await tauriRefreshToken();
      return {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        idToken: response.idToken,
      };
    } catch (error) {
      console.error("Plugin refresh failed, trying manual refresh:", error);

      // Fallback to manual refresh
      const storedRefreshToken = localStorage.getItem("gdrive_refresh_token");
      if (storedRefreshToken && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
        const tokenResponse = await fetch(
          "https://oauth2.googleapis.com/token",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: GOOGLE_CLIENT_ID,
              client_secret: GOOGLE_CLIENT_SECRET,
              refresh_token: storedRefreshToken,
              grant_type: "refresh_token",
            }),
          },
        );

        if (!tokenResponse.ok) {
          throw new Error(`Token refresh failed: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        return {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
        };
      }
      throw error;
    }
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
   * Backup IndexedDB database to Google Drive as JSON
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
   * Restore IndexedDB database from Google Drive JSON backup
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
   */
  async checkVersionDifference(accessToken: string): Promise<boolean> {
    try {
      const backupInfo = await this.getBackupInfo(accessToken);
      // If no backup exists, there's no difference to sync
      if (!backupInfo) {
        return false;
      }
      // For now, just indicate if a backup exists
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear local IndexedDB database
   */
  async clearLocalDatabase(): Promise<string> {
    await clearAllTables();
    return "Local database cleared successfully";
  }

  /**
   * Tauri supports Google Drive sync when configured
   */
  isSupported(): boolean {
    return !!GOOGLE_CLIENT_ID;
  }
}
