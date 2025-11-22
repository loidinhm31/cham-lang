import { invoke } from "@tauri-apps/api/core";
import type {
  LearningSettings,
  SpacedRepetitionAlgorithm,
} from "@/types/settings";

/**
 * Update Learning Settings Request
 * Matches the Rust UpdateLearningSettingsRequest struct
 */
export interface UpdateLearningSettingsRequest {
  sr_algorithm?: SpacedRepetitionAlgorithm;
  leitner_box_count?: number;
  consecutive_correct_required?: number;
  show_failed_words_in_session?: boolean;
  new_words_per_day?: number;
  daily_review_limit?: number;
}

export class LearningSettingsService {
  /**
   * Get the user's learning settings (returns null if not set)
   */
  static async getLearningSettings(): Promise<LearningSettings | null> {
    return invoke("get_learning_settings");
  }

  /**
   * Get the user's learning settings, or create default settings if none exist
   */
  static async getOrCreateLearningSettings(): Promise<LearningSettings> {
    return invoke("get_or_create_learning_settings");
  }

  /**
   * Update the user's learning settings
   */
  static async updateLearningSettings(
    request: UpdateLearningSettingsRequest,
  ): Promise<LearningSettings> {
    return invoke("update_learning_settings", { request });
  }

  /**
   * Helper: Update a single setting field
   */
  static async updateSingleSetting<
    K extends keyof UpdateLearningSettingsRequest,
  >(
    field: K,
    value: UpdateLearningSettingsRequest[K],
  ): Promise<LearningSettings> {
    const request: UpdateLearningSettingsRequest = { [field]: value };
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
