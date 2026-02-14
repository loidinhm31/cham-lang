/**
 * Sync Service
 * Uses platform adapter for cross-platform compatibility
 * Lazy service access + error handling pattern
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
    try {
      const service = getSyncService();
      return await service.syncNow();
    } catch (error) {
      console.error("Error syncing:", error);
      throw SyncService.handleError(error);
    }
  }

  /**
   * Get current sync status
   */
  static async getStatus(): Promise<SyncStatus> {
    try {
      const service = getSyncService();
      return await service.getStatus();
    } catch (error) {
      console.error("Error getting sync status:", error);
      return {
        configured: false,
        authenticated: false,
        pendingChanges: 0,
      };
    }
  }

  /**
   * Trigger immediate sync with progress callback
   */
  static async syncWithProgress(
    onProgress?: (progress: SyncProgress) => void,
  ): Promise<SyncResult> {
    try {
      const service = getSyncService();
      if (service.syncWithProgress && onProgress) {
        return await service.syncWithProgress(onProgress);
      }
      // Fallback to regular sync if syncWithProgress not available or no callback
      return await service.syncNow();
    } catch (error) {
      console.error("Error syncing with progress:", error);
      throw SyncService.handleError(error);
    }
  }

  private static handleError(error: unknown): Error {
    if (typeof error === "string") return new Error(error);
    return error instanceof Error ? error : new Error("Unknown error occurred");
  }
}
