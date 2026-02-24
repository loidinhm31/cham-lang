/**
 * IndexedDB Sync Adapter for cham-lang
 */

import type { ISyncService } from "@cham-lang/ui/adapters/factory/interfaces";
import type {
  SyncProgress,
  SyncResult,
  SyncStatus,
} from "@cham-lang/shared/types";
import { serviceLogger } from "@cham-lang/ui/utils";
import {
  createSyncClientConfig,
  type HttpClientFn,
  QmSyncClient,
} from "@cham-lang/shared/types";
import { IndexedDBSyncStorage } from "@cham-lang/ui/adapters/web";

export type TokenProvider = () => Promise<{
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
}>;

export type TokenSaver = (
  accessToken: string,
  refreshToken: string,
  userId: string,
) => Promise<void>;

export type SyncConfigProvider = () => {
  serverUrl: string;
  appId: string;
  apiKey: string;
};

export interface IndexedDBSyncAdapterConfig {
  getConfig: SyncConfigProvider;
  httpClient?: HttpClientFn;
  getTokens: TokenProvider;
  saveTokens?: TokenSaver;
}

export class IndexedDBSyncAdapter implements ISyncService {
  private client: QmSyncClient | null = null;
  private storage: IndexedDBSyncStorage;
  private config: IndexedDBSyncAdapterConfig;
  private initialized = false;
  private lastConfigHash: string = "";

  constructor(config: IndexedDBSyncAdapterConfig) {
    this.config = config;
    this.storage = new IndexedDBSyncStorage();
  }

  private getConfigHash(syncConfig: {
    serverUrl: string;
    appId: string;
    apiKey: string;
  }): string {
    return `${syncConfig.serverUrl}|${syncConfig.appId}|${syncConfig.apiKey}`;
  }

  private ensureClient(): QmSyncClient {
    const syncConfig = this.config.getConfig();
    const configHash = this.getConfigHash(syncConfig);

    if (!this.client || configHash !== this.lastConfigHash) {
      const clientConfig = createSyncClientConfig(
        syncConfig.serverUrl,
        syncConfig.appId,
        syncConfig.apiKey,
      );
      this.client = new QmSyncClient(clientConfig, this.config.httpClient);
      this.lastConfigHash = configHash;
      this.initialized = false;
    }

    return this.client;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const client = this.ensureClient();
    const { accessToken, refreshToken, userId } = await this.config.getTokens();
    if (accessToken && refreshToken) {
      client.setTokens(accessToken, refreshToken, userId);
    }

    this.initialized = true;
  }

  async syncNow(): Promise<SyncResult> {
    // Call syncWithProgress with a no-op callback for backwards compatibility
    return this.syncWithProgress(() => {});
  }

  async syncWithProgress(
    onProgress: (progress: SyncProgress) => void,
  ): Promise<SyncResult> {
    // Get fresh client with current config
    const client = this.ensureClient();

    // Refresh tokens before sync
    const { accessToken, refreshToken, userId } = await this.config.getTokens();
    if (accessToken && refreshToken) {
      await client.setTokens(accessToken, refreshToken, userId);
    }
    this.initialized = true;

    if (!client.isAuthenticated()) {
      return {
        pushed: 0,
        pulled: 0,
        conflicts: 0,
        success: false,
        error: "Not authenticated",
        syncedAt: Math.floor(Date.now() / 1000),
      };
    }

    try {
      const pendingChanges = await this.storage.getPendingChanges(userId);
      const checkpoint = await this.storage.getCheckpoint();

      const response = await client.delta(pendingChanges, checkpoint);

      let pushed = 0;
      let pulled = 0;
      let conflicts = 0;

      if (response.push) {
        pushed = response.push.synced;
        conflicts = response.push.conflicts.length;

        if (pushed > 0) {
          // Exclude records that conflicted or failed — they need retry on next sync
          type PushFailure = { tableName: string; rowId: string };
          const pushFailures: PushFailure[] =
            (response.push as { failures?: PushFailure[] }).failures ?? [];
          const skipKeys = new Set<string>([
            ...response.push.conflicts.map((c) => `${c.tableName}:${c.rowId}`),
            ...pushFailures.map((f) => `${f.tableName}:${f.rowId}`),
          ]);
          const syncedIds = pendingChanges
            .filter((r) => !skipKeys.has(`${r.tableName}:${r.rowId}`))
            .map((r) => ({ tableName: r.tableName, rowId: r.rowId }));
          await this.storage.markSynced(syncedIds);
        }

        // Emit progress after push phase
        onProgress({
          phase: "pushing",
          recordsPushed: pushed,
          recordsPulled: 0,
          hasMore: response.pull?.hasMore ?? false,
          currentPage: 0,
        });
      }

      if (response.pull) {
        // Collect ALL records from ALL pages first to ensure proper ordering
        const allRecords = [...response.pull.records];
        pulled = allRecords.length;

        // Auto-continue pulling while has_more is true
        let currentCheckpoint = response.pull.checkpoint;
        let hasMore = response.pull.hasMore;
        let page = 1;

        // Emit progress after initial pull
        onProgress({
          phase: "pulling",
          recordsPushed: pushed,
          recordsPulled: pulled,
          hasMore,
          currentPage: page,
        });

        while (hasMore) {
          page++;
          serviceLogger.syncDebug(
            "Pulling more records, checkpoint:",
            currentCheckpoint,
          );

          const pullResponse = await client.pull(currentCheckpoint);

          // Collect records from this page
          allRecords.push(...pullResponse.records);
          pulled += pullResponse.records.length;

          currentCheckpoint = pullResponse.checkpoint;
          hasMore = pullResponse.hasMore;

          // Emit progress after each page
          onProgress({
            phase: "pulling",
            recordsPushed: pushed,
            recordsPulled: pulled,
            hasMore,
            currentPage: page,
          });
        }

        // Apply ALL changes at once after collecting from all pages
        serviceLogger.syncDebug(
          `Applying ${allRecords.length} total records from ${page} pages`,
        );
        if (allRecords.length > 0) {
          await this.storage.applyRemoteChanges(allRecords);
        }

        await this.storage.saveCheckpoint(currentCheckpoint);
      }

      const syncedAt = Math.floor(Date.now() / 1000);
      await this.storage.saveLastSyncAt(syncedAt);

      return {
        pushed,
        pulled,
        conflicts,
        success: true,
        syncedAt,
      };
    } catch (error) {
      serviceLogger.syncError("Sync failed:", error);
      return {
        pushed: 0,
        pulled: 0,
        conflicts: 0,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        syncedAt: Math.floor(Date.now() / 1000),
      };
    }
  }

  async getStatus(): Promise<SyncStatus> {
    await this.initialize();

    const client = this.ensureClient();
    const [pendingChanges, lastSyncAt] = await Promise.all([
      this.storage.getPendingChangesCount(),
      this.storage.getLastSyncAt(),
    ]);

    return {
      configured: true,
      authenticated: client.isAuthenticated(),
      lastSyncAt,
      pendingChanges,
    };
  }
}
