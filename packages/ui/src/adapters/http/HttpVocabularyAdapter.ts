/**
 * HTTP Vocabulary Adapter
 * Communicates with desktop SQLite backend via HTTP REST API
 */

import { HttpAdapter } from "./HttpAdapter";
import type { IVocabularyService } from "@cham-lang/ui/adapters/factory/interfaces";
import type {
  Vocabulary,
  CreateVocabularyRequest,
  UpdateVocabularyRequest,
  SearchQuery,
  BulkMoveResult,
  BulkMoveRequest,
  PaginatedResponse,
} from "@cham-lang/shared/types";

export class HttpVocabularyAdapter
  extends HttpAdapter
  implements IVocabularyService
{
  async createVocabulary(request: CreateVocabularyRequest): Promise<string> {
    return this.post<string>("/vocabularies", request);
  }

  async getVocabulary(id: string): Promise<Vocabulary> {
    return this.get<Vocabulary>(`/vocabularies/${id}`);
  }

  async getAllVocabularies(
    language?: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    return this.get<Vocabulary[]>("/vocabularies", { language, limit });
  }

  async updateVocabulary(request: UpdateVocabularyRequest): Promise<string> {
    return this.put<string>("/vocabularies", request);
  }

  async deleteVocabulary(id: string): Promise<string> {
    return this.delete<string>(`/vocabularies/${id}`);
  }

  async bulkMoveVocabularies(
    vocabularyIds: string[],
    targetCollectionId: string,
  ): Promise<BulkMoveResult> {
    const request: BulkMoveRequest = {
      vocabulary_ids: vocabularyIds,
      target_collection_id: targetCollectionId,
    };
    return this.post<BulkMoveResult>("/vocabularies/bulk-move", request);
  }

  async searchVocabularies(query: SearchQuery): Promise<Vocabulary[]> {
    return this.get<Vocabulary[]>("/vocabularies/search", {
      query: query.query,
      language: query.language,
    });
  }

  async getVocabulariesByTopic(
    topic: string,
    language?: string,
  ): Promise<Vocabulary[]> {
    // Client-side filtering - get all vocabularies and filter by topic
    const vocabularies = await this.getAllVocabularies(language);
    return vocabularies.filter((vocab) => vocab.topics.includes(topic));
  }

  async getVocabulariesByLevel(
    level: string,
    language?: string,
  ): Promise<Vocabulary[]> {
    // Client-side filtering - get all vocabularies and filter by level
    const vocabularies = await this.getAllVocabularies(language);
    return vocabularies.filter((vocab) => vocab.level === level);
  }

  async getVocabulariesByCollection(
    collectionId: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    return this.get<Vocabulary[]>(
      `/vocabularies/by-collection/${collectionId}`,
      { limit },
    );
  }

  async getVocabulariesByCollectionPaginated(
    collectionId: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<Vocabulary>> {
    return this.get<PaginatedResponse<Vocabulary>>(
      `/vocabularies/by-collection/${collectionId}/paginated`,
      { limit, offset },
    );
  }

  async getAllLanguages(): Promise<string[]> {
    return this.get<string[]>("/metadata/languages");
  }

  async getAllTopics(): Promise<string[]> {
    return this.get<string[]>("/metadata/topics");
  }

  async getAllTags(): Promise<string[]> {
    return this.get<string[]>("/metadata/tags");
  }
}
