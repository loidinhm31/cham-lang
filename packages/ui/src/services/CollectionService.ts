/**
 * Collection Service
 * Uses platform adapter for cross-platform compatibility
 * Lazy service access + error handling pattern
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
    try {
      const service = getCollectionService();
      return await service.createCollection(request);
    } catch (error) {
      console.error("Error creating collection:", error);
      throw CollectionService.handleError(error);
    }
  }

  static async getCollection(id: string): Promise<Collection> {
    try {
      const service = getCollectionService();
      return await service.getCollection(id);
    } catch (error) {
      console.error("Error getting collection:", error);
      throw CollectionService.handleError(error);
    }
  }

  static async getUserCollections(): Promise<Collection[]> {
    try {
      const service = getCollectionService();
      return await service.getUserCollections();
    } catch (error) {
      console.error("Error getting user collections:", error);
      throw CollectionService.handleError(error);
    }
  }

  static async getPublicCollections(language?: string): Promise<Collection[]> {
    try {
      const service = getCollectionService();
      return await service.getPublicCollections(language);
    } catch (error) {
      console.error("Error getting public collections:", error);
      throw CollectionService.handleError(error);
    }
  }

  static async updateCollection(
    request: UpdateCollectionRequest,
  ): Promise<string> {
    try {
      const service = getCollectionService();
      return await service.updateCollection(request);
    } catch (error) {
      console.error("Error updating collection:", error);
      throw CollectionService.handleError(error);
    }
  }

  static async deleteCollection(id: string): Promise<string> {
    try {
      const service = getCollectionService();
      return await service.deleteCollection(id);
    } catch (error) {
      console.error("Error deleting collection:", error);
      throw CollectionService.handleError(error);
    }
  }

  static async shareCollection(
    collectionId: string,
    shareWithUsername: string,
  ): Promise<string> {
    try {
      const service = getCollectionService();
      return await service.shareCollection(collectionId, shareWithUsername);
    } catch (error) {
      console.error("Error sharing collection:", error);
      throw CollectionService.handleError(error);
    }
  }

  static async unshareCollection(
    collectionId: string,
    userIdToRemove: string,
  ): Promise<string> {
    try {
      const service = getCollectionService();
      return await service.unshareCollection(collectionId, userIdToRemove);
    } catch (error) {
      console.error("Error unsharing collection:", error);
      throw CollectionService.handleError(error);
    }
  }

  static async updateCollectionWordCount(collectionId: string): Promise<void> {
    try {
      const service = getCollectionService();
      return await service.updateCollectionWordCount(collectionId);
    } catch (error) {
      console.error("Error updating collection word count:", error);
      throw CollectionService.handleError(error);
    }
  }

  // Get level configuration for a language
  static async getLevelConfiguration(language: string): Promise<string[]> {
    try {
      const service = getCollectionService();
      return await service.getLevelConfiguration(language);
    } catch (error) {
      console.error("Error getting level configuration:", error);
      throw CollectionService.handleError(error);
    }
  }

  private static handleError(error: unknown): Error {
    if (typeof error === "string") return new Error(error);
    return error instanceof Error ? error : new Error("Unknown error occurred");
  }
}
