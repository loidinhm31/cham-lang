/**
 * Learning Settings Service Interface
 * Contract that both Tauri and Web adapters must implement
 */

import type {
  LearningSettings,
  SpacedRepetitionAlgorithm,
  LeitnerBoxCount,
} from "../types/settings";

export interface UpdateLearningSettingsRequest {
  sr_algorithm?: SpacedRepetitionAlgorithm;
  leitner_box_count?: LeitnerBoxCount;
  consecutive_correct_required?: number;
  show_failed_words_in_session?: boolean;
  new_words_per_day?: number;
  daily_review_limit?: number;
  auto_advance_timeout_seconds?: number;
  show_hint_in_fillword?: boolean;
  reminder_enabled?: boolean;
  reminder_time?: string;
}

export interface ILearningSettingsService {
  // Settings CRUD
  getLearningSettings(): Promise<LearningSettings | null>;
  getOrCreateLearningSettings(): Promise<LearningSettings>;
  updateLearningSettings(
    request: UpdateLearningSettingsRequest,
  ): Promise<LearningSettings>;
}
