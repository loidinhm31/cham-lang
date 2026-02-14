import type { SyncProgress, SyncResult, SyncStatus } from "@cham-lang/shared";

/**
 * Sync service interface for data synchronization
 * Implemented by IndexedDBSyncAdapter which uses QmSyncClient for all platforms
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
