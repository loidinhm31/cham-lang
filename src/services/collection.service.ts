import { invoke } from '@tauri-apps/api/core';
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from '../types/collection';

export class CollectionService {
  // Collection CRUD
  static async createCollection(
    userId: string,
    request: CreateCollectionRequest
  ): Promise<string> {
    return invoke('create_collection', { userId, request });
  }

  static async getCollection(id: string): Promise<Collection> {
    return invoke('get_collection', { id });
  }

  static async getUserCollections(userId: string): Promise<Collection[]> {
    return invoke('get_user_collections', { userId });
  }

  static async getPublicCollections(language?: string): Promise<Collection[]> {
    return invoke('get_public_collections', { language });
  }

  static async updateCollection(
    userId: string,
    request: UpdateCollectionRequest
  ): Promise<string> {
    return invoke('update_collection', { userId, request });
  }

  static async deleteCollection(userId: string, id: string): Promise<string> {
    return invoke('delete_collection', { userId, id });
  }

  static async shareCollection(
    ownerId: string,
    collectionId: string,
    shareWithUsername: string
  ): Promise<string> {
    return invoke('share_collection', {
      ownerId,
      collectionId,
      shareWithUsername,
    });
  }

  static async unshareCollection(
    ownerId: string,
    collectionId: string,
    userIdToRemove: string
  ): Promise<string> {
    return invoke('unshare_collection', {
      ownerId,
      collectionId,
      userIdToRemove,
    });
  }

  static async updateCollectionWordCount(collectionId: string): Promise<void> {
    return invoke('update_collection_word_count', { collectionId });
  }

  // Get level configuration for a language
  static async getLevelConfiguration(language: string): Promise<string[]> {
    return invoke('get_level_configuration', { language });
  }
}
