/**
 * SM-2 Algorithm (SuperMemo 2)
 * The classic spaced repetition algorithm
 *
 * Reference: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 *
 * Key concepts:
 * - Easiness Factor (EF): 1.3 - 2.5, default 2.5
 * - Quality of response (0-5): We use binary (correct/incorrect)
 * - Intervals: 1 day, 6 days, then multiply by EF
 */

import type {
  ReviewResult,
  SpacedRepetitionAlgorithm,
} from "@cham-lang/ui/utils";
import { addDays, BOX_INTERVAL_PRESETS } from "@cham-lang/ui/utils";
import type { WordProgress } from "@cham-lang/shared/types";
import type { LearningSettings } from "@cham-lang/shared/types";

const MIN_EASINESS_FACTOR = 1.3;
const MAX_EASINESS_FACTOR = 2.5;

export class SM2Algorithm implements SpacedRepetitionAlgorithm {
  getName(): string {
    return "SM-2 (SuperMemo 2)";
  }

  getDescription(): string {
    return "Classic algorithm with dynamic easiness factor. Intervals adapt based on your performance.";
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

    // Update easiness factor (increase slightly for correct answer)
    updated.easinessFactor = this.calculateEasinessFactor(
      updated.easinessFactor,
      5, // Quality 5 = perfect response
    );

    // Check if should advance to next box
    const shouldAdvance =
      updated.consecutiveCorrectCount >= settings.consecutiveCorrectRequired;

    if (shouldAdvance && updated.leitnerBox < settings.leitnerBoxCount) {
      // Advance to next box
      updated.leitnerBox += 1;
      updated.consecutiveCorrectCount = 0; // Reset for next box
    }

    // Calculate next interval using SM-2 formula
    const interval = this.calculateInterval(updated, settings);
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
          ? `Excellent! Advanced to Box ${updated.leitnerBox}!`
          : `Correct! Next review in ${interval} day${interval !== 1 ? "s" : ""}`,
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

    // Update easiness factor (decrease for incorrect answer)
    updated.easinessFactor = this.calculateEasinessFactor(
      updated.easinessFactor,
      0, // Quality 0 = complete blackout
    );

    // Move back to box 1
    updated.leitnerBox = 1;

    // Reset interval to minimum (1 day)
    updated.lastIntervalDays = updated.intervalDays;
    updated.intervalDays = 1;

    // Set next review for tomorrow (or immediate if show_failed_words_in_session)
    const nextReviewDate = settings.showFailedWordsInSession
      ? new Date() // Immediate retry in same session
      : addDays(new Date(), 1);

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
      intervalDays: updated.intervalDays,
      message: settings.showFailedWordsInSession
        ? "Incorrect. Let's try this one again!"
        : "Incorrect. Moved to Box 1. Review again tomorrow.",
    };
  }

  calculateNextReviewDate(
    wordProgress: WordProgress,
    settings: LearningSettings,
  ): Date {
    const interval = this.calculateInterval(wordProgress, settings);
    return addDays(new Date(), interval);
  }

  getBoxInterval(boxNumber: number, settings: LearningSettings): number {
    // For SM-2, we don't use fixed box intervals, but we provide a reference
    const presets = BOX_INTERVAL_PRESETS[settings.leitnerBoxCount];
    return presets[boxNumber - 1] || presets[presets.length - 1];
  }

  /**
   * Calculate the next interval using SM-2 formula
   */
  private calculateInterval(
    wordProgress: WordProgress,
    _settings: LearningSettings,
  ): number {
    const {
      consecutiveCorrectCount,
      intervalDays,
      easinessFactor,
      leitnerBox,
    } = wordProgress;

    // First review in current box
    if (consecutiveCorrectCount === 0) {
      return 1;
    }

    // Second review in current box
    if (consecutiveCorrectCount === 1) {
      return 6;
    }

    // Subsequent reviews: multiply previous interval by easiness factor
    // Also consider the Leitner box as a multiplier
    const boxMultiplier = Math.pow(1.5, leitnerBox - 1);
    const newInterval = Math.round(
      intervalDays * easinessFactor * boxMultiplier,
    );

    // Ensure minimum interval of 1 day
    return Math.max(1, newInterval);
  }

  /**
   * Calculate the easiness factor using SM-2 formula
   * EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
   *
   * Where:
   * - EF is the current easiness factor
   * - q is the quality of response (0-5)
   * - 5 = perfect response, 0 = complete blackout
   */
  private calculateEasinessFactor(currentEF: number, quality: number): number {
    const newEF =
      currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    // Clamp between MIN and MAX
    return Math.max(MIN_EASINESS_FACTOR, Math.min(MAX_EASINESS_FACTOR, newEF));
  }
}
