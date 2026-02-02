/**
 * Collection Service
 * Uses platform adapter for cross-platform compatibility
 */

import { getCollectionService } from "@cham-lang/ui/adapters";
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from "@cham-lang/shared/types";

// Get the platform-specific service
const service = getCollectionService();

export class CollectionService {
  // Collection CRUD
  static async createCollection(
    request: CreateCollectionRequest,
  ): Promise<string> {
    return service.createCollection(request);
  }

  static async getCollection(id: string): Promise<Collection> {
    return service.getCollection(id);
  }

  static async getUserCollections(): Promise<Collection[]> {
    return service.getUserCollections();
  }

  static async getPublicCollections(language?: string): Promise<Collection[]> {
    return service.getPublicCollections(language);
  }

  static async updateCollection(
    request: UpdateCollectionRequest,
  ): Promise<string> {
    return service.updateCollection(request);
  }

  static async deleteCollection(id: string): Promise<string> {
    return service.deleteCollection(id);
  }

  static async shareCollection(
    collectionId: string,
    shareWithUsername: string,
  ): Promise<string> {
    return service.shareCollection(collectionId, shareWithUsername);
  }

  static async unshareCollection(
    collectionId: string,
    userIdToRemove: string,
  ): Promise<string> {
    return service.unshareCollection(collectionId, userIdToRemove);
  }

  static async updateCollectionWordCount(collectionId: string): Promise<void> {
    return service.updateCollectionWordCount(collectionId);
  }

  // Get level configuration for a language
  static async getLevelConfiguration(language: string): Promise<string[]> {
    return service.getLevelConfiguration(language);
  }
}
