import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Cloud, CloudOff, Download, Languages, LogIn, LogOut, Settings, Trash2, Upload,} from "lucide-react";
import {invoke} from "@tauri-apps/api/core";
import {refreshToken, signIn, signOut,} from "@choochmeque/tauri-plugin-google-auth-api";
import {TopBar} from "@/components/molecules";
import {Button, Card, Select} from "@/components/atoms";
import {useDialog, useSyncNotification} from "@/contexts";

// OAuth configuration - these should be environment variables in production
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || "";

export const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useDialog();
  const { hasSyncNotification, checkSyncStatus, dismissNotification } =
    useSyncNotification();
  const [isConfigured, setIsConfigured] = useState(false);
  const [accessToken, setAccessToken] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_refreshTokenState, setRefreshTokenState] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [backupInfo, setBackupInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<string>(
    i18n.language || "en",
  );

  useEffect(() => {
    checkGDriveConfig();

    // Dismiss notification when user first visits profile page
    // Only dismiss on mount, not when hasSyncNotification changes
    if (hasSyncNotification) {
      dismissNotification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  const checkGDriveConfig = () => {
    try {
      const storedToken = localStorage.getItem("gdrive_access_token");
      const storedRefreshToken = localStorage.getItem("gdrive_refresh_token");
      const storedEmail = localStorage.getItem("gdrive_user_email");

      console.log('data', storedRefreshToken)
      if (storedToken) {
        setAccessToken(storedToken);
        setRefreshTokenState(storedRefreshToken || "");
        setUserEmail(storedEmail || "");
        setIsConfigured(true);
        loadBackupInfo(storedToken);
      }
    } catch (error) {
      console.error("Failed to check Google Drive config:", error);
    }
  };

  const loadBackupInfo = async (token: string) => {
    try {
      const info = await invoke<string>("get_gdrive_backup_info", {
        accessToken: token,
      });
      setBackupInfo(info);
    } catch (error) {
      console.error("Failed to load backup info:", error);
      setBackupInfo(null);
    }
  };

  const handleTokenRefresh = async (): Promise<string | null> => {
    try {
      // Try using the plugin's refresh token method first
      const response = await refreshToken();

      // Update stored token
      localStorage.setItem("gdrive_access_token", response.accessToken);
      setAccessToken(response.accessToken);

      // Store refresh token if provided
      if (response.refreshToken) {
        localStorage.setItem("gdrive_refresh_token", response.refreshToken);
        setRefreshTokenState(response.refreshToken);
      }

      return response.accessToken;
    } catch (error) {
      console.error("Token refresh failed via plugin:", error);

      // Fallback: Try manual token refresh using stored refresh token
      const storedRefreshToken = localStorage.getItem("gdrive_refresh_token");

      if (storedRefreshToken && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
        try {
          console.log("Attempting manual token refresh...");
          const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              client_id: GOOGLE_CLIENT_ID,
              client_secret: GOOGLE_CLIENT_SECRET,
              refresh_token: storedRefreshToken,
              grant_type: "refresh_token",
            }),
          });

          if (!tokenResponse.ok) {
            throw new Error(`Token refresh failed: ${tokenResponse.status}`);
          }

          const tokenData = await tokenResponse.json();

          // Update stored token
          localStorage.setItem("gdrive_access_token", tokenData.access_token);
          setAccessToken(tokenData.access_token);

          console.log("Manual token refresh successful");
          return tokenData.access_token;
        } catch (manualError) {
          console.error("Manual token refresh also failed:", manualError);
        }
      }

      // If both methods fail, show session expired and clear tokens
      showAlert(t("auth.sessionExpired"), {
        variant: "warning",
      });

      // Clear tokens and sign out
      localStorage.removeItem("gdrive_access_token");
      localStorage.removeItem("gdrive_refresh_token");
      localStorage.removeItem("gdrive_user_email");
      setAccessToken("");
      setRefreshTokenState("");
      setUserEmail("");
      setIsConfigured(false);

      return null;
    }
  };

  const handleSignIn = async () => {
    if (!GOOGLE_CLIENT_ID) {
      showAlert(t("auth.oauthNotConfigured"), { variant: "error" });
      return;
    }

    try {
      setLoading(true);

      const signInOptions: any = {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        scopes: [
          "openid",
          "email",
          "profile",
          "https://www.googleapis.com/auth/drive.file",
        ],
        successHtmlResponse: "<h1>Success!</h1>",
      };

      const response = await signIn(signInOptions);

      console.log("Sign in successful:", response);

      // Store access token
      localStorage.setItem("gdrive_access_token", response.accessToken);
      setAccessToken(response.accessToken);

      // Store refresh token if provided (critical for token refresh)
      if (response.refreshToken) {
        console.log("Refresh token received and stored");
        localStorage.setItem("gdrive_refresh_token", response.refreshToken);
        setRefreshTokenState(response.refreshToken);
      } else {
        console.warn("No refresh token received - token refresh may not work");
      }

      // Parse ID token to get email
      if (response.idToken) {
        try {
          const payload = JSON.parse(atob(response.idToken.split(".")[1]));
          if (payload.email) {
            localStorage.setItem("gdrive_user_email", payload.email);
            setUserEmail(payload.email);
          }
        } catch (e) {
          console.error("Failed to parse ID token:", e);
        }
      }

      setIsConfigured(true);
      showAlert(t("auth.signInSuccess"), { variant: "success" });
      loadBackupInfo(response.accessToken);
    } catch (error) {
      console.error("Sign in failed:", error);
      showAlert(`${t("auth.signInFailed")}: ${error}`, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut();

      // Clear stored tokens
      localStorage.removeItem("gdrive_access_token");
      localStorage.removeItem("gdrive_refresh_token");
      localStorage.removeItem("gdrive_user_email");

      setAccessToken("");
      setRefreshTokenState("");
      setUserEmail("");
      setIsConfigured(false);
      setBackupInfo(null);
      showAlert(t("auth.signOutSuccess"), { variant: "success" });
    } catch (error) {
      console.error("Sign out failed:", error);
      showAlert(`${t("auth.signInFailed")}: ${error}`, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    const confirmed = await showConfirm(t("gdrive.confirmBackup"), {
      variant: "info",
      confirmText: t("buttons.backup"),
      cancelText: t("buttons.cancel"),
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      let currentToken = accessToken;

      try {
        const result = await invoke<string>("backup_to_gdrive", {
          accessToken: currentToken,
        });
        showAlert(result, { variant: "success" });
        loadBackupInfo(currentToken);
        // Recheck sync status after backup
        await checkSyncStatus();
      } catch (error) {
        const errorStr = String(error);

        // Check if error is due to expired token (401)
        if (
          errorStr.includes("401") ||
          errorStr.includes("UNAUTHENTICATED") ||
          errorStr.includes("Invalid Credentials")
        ) {
          console.log("Token expired, refreshing...");
          const newToken = await handleTokenRefresh();

          if (newToken) {
            // Retry with new token
            const result = await invoke<string>("backup_to_gdrive", {
              accessToken: newToken,
            });
            showAlert(result, { variant: "success" });
            loadBackupInfo(newToken);
            await checkSyncStatus();
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("Backup failed:", error);
      showAlert(`Backup failed: ${error}`, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    const confirmed = await showConfirm(t("gdrive.confirmRestore"), {
      variant: "warning",
      confirmText: t("buttons.restore"),
      cancelText: t("buttons.cancel"),
    });

    if (!confirmed) return;

    try {
      setLoading(true);

      try {
        const result = await invoke<string>("restore_from_gdrive", {
          accessToken: accessToken,
        });
        showAlert(result + t("gdrive.restartPrompt"), { variant: "success" });
        // Recheck sync status after restore
        await checkSyncStatus();
      } catch (error) {
        const errorStr = String(error);

        // Check if error is due to expired token (401)
        if (
          errorStr.includes("401") ||
          errorStr.includes("UNAUTHENTICATED") ||
          errorStr.includes("Invalid Credentials")
        ) {
          console.log("Token expired, refreshing...");
          const newToken = await handleTokenRefresh();

          if (newToken) {
            // Retry with new token
            const result = await invoke<string>("restore_from_gdrive", {
              accessToken: newToken,
            });
            showAlert(result + t("gdrive.restartPrompt"), {
              variant: "success",
            });
            await checkSyncStatus();
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("Restore failed:", error);
      showAlert(`Restore failed: ${error}`, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleClearDatabase = async () => {
    const confirmed = await showConfirm(t("database.dangerZoneWarning"), {
      variant: "error",
      confirmText: t("buttons.deleteConfirm"),
      cancelText: t("buttons.cancel"),
    });

    if (!confirmed) return;

    // Second confirmation
    const finalConfirmed = await showConfirm(t("database.finalConfirmation"), {
      variant: "error",
      confirmText: t("buttons.delete"),
      cancelText: t("buttons.cancel"),
    });

    if (!finalConfirmed) return;

    try {
      setLoading(true);
      const result = await invoke<string>("clear_local_database");
      showAlert(result, { variant: "success" });
    } catch (error) {
      console.error("Clear database failed:", error);
      showAlert(`Clear database failed: ${error}`, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = async (language: string) => {
    try {
      await i18n.changeLanguage(language);
      localStorage.setItem("app_language", language);
      setCurrentLanguage(language);
      showAlert(t("settings.saved") || "Language changed successfully!", {
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to change language:", error);
      showAlert("Failed to change language", { variant: "error" });
    }
  };

  return (
    <>
      <TopBar title={t("nav.profile")} showBack={false} />

      <div className="min-h-screen p-6 space-y-6">
        {/* Language Settings Section */}
        <Card variant="glass">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Languages className="w-6 h-6 text-blue-600" />
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {t("settings.language") || "Interface Language"}
                </h3>
                <p className="text-sm text-gray-600">
                  {t("settings.languageDescription") ||
                    "Choose your preferred language for the app"}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Select
                options={[
                  { value: "en", label: "English" },
                  { value: "vi", label: "Tiếng Việt" },
                ]}
                value={currentLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Google Drive Sync Section */}
        <Card variant="glass">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isConfigured ? (
                  <Cloud className="w-6 h-6 text-green-600" />
                ) : (
                  <CloudOff className="w-6 h-6 text-gray-400" />
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {t("gdrive.title")}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {isConfigured
                      ? `${t("gdrive.connected")} ${userEmail}`
                      : t("gdrive.notConnected")}
                  </p>
                </div>
              </div>
              {isConfigured && (
                <Button
                  onClick={handleSignOut}
                  disabled={loading}
                  variant="secondary"
                  icon={LogOut}
                >
                  {t("gdrive.signOut")}
                </Button>
              )}
            </div>

            {!isConfigured && (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  {t("gdrive.signInDescription")}
                </p>
                <p className="text-xs text-gray-500">
                  {t("gdrive.scopeDescription")}
                </p>
                <Button
                  onClick={handleSignIn}
                  disabled={loading}
                  variant="primary"
                  fullWidth
                  icon={LogIn}
                >
                  {loading ? t("gdrive.signingIn") : t("gdrive.signIn")}
                </Button>
              </div>
            )}

            {isConfigured && (
              <div className="space-y-3 pt-4 border-t border-gray-200">
                {backupInfo && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800 font-medium">
                      {t("gdrive.backupFound")}
                    </p>
                    <pre className="text-xs text-green-700 mt-1 overflow-auto">
                      {backupInfo}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleBackup}
                    disabled={loading}
                    variant="primary"
                    icon={Upload}
                  >
                    {loading ? t("gdrive.processing") : t("gdrive.backupNow")}
                  </Button>
                  <Button
                    onClick={handleRestore}
                    disabled={loading}
                    variant="secondary"
                    icon={Download}
                  >
                    {loading ? t("gdrive.processing") : t("gdrive.restore")}
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  {t("gdrive.lastSyncInfo")}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Learning Settings Section */}
        <Card variant="glass">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-purple-600" />
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {t("settings.learning") || "Learning Settings"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t("settings.learningDescription") ||
                      "Customize spaced repetition and learning preferences"}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => navigate("/settings/learning")}
                variant="primary"
                fullWidth
                icon={Settings}
              >
                {t("settings.configure") || "Configure Learning Settings"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card variant="glass">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-bold text-red-600">
                {t("settings.dangerZone")}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {t("settings.dangerZoneDescription")}
              </p>
            </div>

            <div className="border-t border-red-200 pt-4 space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 font-medium">
                  {t("database.clearLocalDatabase")}
                </p>
                <p className="text-xs text-red-700 mt-1">
                  {t("database.clearDatabaseWarning")}
                </p>
              </div>

              <Button
                onClick={handleClearDatabase}
                disabled={loading}
                variant="secondary"
                fullWidth
                icon={Trash2}
              >
                {loading
                  ? t("database.clearing")
                  : t("database.clearLocalDatabase")}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                {t("database.recommendedWorkflow")}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};
