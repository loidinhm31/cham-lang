import type { IVocabularyService } from "@cham-lang/ui/adapters/factory/interfaces";
import type {
  Vocabulary,
  CreateVocabularyRequest,
  UpdateVocabularyRequest,
  SearchQuery,
  BulkMoveResult,
  PaginatedResponse,
} from "@cham-lang/shared/types";
import { db, generateId, getCurrentTimestamp } from "./database";
import { withSyncTracking, trackDelete } from "./syncHelpers";

export class IndexedDBVocabularyAdapter implements IVocabularyService {
  async createVocabulary(request: CreateVocabularyRequest): Promise<string> {
    const id = generateId();
    const now = getCurrentTimestamp();
    await db.vocabularies.add(
      withSyncTracking({
        id,
        ...request,
        user_id: "local",
        created_at: now,
        updated_at: now,
      }),
    );

    // Update collection word count
    const collection = await db.collections.get(request.collection_id);
    if (collection) {
      await db.collections.update(request.collection_id, {
        word_count: (collection.word_count || 0) + 1,
        updated_at: now,
      });
    }

    return id;
  }

  async getVocabulary(id: string): Promise<Vocabulary> {
    const vocab = await db.vocabularies.get(id);
    if (!vocab) throw new Error(`Vocabulary not found: ${id}`);
    return vocab as Vocabulary;
  }

  async getAllVocabularies(
    language?: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    let query = db.vocabularies.orderBy("created_at").reverse();
    if (language) {
      const all = await query.toArray();
      const filtered = all.filter((v) => v.language === language);
      return (limit ? filtered.slice(0, limit) : filtered) as Vocabulary[];
    }
    const results = await query.toArray();
    return (limit ? results.slice(0, limit) : results) as Vocabulary[];
  }

  async updateVocabulary(request: UpdateVocabularyRequest): Promise<string> {
    const existing = await db.vocabularies.get(request.id);
    if (!existing) throw new Error(`Vocabulary not found: ${request.id}`);

    const { id, ...updates } = request;
    const oldCollectionId = existing.collection_id;

    await db.vocabularies.update(
      id,
      withSyncTracking(
        {
          ...updates,
          updated_at: getCurrentTimestamp(),
        },
        existing,
      ),
    );

    // Update word counts if collection changed
    if (updates.collection_id && updates.collection_id !== oldCollectionId) {
      const oldCollection = await db.collections.get(oldCollectionId);
      if (oldCollection) {
        await db.collections.update(oldCollectionId, {
          word_count: Math.max(0, (oldCollection.word_count || 0) - 1),
        });
      }
      const newCollection = await db.collections.get(updates.collection_id);
      if (newCollection) {
        await db.collections.update(updates.collection_id, {
          word_count: (newCollection.word_count || 0) + 1,
        });
      }
    }

    return "Vocabulary updated successfully";
  }

  async deleteVocabulary(id: string): Promise<string> {
    const vocab = await db.vocabularies.get(id);
    if (vocab) {
      await trackDelete("vocabularies", id, vocab.sync_version ?? 1);
      await db.vocabularies.delete(id);
      const collection = await db.collections.get(vocab.collection_id);
      if (collection) {
        await db.collections.update(vocab.collection_id, {
          word_count: Math.max(0, (collection.word_count || 0) - 1),
        });
      }
    }
    return "Vocabulary deleted successfully";
  }

  async bulkMoveVocabularies(
    vocabularyIds: string[],
    targetCollectionId: string,
  ): Promise<BulkMoveResult> {
    let movedCount = 0;
    let skippedCount = 0;

    for (const vocabId of vocabularyIds) {
      const vocab = await db.vocabularies.get(vocabId);
      if (!vocab || vocab.collection_id === targetCollectionId) {
        skippedCount++;
        continue;
      }

      const oldCollectionId = vocab.collection_id;
      await db.vocabularies.update(vocabId, {
        collection_id: targetCollectionId,
        updated_at: getCurrentTimestamp(),
      });

      // Update old collection count
      const oldColl = await db.collections.get(oldCollectionId);
      if (oldColl) {
        await db.collections.update(oldCollectionId, {
          word_count: Math.max(0, (oldColl.word_count || 0) - 1),
        });
      }

      movedCount++;
    }

    // Update target collection count
    const targetColl = await db.collections.get(targetCollectionId);
    if (targetColl) {
      await db.collections.update(targetCollectionId, {
        word_count: (targetColl.word_count || 0) + movedCount,
      });
    }

    return { moved_count: movedCount, skipped_count: skippedCount };
  }

  async searchVocabularies(query: SearchQuery): Promise<Vocabulary[]> {
    const all = await this.getAllVocabularies(query.language);
    const q = query.query.toLowerCase();
    return all.filter(
      (v) =>
        v.word.toLowerCase().includes(q) ||
        v.definitions.some((d) => d.meaning.toLowerCase().includes(q)),
    );
  }

  async getVocabulariesByTopic(
    topic: string,
    language?: string,
  ): Promise<Vocabulary[]> {
    const all = await this.getAllVocabularies(language);
    return all.filter((v) => v.topics.includes(topic));
  }

  async getVocabulariesByLevel(
    level: string,
    language?: string,
  ): Promise<Vocabulary[]> {
    const all = await this.getAllVocabularies(language);
    return all.filter((v) => v.level === level);
  }

  async getVocabulariesByCollection(
    collectionId: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    let results = await db.vocabularies
      .where("collection_id")
      .equals(collectionId)
      .toArray();
    results.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return (limit ? results.slice(0, limit) : results) as Vocabulary[];
  }

  async getVocabulariesByCollectionPaginated(
    collectionId: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<Vocabulary>> {
    const all = await db.vocabularies
      .where("collection_id")
      .equals(collectionId)
      .toArray();
    all.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const total = all.length;
    const start = offset || 0;
    const end = limit ? start + limit : total;
    const items = all.slice(start, end) as Vocabulary[];

    return {
      items,
      total,
      offset: start,
      limit: limit || total,
      has_more: end < total,
    };
  }

  async getAllLanguages(): Promise<string[]> {
    const collections = await db.collections.toArray();
    const languages = new Set(collections.map((c) => c.language));
    return [...languages];
  }

  async getAllTopics(): Promise<string[]> {
    const vocabs = await db.vocabularies.toArray();
    const topics = new Set(vocabs.flatMap((v) => v.topics));
    return [...topics].sort();
  }

  async getAllTags(): Promise<string[]> {
    const vocabs = await db.vocabularies.toArray();
    const tags = new Set(vocabs.flatMap((v) => v.tags));
    return [...tags].sort();
  }
}
