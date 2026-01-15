/**
 * Tauri Google Drive Adapter
 * Implements IGDriveService using Tauri backend commands and plugin
 */

import { invoke } from "@tauri-apps/api/core";
import {
  signIn as tauriSignIn,
  signOut as tauriSignOut,
  refreshToken as tauriRefreshToken,
} from "@choochmeque/tauri-plugin-google-auth-api";
import {
  BackupInfo,
  GoogleAuthResponse,
  IGDriveService,
} from "@/adapters/interfaces";

// OAuth configuration from environment
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || "";

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
   * Backup database to Google Drive using Tauri backend
   */
  async backupToGDrive(accessToken: string): Promise<string> {
    return await invoke<string>("backup_to_gdrive", { accessToken });
  }

  /**
   * Restore database from Google Drive using Tauri backend
   */
  async restoreFromGDrive(accessToken: string): Promise<string> {
    return await invoke<string>("restore_from_gdrive", { accessToken });
  }

  /**
   * Get backup info from Google Drive using Tauri backend
   */
  async getBackupInfo(accessToken: string): Promise<BackupInfo | null> {
    try {
      const infoStr = await invoke<string>("get_gdrive_backup_info", {
        accessToken,
      });
      // Parse the format: "File: xxx\nLast modified: xxx\nSize: xxx KB"
      const lines = infoStr.split("\n");
      const fileName = lines[0]?.replace("File: ", "") || "chamlang_backup.db";
      const modifiedTime =
        lines[1]?.replace("Last modified: ", "") || "Unknown";
      const sizeKB = parseInt(
        lines[2]?.replace("Size: ", "").replace(" KB", "") || "0",
        10,
      );

      return { fileName, modifiedTime, sizeKB };
    } catch (error) {
      console.error("Failed to get backup info:", error);
      return null;
    }
  }

  /**
   * Check version difference using Tauri backend
   */
  async checkVersionDifference(accessToken: string): Promise<boolean> {
    return await invoke<boolean>("check_version_difference", { accessToken });
  }

  /**
   * Clear local database using Tauri backend
   */
  async clearLocalDatabase(): Promise<string> {
    return await invoke<string>("clear_local_database");
  }

  /**
   * Tauri always supports Google Drive sync
   */
  isSupported(): boolean {
    return !!GOOGLE_CLIENT_ID;
  }
}
