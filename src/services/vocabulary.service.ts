import { invoke } from '@tauri-apps/api/core';
import type {
  Vocabulary,
  CreateVocabularyRequest,
  UpdateVocabularyRequest,
  SearchQuery,
  UserPreferences,
} from '../types/vocabulary';

export class VocabularyService {
  // Database connection
  static async connectDatabase(connectionString: string): Promise<string> {
    return invoke('connect_database', { connectionString });
  }

  static async disconnectDatabase(): Promise<string> {
    return invoke('disconnect_database');
  }

  static async isDatabaseConnected(): Promise<boolean> {
    return invoke('is_database_connected');
  }

  // Vocabulary CRUD
  static async createVocabulary(
    request: CreateVocabularyRequest
  ): Promise<string> {
    return invoke('create_vocabulary', { request });
  }

  static async getVocabulary(id: string): Promise<Vocabulary> {
    return invoke('get_vocabulary', { id });
  }

  static async getAllVocabularies(
    language?: string,
    limit?: number
  ): Promise<Vocabulary[]> {
    return invoke('get_all_vocabularies', { language, limit });
  }

  static async updateVocabulary(request: UpdateVocabularyRequest): Promise<string> {
    return invoke('update_vocabulary', { request });
  }

  static async deleteVocabulary(id: string): Promise<string> {
    return invoke('delete_vocabulary', { id });
  }

  static async searchVocabularies(query: SearchQuery): Promise<Vocabulary[]> {
    return invoke('search_vocabularies', { query: query.query, language: query.language });
  }

  static async getVocabulariesByTopic(
    topic: string,
    language?: string
  ): Promise<Vocabulary[]> {
    return invoke('get_vocabularies_by_topic', { topic, language });
  }

  static async getVocabulariesByLevel(
    level: string,
    language?: string
  ): Promise<Vocabulary[]> {
    return invoke('get_vocabularies_by_level', { level, language });
  }

  static async getVocabulariesByCollection(
    collectionId: string,
    limit?: number
  ): Promise<Vocabulary[]> {
    return invoke('get_vocabularies_by_collection', { collectionId, limit });
  }

  // User preferences
  static async savePreferences(preferences: UserPreferences): Promise<string> {
    return invoke('save_preferences', { preferences });
  }

  static async getPreferences(): Promise<UserPreferences | null> {
    return invoke('get_preferences');
  }

  // Language management
  static async getAllLanguages(): Promise<string[]> {
    return invoke('get_all_languages');
  }
}
