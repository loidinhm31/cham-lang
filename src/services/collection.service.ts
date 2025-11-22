import { invoke } from "@tauri-apps/api/core";
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from "@/types/collection";

export class CollectionService {
  // Collection CRUD
  static async createCollection(
    request: CreateCollectionRequest,
  ): Promise<string> {
    return invoke("create_collection", { request });
  }

  static async getCollection(id: string): Promise<Collection> {
    return invoke("get_collection", { id });
  }

  static async getUserCollections(): Promise<Collection[]> {
    return invoke("get_user_collections");
  }

  static async getPublicCollections(language?: string): Promise<Collection[]> {
    return invoke("get_public_collections", { language });
  }

  static async updateCollection(
    request: UpdateCollectionRequest,
  ): Promise<string> {
    return invoke("update_collection", { request });
  }

  static async deleteCollection(id: string): Promise<string> {
    return invoke("delete_collection", { id });
  }

  static async shareCollection(
    collectionId: string,
    shareWithUsername: string,
  ): Promise<string> {
    return invoke("share_collection", {
      collectionId,
      shareWithUsername,
    });
  }

  static async unshareCollection(
    collectionId: string,
    userIdToRemove: string,
  ): Promise<string> {
    return invoke("unshare_collection", {
      collectionId,
      userIdToRemove,
    });
  }

  static async updateCollectionWordCount(collectionId: string): Promise<void> {
    return invoke("update_collection_word_count", { collectionId });
  }

  // Get level configuration for a language
  static async getLevelConfiguration(language: string): Promise<string[]> {
    return invoke("get_level_configuration", { language });
  }
}
