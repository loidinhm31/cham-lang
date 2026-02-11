import type { ISyncService } from "@cham-lang/ui/adapters/factory/interfaces";
import type {
  SyncProgress,
  SyncResult,
  SyncStatus,
} from "@cham-lang/shared/types";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export class TauriSyncAdapter implements ISyncService {
  async syncNow(): Promise<SyncResult> {
    return invoke<SyncResult>("sync_now");
  }

  async syncWithProgress(
    onProgress: (progress: SyncProgress) => void,
  ): Promise<SyncResult> {
    // Subscribe to progress events before starting sync
    let unlisten: UnlistenFn | undefined;

    try {
      unlisten = await listen<SyncProgress>("sync:progress", (event) => {
        onProgress(event.payload);
      });

      // Run the sync operation
      return await invoke<SyncResult>("sync_now");
    } finally {
      // Always unsubscribe when done
      if (unlisten) {
        unlisten();
      }
    }
  }

  async getStatus(): Promise<SyncStatus> {
    return invoke<SyncStatus>("sync_get_status");
  }
}
