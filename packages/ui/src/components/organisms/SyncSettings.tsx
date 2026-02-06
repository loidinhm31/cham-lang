import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Server,
  Cloud,
  CloudOff,
  AlertTriangle,
} from "lucide-react";
import { Button, Input, Card } from "@cham-lang/ui/components/atoms";
import { getAuthService, getSyncService } from "@cham-lang/ui/adapters";
import { AuthStatus, SyncResult, SyncStatus } from "@cham-lang/shared/types";

export const SyncSettings: React.FC = () => {
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
    <div className="space-y-6">
      {/* Cloud Sync Status Card */}
      <Card variant="glass">
        <div className="p-2">
          <div className="flex items-start gap-4">
            <Cloud className="w-6 h-6 text-blue-500" />
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-2 text-[var(--color-text-primary)]">
                {t("settings.cloudSync") || "Cloud Sync"}
              </h2>
              <p className="mb-4 text-[var(--color-text-secondary)]">
                {t("settings.cloudSyncDescription") ||
                  "Keep your data synchronized across devices"}
              </p>

              {/* Status indicator */}
              <div className="flex items-center gap-2 mb-4">
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                ) : authStatus?.isAuthenticated ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <CloudOff className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {isSyncing
                    ? t("sync.syncing") || "Syncing..."
                    : authStatus?.isAuthenticated
                      ? t("auth.connected") || "Connected"
                      : t("auth.notLoggedIn") || "Not logged in"}
                </span>
                {syncStatus?.lastSyncAt && (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    — {t("sync.lastSync") || "Last sync"}:{" "}
                    {formatTimestamp(syncStatus.lastSyncAt)}
                  </span>
                )}
              </div>

              {/* Pending changes badge */}
              {syncStatus?.pendingChanges !== undefined &&
                syncStatus.pendingChanges > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 bg-blue-50 text-blue-600 border border-blue-100">
                    <AlertCircle className="w-3 h-3" />
                    {syncStatus.pendingChanges}{" "}
                    {t("sync.pendingChanges") || "pending changes"}
                  </div>
                )}
            </div>
          </div>

          {/* Sync Result */}
          {syncResult && (
            <div
              className={`mt-4 p-4 rounded-lg border ${
                syncResult.success
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                {syncResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <span
                  className={`text-sm font-semibold ${syncResult.success ? "text-green-700" : "text-red-700"}`}
                >
                  {syncResult.success
                    ? t("sync.success") || "Sync completed"
                    : `${t("sync.failed") || "Sync failed"}${syncResult.error ? `: ${syncResult.error}` : ""}`}
                </span>
              </div>

              {syncResult.success && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/60 text-center p-2 rounded border border-gray-100">
                    <div className="text-lg font-bold text-[var(--color-text-primary)]">
                      {syncResult.pushed}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {t("sync.pushed") || "Pushed"}
                    </div>
                  </div>
                  <div className="bg-white/60 text-center p-2 rounded border border-gray-100">
                    <div className="text-lg font-bold text-[var(--color-text-primary)]">
                      {syncResult.pulled}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {t("sync.pulled") || "Pulled"}
                    </div>
                  </div>
                  <div className="bg-white/60 text-center p-2 rounded border border-gray-100">
                    <div className="text-lg font-bold text-[var(--color-text-primary)]">
                      {syncResult.conflicts}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {t("sync.conflicts") || "Conflicts"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-col gap-3">
            {authStatus?.isAuthenticated && (
              <>
                <Button
                  variant="primary"
                  onClick={handleSync}
                  disabled={isSyncing || isLoadingStatus}
                  fullWidth
                  icon={RefreshCw}
                  className={isSyncing ? "animate-pulse" : ""}
                >
                  {isSyncing
                    ? t("sync.syncing") || "Syncing..."
                    : t("sync.syncNow") || "Sync Now"}
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Server Configuration Card */}
      <Card variant="glass">
        <div className="p-2">
          <div className="flex items-start gap-4">
            <Server className="w-6 h-6 text-blue-500" />
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-2 text-[var(--color-text-primary)]">
                {t("settings.serverConfig") || "Server Configuration"}
              </h2>
              <p className="mb-4 text-[var(--color-text-secondary)]">
                {t("settings.serverConfigDescription") ||
                  "Configure the sync server connection"}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-text-primary)]">
                    {t("settings.serverUrl") || "Server URL"}
                  </label>
                  <Input
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://localhost:3000"
                    className="text-sm"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleConfigureSync}
                  disabled={isLoadingStatus || !serverUrl}
                >
                  {t("sync.saveConfig") || "Save Configuration"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
