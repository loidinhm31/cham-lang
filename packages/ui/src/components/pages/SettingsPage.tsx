import React, { useEffect, useMemo, useState } from "react";
import { useAuth, useNav } from "@cham-lang/ui/hooks";
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
  Palette,
  Plus,
  Settings,
  Trash2,
  Type,
  Upload,
  User,
} from "lucide-react";
import { TopBar } from "@cham-lang/ui/components/molecules";
import { Button, Card, Select } from "@cham-lang/ui/components/atoms";
import { SyncSettings } from "@cham-lang/ui/components/organisms";
import { useDialog, useSyncNotification } from "@cham-lang/ui/contexts";
import type { FontSizeOption } from "@cham-lang/ui/services";
import {
  FontSizeService,
  GdriveService,
  LearningSettingsService,
  NotificationService,
} from "@cham-lang/ui/services";

export interface SettingsPageProps {
  /**
   * Callback when user requests logout - allows parent app to handle logout
   * Consistent with fin-catch pattern for embedded apps
   */
  onLogout?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onLogout }) => {
  const { t, i18n } = useTranslation();
  const { navigate } = useNav();
  const { isAuthenticated, authStatus, logout } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const { hasSyncNotification, checkSyncStatus, dismissNotification } =
    useSyncNotification();

  // Use the onLogout prop directly (passed from AppShell)
  const onLogoutRequest = onLogout;

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

      setReminderEnabled(settings.reminderEnabled || false);
      setReminderTime(settings.reminderTime || "19:00");

      // If reminder is enabled, reschedule it on app start
      if (settings.reminderEnabled) {
        await rescheduleReminder(settings.reminderTime || "19:00");
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
      const info = await GdriveService.getBackupInfo(token);
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
      const response = await GdriveService.refreshToken();

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
    if (!GdriveService.isSupported()) {
      showAlert(t("auth.oauthNotConfigured"), { variant: "error" });
      return;
    }

    try {
      setLoading(true);

      const response = await GdriveService.signIn();

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
      await GdriveService.signOut();

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
        const result = await GdriveService.backupToGDrive(currentToken);
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
            const result = await GdriveService.backupToGDrive(newToken);
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
        const result = await GdriveService.restoreFromGDrive(accessToken);
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
            const result = await GdriveService.restoreFromGDrive(newToken);
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
      const result = await GdriveService.clearLocalDatabase();
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
          reminderEnabled: true,
          reminderTime: reminderTime,
        });

        setReminderEnabled(true);
        showAlert(result.message, { variant: "success" });
      } else {
        // Cancel the daily reminder
        const result = await NotificationService.cancelDailyReminder();

        // Save to database
        await LearningSettingsService.updateLearningSettings({
          reminderEnabled: false,
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
        reminderTime: reminderTime,
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
      <TopBar title={t("settings.title")} showBack={false} />

      <div className="min-h-screen px-4 md:px-6 lg:px-8 py-6 pb-24">
        {/* Settings Grid - 2 columns on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QM Cloud Sync Section */}
          {isAuthenticated ? (
            <Card variant="glass">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-bold text-(--color-text-primary)">
                      {t("auth.account") || "Account"}
                    </h3>
                    <p className="text-sm ttext-text-secondary">
                      {authStatus?.username ||
                        authStatus?.email ||
                        t("auth.manageAccount") ||
                        "Manage your account connection"}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    await logout();
                    showAlert(
                      t("auth.loggedOut") || "Logged out successfully",
                      {
                        variant: "success",
                      },
                    );
                    onLogoutRequest?.();
                  }}
                  variant="secondary"
                  icon={LogOut}
                  fullWidth
                >
                  {t("auth.logout") || "Logout"}
                </Button>
              </div>
            </Card>
          ) : (
            <Card variant="glass">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <LogIn className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-bold text-(--color-text-primary)">
                      {t("auth.loginToConnect") || "Login to connect to server"}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {t("auth.loginPrompt") || "Log in to sync your progress"}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate("/login")}
                  variant="primary"
                  icon={LogIn}
                  fullWidth
                >
                  {t("auth.login") || "Login"}
                </Button>
              </div>
            </Card>
          )}

          <SyncSettings />

          {/* Display Settings Section - Language & Text Size */}
          <Card variant="glass">
            <div className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="text-lg font-bold text-(--color-text-primary)">
                    {t("settings.displaySettings") || "Display Settings"}
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {t("settings.displaySettingsDescription") ||
                      "Customize language and text appearance"}
                  </p>
                </div>
              </div>

              {/* Interface Language */}
              <div className="space-y-3 pt-4 border-t border-border-light">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-pink-500" />
                  <h4 className="font-semibold text-(--color-text-primary)">
                    {t("settings.theme") || "Theme Preview"}
                  </h4>
                </div>
                <p className="text-sm text-text-secondary">
                  {t("settings.themeDescription") ||
                    "Preview and verify different themes"}
                </p>
                <div className="flex justify-center">
                  <Button
                    onClick={() => navigate("/settings/theme-preview")}
                    variant="primary"
                    icon={Palette}
                  >
                    Open Theme Preview
                  </Button>
                </div>
              </div>

              {/* Interface Language */}
              <div className="space-y-3 pt-4 border-t border-border-light">
                <div className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-(--color-text-primary)">
                    {t("settings.language") || "Interface Language"}
                  </h4>
                </div>
                <p className="text-sm text-text-secondary">
                  {t("settings.languageDescription") ||
                    "Choose your preferred language for the app"}
                </p>
                <div className="flex justify-center">
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

              {/* Text Size */}
              <div className="space-y-4 pt-4 border-t border-border-light">
                <div className="flex items-center gap-2">
                  <Type className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-(--color-text-primary)">
                    {t("settings.fontSize") || "Text Size"}
                  </h4>
                </div>
                <p className="text-sm text-text-secondary">
                  {t("settings.fontSizeDescription") ||
                    "Adjust the size of text throughout the app"}
                </p>

                {/* Quick Increase/Decrease Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 justify-center">
                  <Button
                    onClick={handleDecreaseFontSize}
                    disabled={currentFontSize === "small"}
                    variant="secondary"
                    icon={Minus}
                    size="md"
                  >
                    {t("settings.decrease") || "Decrease"}
                  </Button>
                  <div className="px-4 py-2 bg-(--color-primary-500)/10 rounded-lg border-2 border-(--color-primary-500)/30 text-center">
                    <span className="text-sm font-bold text-(--color-primary-500)">
                      {t(`fontSizes.${currentFontSize}`) ||
                        FontSizeService.getConfig(currentFontSize).label}
                    </span>
                  </div>
                  <Button
                    onClick={handleIncreaseFontSize}
                    disabled={currentFontSize === "extra-large"}
                    variant="secondary"
                    icon={Plus}
                    size="md"
                  >
                    {t("settings.increase") || "Increase"}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-3 justify-center items-start">
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
                  <div className="bg-(--color-bg-white) border border-(--color-border-light) rounded-lg p-4">
                    <p className="text-xs text-text-secondary mb-2">
                      {t("settings.preview") || "Preview:"}
                    </p>
                    <p className="text-(--color-text-primary)">
                      {t("app.tagline") || "Adapt to Learn"}
                    </p>
                    <p className="text-sm ttext-text-secondary mt-1">
                      {t("settings.fontSizePreviewText") ||
                        "The quick brown fox jumps over the lazy dog"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Notifications Section - Test & Daily Reminder */}
          <Card variant="glass">
            <div className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center gap-3">
                <Bell className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                <div>
                  <h3 className="text-lg font-bold text-(--color-text-primary)">
                    {t("settings.notificationsSection") || "Notifications"}
                  </h3>
                  <p className="text-sm ttext-text-secondary">
                    {t("settings.notificationsSectionDescription") ||
                      "Manage reminders and notification preferences"}
                  </p>
                </div>
              </div>

              {/* Notification Test */}
              <div className="space-y-3 pt-4 border-t border-border-light">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <h4 className="font-semibold text-(--color-text-primary)">
                    {t("settings.notifications") || "Notification Test"}
                  </h4>
                </div>
                <p className="text-sm ttext-text-secondary">
                  {t("settings.notificationsDescription") ||
                    "Test scheduled notifications"}
                </p>
                <div className="flex flex-col items-center">
                  <Button
                    onClick={handleTestNotification}
                    disabled={loading}
                    variant="primary"
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

              {/* Daily Reminder */}
              <div className="space-y-4 pt-4 border-t border-border-light">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h4 className="font-semibold text-(--color-text-primary)">
                      {t("reminder.dailyReminder") || "Daily Reminder"}
                    </h4>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => handleReminderToggle(e.target.checked)}
                      disabled={loading}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
                <p className="text-sm ttext-text-secondary">
                  {t("reminder.dailyReminderDescription") ||
                    "Get reminded to practice every day"}
                </p>

                <div>
                  <label className="block text-sm font-medium text-(--color-text-primary) mb-2">
                    {t("reminder.reminderTime") || "Reminder Time"}
                  </label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    disabled={loading}
                    className="w-full px-3 py-2 text-lg border border-border-light rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-800 text-(--color-text-primary)"
                  />
                  <p className="text-xs ttext-text-secondary mt-2">
                    {t("reminder.currentTime") || "Selected time:"}{" "}
                    {reminderTime}
                  </p>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={handleSaveReminderTime}
                    disabled={loading}
                    variant="primary"
                    icon={Clock}
                  >
                    {loading
                      ? t("settings.saving") || "Saving..."
                      : t("reminder.saveTime") || "Save Reminder Time"}
                  </Button>
                </div>

                {reminderEnabled && (
                  <div className="bg-(--color-primary-500)/10 border border-(--color-primary-500)/30 rounded-lg p-3">
                    <p className="text-sm text-(--color-text-primary) font-medium">
                      {t("reminder.reminderActive") ||
                        "Daily reminder is active"}
                    </p>
                    <p className="text-xs text-(--color-text-secondary) mt-1">
                      {t("reminder.reminderActiveDescription") ||
                        `You will receive a notification every day at ${reminderTime}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Data Management Section - Google Drive Sync & Danger Zone */}
          <Card variant="glass">
            <div className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center gap-3">
                <Cloud className="w-6 h-6 text-green-600 dark:text-green-400" />
                <div>
                  <h3 className="text-lg font-bold text-(--color-text-primary)">
                    {t("settings.dataManagement") || "Data Management"}
                  </h3>
                  <p className="text-sm ttext-text-secondary">
                    {t("settings.dataManagementDescription") ||
                      "Backup, sync, and manage your data"}
                  </p>
                </div>
              </div>

              {/* Google Drive Sync */}
              <div className="space-y-4 pt-4 border-t border-border-light">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isConfigured ? (
                      <Cloud className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <CloudOff className="w-5 h-5 ttext-text-secondary" />
                    )}
                    <h4 className="font-semibold text-(--color-text-primary)">
                      {t("gdrive.title")}
                    </h4>
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
                <p className="text-sm ttext-text-secondary">
                  {isConfigured
                    ? `${t("gdrive.connected")} ${userEmail}`
                    : t("gdrive.notConnected")}
                </p>

                {!isConfigured && (
                  <div className="space-y-3 flex flex-col items-center">
                    <p className="text-sm ttext-text-secondary">
                      {t("gdrive.signInDescription")}
                    </p>
                    <p className="text-xs text-text-muted">
                      {t("gdrive.scopeDescription")}
                    </p>
                    <Button
                      onClick={handleSignIn}
                      disabled={loading}
                      variant="primary"
                      icon={LogIn}
                    >
                      {loading ? t("gdrive.signingIn") : t("gdrive.signIn")}
                    </Button>
                  </div>
                )}

                {isConfigured && (
                  <div className="space-y-3">
                    {backupInfo && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <p className="text-sm text-(--color-text-primary) font-medium">
                          {t("gdrive.backupFound")}
                        </p>
                        <pre className="text-xs text-(--color-text-secondary) mt-1 overflow-auto">
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
                        {loading
                          ? t("gdrive.processing")
                          : t("gdrive.backupNow")}
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

              {/* Danger Zone */}
              <div className="space-y-4 pt-4 border-t border-red-200 dark:border-red-900/30">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <h4 className="font-semibold text-red-600 dark:text-red-400">
                    {t("settings.dangerZone")}
                  </h4>
                </div>
                <p className="text-sm ttext-text-secondary">
                  {t("settings.dangerZoneDescription")}
                </p>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-sm text-red-600 font-medium">
                    {t("database.clearLocalDatabase")}
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    {t("database.clearDatabaseWarning")}
                  </p>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={handleClearDatabase}
                    disabled={loading}
                    variant="danger"
                    icon={Trash2}
                  >
                    {loading
                      ? t("database.clearing")
                      : t("database.clearLocalDatabase")}
                  </Button>
                </div>

                <p className="text-xs text-gray-500 text-center">
                  {t("database.recommendedWorkflow")}
                </p>
              </div>
            </div>
          </Card>

          {/* Learning Settings Section */}
          <Card variant="glass">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  <div>
                    <h3 className="text-lg font-bold text-(--color-text-primary)">
                      {t("settings.learning") || "Learning Settings"}
                    </h3>
                    <p className="text-sm ttext-text-secondary">
                      {t("settings.learningDescription") ||
                        "Customize spaced repetition and learning preferences"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-col items-center">
                <Button
                  onClick={() => navigate("/settings/learning")}
                  variant="primary"
                  icon={Settings}
                >
                  {t("settings.configure") || "Configure Learning Settings"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};
