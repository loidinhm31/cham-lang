import type { ICollectionService } from "@cham-lang/ui/adapters/factory/interfaces";
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from "@cham-lang/shared/types";
import { db, generateId, getCurrentTimestamp } from "./database";
import { withSyncTracking, trackDelete } from "./syncHelpers";

export class IndexedDBCollectionAdapter implements ICollectionService {
  private async hydrateSharedWith(collection: Collection): Promise<Collection> {
    if (!collection.id) return collection;
    const sharedUsers = await db.collectionSharedUsers
      .where("collection_id")
      .equals(collection.id)
      .toArray();
    collection.shared_with = sharedUsers.map((su) => ({
      user_id: su.user_id,
      permission: su.permission as "viewer" | "editor",
    }));
    return collection;
  }

  async createCollection(request: CreateCollectionRequest): Promise<string> {
    const id = generateId();
    const now = getCurrentTimestamp();
    await db.collections.add(
      withSyncTracking({
        id,
        name: request.name,
        description: request.description,
        language: request.language,
        shared_with: [],
        is_public: request.is_public,
        word_count: 0,
        created_at: now,
        updated_at: now,
      }),
    );
    return id;
  }

  async getCollection(id: string): Promise<Collection> {
    const collection = await db.collections.get(id);
    if (!collection) throw new Error(`Collection not found: ${id}`);
    return this.hydrateSharedWith(collection as Collection);
  }

  async getUserCollections(): Promise<Collection[]> {
    const collections = await db.collections.toArray();
    collections.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return Promise.all(
      collections.map((c) => this.hydrateSharedWith(c as Collection)),
    );
  }

  async getPublicCollections(language?: string): Promise<Collection[]> {
    let collections = await db.collections
      .where("is_public")
      .equals(1) // Dexie stores booleans as 0/1
      .toArray();

    // Fallback: filter manually since boolean indexing can be tricky
    if (collections.length === 0) {
      const all = await db.collections.toArray();
      collections = all.filter((c) => c.is_public);
    }

    if (language) {
      collections = collections.filter((c) => c.language === language);
    }
    return collections as Collection[];
  }

  async updateCollection(request: UpdateCollectionRequest): Promise<string> {
    const existing = await db.collections.get(request.id);
    if (!existing) throw new Error(`Collection not found: ${request.id}`);

    const { id, ...updates } = request;
    await db.collections.update(
      id,
      withSyncTracking(
        {
          ...updates,
          updated_at: getCurrentTimestamp(),
        },
        existing,
      ),
    );
    return "Collection updated successfully";
  }

  async deleteCollection(id: string): Promise<string> {
    await db.transaction(
      "rw",
      [db.collections, db.vocabularies, db._pendingChanges],
      async () => {
        // Track vocabulary deletions for sync
        const vocabs = await db.vocabularies
          .where("collection_id")
          .equals(id)
          .toArray();
        for (const vocab of vocabs) {
          await trackDelete("vocabularies", vocab.id, vocab.sync_version ?? 1);
        }
        // Track collection deletion for sync
        const collection = await db.collections.get(id);
        if (collection) {
          await trackDelete("collections", id, collection.sync_version ?? 1);
        }
        // Delete all vocabularies in this collection
        await db.vocabularies.where("collection_id").equals(id).delete();
        // Delete the collection
        await db.collections.delete(id);
      },
    );
    return "Collection deleted successfully";
  }

  async shareCollection(
    collectionId: string,
    shareWithUserId: string,
  ): Promise<string> {
    const collection = await db.collections.get(collectionId);
    if (!collection) throw new Error(`Collection not found: ${collectionId}`);

    // Check if already shared with this user
    const existing = await db.collectionSharedUsers
      .where("collection_id")
      .equals(collectionId)
      .filter((su) => su.user_id === shareWithUserId)
      .first();
    if (existing) {
      return "Collection already shared with this user";
    }

    const id = generateId();
    const now = getCurrentTimestamp();

    // Add to collectionSharedUsers table (sync will pick this up)
    await db.collectionSharedUsers.add(
      withSyncTracking({
        id,
        collection_id: collectionId,
        user_id: shareWithUserId,
        permission: "viewer",
        created_at: now,
      }),
    );

    // Update the collection's shared_with array for immediate UI feedback
    const sharedWith = [
      ...collection.shared_with,
      { user_id: shareWithUserId, permission: "viewer" },
    ];
    await db.collections.update(
      collectionId,
      withSyncTracking(
        { shared_with: sharedWith, updated_at: now },
        collection,
      ),
    );

    return "Collection shared successfully";
  }

  async unshareCollection(
    collectionId: string,
    userIdToRemove: string,
  ): Promise<string> {
    const collection = await db.collections.get(collectionId);
    if (!collection) throw new Error(`Collection not found: ${collectionId}`);

    // Find and track deletion of the shared user record
    const sharedUserRecord = await db.collectionSharedUsers
      .where("collection_id")
      .equals(collectionId)
      .filter((su) => su.user_id === userIdToRemove)
      .first();

    if (sharedUserRecord) {
      await trackDelete(
        "collectionSharedUsers",
        sharedUserRecord.id,
        sharedUserRecord.sync_version ?? 1,
      );
      await db.collectionSharedUsers.delete(sharedUserRecord.id);
    }

    // Update the collection's shared_with array for immediate UI feedback
    const sharedWith = collection.shared_with.filter(
      (su) => su.user_id !== userIdToRemove,
    );
    const now = getCurrentTimestamp();
    await db.collections.update(
      collectionId,
      withSyncTracking(
        { shared_with: sharedWith, updated_at: now },
        collection,
      ),
    );

    return "Collection unshared successfully";
  }

  async updateCollectionWordCount(collectionId: string): Promise<void> {
    const count = await db.vocabularies
      .where("collection_id")
      .equals(collectionId)
      .count();
    await db.collections.update(collectionId, { word_count: count });
  }

  async getLevelConfiguration(language: string): Promise<string[]> {
    // Return default level configurations based on language
    const levelConfigs: Record<string, string[]> = {
      ko: [
        "TOPIK I (1급)",
        "TOPIK I (2급)",
        "TOPIK II (3급)",
        "TOPIK II (4급)",
        "TOPIK II (5급)",
        "TOPIK II (6급)",
      ],
      en: ["A1", "A2", "B1", "B2", "C1", "C2"],
      vi: ["A1", "A2", "B1", "B2", "C1", "C2"],
      ja: ["N5", "N4", "N3", "N2", "N1"],
      zh: ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"],
    };
    return levelConfigs[language] || ["Beginner", "Intermediate", "Advanced"];
  }
}
