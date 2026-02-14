import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Server,
  Cloud,
  CloudOff,
} from "lucide-react";
import { Button, Input, Card } from "@cham-lang/ui/components/atoms";
import { AuthService, SyncService } from "@cham-lang/ui/services";
import {
  AuthStatus,
  SyncProgress,
  SyncResult,
  SyncStatus,
} from "@cham-lang/shared/types";
import { isTauri } from "@cham-lang/ui/utils";

export interface SyncSettingsProps {

}

export const SyncSettings: React.FC<SyncSettingsProps> = () => {
  const { t } = useTranslation();
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [serverUrl, setServerUrl] = useState("http://localhost:3000");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Load auth and sync status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const [auth, sync] = await Promise.all([
        AuthService.getStatus(),
        SyncService.getStatus(),
      ]);
      setAuthStatus(auth);
      setSyncStatus(sync);
      if (auth.serverUrl) {
        setServerUrl(auth.serverUrl);
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
      await AuthService.configureSync({
        serverUrl,
      });
      await loadStatus();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sync.configureFailed"));
    }
  };

  const handleSync = async () => {
    if (!authStatus?.isAuthenticated) {
      setError(t("auth.loginRequired"));
      return;
    }

    setIsSyncing(true);
    setError(null);
    setSyncResult(null);
    setSyncProgress(null);

    try {
      // Use progress-aware sync
      const result = await SyncService.syncWithProgress((progress) => {
        setSyncProgress(progress);
      });
      setSyncResult(result);

      // Reload sync status to update last sync time
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sync.failed"));
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const formatTimestamp = (timestamp?: string | number) => {
    if (!timestamp) return t("common.never");
    try {
      const date =
        typeof timestamp === "number"
          ? new Date(timestamp * 1000)
          : new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return t("common.invalidDate");
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
              <h2 className="text-2xl font-semibold mb-2 text-(--color-text-primary)">
                {t("settings.cloudSync")}
              </h2>
              <p className="mb-4 text-text-secondary">
                {t("settings.cloudSyncDescription")}
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
                <span className="text-sm text-text-secondary">
                  {isSyncing
                    ? t("sync.syncing")
                    : authStatus?.isAuthenticated
                      ? t("auth.connected")
                      : t("auth.notLoggedIn")}
                </span>
                {syncStatus?.lastSyncAt && (
                  <span className="text-xs text-text-muted">
                    — {t("sync.lastSync")}:{" "}
                    {formatTimestamp(syncStatus.lastSyncAt)}
                  </span>
                )}
              </div>

              {/* Pending changes badge */}
              {syncStatus?.pendingChanges !== undefined &&
                syncStatus.pendingChanges > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 bg-blue-50 text-blue-600 border border-blue-100">
                    <AlertCircle className="w-3 h-3" />
                    {syncStatus.pendingChanges} {t("sync.pendingChanges")}
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
                    ? t("sync.success")
                    : `${t("sync.failed")}${syncResult.error ? `: ${syncResult.error}` : ""}`}
                </span>
              </div>

              {syncResult.success && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/60 text-center p-2 rounded border border-gray-100">
                    <div className="text-lg font-bold text-(--color-text-primary)">
                      {syncResult.pushed}
                    </div>
                    <div className="text-xs text-text-muted">
                      {t("sync.pushed")}
                    </div>
                  </div>
                  <div className="bg-white/60 text-center p-2 rounded border border-gray-100">
                    <div className="text-lg font-bold text-(--color-text-primary)">
                      {syncResult.pulled}
                    </div>
                    <div className="text-xs text-text-muted">
                      {t("sync.pulled")}
                    </div>
                  </div>
                  <div className="bg-white/60 text-center p-2 rounded border border-gray-100">
                    <div className="text-lg font-bold text-(--color-text-primary)">
                      {syncResult.conflicts}
                    </div>
                    <div className="text-xs text-text-muted">
                      {t("sync.conflicts")}
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

          {/* Sync Progress */}
          {isSyncing && syncProgress && (
            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                <span className="text-sm font-medium text-blue-700">
                  {syncProgress.phase === "pushing"
                    ? t("sync.pushing")
                    : t("sync.pulling")}
                </span>
              </div>
              <div className="text-sm text-blue-600">
                {syncProgress.phase === "pushing" ? (
                  <span>
                    {t("sync.recordsPushed", {
                      count: syncProgress.recordsPushed,
                    })}
                  </span>
                ) : (
                  <span>
                    {t("sync.recordsPulled", {
                      count: syncProgress.recordsPulled,
                      page: syncProgress.currentPage,
                    })}
                    {syncProgress.hasMore && ` - ${t("sync.morePages")}`}
                  </span>
                )}
              </div>
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
                  {isSyncing ? t("sync.syncing") : t("sync.syncNow")}
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Server Configuration Card - Only shown in Tauri (native) mode */}
      {isTauri() && (
        <Card variant="glass">
          <div className="p-2">
            <div className="flex items-start gap-4">
              <Server className="w-6 h-6 text-blue-500" />
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-2 text-(--color-text-primary)">
                  {t("settings.serverConfig")}
                </h2>
                <p className="mb-4 text-text-secondary">
                  {t("settings.serverConfigDescription")}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-(--color-text-primary)">
                      {t("settings.serverUrl")}
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
                    {t("sync.saveConfig")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
