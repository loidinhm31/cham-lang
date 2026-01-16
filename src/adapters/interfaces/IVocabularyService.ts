/**
 * Vocabulary Service Interface
 * Contract that both Tauri and Web adapters must implement
 */

import type {
  Vocabulary,
  CreateVocabularyRequest,
  UpdateVocabularyRequest,
  SearchQuery,
  BulkMoveResult,
  PaginatedResponse,
} from "@/types/vocabulary";

export interface IVocabularyService {
  // Vocabulary CRUD
  createVocabulary(request: CreateVocabularyRequest): Promise<string>;
  getVocabulary(id: string): Promise<Vocabulary>;
  getAllVocabularies(language?: string, limit?: number): Promise<Vocabulary[]>;
  updateVocabulary(request: UpdateVocabularyRequest): Promise<string>;
  deleteVocabulary(id: string): Promise<string>;

  // Bulk operations
  bulkMoveVocabularies(
    vocabularyIds: string[],
    targetCollectionId: string,
  ): Promise<BulkMoveResult>;

  // Search and filter
  searchVocabularies(query: SearchQuery): Promise<Vocabulary[]>;
  getVocabulariesByTopic(
    topic: string,
    language?: string,
  ): Promise<Vocabulary[]>;
  getVocabulariesByLevel(
    level: string,
    language?: string,
  ): Promise<Vocabulary[]>;
  getVocabulariesByCollection(
    collectionId: string,
    limit?: number,
  ): Promise<Vocabulary[]>;
  getVocabulariesByCollectionPaginated(
    collectionId: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<Vocabulary>>;

  // Metadata
  getAllLanguages(): Promise<string[]>;
  getAllTopics(): Promise<string[]>;
  getAllTags(): Promise<string[]>;
}
