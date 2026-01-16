/**
 * Web Google Drive Adapter
 * Implements IGDriveService using pure JavaScript with Google Drive REST API
 * for web browsers without Tauri
 */

import type {
  IGDriveService,
  GoogleAuthResponse,
  BackupInfo,
  VersionMetadata,
} from "@/adapters/interfaces";
import { DatabaseMigration, type SQLiteBackupData } from "./DatabaseMigration";
import { db } from "./db";

// OAuth configuration from environment
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || "";

// Google Drive API constants
const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const BACKUP_FILE_NAME = "chamlang_backup_web.json";
const VERSION_FILE_NAME = "chamlang_version_web.json";

// OAuth endpoints
const OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";

// Scopes needed for Google Drive file access
const OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
];

interface DriveFile {
  id: string;
  name?: string;
  modifiedTime?: string;
  size?: string;
}

interface DriveFileList {
  files: DriveFile[];
}

/**
 * Web Google Drive Adapter
 * Uses OAuth popup flow and Google Drive REST API
 */
export class WebGDriveAdapter implements IGDriveService {
  private migration = new DatabaseMigration();

  /**
   * Generate a random state for OAuth
   */
  private generateState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  /**
   * Generate PKCE code verifier
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.base64UrlEncode(array);
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return this.base64UrlEncode(new Uint8Array(hash));
  }

  /**
   * Base64 URL encode
   */
  private base64UrlEncode(array: Uint8Array): string {
    let binary = "";
    array.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  /**
   * Sign in with Google OAuth using popup flow
   */
  async signIn(): Promise<GoogleAuthResponse> {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error(
        "Google OAuth is not configured. Please set VITE_GOOGLE_CLIENT_ID.",
      );
    }

    const state = this.generateState();
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // Store state and verifier for validation
    sessionStorage.setItem("oauth_state", state);
    sessionStorage.setItem("oauth_code_verifier", codeVerifier);

    // Build OAuth URL
    const redirectUri = `${window.location.origin}/oauth/callback`;
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: OAUTH_SCOPES.join(" "),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      access_type: "offline",
      prompt: "consent", // Force consent to get refresh token
    });

    const authUrl = `${OAUTH_AUTHORIZE_URL}?${params.toString()}`;

    // Open popup window
    return new Promise((resolve, reject) => {
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        "Google Sign In",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
      );

      if (!popup) {
        reject(
          new Error("Failed to open popup. Please allow popups for this site."),
        );
        return;
      }

      // Listen for the callback message
      const messageHandler = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data?.type === "oauth_callback") {
          window.removeEventListener("message", messageHandler);
          popup.close();

          const { code, state: returnedState, error } = event.data;

          if (error) {
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          // Validate state
          const savedState = sessionStorage.getItem("oauth_state");
          if (returnedState !== savedState) {
            reject(new Error("Invalid OAuth state"));
            return;
          }

          // Exchange code for tokens
          try {
            const tokens = await this.exchangeCodeForTokens(code, redirectUri);
            resolve(tokens);
          } catch (err) {
            reject(err);
          }
        }
      };

      window.addEventListener("message", messageHandler);

      // Check if popup was closed without completing auth
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", messageHandler);
          reject(new Error("Sign in was cancelled"));
        }
      }, 1000);
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
  ): Promise<GoogleAuthResponse> {
    const codeVerifier = sessionStorage.getItem("oauth_code_verifier");
    if (!codeVerifier) {
      throw new Error("Missing code verifier");
    }

    const body: Record<string, string> = {
      client_id: GOOGLE_CLIENT_ID,
      code: code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    };

    // Include client_secret if available (optional for PKCE flow)
    if (GOOGLE_CLIENT_SECRET) {
      body.client_secret = GOOGLE_CLIENT_SECRET;
    }

    const response = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Token exchange failed: ${errorData.error_description || response.status}`,
      );
    }

    const data = await response.json();

    // Parse email from ID token
    let email: string | undefined;
    if (data.id_token) {
      try {
        const payload = JSON.parse(atob(data.id_token.split(".")[1]));
        email = payload.email;
      } catch (e) {
        console.error("Failed to parse ID token:", e);
      }
    }

    // Clean up
    sessionStorage.removeItem("oauth_state");
    sessionStorage.removeItem("oauth_code_verifier");

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      idToken: data.id_token,
      email,
    };
  }

  /**
   * Sign out - just clear local tokens
   */
  async signOut(): Promise<void> {
    localStorage.removeItem("gdrive_access_token");
    localStorage.removeItem("gdrive_refresh_token");
    localStorage.removeItem("gdrive_user_email");
  }

  /**
   * Refresh the access token
   */
  async refreshToken(): Promise<GoogleAuthResponse> {
    const storedRefreshToken = localStorage.getItem("gdrive_refresh_token");
    if (!storedRefreshToken) {
      throw new Error("No refresh token available");
    }

    const body: Record<string, string> = {
      client_id: GOOGLE_CLIENT_ID,
      refresh_token: storedRefreshToken,
      grant_type: "refresh_token",
    };

    if (GOOGLE_CLIENT_SECRET) {
      body.client_secret = GOOGLE_CLIENT_SECRET;
    }

    const response = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || storedRefreshToken,
    };
  }

  /**
   * Search for a file in Google Drive
   */
  private async searchFile(
    accessToken: string,
    fileName: string,
  ): Promise<DriveFile | null> {
    const searchUrl = `${DRIVE_API_BASE}/files?q=name='${fileName}' and trashed=false&fields=files(id,name,modifiedTime,size)`;

    const response = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Search failed: ${error}`);
    }

    const data: DriveFileList = await response.json();
    return data.files[0] || null;
  }

  /**
   * Upload or update a file in Google Drive
   */
  private async uploadFile(
    accessToken: string,
    fileName: string,
    content: string,
    mimeType: string,
    existingFileId?: string,
  ): Promise<void> {
    if (existingFileId) {
      // Update existing file
      const updateUrl = `${DRIVE_UPLOAD_BASE}/files/${existingFileId}?uploadType=media`;
      const response = await fetch(updateUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": mimeType,
        },
        body: content,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
      }
    } else {
      // Create new file using multipart upload
      const boundary = "chamlang_boundary_" + Date.now();
      const metadata = JSON.stringify({
        name: fileName,
        mimeType: mimeType,
      });

      const body =
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        `${metadata}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n` +
        `${content}\r\n` +
        `--${boundary}--`;

      const uploadUrl = `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`;
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: body,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
      }
    }
  }

  /**
   * Download a file from Google Drive
   */
  private async downloadFile(
    accessToken: string,
    fileId: string,
  ): Promise<string> {
    const downloadUrl = `${DRIVE_API_BASE}/files/${fileId}?alt=media`;

    const response = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Download failed: ${error}`);
    }

    return await response.text();
  }

  /**
   * Get current local version (timestamp of last update)
   */
  private async getLocalVersion(): Promise<number> {
    // Use the latest updated_at from any table as version
    const collections = await db.collections
      .orderBy("updated_at")
      .reverse()
      .first();
    const vocabularies = await db.vocabularies
      .orderBy("updated_at")
      .reverse()
      .first();
    const settings = await db.learningSettings
      .orderBy("updated_at")
      .reverse()
      .first();

    const dates = [
      collections?.updated_at,
      vocabularies?.updated_at,
      settings?.updated_at,
    ].filter(Boolean) as string[];

    if (dates.length === 0) {
      return Date.now();
    }

    return Math.max(...dates.map((d) => new Date(d).getTime()));
  }

  /**
   * Backup database to Google Drive
   */
  async backupToGDrive(accessToken: string): Promise<string> {
    // Export current IndexedDB data
    const data = await this.migration.exportToJSON();
    const jsonContent = JSON.stringify(data, null, 2);

    // Check if backup file exists
    const existingFile = await this.searchFile(accessToken, BACKUP_FILE_NAME);

    // Upload backup
    await this.uploadFile(
      accessToken,
      BACKUP_FILE_NAME,
      jsonContent,
      "application/json",
      existingFile?.id,
    );

    // Upload version metadata
    const localVersion = await this.getLocalVersion();
    const versionMetadata: VersionMetadata = {
      version: localVersion,
      lastUpdated: localVersion,
      device: "web",
    };

    const existingVersionFile = await this.searchFile(
      accessToken,
      VERSION_FILE_NAME,
    );
    await this.uploadFile(
      accessToken,
      VERSION_FILE_NAME,
      JSON.stringify(versionMetadata),
      "application/json",
      existingVersionFile?.id,
    );

    return existingFile
      ? "Backup updated successfully!"
      : "Backup created successfully!";
  }

  /**
   * Restore database from Google Drive
   */
  async restoreFromGDrive(accessToken: string): Promise<string> {
    // Find backup file
    const backupFile = await this.searchFile(accessToken, BACKUP_FILE_NAME);
    if (!backupFile) {
      throw new Error("No backup found on Google Drive");
    }

    // Download backup
    const content = await this.downloadFile(accessToken, backupFile.id);
    const backupData: SQLiteBackupData = JSON.parse(content);

    // Import to IndexedDB
    const result = await this.migration.importFromSQLiteBackup(
      backupData,
      true,
    );

    if (!result.success && result.errors.length > 0) {
      throw new Error(`Restore failed: ${result.errors.join(", ")}`);
    }

    return `Database restored successfully! Imported ${result.imported.collections} collections, ${result.imported.vocabularies} vocabularies.`;
  }

  /**
   * Get backup info from Google Drive
   */
  async getBackupInfo(accessToken: string): Promise<BackupInfo | null> {
    const file = await this.searchFile(accessToken, BACKUP_FILE_NAME);
    if (!file) {
      return null;
    }

    return {
      fileName: file.name || BACKUP_FILE_NAME,
      modifiedTime: file.modifiedTime || "Unknown",
      sizeKB: file.size ? Math.round(parseInt(file.size, 10) / 1024) : 0,
    };
  }

  /**
   * Check if remote version differs from local
   */
  async checkVersionDifference(accessToken: string): Promise<boolean> {
    const versionFile = await this.searchFile(accessToken, VERSION_FILE_NAME);
    if (!versionFile) {
      return false; // No backup yet
    }

    try {
      const content = await this.downloadFile(accessToken, versionFile.id);
      const remoteMetadata: VersionMetadata = JSON.parse(content);
      const localVersion = await this.getLocalVersion();

      return remoteMetadata.version !== localVersion;
    } catch (error) {
      console.error("Failed to check version:", error);
      return false;
    }
  }

  /**
   * Clear local database
   */
  async clearLocalDatabase(): Promise<string> {
    await this.migration.clearDatabase();
    return "Database cleared successfully! All data has been removed.";
  }

  /**
   * Check if Google Drive sync is supported on this platform
   */
  isSupported(): boolean {
    return !!GOOGLE_CLIENT_ID;
  }
}
