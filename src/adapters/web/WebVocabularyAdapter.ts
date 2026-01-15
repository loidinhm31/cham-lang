/**
 * Web Vocabulary Adapter
 * Implements vocabulary operations using IndexedDB via Dexie.js
 */

import type { IVocabularyService } from "@/adapters";
import type {
  Vocabulary,
  CreateVocabularyRequest,
  UpdateVocabularyRequest,
  SearchQuery,
  BulkMoveResult,
  PaginatedResponse,
} from "@/types/vocabulary";
import { db, generateId, now } from "./db";

export class WebVocabularyAdapter implements IVocabularyService {
  async createVocabulary(request: CreateVocabularyRequest): Promise<string> {
    const id = generateId();
    const timestamp = now();

    await db.vocabularies.add({
      id,
      ...request,
      user_id: "local-user", // Web mode uses a local user
      created_at: timestamp,
      updated_at: timestamp,
    });

    // Update collection word count
    const collection = await db.collections.get(request.collection_id);
    if (collection) {
      await db.collections.update(request.collection_id, {
        word_count: collection.word_count + 1,
        updated_at: timestamp,
      });
    }

    return id;
  }

  async getVocabulary(id: string): Promise<Vocabulary> {
    const vocab = await db.vocabularies.get(id);
    if (!vocab) {
      throw new Error(`Vocabulary not found: ${id}`);
    }
    return vocab;
  }

  async getAllVocabularies(
    language?: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    let query = db.vocabularies.toCollection();

    if (language) {
      query = db.vocabularies.where("language").equals(language);
    }

    let result = await query.toArray();

    if (limit && limit > 0) {
      result = result.slice(0, limit);
    }

    return result;
  }

  async updateVocabulary(request: UpdateVocabularyRequest): Promise<string> {
    const { id, ...updates } = request;

    await db.vocabularies.update(id, {
      ...updates,
      updated_at: now(),
    });

    return id;
  }

  async deleteVocabulary(id: string): Promise<string> {
    const vocab = await db.vocabularies.get(id);
    if (vocab) {
      await db.vocabularies.delete(id);

      // Update collection word count
      const collection = await db.collections.get(vocab.collection_id);
      if (collection && collection.word_count > 0) {
        await db.collections.update(vocab.collection_id, {
          word_count: collection.word_count - 1,
          updated_at: now(),
        });
      }
    }

    return id;
  }

  async bulkMoveVocabularies(
    vocabularyIds: string[],
    targetCollectionId: string,
  ): Promise<BulkMoveResult> {
    let movedCount = 0;
    let skippedCount = 0;
    const timestamp = now();

    // Get source collections for word count updates
    const sourceCollectionCounts: Record<string, number> = {};

    for (const vocabId of vocabularyIds) {
      const vocab = await db.vocabularies.get(vocabId);
      if (vocab) {
        if (vocab.collection_id === targetCollectionId) {
          skippedCount++;
          continue;
        }

        // Track source collection
        sourceCollectionCounts[vocab.collection_id] =
          (sourceCollectionCounts[vocab.collection_id] || 0) + 1;

        // Move vocabulary
        await db.vocabularies.update(vocabId, {
          collection_id: targetCollectionId,
          updated_at: timestamp,
        });
        movedCount++;
      } else {
        skippedCount++;
      }
    }

    // Update source collection word counts
    for (const [collectionId, count] of Object.entries(
      sourceCollectionCounts,
    )) {
      const collection = await db.collections.get(collectionId);
      if (collection) {
        await db.collections.update(collectionId, {
          word_count: Math.max(0, collection.word_count - count),
          updated_at: timestamp,
        });
      }
    }

    // Update target collection word count
    const targetCollection = await db.collections.get(targetCollectionId);
    if (targetCollection) {
      await db.collections.update(targetCollectionId, {
        word_count: targetCollection.word_count + movedCount,
        updated_at: timestamp,
      });
    }

    return { moved_count: movedCount, skipped_count: skippedCount };
  }

  async searchVocabularies(query: SearchQuery): Promise<Vocabulary[]> {
    const searchTerm = query.query.toLowerCase();

    let vocabs = await db.vocabularies.toArray();

    // Filter by language if specified
    if (query.language) {
      vocabs = vocabs.filter((v) => v.language === query.language);
    }

    // Search in word and definitions
    vocabs = vocabs.filter((v) => {
      const wordMatch = v.word.toLowerCase().includes(searchTerm);
      const defMatch = v.definitions.some(
        (d) =>
          d.meaning.toLowerCase().includes(searchTerm) ||
          d.translation?.toLowerCase().includes(searchTerm),
      );
      return wordMatch || defMatch;
    });

    return vocabs;
  }

  async getVocabulariesByTopic(
    topic: string,
    language?: string,
  ): Promise<Vocabulary[]> {
    let vocabs = await db.vocabularies.where("topics").equals(topic).toArray();

    if (language) {
      vocabs = vocabs.filter((v) => v.language === language);
    }

    return vocabs;
  }

  async getVocabulariesByLevel(
    level: string,
    language?: string,
  ): Promise<Vocabulary[]> {
    let query = db.vocabularies.where("level").equals(level);

    let vocabs = await query.toArray();

    if (language) {
      vocabs = vocabs.filter((v) => v.language === language);
    }

    return vocabs;
  }

  async getVocabulariesByCollection(
    collectionId: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    let vocabs = await db.vocabularies
      .where("collection_id")
      .equals(collectionId)
      .toArray();

    if (limit && limit > 0) {
      vocabs = vocabs.slice(0, limit);
    }

    return vocabs;
  }

  async getVocabulariesByCollectionPaginated(
    collectionId: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<Vocabulary>> {
    const allVocabs = await db.vocabularies
      .where("collection_id")
      .equals(collectionId)
      .toArray();

    const total = allVocabs.length;
    const startIndex = offset || 0;
    const pageSize = limit || 20;
    const items = allVocabs.slice(startIndex, startIndex + pageSize);

    return {
      items,
      total,
      offset: startIndex,
      limit: pageSize,
      has_more: startIndex + items.length < total,
    };
  }

  async getAllLanguages(): Promise<string[]> {
    const vocabs = await db.vocabularies.toArray();
    const languages = new Set(vocabs.map((v) => v.language));
    return Array.from(languages);
  }

  async getAllTopics(): Promise<string[]> {
    const vocabs = await db.vocabularies.toArray();
    const topics = new Set(vocabs.flatMap((v) => v.topics));
    return Array.from(topics);
  }

  async getAllTags(): Promise<string[]> {
    const vocabs = await db.vocabularies.toArray();
    const tags = new Set(vocabs.flatMap((v) => v.tags));
    return Array.from(tags);
  }
}
