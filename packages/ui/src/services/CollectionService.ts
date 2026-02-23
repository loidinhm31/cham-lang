/**
 * Collection Service
 * Direct passthrough to the platform adapter via ServiceFactory
 */

import { getCollectionService } from "@cham-lang/ui/adapters";
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from "@cham-lang/shared/types";

export class CollectionService {
  // Collection CRUD
  static async createCollection(
    request: CreateCollectionRequest,
  ): Promise<string> {
    return getCollectionService().createCollection(request);
  }

  static async getCollection(id: string): Promise<Collection> {
    return getCollectionService().getCollection(id);
  }

  static async getUserCollections(): Promise<Collection[]> {
    return getCollectionService().getUserCollections();
  }

  static async getPublicCollections(language?: string): Promise<Collection[]> {
    return getCollectionService().getPublicCollections(language);
  }

  static async updateCollection(
    request: UpdateCollectionRequest,
  ): Promise<string> {
    return getCollectionService().updateCollection(request);
  }

  static async deleteCollection(id: string): Promise<string> {
    return getCollectionService().deleteCollection(id);
  }

  static async shareCollection(
    collectionId: string,
    shareWithUserId: string,
    permission?: "viewer" | "editor",
  ): Promise<string> {
    return getCollectionService().shareCollection(
      collectionId,
      shareWithUserId,
      permission,
    );
  }

  static async updateSharePermission(
    collectionId: string,
    userId: string,
    permission: "viewer" | "editor",
  ): Promise<string> {
    return getCollectionService().updateSharePermission(
      collectionId,
      userId,
      permission,
    );
  }

  static async unshareCollection(
    collectionId: string,
    userIdToRemove: string,
  ): Promise<string> {
    return getCollectionService().unshareCollection(
      collectionId,
      userIdToRemove,
    );
  }

  static async updateCollectionWordCount(collectionId: string): Promise<void> {
    return getCollectionService().updateCollectionWordCount(collectionId);
  }

  // Get level configuration for a language
  static async getLevelConfiguration(language: string): Promise<string[]> {
    return getCollectionService().getLevelConfiguration(language);
  }
}
