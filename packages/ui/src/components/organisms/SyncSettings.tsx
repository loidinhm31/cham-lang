import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Server,
  LogOut,
  Cloud,
  AlertTriangle,
} from "lucide-react";
import { Button, Input, Card } from "@cham-lang/ui/components/atoms";
import { getAuthService, getSyncService } from "@cham-lang/ui/adapters";
import { AuthStatus, SyncResult, SyncStatus } from "@cham-lang/shared/types";
import { AuthForm } from "./AuthForm";

interface SyncSettingsProps {
  onLogout?: () => void;
}

export const SyncSettings: React.FC<SyncSettingsProps> = ({ onLogout }) => {
  const { t } = useTranslation();
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [serverUrl, setServerUrl] = useState("http://localhost:3000");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Load auth and sync status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const authService = getAuthService();
      const syncService = getSyncService();

      const [auth, sync] = await Promise.all([
        authService.getStatus(),
        syncService.getStatus(),
      ]);
      setAuthStatus(auth);
      setSyncStatus(sync);
      if (sync.serverUrl) {
        setServerUrl(sync.serverUrl);
      }
      setError(null);
    } catch (err) {
      // Don't show error immediately on load, just log it
      console.error("Failed to load sync status:", err);
      // But keep loading status false
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleConfigureSync = async () => {
    try {
      const authService = getAuthService();
      await authService.configureSync({
        serverUrl,
        appId: "cham-lang",
        apiKey: "", // API key is not needed for user auth
      });
      await loadStatus();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to configure sync");
    }
  };

  const handleSync = async () => {
    if (!authStatus?.isAuthenticated) {
      setError(t("auth.loginRequired") || "You must be logged in to sync");
      return;
    }

    setIsSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const syncService = getSyncService();
      const result = await syncService.syncNow();
      setSyncResult(result);
      // Reload sync status to update last sync time
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    try {
      const authService = getAuthService();
      await authService.logout();
      setAuthStatus({ isAuthenticated: false });
      setSyncResult(null);
      setError(null);
      onLogout?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to logout");
    }
  };

  const formatTimestamp = (timestamp?: string | number) => {
    if (!timestamp) return t("common.never") || "Never";
    try {
      const date =
        typeof timestamp === "number"
          ? new Date(timestamp * 1000)
          : new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return "Invalid date";
    }
  };

  return (
    <Card variant="glass">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Cloud className="w-6 h-6 text-blue-500" />
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              {t("settings.cloudSync") || "Cloud Sync"}
            </h3>
            <p className="text-sm text-gray-600">
              {t("settings.cloudSyncDescription") ||
                "Keep your data synchronized across devices"}
            </p>
          </div>
        </div>

        {/* Status Section */}
        {authStatus?.isAuthenticated ? (
          <div className="rounded-xl p-4 bg-white/50 border border-gray-200 shadow-sm space-y-4">
            {/* Account Info */}
            <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {authStatus.username || t("auth.unknownUser")}
                </p>
                <p className="text-xs text-gray-500">{authStatus.email}</p>
              </div>
            </div>

            {/* Pending Changes Badge */}
            {syncStatus?.pendingChanges !== undefined &&
              syncStatus.pendingChanges > 0 && (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    {syncStatus.pendingChanges}{" "}
                    {t("sync.pendingChanges") || "pending changes"}
                  </span>
                </div>
              )}

            {/* Sync Result */}
            {syncResult && (
              <div
                className={`p-3 rounded-lg text-sm border ${
                  syncResult.success
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-1 font-medium">
                  {syncResult.success ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  {syncResult.success
                    ? t("sync.success") || "Sync completed"
                    : t("sync.failed") || "Sync failed"}
                </div>
                {syncResult.success && (
                  <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs">
                    <div className="bg-white/50 p-1 rounded">
                      <span className="block font-bold">
                        {syncResult.pushed}
                      </span>
                      <span className="text-gray-500">
                        {t("sync.pushed") || "Pushed"}
                      </span>
                    </div>
                    <div className="bg-white/50 p-1 rounded">
                      <span className="block font-bold">
                        {syncResult.pulled}
                      </span>
                      <span className="text-gray-500">
                        {t("sync.pulled") || "Pulled"}
                      </span>
                    </div>
                    <div className="bg-white/50 p-1 rounded">
                      <span className="block font-bold text-orange-600">
                        {syncResult.conflicts}
                      </span>
                      <span className="text-gray-500">
                        {t("sync.conflicts") || "Conflicts"}
                      </span>
                    </div>
                  </div>
                )}
                {!syncResult.success && syncResult.error && (
                  <p className="mt-1 opacity-90">{syncResult.error}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleSync}
                disabled={isSyncing || isLoadingStatus}
                variant="primary"
                fullWidth
                icon={RefreshCw}
                className={isSyncing ? "animate-pulse" : ""}
              >
                {isSyncing
                  ? t("sync.syncing") || "Syncing..."
                  : t("sync.syncNow") || "Sync Now"}
              </Button>

              <Button
                onClick={handleLogout}
                disabled={isLoadingStatus}
                variant="secondary"
                fullWidth
                icon={LogOut}
              >
                {t("auth.logout") || "Logout"}
              </Button>
            </div>

            {syncStatus?.lastSyncAt ? (
              <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>
                  {t("sync.lastSync") || "Last sync"}:{" "}
                  {formatTimestamp(syncStatus.lastSyncAt)}
                </span>
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center">
                {t("sync.neverSynced") || "Never synced"}
              </p>
            )}
          </div>
        ) : (
          /* Auth Form if not authenticated */
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {t("sync.loginPrompt") ||
                "Sign in to sync your vocabulary and collections across all your devices."}
            </p>
            <AuthForm onSuccess={() => loadStatus()} />
          </div>
        )}

        {/* Server Config (Collapsed) */}
        <div className="pt-4 border-t border-gray-200">
          <details className="text-sm group">
            <summary className="cursor-pointer text-gray-500 hover:text-gray-700 font-medium mb-2 flex items-center gap-2 select-none">
              <Server className="w-4 h-4" />
              {t("settings.serverConfig") || "Server Configuration"}
              <span className="ml-auto text-xs opacity-0 group-open:opacity-100 transition-opacity">
                {serverUrl}
              </span>
            </summary>
            <div className="space-y-2 pl-2 pt-2 animate-in slide-in-from-top-1 duration-200">
              <label className="block text-xs text-gray-500">
                {t("settings.serverUrl") || "Server URL"}
              </label>
              <div className="flex gap-2">
                <Input
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://localhost:3000"
                  className="text-xs py-1"
                />
                <Button
                  onClick={handleConfigureSync}
                  size="sm"
                  variant="secondary"
                  disabled={isLoadingStatus}
                >
                  {t("buttons.save") || "Save"}
                </Button>
              </div>
            </div>
          </details>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>
    </Card>
  );
};
