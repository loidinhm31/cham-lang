/**
 * Tauri Collection Adapter
 * Wraps Tauri IPC calls for collection operations
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from "@cham-lang/shared/types";
import { ICollectionService } from "@cham-lang/shared/services";

export class TauriCollectionAdapter implements ICollectionService {
  async createCollection(request: CreateCollectionRequest): Promise<string> {
    return invoke("create_collection", { request });
  }

  async getCollection(id: string): Promise<Collection> {
    return invoke("get_collection", { id });
  }

  async getUserCollections(): Promise<Collection[]> {
    return invoke("get_user_collections");
  }

  async getPublicCollections(language?: string): Promise<Collection[]> {
    return invoke("get_public_collections", { language });
  }

  async updateCollection(request: UpdateCollectionRequest): Promise<string> {
    return invoke("update_collection", { request });
  }

  async deleteCollection(id: string): Promise<string> {
    return invoke("delete_collection", { id });
  }

  async shareCollection(
    collectionId: string,
    shareWithUsername: string,
  ): Promise<string> {
    return invoke("share_collection", {
      collectionId,
      shareWithUsername,
    });
  }

  async unshareCollection(
    collectionId: string,
    userIdToRemove: string,
  ): Promise<string> {
    return invoke("unshare_collection", {
      collectionId,
      userIdToRemove,
    });
  }

  async updateCollectionWordCount(collectionId: string): Promise<void> {
    return invoke("update_collection_word_count", { collectionId });
  }

  async getLevelConfiguration(language: string): Promise<string[]> {
    return invoke("get_level_configuration", { language });
  }
}
