/**
 * Vocabulary Service
 * Direct passthrough to the platform adapter via ServiceFactory
 */

import { getVocabularyService } from "@cham-lang/ui/adapters";
import type {
  CreateVocabularyRequest,
  SearchQuery,
  UpdateVocabularyRequest,
  BulkMoveResult,
  Vocabulary,
  PaginatedResponse,
} from "@cham-lang/shared/types";

export class VocabularyService {
  // Vocabulary CRUD
  static async createVocabulary(
    request: CreateVocabularyRequest,
  ): Promise<string> {
    return getVocabularyService().createVocabulary(request);
  }

  static async getVocabulary(id: string): Promise<Vocabulary> {
    return getVocabularyService().getVocabulary(id);
  }

  static async getAllVocabularies(
    language?: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    return getVocabularyService().getAllVocabularies(language, limit);
  }

  static async updateVocabulary(
    request: UpdateVocabularyRequest,
  ): Promise<string> {
    return getVocabularyService().updateVocabulary(request);
  }

  static async deleteVocabulary(id: string): Promise<string> {
    return getVocabularyService().deleteVocabulary(id);
  }

  static async bulkMoveVocabularies(
    vocabularyIds: string[],
    targetCollectionId: string,
  ): Promise<BulkMoveResult> {
    return getVocabularyService().bulkMoveVocabularies(
      vocabularyIds,
      targetCollectionId,
    );
  }

  static async searchVocabularies(query: SearchQuery): Promise<Vocabulary[]> {
    return getVocabularyService().searchVocabularies(query);
  }

  static async getVocabulariesByTopic(
    topic: string,
    language?: string,
  ): Promise<Vocabulary[]> {
    return getVocabularyService().getVocabulariesByTopic(topic, language);
  }

  static async getVocabulariesByLevel(
    level: string,
    language?: string,
  ): Promise<Vocabulary[]> {
    return getVocabularyService().getVocabulariesByLevel(level, language);
  }

  static async getVocabulariesByCollection(
    collectionId: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    return getVocabularyService().getVocabulariesByCollection(
      collectionId,
      limit,
    );
  }

  static async getVocabulariesByCollectionPaginated(
    collectionId: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<Vocabulary>> {
    return getVocabularyService().getVocabulariesByCollectionPaginated(
      collectionId,
      limit,
      offset,
    );
  }

  // Language management
  static async getAllLanguages(): Promise<string[]> {
    return getVocabularyService().getAllLanguages();
  }

  // Topics and tags
  static async getAllTopics(): Promise<string[]> {
    return getVocabularyService().getAllTopics();
  }

  static async getAllTags(): Promise<string[]> {
    return getVocabularyService().getAllTags();
  }
}
