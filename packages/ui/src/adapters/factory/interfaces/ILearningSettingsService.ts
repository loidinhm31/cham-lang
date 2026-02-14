/**
 * Learning Settings Service Interface
 * Contract that both Tauri and Web adapters must implement
 */

import type {
  LearningSettings,
  SpacedRepetitionAlgorithm,
  LeitnerBoxCount,
} from "@cham-lang/shared/types";

export interface UpdateLearningSettingsRequest {
  srAlgorithm?: SpacedRepetitionAlgorithm;
  leitnerBoxCount?: LeitnerBoxCount;
  consecutiveCorrectRequired?: number;
  showFailedWordsInSession?: boolean;
  newWordsPerDay?: number;
  dailyReviewLimit?: number;
  autoAdvanceTimeoutSeconds?: number;
  showHintInFillword?: boolean;
  reminderEnabled?: boolean;
  reminderTime?: string;
}

export interface ILearningSettingsService {
  // Settings CRUD
  getLearningSettings(): Promise<LearningSettings | null>;
  getOrCreateLearningSettings(): Promise<LearningSettings>;
  updateLearningSettings(
    request: UpdateLearningSettingsRequest,
  ): Promise<LearningSettings>;
}
