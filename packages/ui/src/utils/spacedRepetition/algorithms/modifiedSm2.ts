/**
 * Modified SM-2 Algorithm
 * Simplified version of SM-2 with fixed intervals per Leitner box
 *
 * This algorithm combines the Leitner box system with predictable intervals,
 * making it easier for users to understand when they'll review words again.
 *
 * Intervals per box:
 * - 3 boxes: [1d, 7d, 30d]
 * - 5 boxes: [1d, 3d, 7d, 14d, 30d]
 * - 7 boxes: [1d, 2d, 4d, 7d, 14d, 30d, 60d]
 */

import type {
  ReviewResult,
  SpacedRepetitionAlgorithm,
} from "@cham-lang/ui/utils";
import { addDays, BOX_INTERVAL_PRESETS } from "@cham-lang/ui/utils";
import type { WordProgress } from "@cham-lang/shared/types";
import type { LearningSettings } from "@cham-lang/shared/types";

const DEFAULT_EASINESS_FACTOR = 2.5;

export class ModifiedSM2Algorithm implements SpacedRepetitionAlgorithm {
  getName(): string {
    return "Modified SM-2";
  }

  getDescription(): string {
    return "Simplified SM-2 with fixed intervals per box. Predictable and easy to understand.";
  }

  processCorrectAnswer(
    wordProgress: WordProgress,
    settings: LearningSettings,
  ): ReviewResult {
    const updated = { ...wordProgress };
    const previousBox = updated.leitnerBox;

    // Increment counters
    updated.correctCount += 1;
    updated.consecutiveCorrectCount += 1;
    updated.totalReviews += 1;
    updated.lastPracticed = new Date().toISOString();

    // Keep easiness factor stable (not used for interval calculation in this algorithm)
    if (updated.easinessFactor === 0) {
      updated.easinessFactor = DEFAULT_EASINESS_FACTOR;
    }

    // Check if should advance to next box
    const shouldAdvance =
      updated.consecutiveCorrectCount >= settings.consecutiveCorrectRequired;

    if (shouldAdvance && updated.leitnerBox < settings.leitnerBoxCount) {
      // Advance to next box
      updated.leitnerBox += 1;
      updated.consecutiveCorrectCount = 0; // Reset for next box
    }

    // Get fixed interval for current box
    const interval = this.getBoxInterval(updated.leitnerBox, settings);
    updated.lastIntervalDays = updated.intervalDays;
    updated.intervalDays = interval;

    // Calculate next review date
    const nextReviewDate = addDays(new Date(), interval);
    updated.nextReviewDate = nextReviewDate.toISOString();

    // Update legacy mastery level
    const total = updated.correctCount + updated.incorrectCount;
    const ratio = updated.correctCount / total;
    updated.masteryLevel = Math.round(ratio * 5);

    // Reset session flags
    updated.failedInSession = false;
    updated.retryCount = 0;

    return {
      updatedProgress: updated,
      boxChanged: updated.leitnerBox !== previousBox,
      previousBox,
      newBox: updated.leitnerBox,
      nextReviewDate,
      intervalDays: interval,
      message:
        shouldAdvance && updated.leitnerBox !== previousBox
          ? `Excellent! Advanced to Box ${updated.leitnerBox}! Next review in ${interval} day${interval !== 1 ? "s" : ""}`
          : `Correct! ${updated.consecutiveCorrectCount}/${settings.consecutiveCorrectRequired} towards next box. Review in ${interval} day${interval !== 1 ? "s" : ""}`,
    };
  }

  processIncorrectAnswer(
    wordProgress: WordProgress,
    settings: LearningSettings,
  ): ReviewResult {
    const updated = { ...wordProgress };
    const previousBox = updated.leitnerBox;

    // Increment counters
    updated.incorrectCount += 1;
    updated.consecutiveCorrectCount = 0; // Reset consecutive count
    updated.totalReviews += 1;
    updated.lastPracticed = new Date().toISOString();

    // Move back to box 1
    updated.leitnerBox = 1;

    // Get interval for box 1 (always 1 day)
    const interval = this.getBoxInterval(1, settings);
    updated.lastIntervalDays = updated.intervalDays;
    updated.intervalDays = interval;

    // Set next review for tomorrow (or immediate if show_failed_words_in_session)
    const nextReviewDate = settings.showFailedWordsInSession
      ? new Date() // Immediate retry in same session
      : addDays(new Date(), interval);

    updated.nextReviewDate = nextReviewDate.toISOString();

    // Update legacy mastery level
    const total = updated.correctCount + updated.incorrectCount;
    const ratio = total > 0 ? updated.correctCount / total : 0;
    updated.masteryLevel = Math.round(ratio * 5);

    // Set session flags for re-queuing
    updated.failedInSession = settings.showFailedWordsInSession;
    updated.retryCount = settings.showFailedWordsInSession
      ? updated.retryCount + 1
      : 0;

    return {
      updatedProgress: updated,
      boxChanged: updated.leitnerBox !== previousBox,
      previousBox,
      newBox: updated.leitnerBox,
      nextReviewDate,
      intervalDays: interval,
      message: settings.showFailedWordsInSession
        ? "Incorrect. Let's try this one again!"
        : `Incorrect. Moved to Box 1. Review again in ${interval} day${interval !== 1 ? "s" : ""}.`,
    };
  }

  calculateNextReviewDate(
    wordProgress: WordProgress,
    settings: LearningSettings,
  ): Date {
    const interval = this.getBoxInterval(wordProgress.leitnerBox, settings);
    return addDays(new Date(), interval);
  }

  getBoxInterval(boxNumber: number, settings: LearningSettings): number {
    const presets = BOX_INTERVAL_PRESETS[settings.leitnerBoxCount];
    const index = boxNumber - 1; // Convert to 0-indexed

    // Return the interval for this box, or the last interval if box number exceeds array
    return presets[index] !== undefined
      ? presets[index]
      : presets[presets.length - 1];
  }
}
