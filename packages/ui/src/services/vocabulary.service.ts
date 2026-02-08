/**
 * Vocabulary Service
 * Uses platform adapter for cross-platform compatibility
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

// Get the platform-specific service
const service = getVocabularyService();

export class VocabularyService {
  // Vocabulary CRUD
  static async createVocabulary(
    request: CreateVocabularyRequest,
  ): Promise<string> {
    return service.createVocabulary(request);
  }

  static async getVocabulary(id: string): Promise<Vocabulary> {
    return service.getVocabulary(id);
  }

  static async getAllVocabularies(
    language?: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    return service.getAllVocabularies(language, limit);
  }

  static async updateVocabulary(
    request: UpdateVocabularyRequest,
  ): Promise<string> {
    return service.updateVocabulary(request);
  }

  static async deleteVocabulary(id: string): Promise<string> {
    return service.deleteVocabulary(id);
  }

  static async bulkMoveVocabularies(
    vocabularyIds: string[],
    targetCollectionId: string,
  ): Promise<BulkMoveResult> {
    return service.bulkMoveVocabularies(vocabularyIds, targetCollectionId);
  }

  static async searchVocabularies(query: SearchQuery): Promise<Vocabulary[]> {
    return service.searchVocabularies(query);
  }

  static async getVocabulariesByTopic(
    topic: string,
    language?: string,
  ): Promise<Vocabulary[]> {
    return service.getVocabulariesByTopic(topic, language);
  }

  static async getVocabulariesByLevel(
    level: string,
    language?: string,
  ): Promise<Vocabulary[]> {
    return service.getVocabulariesByLevel(level, language);
  }

  static async getVocabulariesByCollection(
    collectionId: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    return service.getVocabulariesByCollection(collectionId, limit);
  }

  static async getVocabulariesByCollectionPaginated(
    collectionId: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<Vocabulary>> {
    return service.getVocabulariesByCollectionPaginated(
      collectionId,
      limit,
      offset,
    );
  }

  // Language management
  static async getAllLanguages(): Promise<string[]> {
    return service.getAllLanguages();
  }

  // Topics and tags
  static async getAllTopics(): Promise<string[]> {
    return service.getAllTopics();
  }

  static async getAllTags(): Promise<string[]> {
    return service.getAllTags();
  }
}
