import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Clock,
  Cloud,
  CloudOff,
  Download,
  Languages,
  LogIn,
  LogOut,
  Minus,
  Plus,
  Settings,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import {
  refreshToken,
  signIn,
  signOut,
} from "@choochmeque/tauri-plugin-google-auth-api";
import { TopBar } from "@/components/molecules";
import { Button, Card, Select } from "@/components/atoms";
import { useDialog, useSyncNotification } from "@/contexts";
import {
  FontSizeService,
  LearningSettingsService,
  NotificationService,
} from "@/services";
import type { FontSizeOption } from "@/services";

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
  const [currentFontSize, setCurrentFontSize] = useState<FontSizeOption>(
    FontSizeService.getFontSize(),
  );
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(false);
  const [reminderTime, setReminderTime] = useState<string>("19:00"); // Default 7:00 PM

  useEffect(() => {
    checkGDriveConfig();
    loadReminderSettings();

    // Dismiss notification when user first visits profile page
    // Only dismiss on mount, not when hasSyncNotification changes
    if (hasSyncNotification) {
      dismissNotification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  const loadReminderSettings = async () => {
    try {
      // Load settings from database
      const settings =
        await LearningSettingsService.getOrCreateLearningSettings();

      setReminderEnabled(settings.reminder_enabled || false);
      setReminderTime(settings.reminder_time || "19:00");

      // If reminder is enabled, reschedule it on app start
      if (settings.reminder_enabled) {
        await rescheduleReminder(settings.reminder_time || "19:00");
      }
    } catch (error) {
      console.error("Failed to load reminder settings:", error);
    }
  };

  const rescheduleReminder = async (time: string) => {
    try {
      // Check permission first
      const permissionGranted = await NotificationService.isPermissionGranted();
      if (!permissionGranted) {
        console.log("Notification permission not granted, skipping reschedule");
        return;
      }

      // Reschedule the reminder
      await NotificationService.scheduleDailyReminder({
        time,
        title: t("reminder.title") || "Cham Lang Reminder",
        body:
          t("reminder.body") ||
          "Time to practice your vocabulary! Keep learning!",
      });
      console.log(`Daily reminder rescheduled for ${time}`);
    } catch (error) {
      console.error("Failed to reschedule reminder:", error);
    }
  };

  const checkGDriveConfig = () => {
    try {
      const storedToken = localStorage.getItem("gdrive_access_token");
      const storedRefreshToken = localStorage.getItem("gdrive_refresh_token");
      const storedEmail = localStorage.getItem("gdrive_user_email");

      console.log("data", storedRefreshToken);
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
          const tokenResponse = await fetch(
            "https://oauth2.googleapis.com/token",
            {
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
            },
          );

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
        successHtmlResponse: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sign In Successful</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                padding: 20px;
              }
              .container {
                background: white;
                border-radius: 16px;
                padding: 48px 40px;
                text-align: center;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 400px;
                width: 100%;
                animation: slideUp 0.4s ease-out;
              }
              @keyframes slideUp {
                from {
                  opacity: 0;
                  transform: translateY(30px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
              .checkmark {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: #10b981;
                margin: 0 auto 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: scaleIn 0.5s ease-out 0.2s both;
              }
              @keyframes scaleIn {
                from {
                  transform: scale(0);
                }
                to {
                  transform: scale(1);
                }
              }
              .checkmark svg {
                width: 48px;
                height: 48px;
                stroke: white;
                stroke-width: 3;
                stroke-linecap: round;
                stroke-linejoin: round;
                fill: none;
                stroke-dasharray: 100;
                stroke-dashoffset: 100;
                animation: drawCheck 0.5s ease-out 0.4s forwards;
              }
              @keyframes drawCheck {
                to {
                  stroke-dashoffset: 0;
                }
              }
              h1 {
                color: #1f2937;
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 12px;
              }
              p {
                color: #6b7280;
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 32px;
              }
              .close-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                padding: 14px 32px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                width: 100%;
                transition: transform 0.2s, box-shadow 0.2s;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
              }
              .close-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
              }
              .close-btn:active {
                transform: translateY(0);
              }
              .auto-close {
                color: #9ca3af;
                font-size: 14px;
                margin-top: 16px;
              }
              .signature {
                margin-top: 32px;
                padding-top: 24px;
                border-top: 1px solid #e5e7eb;
              }
              .signature .brand {
                font-size: 18px;
                font-weight: 700;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 4px;
              }
              .signature .tagline {
                font-size: 13px;
                color: #9ca3af;
                margin-bottom: 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="checkmark">
                <svg viewBox="0 0 52 52">
                  <polyline points="14,26 22,34 38,18"/>
                </svg>
              </div>
              <h1>Sign In Successful!</h1>
              <p>You have successfully signed in with Google. You can now close this window and return to the app.</p>
              <button class="close-btn" onclick="closeWindow()">Close Window</button>
              <p class="auto-close">This window will close automatically in <span id="countdown">5</span> seconds</p>
              <div class="signature">
                <div class="brand">Cham Lang</div>
                <p class="tagline">Adapt to Learn</p>
              </div>
            </div>
            <script>
              let countdown = 5;
              const countdownEl = document.getElementById('countdown');

              const timer = setInterval(() => {
                countdown--;
                countdownEl.textContent = countdown;
                if (countdown <= 0) {
                  clearInterval(timer);
                  closeWindow();
                }
              }, 1000);

              function closeWindow() {
                // Try multiple methods to close the window
                if (window.close) {
                  window.close();
                }
                // Fallback for browsers that prevent window.close()
                setTimeout(() => {
                  window.location.href = 'about:blank';
                }, 100);
              }
            </script>
          </body>
          </html>
        `,
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

  const handleFontSizeChange = (size: FontSizeOption) => {
    try {
      FontSizeService.setFontSize(size);
      setCurrentFontSize(size);
      showAlert(t("settings.saved") || "Font size changed successfully!", {
        variant: "success",
      });
    } catch (error) {
      console.error("Failed to change font size:", error);
      showAlert("Failed to change font size", { variant: "error" });
    }
  };

  const handleIncreaseFontSize = () => {
    const newSize = FontSizeService.increase();
    setCurrentFontSize(newSize);
  };

  const handleDecreaseFontSize = () => {
    const newSize = FontSizeService.decrease();
    setCurrentFontSize(newSize);
  };

  const handleTestNotification = async () => {
    try {
      setLoading(true);

      const result =
        await NotificationService.scheduleTestNotificationWithPermission();

      if (result.success) {
        showAlert(result.message, { variant: "success" });
      } else {
        showAlert(result.message, { variant: "error" });
      }
    } catch (error) {
      console.error("Failed to schedule notification:", error);
      showAlert(`Failed to schedule notification: ${error}`, {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReminderToggle = async (enabled: boolean) => {
    try {
      setLoading(true);

      if (enabled) {
        // Schedule the daily reminder with permission check
        const result =
          await NotificationService.scheduleDailyReminderWithPermission({
            time: reminderTime,
            title: t("reminder.title") || "Cham Lang Reminder",
            body:
              t("reminder.body") ||
              "Time to practice your vocabulary! Keep learning!",
          });

        if (!result.success) {
          showAlert(result.message, { variant: "error" });
          return;
        }

        // Save to database
        await LearningSettingsService.updateLearningSettings({
          reminder_enabled: true,
          reminder_time: reminderTime,
        });

        setReminderEnabled(true);
        showAlert(result.message, { variant: "success" });
      } else {
        // Cancel the daily reminder
        const result = await NotificationService.cancelDailyReminder();

        // Save to database
        await LearningSettingsService.updateLearningSettings({
          reminder_enabled: false,
        });

        setReminderEnabled(false);
        showAlert(result, { variant: "success" });
      }
    } catch (error) {
      console.error("Failed to update reminder:", error);
      showAlert(`Failed to update reminder: ${error}`, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReminderTime = async () => {
    try {
      setLoading(true);

      // Save to database first
      await LearningSettingsService.updateLearningSettings({
        reminder_time: reminderTime,
      });

      // If reminder is enabled, reschedule with new time
      if (reminderEnabled) {
        // schedule_daily_reminder already cancels existing reminder internally
        const result =
          await NotificationService.scheduleDailyReminderWithPermission({
            time: reminderTime,
            title: t("reminder.title") || "Cham Lang Reminder",
            body:
              t("reminder.body") ||
              "Time to practice your vocabulary! Keep learning!",
          });

        if (!result.success) {
          showAlert(result.message, { variant: "error" });
          return;
        }

        showAlert(result.message, { variant: "success" });
      } else {
        showAlert(t("settings.saved") || "Reminder time saved successfully!", {
          variant: "success",
        });
      }
    } catch (error) {
      console.error("Failed to save reminder time:", error);
      showAlert(`Failed to save reminder time: ${error}`, {
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopBar title={t("nav.profile")} showBack={false} />

      <div className="min-h-screen px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 space-y-6">
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

        {/* Font Size Settings Section */}
        <Card variant="glass">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Type className="w-6 h-6 text-purple-600" />
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {t("settings.fontSize") || "Text Size"}
                </h3>
                <p className="text-sm text-gray-600">
                  {t("settings.fontSizeDescription") ||
                    "Adjust the size of text throughout the app"}
                </p>
              </div>
            </div>

            <div className="pt-2 space-y-4">
              {/* Quick Increase/Decrease Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <Button
                  onClick={handleDecreaseFontSize}
                  disabled={currentFontSize === "small"}
                  variant="secondary"
                  icon={Minus}
                  className="sm:flex-1"
                >
                  {t("settings.decrease") || "Decrease"}
                </Button>
                <div className="px-4 py-2 bg-indigo-50 rounded-lg border-2 border-indigo-200 sm:min-w-[140px] text-center">
                  <span className="text-sm font-bold text-indigo-900">
                    {t(`fontSizes.${currentFontSize}`) ||
                      FontSizeService.getConfig(currentFontSize).label}
                  </span>
                </div>
                <Button
                  onClick={handleIncreaseFontSize}
                  disabled={currentFontSize === "extra-large"}
                  variant="secondary"
                  icon={Plus}
                  className="sm:flex-1"
                >
                  {t("settings.increase") || "Increase"}
                </Button>
              </div>

              {/* Dropdown Selector */}
              <Select
                label={t("settings.selectFontSize") || "Select Font Size"}
                options={FontSizeService.getOptions().map((config) => ({
                  value: config.value,
                  label: t(`fontSizes.${config.value}`) || config.label,
                }))}
                value={currentFontSize}
                onChange={(e) =>
                  handleFontSizeChange(e.target.value as FontSizeOption)
                }
              />

              {/* Preview Text */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">
                  {t("settings.preview") || "Preview:"}
                </p>
                <p className="text-gray-800">
                  {t("app.tagline") || "Adapt to Learn"}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {t("settings.fontSizePreviewText") ||
                    "The quick brown fox jumps over the lazy dog"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Notification Test Section */}
        <Card variant="glass">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Bell className="w-6 h-6 text-orange-600" />
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {t("settings.notifications") || "Notifications Test"}
                </h3>
                <p className="text-sm text-gray-600">
                  {t("settings.notificationsDescription") ||
                    "Test scheduled notifications"}
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleTestNotification}
                disabled={loading}
                variant="primary"
                fullWidth
                icon={Bell}
              >
                {loading
                  ? t("settings.scheduling") || "Scheduling..."
                  : t("settings.scheduleNotification") ||
                    "Schedule Notification (+1 minute)"}
              </Button>
              <p className="text-xs text-gray-500 text-center mt-2">
                {t("settings.notificationHint") ||
                  "This will schedule a notification to appear in 1 minute"}
              </p>
            </div>
          </div>
        </Card>

        {/* Daily Reminder Section */}
        <Card variant="glass">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-indigo-600" />
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {t("reminder.dailyReminder") || "Daily Reminder"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t("reminder.dailyReminderDescription") ||
                      "Get reminded to practice every day"}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => handleReminderToggle(e.target.checked)}
                  disabled={loading}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <div className="pt-2 space-y-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("reminder.reminderTime") || "Reminder Time"}
                </label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  disabled={loading}
                  className="w-full px-3 py-2 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {t("reminder.currentTime") || "Selected time:"} {reminderTime}
                </p>
              </div>

              <Button
                onClick={handleSaveReminderTime}
                disabled={loading}
                variant="primary"
                fullWidth
                icon={Clock}
              >
                {loading
                  ? t("settings.saving") || "Saving..."
                  : t("reminder.saveTime") || "Save Reminder Time"}
              </Button>

              {reminderEnabled && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <p className="text-sm text-indigo-800 font-medium">
                    {t("reminder.reminderActive") || "Daily reminder is active"}
                  </p>
                  <p className="text-xs text-indigo-700 mt-1">
                    {t("reminder.reminderActiveDescription") ||
                      `You will receive a notification every day at ${reminderTime}`}
                  </p>
                </div>
              )}
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
