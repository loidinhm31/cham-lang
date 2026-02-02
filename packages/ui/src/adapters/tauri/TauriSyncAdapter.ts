import type { ISyncService } from "@cham-lang/shared/services";
import type { SyncResult, SyncStatus } from "@cham-lang/shared/types";
import { invoke } from "@tauri-apps/api/core";

export class TauriSyncAdapter implements ISyncService {
  async syncNow(): Promise<SyncResult> {
    return invoke<SyncResult>("sync_now");
  }

  async getStatus(): Promise<SyncStatus> {
    return invoke<SyncStatus>("sync_get_status");
  }
}
