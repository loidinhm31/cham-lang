/**
 * Practice Service
 * Direct passthrough to the platform adapter via ServiceFactory
 */

import { getPracticeService } from "@cham-lang/ui/adapters";
import type {
  CreatePracticeSessionRequest,
  PracticeSession,
  UpdateProgressRequest,
  UserPracticeProgress,
  WordProgress,
} from "@cham-lang/shared/types";

export class PracticeService {
  // Practice session management
  static async createPracticeSession(
    request: CreatePracticeSessionRequest,
  ): Promise<string> {
    return getPracticeService().createPracticeSession(request);
  }

  static async getPracticeSessions(
    language: string,
    limit?: number,
  ): Promise<PracticeSession[]> {
    return getPracticeService().getPracticeSessions(language, limit);
  }

  // Progress management
  static async updatePracticeProgress(
    request: UpdateProgressRequest,
  ): Promise<string> {
    return getPracticeService().updatePracticeProgress(request);
  }

  static async getPracticeProgress(
    language: string,
  ): Promise<UserPracticeProgress | null> {
    return getPracticeService().getPracticeProgress(language);
  }

  static async getWordProgress(
    language: string,
    vocabularyId: string,
  ): Promise<WordProgress | null> {
    return getPracticeService().getWordProgress(language, vocabularyId);
  }
}
