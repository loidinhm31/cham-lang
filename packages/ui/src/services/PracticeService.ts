/**
 * Practice Service
 * Uses platform adapter for cross-platform compatibility
 * Lazy service access + error handling pattern
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
    try {
      const service = getPracticeService();
      return await service.createPracticeSession(request);
    } catch (error) {
      console.error("Error creating practice session:", error);
      throw PracticeService.handleError(error);
    }
  }

  static async getPracticeSessions(
    language: string,
    limit?: number,
  ): Promise<PracticeSession[]> {
    try {
      const service = getPracticeService();
      return await service.getPracticeSessions(language, limit);
    } catch (error) {
      console.error("Error getting practice sessions:", error);
      throw PracticeService.handleError(error);
    }
  }

  // Progress management
  static async updatePracticeProgress(
    request: UpdateProgressRequest,
  ): Promise<string> {
    try {
      const service = getPracticeService();
      return await service.updatePracticeProgress(request);
    } catch (error) {
      console.error("Error updating practice progress:", error);
      throw PracticeService.handleError(error);
    }
  }

  static async getPracticeProgress(
    language: string,
  ): Promise<UserPracticeProgress | null> {
    try {
      const service = getPracticeService();
      return await service.getPracticeProgress(language);
    } catch (error) {
      console.error("Error getting practice progress:", error);
      throw PracticeService.handleError(error);
    }
  }

  static async getWordProgress(
    language: string,
    vocabularyId: string,
  ): Promise<WordProgress | null> {
    try {
      const service = getPracticeService();
      return await service.getWordProgress(language, vocabularyId);
    } catch (error) {
      console.error("Error getting word progress:", error);
      throw PracticeService.handleError(error);
    }
  }

  private static handleError(error: unknown): Error {
    if (typeof error === "string") return new Error(error);
    return error instanceof Error ? error : new Error("Unknown error occurred");
  }
}
