// Sync types for data synchronization with qm-sync

// Re-export sync protocol types from @qm-center/sync-client-types (single source of truth)
export type {
  SyncRecord,
  Checkpoint,
  ConflictInfo,
  PushRequest,
  PushRecord,
  PushResponse,
  PullRequest,
  PullResponse,
  PullRecord,
  DeltaRequest,
  DeltaResponse,
  AuthHeaders,
  HttpRequest,
  HttpResponse,
  SyncClientConfig,
  RefreshResponse,
} from "@qm-center/sync-client-types";

// Re-export helper functions
export {
  createAuthHeaders,
  withBearer,
  createSyncClientConfig,
  initialCheckpoint,
} from "@qm-center/sync-client-types";

// Re-export client implementation for TypeScript/JavaScript apps
export {
  QmSyncClient,
  fetchHttpClient,
  type HttpClientFn,
} from "@qm-center/sync-client-types";

// =============================================================================
// App-specific types (not in @qm-center/sync-client-types)
// =============================================================================

/**
 * Sync configuration status
 */
export interface SyncStatus {
  configured: boolean;
  authenticated: boolean;
  lastSyncAt?: number; // Unix timestamp
  pendingChanges: number;
  serverUrl?: string;
}

/**
 * Result of a sync operation.
 */
export interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  success: boolean;
  error?: string;
  syncedAt: number; // Unix timestamp when sync completed
}

/**
 * Metadata stored for each table's sync state
 */
export interface SyncMetadata {
  tableName: string;
  lastSyncTimestamp?: string;
  appId?: string;
  apiKey?: string;
}
