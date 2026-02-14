/**
 * Learning Settings Types
 * Configuration for Spaced Repetition and Leitner System
 */

export type SpacedRepetitionAlgorithm = "sm2" | "modifiedsm2" | "simple";
export type LeitnerBoxCount = 3 | 5 | 7;
export type FillWordDirection = "definition_to_word" | "word_to_definition";

export interface LearningSettings {
  id?: string;

  // Spaced Repetition Configuration
  srAlgorithm: SpacedRepetitionAlgorithm;

  // Leitner System Configuration
  leitnerBoxCount: LeitnerBoxCount;

  // Learning Rules
  consecutiveCorrectRequired: number; // Number of consecutive correct answers to advance to next box
  showFailedWordsInSession: boolean; // Re-queue failed words in the same session

  // Optional Advanced Settings
  newWordsPerDay?: number; // Limit new words introduced daily
  dailyReviewLimit?: number; // Maximum reviews per day

  // UI Preferences
  autoAdvanceTimeoutSeconds: number; // Auto-advance timeout in seconds (default: 2)
  showHintInFillword: boolean; // Show/hide hint in fill word mode (default: true)

  // Notification Settings
  reminderEnabled?: boolean; // Enable daily reminder notifications
  reminderTime?: string; // Daily reminder time in HH:MM format

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// Default settings
export const DEFAULT_LEARNING_SETTINGS: Omit<
  LearningSettings,
  "id" | "createdAt" | "updatedAt"
> = {
  srAlgorithm: "modifiedsm2",
  leitnerBoxCount: 5,
  consecutiveCorrectRequired: 3,
  showFailedWordsInSession: true,
  newWordsPerDay: 20,
  dailyReviewLimit: 100,
  autoAdvanceTimeoutSeconds: 2,
  showHintInFillword: true,
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
