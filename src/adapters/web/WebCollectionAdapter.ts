/**
 * Web Collection Adapter
 * Implements collection operations using IndexedDB via Dexie.js
 */

import type { ICollectionService } from "../interfaces/ICollectionService";
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from "@/types/collection";
import { db, generateId, now } from "./db";

// Language level configurations
const LEVEL_CONFIGS: Record<string, string[]> = {
  japanese: ["N5", "N4", "N3", "N2", "N1"],
  english: ["A1", "A2", "B1", "B2", "C1", "C2"],
  vietnamese: ["Basic", "Intermediate", "Advanced"],
  default: [
    "Beginner",
    "Elementary",
    "Intermediate",
    "Upper-Intermediate",
    "Advanced",
  ],
};

export class WebCollectionAdapter implements ICollectionService {
  async createCollection(request: CreateCollectionRequest): Promise<string> {
    const id = generateId();
    const timestamp = now();

    // Destructure to exclude any 'id' field that might be in the request
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _ignoredId, ...requestData } =
      request as CreateCollectionRequest & { id?: string };

    await db.collections.add({
      id,
      ...requestData,
      owner_id: "local-user",
      shared_with: [],
      word_count: 0,
      created_at: timestamp,
      updated_at: timestamp,
    });

    return id;
  }

  async getCollection(id: string): Promise<Collection> {
    const collection = await db.collections.get(id);
    if (!collection) {
      throw new Error(`Collection not found: ${id}`);
    }
    return collection;
  }

  async getUserCollections(): Promise<Collection[]> {
    // In web mode, all collections belong to the local user
    const collections = await db.collections.toArray();

    // Sort by updated_at DESC, then by name ASC for consistent ordering
    // This matches SQLite backend behavior
    collections.sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime();
      const dateB = new Date(b.updated_at).getTime();
      if (dateB !== dateA) {
        return dateB - dateA; // DESC order (most recently updated first)
      }
      // Secondary sort by name (ascending, case-insensitive)
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    return collections;
  }

  async getPublicCollections(language?: string): Promise<Collection[]> {
    let collections = await db.collections
      .where("is_public")
      .equals(1) // Dexie stores booleans as 0/1
      .toArray();

    // Fallback: filter by is_public if boolean indexing doesn't work
    if (collections.length === 0) {
      const allCollections = await db.collections.toArray();
      collections = allCollections.filter((c) => c.is_public);
    }

    if (language) {
      collections = collections.filter((c) => c.language === language);
    }

    // Sort by updated_at DESC, then by name ASC for consistent ordering
    // This matches SQLite backend behavior
    collections.sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime();
      const dateB = new Date(b.updated_at).getTime();
      if (dateB !== dateA) {
        return dateB - dateA; // DESC order (most recently updated first)
      }
      // Secondary sort by name (ascending, case-insensitive)
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    return collections;
  }

  async updateCollection(request: UpdateCollectionRequest): Promise<string> {
    const { id, ...updates } = request;

    await db.collections.update(id, {
      ...updates,
      updated_at: now(),
    });

    return id;
  }

  async deleteCollection(id: string): Promise<string> {
    // Delete all vocabularies in the collection first
    await db.vocabularies.where("collection_id").equals(id).delete();

    // Delete the collection
    await db.collections.delete(id);

    return id;
  }

  async shareCollection(
    collectionId: string,
    shareWithUsername: string,
  ): Promise<string> {
    // In web mode, sharing is limited - we just add to shared_with array
    const collection = await db.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    const sharedWith = [...collection.shared_with, shareWithUsername];

    await db.collections.update(collectionId, {
      shared_with: sharedWith,
      updated_at: now(),
    });

    return `Shared with ${shareWithUsername}`;
  }

  async unshareCollection(
    collectionId: string,
    userIdToRemove: string,
  ): Promise<string> {
    const collection = await db.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    const sharedWith = collection.shared_with.filter(
      (u) => u !== userIdToRemove,
    );

    await db.collections.update(collectionId, {
      shared_with: sharedWith,
      updated_at: now(),
    });

    return `Unshared with ${userIdToRemove}`;
  }

  async updateCollectionWordCount(collectionId: string): Promise<void> {
    const vocabs = await db.vocabularies
      .where("collection_id")
      .equals(collectionId)
      .toArray();

    await db.collections.update(collectionId, {
      word_count: vocabs.length,
      updated_at: now(),
    });
  }

  async getLevelConfiguration(language: string): Promise<string[]> {
    const normalizedLang = language.toLowerCase();
    return LEVEL_CONFIGS[normalizedLang] || LEVEL_CONFIGS.default;
  }
}
