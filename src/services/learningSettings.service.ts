/**
 * Learning Settings Service
 * Uses platform adapter for cross-platform compatibility
 */

import { getLearningSettingsService } from "@/adapters/ServiceFactory";
import type { LearningSettings } from "@/types/settings";

// Re-export the request type from the interface
export type { UpdateLearningSettingsRequest } from "@/adapters/interfaces/ILearningSettingsService";

// Get the platform-specific service
const service = getLearningSettingsService();

export class LearningSettingsService {
  /**
   * Get the user's learning settings (returns null if not set)
   */
  static async getLearningSettings(): Promise<LearningSettings | null> {
    return service.getLearningSettings();
  }

  /**
   * Get the user's learning settings, or create default settings if none exist
   */
  static async getOrCreateLearningSettings(): Promise<LearningSettings> {
    return service.getOrCreateLearningSettings();
  }

  /**
   * Update the user's learning settings
   */
  static async updateLearningSettings(
    request: Parameters<typeof service.updateLearningSettings>[0],
  ): Promise<LearningSettings> {
    return service.updateLearningSettings(request);
  }

  /**
   * Helper: Update a single setting field
   */
  static async updateSingleSetting<
    K extends keyof Parameters<typeof service.updateLearningSettings>[0],
  >(
    field: K,
    value: Parameters<typeof service.updateLearningSettings>[0][K],
  ): Promise<LearningSettings> {
    const request = { [field]: value } as Parameters<
      typeof service.updateLearningSettings
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
