import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell,
  Clock,
  Cloud,
  CloudOff,
  Download,
  ExternalLink,
  Languages,
  LogIn,
  LogOut,
  Minus,
  Plus,
  Settings,
  StopCircle,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { TopBar } from "@/components/molecules";
import { Button, Card, Select } from "@/components/atoms";
import { useDialog, useSyncNotification } from "@/contexts";
import {
  FontSizeService,
  LearningSettingsService,
  NotificationService,
} from "@/services";
import { getGDriveService } from "@/adapters/ServiceFactory";
import type { FontSizeOption } from "@/services";
import {
  isDesktop,
  openInBrowser,
  isOpenedFromDesktop,
} from "@/utils/platform";
import { browserSyncService } from "@/services/BrowserSyncService";

export const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useDialog();
  const { hasSyncNotification, checkSyncStatus, dismissNotification } =
    useSyncNotification();

  // Get the GDrive service for the current platform
  const gdriveService = useMemo(() => getGDriveService(), []);

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

  // Browser sync state (desktop only)
  const [browserSyncActive, setBrowserSyncActive] = useState<boolean>(false);
  const [browserSyncLoading, setBrowserSyncLoading] = useState<boolean>(false);

  useEffect(() => {
    checkGDriveConfig();
    loadReminderSettings();
    checkBrowserSyncStatus();

    // Dismiss notification when user first visits profile page
    // Only dismiss on mount, not when hasSyncNotification changes
    if (hasSyncNotification) {
      dismissNotification();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  // Check browser sync status from backend (desktop only)
  const checkBrowserSyncStatus = async () => {
    if (!isDesktop()) return;

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const isActive = await invoke<boolean>("is_browser_sync_active");
      setBrowserSyncActive(isActive);
    } catch (error) {
      console.error("Failed to check browser sync status:", error);
    }
  };

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
      const info = await gdriveService.getBackupInfo(token);
      if (info) {
        setBackupInfo(
          `File: ${info.fileName}\nLast modified: ${info.modifiedTime}\nSize: ${info.sizeKB} KB`,
        );
      } else {
        setBackupInfo(null);
      }
    } catch (error) {
      console.error("Failed to load backup info:", error);
      setBackupInfo(null);
    }
  };

  const handleTokenRefresh = async (): Promise<string | null> => {
    try {
      // Use the adapter's refresh token method
      const response = await gdriveService.refreshToken();

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
      console.error("Token refresh failed:", error);

      // If refresh fails, show session expired and clear tokens
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
    if (!gdriveService.isSupported()) {
      showAlert(t("auth.oauthNotConfigured"), { variant: "error" });
      return;
    }

    try {
      setLoading(true);

      const response = await gdriveService.signIn();

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

      // Store email if provided
      if (response.email) {
        localStorage.setItem("gdrive_user_email", response.email);
        setUserEmail(response.email);
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
      await gdriveService.signOut();

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
        const result = await gdriveService.backupToGDrive(currentToken);
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
            const result = await gdriveService.backupToGDrive(newToken);
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
        const result = await gdriveService.restoreFromGDrive(accessToken);
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
            const result = await gdriveService.restoreFromGDrive(newToken);
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
      const result = await gdriveService.clearLocalDatabase();
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

      <div className="min-h-screen px-4 md:px-6 lg:px-8 py-6 pb-24">
        {/* Settings Grid - 2 columns on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Browser Sync Section - Show on desktop OR when opened from desktop in browser */}
          {(isDesktop() || isOpenedFromDesktop()) && (
            <Card variant="glass">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Cloud className="w-6 h-6 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">
                        {t("settings.browserSync") || "Browser Sync"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {isDesktop()
                          ? t("settings.openInBrowserDescription") ||
                            "Open the app in your default web browser"
                          : t("settings.browserSyncDescription") ||
                            "Sync data between browser and desktop"}
                      </p>
                    </div>
                  </div>
                  {isDesktop() && browserSyncActive && (
                    <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      Active
                    </span>
                  )}
                </div>

                <div className="pt-2 space-y-3">
                  {/* Desktop: Open in Browser / Stop Sharing buttons */}
                  {isDesktop() && (
                    <>
                      {!browserSyncActive ? (
                        <Button
                          onClick={async () => {
                            try {
                              setBrowserSyncLoading(true);
                              const { invoke } = await import(
                                "@tauri-apps/api/core"
                              );
                              const url =
                                await invoke<string>("start_browser_sync");
                              setBrowserSyncActive(true);
                              await openInBrowser(url);
                              showAlert(
                                t("settings.browserSyncStarted") ||
                                  "Browser sync started. Your data is now accessible in the browser.",
                                { variant: "success" },
                              );
                            } catch (error) {
                              console.error(
                                "Failed to start browser sync:",
                                error,
                              );
                              showAlert(
                                `Failed to start browser sync: ${error}`,
                                {
                                  variant: "error",
                                },
                              );
                            } finally {
                              setBrowserSyncLoading(false);
                            }
                          }}
                          disabled={browserSyncLoading}
                          variant="primary"
                          fullWidth
                          icon={ExternalLink}
                        >
                          {browserSyncLoading
                            ? t("settings.starting") || "Starting..."
                            : t("settings.openInBrowserButton") ||
                              "Open in Web Browser"}
                        </Button>
                      ) : (
                        <Button
                          onClick={async () => {
                            try {
                              setBrowserSyncLoading(true);
                              const { invoke } = await import(
                                "@tauri-apps/api/core"
                              );
                              await invoke("stop_browser_sync");
                              setBrowserSyncActive(false);
                              showAlert(
                                t("settings.browserSyncStopped") ||
                                  "Browser sync stopped.",
                                { variant: "success" },
                              );
                            } catch (error) {
                              console.error(
                                "Failed to stop browser sync:",
                                error,
                              );
                              showAlert(
                                `Failed to stop browser sync: ${error}`,
                                {
                                  variant: "error",
                                },
                              );
                            } finally {
                              setBrowserSyncLoading(false);
                            }
                          }}
                          disabled={browserSyncLoading}
                          variant="danger"
                          fullWidth
                          icon={StopCircle}
                        >
                          {browserSyncLoading
                            ? t("settings.stopping") || "Stopping..."
                            : t("settings.stopSharing") || "Stop Sharing"}
                        </Button>
                      )}
                      <p className="text-xs text-gray-500 text-center">
                        {browserSyncActive
                          ? t("settings.browserSyncActiveHint") ||
                            "Your data is being shared on http://localhost:25091"
                          : t("settings.openInBrowserHint") ||
                            "Opens http://localhost:25091 in your default browser"}
                      </p>
                    </>
                  )}

                  {/* Browser: Load from Desktop / Sync to Desktop buttons */}
                  {isOpenedFromDesktop() && (
                    <>
                      {/* Load from Desktop button */}
                      <Button
                        onClick={async () => {
                          try {
                            setLoading(true);
                            console.log(
                              "📥 Manual load from desktop triggered...",
                            );
                            const result =
                              await browserSyncService.loadFromDesktop();
                            console.log("📥 Load result:", result);
                            if (result.success) {
                              showAlert(result.message, { variant: "success" });
                              // Reload using full current URL to preserve session token
                              window.location.href = window.location.href;
                            } else {
                              showAlert(result.message, { variant: "error" });
                            }
                          } catch (error) {
                            console.error(
                              "Failed to load from desktop:",
                              error,
                            );
                            showAlert(`Load failed: ${error}`, {
                              variant: "error",
                            });
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        variant="secondary"
                        fullWidth
                        icon={Download}
                      >
                        {loading
                          ? t("settings.loading") || "Loading..."
                          : t("settings.loadFromDesktop") ||
                            "Load Data from Desktop"}
                      </Button>

                      {/* Sync to Desktop button */}
                      <Button
                        onClick={async () => {
                          try {
                            setLoading(true);
                            console.log(
                              "📤 Manual sync to desktop triggered...",
                            );
                            const result =
                              await browserSyncService.syncToDesktop();
                            console.log("📤 Sync result:", result);
                            if (result.success) {
                              showAlert(result.message, { variant: "success" });
                            } else {
                              showAlert(result.message, { variant: "error" });
                            }
                          } catch (error) {
                            console.error("Failed to sync to desktop:", error);
                            showAlert(`Sync failed: ${error}`, {
                              variant: "error",
                            });
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        variant="primary"
                        fullWidth
                        icon={Upload}
                      >
                        {loading
                          ? t("settings.syncing") || "Syncing..."
                          : t("settings.syncToDesktopButton") ||
                            "Sync Changes to Desktop"}
                      </Button>

                      {/* Session info */}
                      <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded space-y-1">
                        <p>
                          <strong>Session:</strong>{" "}
                          {browserSyncService.getToken()?.slice(0, 16)}...
                        </p>
                        <p>
                          <strong>Last Load:</strong>{" "}
                          {browserSyncService
                            .getLastLoadTime()
                            ?.toLocaleString() || "Never"}
                        </p>
                        <p>
                          <strong>Last Sync:</strong>{" "}
                          {browserSyncService
                            .getLastSyncTime()
                            ?.toLocaleString() || "Never"}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}

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
                  onValueChange={handleLanguageChange}
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
                  onValueChange={(value) =>
                    handleFontSizeChange(value as FontSizeOption)
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
                    {t("reminder.currentTime") || "Selected time:"}{" "}
                    {reminderTime}
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
                      {t("reminder.reminderActive") ||
                        "Daily reminder is active"}
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
      </div>
    </>
  );
};
