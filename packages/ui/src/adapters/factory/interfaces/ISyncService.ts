import type {
  SyncProgress,
  SyncResult,
  SyncStatus,
} from "../../../../../shared/src/types/sync";

/**
 * Sync service interface for data synchronization
 * Implemented by platform-specific adapters:
 * - TauriSyncAdapter: Uses Tauri invoke for desktop
 * - IndexedDBSyncAdapter: Uses QmSyncClient directly for web
 */
export interface ISyncService {
  /**
   * Trigger a sync operation
   * Pushes local changes and pulls remote changes
   */
  syncNow(): Promise<SyncResult>;

  /**
   * Get current sync status
   */
  getStatus(): Promise<SyncStatus>;

  /**
   * Trigger a sync operation with progress updates
   * Optional method for platforms that support progress reporting
   */
  syncWithProgress?(
    onProgress: (progress: SyncProgress) => void,
  ): Promise<SyncResult>;
}
