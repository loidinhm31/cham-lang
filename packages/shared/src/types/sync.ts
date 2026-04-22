// Sync types for data synchronization with glean-oak-sync

// Re-export sync protocol types from @glean-oak/sync-client-types (single source of truth)
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
} from "@glean-oak/sync-client-types";

// Re-export helper functions
export {
  createAuthHeaders,
  withBearer,
  createSyncClientConfig,
  initialCheckpoint,
} from "@glean-oak/sync-client-types";

// Re-export client implementation for TypeScript/JavaScript apps
export {
  GleanOakClient,
  fetchHttpClient,
  type HttpClientFn,
} from "@glean-oak/sync-client-types";

// =============================================================================
// App-specific types (not in @glean-oak/sync-client-types)
// =============================================================================

/**
 * Sync configuration status
 */
export interface SyncStatus {
  configured: boolean;
  authenticated: boolean;
  lastSyncAt?: number; // Unix timestamp
  pendingChanges: number;
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

/**
 * Progress information during sync operation
 */
export interface SyncProgress {
  phase: "pushing" | "pulling";
  recordsPushed: number;
  recordsPulled: number;
  hasMore: boolean;
  currentPage: number;
}
