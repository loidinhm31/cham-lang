/**
 * Simple Doubling Algorithm
 * Very simple spaced repetition using interval doubling
 *
 * Key concept:
 * - Start with 1 day interval
 * - Each correct answer doubles the interval (1 → 2 → 4 → 8 → 16...)
 * - Incorrect answer resets back to 1 day
 * - Uses Leitner boxes for visual progression
 *
 * This is the easiest algorithm to understand and explain to users.
 */

import type {
  ReviewResult,
  SpacedRepetitionAlgorithm,
} from "@cham-lang/ui/utils";
import { addDays } from "@cham-lang/ui/utils";
import type { WordProgress } from "@cham-lang/shared/types";
import type { LearningSettings } from "@cham-lang/shared/types";

const DEFAULT_EASINESS_FACTOR = 2.5;
const INITIAL_INTERVAL = 1; // Start with 1 day
const MAX_INTERVAL = 120; // Cap at ~4 months

export class SimpleAlgorithm implements SpacedRepetitionAlgorithm {
  getName(): string {
    return "Simple Doubling";
  }

  getDescription(): string {
    return "Each success doubles the interval (1d → 2d → 4d). Very simple approach.";
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

    // Keep easiness factor stable (not used in this algorithm)
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

    // Double the interval (or use initial interval if this is first review)
    let interval: number;
    if (updated.intervalDays === 0) {
      interval = INITIAL_INTERVAL;
    } else {
      interval = Math.min(updated.intervalDays * 2, MAX_INTERVAL);
    }

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
          : `Correct! Interval doubled to ${interval} day${interval !== 1 ? "s" : ""}. ${updated.consecutiveCorrectCount}/${settings.consecutiveCorrectRequired} towards next box.`,
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

    // Reset interval to initial
    updated.lastIntervalDays = updated.intervalDays;
    updated.intervalDays = INITIAL_INTERVAL;

    // Set next review for tomorrow (or immediate if show_failed_words_in_session)
    const nextReviewDate = settings.showFailedWordsInSession
      ? new Date() // Immediate retry in same session
      : addDays(new Date(), INITIAL_INTERVAL);

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
      intervalDays: INITIAL_INTERVAL,
      message: settings.showFailedWordsInSession
        ? "Incorrect. Let's try this one again!"
        : `Incorrect. Reset to Box 1. Review again tomorrow.`,
    };
  }

  calculateNextReviewDate(wordProgress: WordProgress): Date {
    // Next interval will be double the current (or initial if current is 0)
    const interval =
      wordProgress.intervalDays === 0
        ? INITIAL_INTERVAL
        : Math.min(wordProgress.intervalDays * 2, MAX_INTERVAL);
    return addDays(new Date(), interval);
  }

  getBoxInterval(boxNumber: number, _settings: LearningSettings): number {
    // For the simple algorithm, we show reference intervals based on doubling
    // Box 1: 1d, Box 2: 2d, Box 3: 4d, Box 4: 8d, Box 5: 16d, etc.
    const interval = Math.pow(2, boxNumber - 1);
    return Math.min(interval, MAX_INTERVAL);
  }
}
