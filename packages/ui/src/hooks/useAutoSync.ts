import { useCallback, useEffect, useRef } from "react";
import type { ISyncService } from "@cham-lang/ui/adapters/factory/interfaces";
import type { SyncResult } from "@cham-lang/shared";

interface UseAutoSyncOptions {
  syncService: ISyncService | null;
  enabled: boolean;
  intervalMs?: number;
  onSyncStart?: () => void;
  onSyncResult?: (result: SyncResult) => void;
}

export function useAutoSync({
  syncService,
  enabled,
  intervalMs = 60_000,
  onSyncStart,
  onSyncResult,
}: UseAutoSyncOptions): void {
  const isSyncingRef = useRef(false);

  const doSync = useCallback(async () => {
    if (!syncService || isSyncingRef.current) return;
    isSyncingRef.current = true;
    onSyncStart?.();
    try {
      const result = await syncService.syncNow();
      onSyncResult?.(result);
    } catch (e) {
      console.warn("[auto-sync] failed:", e);
      onSyncResult?.({
        pushed: 0,
        pulled: 0,
        conflicts: 0,
        success: false,
        error: e instanceof Error ? e.message : "Sync failed",
        syncedAt: Date.now(),
      });
    } finally {
      isSyncingRef.current = false;
    }
  }, [syncService, onSyncStart, onSyncResult]);

  useEffect(() => {
    if (!enabled || !syncService) return;

    doSync();

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startInterval = () => {
      if (!intervalId) {
        intervalId = setInterval(doSync, intervalMs);
      }
    };

    const stopInterval = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopInterval();
      } else {
        doSync();
        startInterval();
      }
    };

    if (!document.hidden) {
      startInterval();
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, syncService, intervalMs, doSync]);
}
