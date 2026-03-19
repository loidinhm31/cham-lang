import { useCallback, useEffect, useRef } from "react";
import type { ISyncService } from "@cham-lang/ui/adapters/factory/interfaces";

interface UseAutoSyncOptions {
  syncService: ISyncService | null;
  enabled: boolean;
  intervalMs?: number;
}

export function useAutoSync({
  syncService,
  enabled,
  intervalMs = 60_000,
}: UseAutoSyncOptions): void {
  const isSyncingRef = useRef(false);

  const doSync = useCallback(async () => {
    if (!syncService || isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      await syncService.syncNow();
    } catch (e) {
      console.warn("[auto-sync] failed:", e);
    } finally {
      isSyncingRef.current = false;
    }
  }, [syncService]);

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
