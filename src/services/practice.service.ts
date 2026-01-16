/**
 * Practice Service
 * Uses platform adapter for cross-platform compatibility
 */

import { getPracticeService } from "@/adapters/ServiceFactory";
import type {
  CreatePracticeSessionRequest,
  PracticeSession,
  UpdateProgressRequest,
  UserPracticeProgress,
  WordProgress,
} from "@/types/practice";

// Get the platform-specific service
const service = getPracticeService();

export class PracticeService {
  // Practice session management
  static async createPracticeSession(
    request: CreatePracticeSessionRequest,
  ): Promise<string> {
    return service.createPracticeSession(request);
  }

  static async getPracticeSessions(
    language: string,
    limit?: number,
  ): Promise<PracticeSession[]> {
    return service.getPracticeSessions(language, limit);
  }

  // Progress management
  static async updatePracticeProgress(
    request: UpdateProgressRequest,
  ): Promise<string> {
    return service.updatePracticeProgress(request);
  }

  static async getPracticeProgress(
    language: string,
  ): Promise<UserPracticeProgress | null> {
    return service.getPracticeProgress(language);
  }

  static async getWordProgress(
    language: string,
    vocabularyId: string,
  ): Promise<WordProgress | null> {
    return service.getWordProgress(language, vocabularyId);
  }
}
