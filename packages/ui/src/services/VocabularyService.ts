/**
 * Vocabulary Service
 * Uses platform adapter for cross-platform compatibility
 * Lazy service access + error handling pattern
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
    try {
      const service = getVocabularyService();
      return await service.createVocabulary(request);
    } catch (error) {
      console.error("Error creating vocabulary:", error);
      throw VocabularyService.handleError(error);
    }
  }

  static async getVocabulary(id: string): Promise<Vocabulary> {
    try {
      const service = getVocabularyService();
      return await service.getVocabulary(id);
    } catch (error) {
      console.error("Error getting vocabulary:", error);
      throw VocabularyService.handleError(error);
    }
  }

  static async getAllVocabularies(
    language?: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    try {
      const service = getVocabularyService();
      return await service.getAllVocabularies(language, limit);
    } catch (error) {
      console.error("Error getting all vocabularies:", error);
      throw VocabularyService.handleError(error);
    }
  }

  static async updateVocabulary(
    request: UpdateVocabularyRequest,
  ): Promise<string> {
    try {
      const service = getVocabularyService();
      return await service.updateVocabulary(request);
    } catch (error) {
      console.error("Error updating vocabulary:", error);
      throw VocabularyService.handleError(error);
    }
  }

  static async deleteVocabulary(id: string): Promise<string> {
    try {
      const service = getVocabularyService();
      return await service.deleteVocabulary(id);
    } catch (error) {
      console.error("Error deleting vocabulary:", error);
      throw VocabularyService.handleError(error);
    }
  }

  static async bulkMoveVocabularies(
    vocabularyIds: string[],
    targetCollectionId: string,
  ): Promise<BulkMoveResult> {
    try {
      const service = getVocabularyService();
      return await service.bulkMoveVocabularies(
        vocabularyIds,
        targetCollectionId,
      );
    } catch (error) {
      console.error("Error bulk moving vocabularies:", error);
      throw VocabularyService.handleError(error);
    }
  }

  static async searchVocabularies(query: SearchQuery): Promise<Vocabulary[]> {
    try {
      const service = getVocabularyService();
      return await service.searchVocabularies(query);
    } catch (error) {
      console.error("Error searching vocabularies:", error);
      throw VocabularyService.handleError(error);
    }
  }

  static async getVocabulariesByTopic(
    topic: string,
    language?: string,
  ): Promise<Vocabulary[]> {
    try {
      const service = getVocabularyService();
      return await service.getVocabulariesByTopic(topic, language);
    } catch (error) {
      console.error("Error getting vocabularies by topic:", error);
      throw VocabularyService.handleError(error);
    }
  }

  static async getVocabulariesByLevel(
    level: string,
    language?: string,
  ): Promise<Vocabulary[]> {
    try {
      const service = getVocabularyService();
      return await service.getVocabulariesByLevel(level, language);
    } catch (error) {
      console.error("Error getting vocabularies by level:", error);
      throw VocabularyService.handleError(error);
    }
  }

  static async getVocabulariesByCollection(
    collectionId: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    try {
      const service = getVocabularyService();
      return await service.getVocabulariesByCollection(collectionId, limit);
    } catch (error) {
      console.error("Error getting vocabularies by collection:", error);
      throw VocabularyService.handleError(error);
    }
  }

  static async getVocabulariesByCollectionPaginated(
    collectionId: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<Vocabulary>> {
    try {
      const service = getVocabularyService();
      return await service.getVocabulariesByCollectionPaginated(
        collectionId,
        limit,
        offset,
      );
    } catch (error) {
      console.error("Error getting paginated vocabularies:", error);
      throw VocabularyService.handleError(error);
    }
  }

  // Language management
  static async getAllLanguages(): Promise<string[]> {
    try {
      const service = getVocabularyService();
      return await service.getAllLanguages();
    } catch (error) {
      console.error("Error getting all languages:", error);
      throw VocabularyService.handleError(error);
    }
  }

  // Topics and tags
  static async getAllTopics(): Promise<string[]> {
    try {
      const service = getVocabularyService();
      return await service.getAllTopics();
    } catch (error) {
      console.error("Error getting all topics:", error);
      throw VocabularyService.handleError(error);
    }
  }

  static async getAllTags(): Promise<string[]> {
    try {
      const service = getVocabularyService();
      return await service.getAllTags();
    } catch (error) {
      console.error("Error getting all tags:", error);
      throw VocabularyService.handleError(error);
    }
  }

  private static handleError(error: unknown): Error {
    if (typeof error === "string") return new Error(error);
    return error instanceof Error ? error : new Error("Unknown error occurred");
  }
}
