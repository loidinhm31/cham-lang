/**
 * IndexedDB Sync Adapter for cham-lang
 */

import type { ISyncService } from "@cham-lang/ui/adapters/factory/interfaces";
import type { SyncResult, SyncStatus } from "@cham-lang/shared/types";
import {
  createSyncClientConfig,
  type HttpClientFn,
  QmSyncClient,
} from "@cham-lang/shared/types";
import { IndexedDBSyncStorage } from "./IndexedDBSyncStorage";

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

export interface IndexedDBSyncAdapterConfig {
  serverUrl: string;
  appId: string;
  apiKey: string;
  httpClient?: HttpClientFn;
  getTokens: TokenProvider;
  saveTokens?: TokenSaver;
}

export class IndexedDBSyncAdapter implements ISyncService {
  private client: QmSyncClient;
  private storage: IndexedDBSyncStorage;
  private config: IndexedDBSyncAdapterConfig;
  private initialized = false;

  constructor(config: IndexedDBSyncAdapterConfig) {
    this.config = config;
    const clientConfig = createSyncClientConfig(
      config.serverUrl,
      config.appId,
      config.apiKey,
    );
    this.client = new QmSyncClient(clientConfig, config.httpClient);
    this.storage = new IndexedDBSyncStorage();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const { accessToken, refreshToken, userId } = await this.config.getTokens();
    if (accessToken && refreshToken) {
      this.client.setTokens(accessToken, refreshToken, userId);
    }

    this.initialized = true;
  }

  async syncNow(): Promise<SyncResult> {
    // Refresh tokens before sync
    const { accessToken, refreshToken, userId } = await this.config.getTokens();
    if (accessToken && refreshToken) {
      this.client.setTokens(accessToken, refreshToken, userId);
    }
    this.initialized = true;

    if (!this.client.isAuthenticated()) {
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
      const pendingChanges = await this.storage.getPendingChanges();
      const checkpoint = await this.storage.getCheckpoint();

      const response = await this.client.delta(pendingChanges, checkpoint);

      let pushed = 0;
      let pulled = 0;
      let conflicts = 0;

      if (response.push) {
        pushed = response.push.synced;
        conflicts = response.push.conflicts.length;

        if (pushed > 0) {
          const syncedIds = pendingChanges.map((r) => ({
            tableName: r.tableName,
            rowId: r.rowId,
          }));
          await this.storage.markSynced(syncedIds);
        }
      }

      if (response.pull) {
        pulled = response.pull.records.length;

        if (pulled > 0) {
          await this.storage.applyRemoteChanges(response.pull.records);
        }

        await this.storage.saveCheckpoint(response.pull.checkpoint);
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
      console.error("Sync failed:", error);
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

    const [pendingChanges, lastSyncAt] = await Promise.all([
      this.storage.getPendingChangesCount(),
      this.storage.getLastSyncAt(),
    ]);

    return {
      configured: true,
      authenticated: this.client.isAuthenticated(),
      lastSyncAt,
      pendingChanges,
      serverUrl: this.config.serverUrl,
    };
  }
}
