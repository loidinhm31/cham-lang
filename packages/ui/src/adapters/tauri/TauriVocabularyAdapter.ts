/**
 * Tauri Vocabulary Adapter
 * Wraps Tauri IPC calls for vocabulary operations
 */

import { invoke } from "@tauri-apps/api/core";
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

export class TauriVocabularyAdapter implements IVocabularyService {
  async createVocabulary(request: CreateVocabularyRequest): Promise<string> {
    return invoke("create_vocabulary", { request });
  }

  async getVocabulary(id: string): Promise<Vocabulary> {
    return invoke("get_vocabulary", { id });
  }

  async getAllVocabularies(
    language?: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    return invoke("get_all_vocabularies", { language, limit });
  }

  async updateVocabulary(request: UpdateVocabularyRequest): Promise<string> {
    return invoke("update_vocabulary", { request });
  }

  async deleteVocabulary(id: string): Promise<string> {
    return invoke("delete_vocabulary", { id });
  }

  async bulkMoveVocabularies(
    vocabularyIds: string[],
    targetCollectionId: string,
  ): Promise<BulkMoveResult> {
    const request: BulkMoveRequest = {
      vocabulary_ids: vocabularyIds,
      target_collection_id: targetCollectionId,
    };
    return invoke("bulk_move_vocabularies", { request });
  }

  async searchVocabularies(query: SearchQuery): Promise<Vocabulary[]> {
    return invoke("search_vocabularies", {
      query: query.query,
      language: query.language,
    });
  }

  async getVocabulariesByTopic(
    topic: string,
    language?: string,
  ): Promise<Vocabulary[]> {
    return invoke("get_vocabularies_by_topic", { topic, language });
  }

  async getVocabulariesByLevel(
    level: string,
    language?: string,
  ): Promise<Vocabulary[]> {
    return invoke("get_vocabularies_by_level", { level, language });
  }

  async getVocabulariesByCollection(
    collectionId: string,
    limit?: number,
  ): Promise<Vocabulary[]> {
    return invoke("get_vocabularies_by_collection", { collectionId, limit });
  }

  async getVocabulariesByCollectionPaginated(
    collectionId: string,
    limit?: number,
    offset?: number,
  ): Promise<PaginatedResponse<Vocabulary>> {
    return invoke("get_vocabularies_by_collection_paginated", {
      collectionId,
      limit,
      offset,
    });
  }

  async getAllLanguages(): Promise<string[]> {
    return invoke("get_all_languages");
  }

  async getAllTopics(): Promise<string[]> {
    return invoke("get_all_topics");
  }

  async getAllTags(): Promise<string[]> {
    return invoke("get_all_tags");
  }
}
