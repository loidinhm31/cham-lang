import { useCallback, useRef } from "react";
import { useSyncToastContext } from "@cham-lang/ui/contexts";
import type { SyncResult } from "@cham-lang/shared";

export function useSyncToast() {
  const { addToast, updateToast } = useSyncToastContext();
  const activeToastIdRef = useRef<string | null>(null);

  // Safe from concurrent overwrites: isSyncingRef in useAutoSync prevents
  // a second sync from starting while one is in flight.
  const handleSyncStart = useCallback(() => {
    const id = addToast("Syncing...", "syncing");
    activeToastIdRef.current = id;
  }, [addToast]);

  const handleSyncResult = useCallback(
    (result: SyncResult) => {
      const id = activeToastIdRef.current;
      activeToastIdRef.current = null;

      if (!result.success) {
        if (id) {
          updateToast(id, "Sync failed", "error");
        } else {
          addToast("Sync failed", "error");
        }
        return;
      }

      const msg =
        result.pushed === 0 && result.pulled === 0
          ? "Up to date"
          : `Synced: ↑${result.pushed} ↓${result.pulled}`;

      if (id) {
        updateToast(id, msg, "success");
      } else {
        addToast(msg, "success");
      }
    },
    [addToast, updateToast],
  );

  return { handleSyncStart, handleSyncResult };
}
