/**
 * Sync Service
 * Direct passthrough to the platform adapter via ServiceFactory
 */

import { getSyncService } from "@cham-lang/ui/adapters";
import type {
  SyncResult,
  SyncStatus,
  SyncProgress,
} from "@cham-lang/shared/types";

export class SyncService {
  /**
   * Trigger immediate sync with server
   */
  static async syncNow(): Promise<SyncResult> {
    return getSyncService().syncNow();
  }

  /**
   * Get current sync status
   */
  static async getStatus(): Promise<SyncStatus> {
    return getSyncService().getStatus();
  }

  /**
   * Trigger immediate sync with progress callback
   */
  static async syncWithProgress(
    onProgress?: (progress: SyncProgress) => void,
  ): Promise<SyncResult> {
    const service = getSyncService();
    if (service.syncWithProgress && onProgress) {
      return service.syncWithProgress(onProgress);
    }
    // Fallback to regular sync if syncWithProgress not available or no callback
    return service.syncNow();
  }
}
