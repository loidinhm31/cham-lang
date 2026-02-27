import { getDb, generateId, getCurrentTimestamp, type PendingChange } from "./database";

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
 * Create a copy of a synced entity with a new ID and reset sync state.
 * The new ID is always forced last — any id in overrides is ignored.
 * Pass overrides to customize other entity-specific fields (e.g. collectionId for vocabularies).
 */
export function copyWithNewId<
  T extends {
    id?: string;
    syncVersion?: number;
    syncedAt?: number | null;
    createdAt: string;
    updatedAt: string;
  },
>(
  entity: T,
  overrides?: Partial<T>,
): T & { id: string; syncVersion: number; syncedAt: undefined } {
  const now = getCurrentTimestamp();
  return {
    ...entity,
    ...overrides,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    syncVersion: 1,
    syncedAt: undefined,
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
  await getDb()._pendingChanges.add(change);
}
