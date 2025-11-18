import { invoke } from '@tauri-apps/api/core';
import type {
  PracticeSession,
  CreatePracticeSessionRequest,
  UserPracticeProgress,
  WordProgress,
  UpdateProgressRequest,
} from '../types/practice';

export class PracticeService {
  // Practice session management
  static async createPracticeSession(request: CreatePracticeSessionRequest): Promise<string> {
    return invoke('create_practice_session', { request });
  }

  static async getPracticeSessions(language: string, limit?: number): Promise<PracticeSession[]> {
    return invoke('get_practice_sessions', { language, limit });
  }

  // Progress management
  static async updatePracticeProgress(request: UpdateProgressRequest): Promise<string> {
    return invoke('update_practice_progress', { request });
  }

  static async getPracticeProgress(language: string): Promise<UserPracticeProgress | null> {
    return invoke('get_practice_progress', { language });
  }

  static async getWordProgress(
    language: string,
    vocabularyId: string
  ): Promise<WordProgress | null> {
    return invoke('get_word_progress', { language, vocabularyId });
  }
}
