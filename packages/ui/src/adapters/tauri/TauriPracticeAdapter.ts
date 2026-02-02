/**
 * Tauri Practice Adapter
 * Wraps Tauri IPC calls for practice operations
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  CreatePracticeSessionRequest,
  PracticeSession,
  UpdateProgressRequest,
  UserPracticeProgress,
  WordProgress,
} from "@cham-lang/shared/types";
import { IPracticeService } from "@cham-lang/shared/services";

export class TauriPracticeAdapter implements IPracticeService {
  async createPracticeSession(
    request: CreatePracticeSessionRequest,
  ): Promise<string> {
    return invoke("create_practice_session", { request });
  }

  async getPracticeSessions(
    language: string,
    limit?: number,
  ): Promise<PracticeSession[]> {
    return invoke("get_practice_sessions", { language, limit });
  }

  async updatePracticeProgress(
    request: UpdateProgressRequest,
  ): Promise<string> {
    return invoke("update_practice_progress", { request });
  }

  async getPracticeProgress(
    language: string,
  ): Promise<UserPracticeProgress | null> {
    return invoke("get_practice_progress", { language });
  }

  async getWordProgress(
    language: string,
    vocabularyId: string,
  ): Promise<WordProgress | null> {
    return invoke("get_word_progress", { language, vocabularyId });
  }
}
