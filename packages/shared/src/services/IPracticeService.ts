/**
 * Practice Service Interface
 * Contract that both Tauri and Web adapters must implement
 */

import type {
  CreatePracticeSessionRequest,
  PracticeSession,
  UpdateProgressRequest,
  UserPracticeProgress,
  WordProgress,
} from "../types/practice";

export interface IPracticeService {
  // Practice session management
  createPracticeSession(request: CreatePracticeSessionRequest): Promise<string>;
  getPracticeSessions(
    language: string,
    limit?: number,
  ): Promise<PracticeSession[]>;

  // Progress management
  updatePracticeProgress(request: UpdateProgressRequest): Promise<string>;
  getPracticeProgress(language: string): Promise<UserPracticeProgress | null>;
  getWordProgress(
    language: string,
    vocabularyId: string,
  ): Promise<WordProgress | null>;
}
