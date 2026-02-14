/**
 * Learning Settings Service
 * Uses platform adapter for cross-platform compatibility
 * Lazy service access + error handling pattern
 */

import { getLearningSettingsService } from "@cham-lang/ui/adapters";
import type { LearningSettings } from "@cham-lang/shared/types";

// Re-export the request type from the interface
export type { UpdateLearningSettingsRequest } from "@cham-lang/ui/adapters/factory/interfaces";

export class LearningSettingsService {
  /**
   * Get the user's learning settings (returns null if not set)
   */
  static async getLearningSettings(): Promise<LearningSettings | null> {
    try {
      const service = getLearningSettingsService();
      return await service.getLearningSettings();
    } catch (error) {
      console.error("Error getting learning settings:", error);
      throw LearningSettingsService.handleError(error);
    }
  }

  /**
   * Get the user's learning settings, or create default settings if none exist
   */
  static async getOrCreateLearningSettings(): Promise<LearningSettings> {
    try {
      const service = getLearningSettingsService();
      return await service.getOrCreateLearningSettings();
    } catch (error) {
      console.error("Error getting or creating learning settings:", error);
      throw LearningSettingsService.handleError(error);
    }
  }

  /**
   * Update the user's learning settings
   */
  static async updateLearningSettings(
    request: Parameters<
      ReturnType<typeof getLearningSettingsService>["updateLearningSettings"]
    >[0],
  ): Promise<LearningSettings> {
    try {
      const service = getLearningSettingsService();
      return await service.updateLearningSettings(request);
    } catch (error) {
      console.error("Error updating learning settings:", error);
      throw LearningSettingsService.handleError(error);
    }
  }

  /**
   * Helper: Update a single setting field
   */
  static async updateSingleSetting<
    K extends keyof Parameters<
      ReturnType<typeof getLearningSettingsService>["updateLearningSettings"]
    >[0],
  >(
    field: K,
    value: Parameters<
      ReturnType<typeof getLearningSettingsService>["updateLearningSettings"]
    >[0][K],
  ): Promise<LearningSettings> {
    const request = { [field]: value } as Parameters<
      ReturnType<typeof getLearningSettingsService>["updateLearningSettings"]
    >[0];
    return this.updateLearningSettings(request);
  }

  /**
   * Helper: Get settings with defaults
   * Always returns settings (creates default if none exist)
   */
  static async getSettingsWithDefaults(): Promise<LearningSettings> {
    return this.getOrCreateLearningSettings();
  }

  private static handleError(error: unknown): Error {
    if (typeof error === "string") return new Error(error);
    return error instanceof Error ? error : new Error("Unknown error occurred");
  }
}
