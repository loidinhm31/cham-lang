/**
 * Spaced Repetition Algorithm Interface
 * All SR algorithms must implement this interface for consistency
 */

import type { WordProgress } from '../../types/practice';
import type { LearningSettings, LeitnerBoxCount } from '../../types/settings';

// Re-export box interval presets from settings
export { BOX_INTERVAL_PRESETS } from '../../types/settings';

/**
 * Result of processing an answer
 */
export interface ReviewResult {
  // Updated word progress with new SR values
  updatedProgress: WordProgress;

  // Human-readable feedback
  boxChanged: boolean; // Did the word move to a different box?
  previousBox: number;
  newBox: number;
  nextReviewDate: Date;
  intervalDays: number;

  // For UI messaging
  message?: string; // e.g., "Great! You've mastered this word!"
}

/**
 * Common interface for all Spaced Repetition algorithms
 */
export interface SpacedRepetitionAlgorithm {
  /**
   * Get the name of the algorithm
   */
  getName(): string;

  /**
   * Get a description of how this algorithm works
   */
  getDescription(): string;

  /**
   * Process a correct answer and update word progress
   * @param wordProgress Current word progress
   * @param settings User's learning settings
   * @returns Updated word progress and review result
   */
  processCorrectAnswer(
    wordProgress: WordProgress,
    settings: LearningSettings
  ): ReviewResult;

  /**
   * Process an incorrect answer and update word progress
   * @param wordProgress Current word progress
   * @param settings User's learning settings
   * @returns Updated word progress and review result
   */
  processIncorrectAnswer(
    wordProgress: WordProgress,
    settings: LearningSettings
  ): ReviewResult;

  /**
   * Calculate the next review date for a word
   * @param wordProgress Current word progress
   * @param settings User's learning settings
   * @returns Next review date
   */
  calculateNextReviewDate(
    wordProgress: WordProgress,
    settings: LearningSettings
  ): Date;

  /**
   * Get the interval in days for a specific Leitner box
   * @param boxNumber The Leitner box number (1-indexed)
   * @param settings User's learning settings
   * @returns Interval in days
   */
  getBoxInterval(boxNumber: number, settings: LearningSettings): number;
}

/**
 * Helper function to add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Helper function to check if a word is due for review
 */
export function isDueForReview(wordProgress: WordProgress, currentDate: Date = new Date()): boolean {
  const reviewDate = new Date(wordProgress.next_review_date);
  return reviewDate <= currentDate;
}

/**
 * Helper function to get days until next review
 */
export function getDaysUntilReview(wordProgress: WordProgress, currentDate: Date = new Date()): number {
  const reviewDate = new Date(wordProgress.next_review_date);
  const diffTime = reviewDate.getTime() - currentDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
