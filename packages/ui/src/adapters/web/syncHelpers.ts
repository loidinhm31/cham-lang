import { db, generateId, type PendingChange } from "./database";

/**
 * Add sync tracking fields to a new or updated entity
 */
export function withSyncTracking<T extends Record<string, unknown>>(
  entity: T,
  existing?: { syncVersion?: number },
): T & { syncVersion: number; syncedAt: undefined } {
  return {
    ...entity,
    syncVersion: (existing?.syncVersion ?? 0) + 1,
    syncedAt: undefined, // Mark as unsynced
  };
}

/**
 * Track a deletion for sync
 */
export async function trackDelete(
  tableName: string,
  recordId: string,
  syncVersion: number,
): Promise<void> {
  const change: PendingChange = {
    id: generateId(),
    tableName,
    recordId,
    operation: "delete",
    syncVersion,
    createdAt: Math.floor(Date.now() / 1000),
  };
  await db._pendingChanges.add(change);
}
