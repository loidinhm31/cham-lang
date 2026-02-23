/**
 * Learning Settings Service
 * Direct passthrough to the platform adapter via ServiceFactory
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
    return getLearningSettingsService().getLearningSettings();
  }

  /**
   * Get the user's learning settings, or create default settings if none exist
   */
  static async getOrCreateLearningSettings(): Promise<LearningSettings> {
    return getLearningSettingsService().getOrCreateLearningSettings();
  }

  /**
   * Update the user's learning settings
   */
  static async updateLearningSettings(
    request: Parameters<
      ReturnType<typeof getLearningSettingsService>["updateLearningSettings"]
    >[0],
  ): Promise<LearningSettings> {
    return getLearningSettingsService().updateLearningSettings(request);
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
}
