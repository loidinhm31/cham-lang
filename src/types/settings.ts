/**
 * Learning Settings Types
 * Configuration for Spaced Repetition and Leitner System
 */

export type SpacedRepetitionAlgorithm = "sm2" | "modifiedsm2" | "simple";
export type LeitnerBoxCount = 3 | 5 | 7;
export type FillWordDirection = "definition_to_word" | "word_to_definition";

export interface LearningSettings {
  id?: string;
  user_id: string;

  // Spaced Repetition Configuration
  sr_algorithm: SpacedRepetitionAlgorithm;

  // Leitner System Configuration
  leitner_box_count: LeitnerBoxCount;

  // Learning Rules
  consecutive_correct_required: number; // Number of consecutive correct answers to advance to next box
  show_failed_words_in_session: boolean; // Re-queue failed words in the same session

  // Optional Advanced Settings
  new_words_per_day?: number; // Limit new words introduced daily
  daily_review_limit?: number; // Maximum reviews per day

  // UI Preferences
  auto_advance_timeout_seconds: number; // Auto-advance timeout in seconds (default: 2)
  show_hint_in_fillword: boolean; // Show/hide hint in fill word mode (default: true)

  // Notification Settings
  reminder_enabled?: boolean; // Enable daily reminder notifications
  reminder_time?: string; // Daily reminder time in HH:MM format

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Default settings
export const DEFAULT_LEARNING_SETTINGS: Omit<
  LearningSettings,
  "id" | "user_id" | "created_at" | "updated_at"
> = {
  sr_algorithm: "modifiedsm2",
  leitner_box_count: 5,
  consecutive_correct_required: 3,
  show_failed_words_in_session: true,
  new_words_per_day: 20,
  daily_review_limit: 100,
  auto_advance_timeout_seconds: 2,
  show_hint_in_fillword: true,
};

// Box interval configurations (in days)
export const BOX_INTERVAL_PRESETS: Record<LeitnerBoxCount, number[]> = {
  3: [1, 7, 30], // Learning, Review, Mastered
  5: [1, 3, 7, 14, 30], // New, Learning, Review, Familiar, Mastered
  7: [1, 2, 4, 7, 14, 30, 60], // Very granular progression
};

// Algorithm descriptions for UI
export const SR_ALGORITHM_INFO: Record<
  SpacedRepetitionAlgorithm,
  { name: string; description: string }
> = {
  sm2: {
    name: "SM-2 (SuperMemo 2)",
    description:
      "Classic algorithm with dynamic easiness factor. Intervals adapt based on your performance.",
  },
  modifiedsm2: {
    name: "Modified SM-2",
    description:
      "Simplified SM-2 with fixed intervals per box. Predictable and easy to understand.",
  },
  simple: {
    name: "Simple Doubling",
    description:
      "Each success doubles the interval (1d → 2d → 4d). Very simple approach.",
  },
};
