/**
 * HTTP Practice Adapter
 * Communicates with desktop SQLite backend via HTTP REST API
 */

import { HttpAdapter } from "./HttpAdapter";
import type { IPracticeService } from "@/adapters";
import type {
  CreatePracticeSessionRequest,
  PracticeSession,
  UpdateProgressRequest,
  UserPracticeProgress,
  WordProgress,
} from "@/types/practice";

export class HttpPracticeAdapter
  extends HttpAdapter
  implements IPracticeService
{
  async createPracticeSession(
    request: CreatePracticeSessionRequest,
  ): Promise<string> {
    return this.post<string>("/practice/sessions", request);
  }

  async getPracticeSessions(
    language: string,
    limit?: number,
  ): Promise<PracticeSession[]> {
    return this.get<PracticeSession[]>("/practice/sessions", {
      language,
      limit,
    });
  }

  async updatePracticeProgress(
    request: UpdateProgressRequest,
  ): Promise<string> {
    return this.put<string>("/practice/progress", request);
  }

  async getPracticeProgress(
    language: string,
  ): Promise<UserPracticeProgress | null> {
    return this.get<UserPracticeProgress | null>(
      `/practice/progress/${language}`,
    );
  }

  async getWordProgress(
    language: string,
    vocabularyId: string,
  ): Promise<WordProgress | null> {
    // Get the full practice progress and extract word progress
    const progress = await this.getPracticeProgress(language);
    if (!progress || !progress.words_progress) {
      return null;
    }
    // Find the word progress for the given vocabulary ID
    const wordProgress = progress.words_progress.find(
      (wp) => wp.vocabulary_id === vocabularyId,
    );
    return wordProgress || null;
  }
}
