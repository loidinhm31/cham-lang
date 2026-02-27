import type { IVocabularyService } from "@cham-lang/ui/adapters/factory/interfaces";
import type {
  Vocabulary,
  CreateVocabularyRequest,
  UpdateVocabularyRequest,
  SearchQuery,
  BulkMoveResult,
  PaginatedResponse,
} from "@cham-lang/shared/types";
import { getDb, generateId, getCurrentTimestamp } from "./database";
import { withSyncTracking } from "./syncHelpers";

export class IndexedDBVocabularyAdapter implements IVocabularyService {
  async createVocabulary(request: CreateVocabularyRequest): Promise<string> {
    const id = generateId();
    const now = getCurrentTimestamp();
    await getDb().vocabularies.add(
      withSyncTracking({
        id,
        ...request,
        createdAt: now,
        updatedAt: now,
      }),
    );

    // Update collection word count
    const collection = await getDb().collections.get(request.collectionId);
    if (collection) {
      await getDb().collections.update(request.collectionId, {
        wordCount: (collection.wordCount || 0) + 1,
        updatedAt: now,
      });
    }

    return id;
  }

  async getVocabulary(id: string): Promise<Vocabulary> {
    const vocab = await getDb().vocabularies.get(id);
    if (!vocab || vocab.deleted === 1) throw new Error(`Vocabulary not found: ${id}`);
    return vocab as Vocabulary;
  }

  async getAllVocabularies(
    language?: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    const all = await getDb().vocabularies
      .orderBy("createdAt")
      .reverse()
      .filter((v) => !v.deleted)
      .toArray();
    const filtered = language ? all.filter((v) => v.language === language) : all;
    return (limit ? filtered.slice(0, limit) : filtered) as Vocabulary[];
  }

  async updateVocabulary(request: UpdateVocabularyRequest): Promise<string> {
    const existing = await getDb().vocabularies.get(request.id);
    if (!existing || existing.deleted === 1) throw new Error(`Vocabulary not found: ${request.id}`);

    const { id, ...updates } = request;
    const oldCollectionId = existing.collectionId;

    await getDb().vocabularies.update(
      id,
      withSyncTracking(
        {
          ...updates,
          updatedAt: getCurrentTimestamp(),
        },
        existing,
      ),
    );

    // Update word counts if collection changed
    if (updates.collectionId && updates.collectionId !== oldCollectionId) {
      const oldCollection = await getDb().collections.get(oldCollectionId);
      if (oldCollection) {
        await getDb().collections.update(oldCollectionId, {
          wordCount: Math.max(0, (oldCollection.wordCount || 0) - 1),
        });
      }
      const newCollection = await getDb().collections.get(updates.collectionId);
      if (newCollection) {
        await getDb().collections.update(updates.collectionId, {
          wordCount: (newCollection.wordCount || 0) + 1,
        });
      }
    }

    return "Vocabulary updated successfully";
  }

  async deleteVocabulary(id: string): Promise<string> {
    await getDb().transaction("rw", [getDb().vocabularies, getDb().collections], async () => {
      const vocab = await getDb().vocabularies.get(id);
      if (!vocab || vocab.deleted === 1) return;

      const now = Date.now();
      await getDb().vocabularies.update(id, {
        deleted: 1,
        deletedAt: now,
        syncVersion: (vocab.syncVersion ?? 0) + 1,
        syncedAt: undefined,
        updatedAt: new Date(now).toISOString(),
      });

      const collection = await getDb().collections.get(vocab.collectionId);
      if (collection) {
        await getDb().collections.update(vocab.collectionId, {
          wordCount: Math.max(0, (collection.wordCount || 0) - 1),
        });
      }
    });
    return "Vocabulary deleted successfully";
  }

  async bulkMoveVocabularies(
    vocabularyIds: string[],
    targetCollectionId: string,
  ): Promise<BulkMoveResult> {
    let movedCount = 0;
    let skippedCount = 0;

    for (const vocabId of vocabularyIds) {
      const vocab = await getDb().vocabularies.get(vocabId);
      if (!vocab || vocab.deleted === 1 || vocab.collectionId === targetCollectionId) {
        skippedCount++;
        continue;
      }

      const oldCollectionId = vocab.collectionId;
      await getDb().vocabularies.update(vocabId, {
        collectionId: targetCollectionId,
        updatedAt: getCurrentTimestamp(),
      });

      // Update old collection count
      const oldColl = await getDb().collections.get(oldCollectionId);
      if (oldColl) {
        await getDb().collections.update(oldCollectionId, {
          wordCount: Math.max(0, (oldColl.wordCount || 0) - 1),
        });
      }

      movedCount++;
    }

    // Update target collection count
    const targetColl = await getDb().collections.get(targetCollectionId);
    if (targetColl) {
      await getDb().collections.update(targetCollectionId, {
        wordCount: (targetColl.wordCount || 0) + movedCount,
      });
    }

    return { movedCount: movedCount, skippedCount: skippedCount };
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
    let results = await getDb().vocabularies
      .where("collectionId")
      .equals(collectionId)
      .filter((v) => !v.deleted)
      .toArray();
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return (limit ? results.slice(0, limit) : results) as Vocabulary[];
  }

  async getVocabulariesByCollectionPaginated(
    collectionId: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<Vocabulary>> {
    const all = await getDb().vocabularies
      .where("collectionId")
      .equals(collectionId)
      .filter((v) => !v.deleted)
      .toArray();
    all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = all.length;
    const start = offset || 0;
    const end = limit ? start + limit : total;
    const items = all.slice(start, end) as Vocabulary[];

    return {
      items,
      total,
      offset: start,
      limit: limit || total,
      hasMore: end < total,
    };
  }

  async getAllLanguages(): Promise<string[]> {
    const collections = await getDb().collections.filter((c) => !c.deleted).toArray();
    const languages = new Set(collections.map((c) => c.language));
    return [...languages];
  }

  async getAllTopics(): Promise<string[]> {
    const vocabs = await getDb().vocabularies.filter((v) => !v.deleted).toArray();
    const topics = new Set(vocabs.flatMap((v) => v.topics));
    return [...topics].sort();
  }

  async getAllTags(): Promise<string[]> {
    const vocabs = await getDb().vocabularies.filter((v) => !v.deleted).toArray();
    const tags = new Set(vocabs.flatMap((v) => v.tags));
    return [...tags].sort();
  }
}
