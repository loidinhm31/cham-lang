/**
 * Collection Service Interface
 * Contract that both Tauri and Web adapters must implement
 */

import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from "@cham-lang/shared/types";

export interface ICollectionService {
  // Collection CRUD
  createCollection(request: CreateCollectionRequest): Promise<string>;
  getCollection(id: string): Promise<Collection>;
  getUserCollections(): Promise<Collection[]>;
  getPublicCollections(language?: string): Promise<Collection[]>;
  updateCollection(request: UpdateCollectionRequest): Promise<string>;
  deleteCollection(id: string): Promise<string>;

  // Sharing
  shareCollection(
    collectionId: string,
    shareWithUserId: string,
  ): Promise<string>;
  unshareCollection(
    collectionId: string,
    userIdToRemove: string,
  ): Promise<string>;

  // Metadata
  updateCollectionWordCount(collectionId: string): Promise<void>;
  getLevelConfiguration(language: string): Promise<string[]>;
}
