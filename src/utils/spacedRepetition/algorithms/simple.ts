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
} from "@/utils/spacedRepetition/types";
import { addDays } from "@/utils/spacedRepetition/types";
import type { WordProgress } from "@/types/practice";
import type { LearningSettings } from "@/types/settings";

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
    const previousBox = updated.leitner_box;

    // Increment counters
    updated.correct_count += 1;
    updated.consecutive_correct_count += 1;
    updated.total_reviews += 1;
    updated.last_practiced = new Date().toISOString();

    // Keep easiness factor stable (not used in this algorithm)
    if (updated.easiness_factor === 0) {
      updated.easiness_factor = DEFAULT_EASINESS_FACTOR;
    }

    // Check if should advance to next box
    const shouldAdvance =
      updated.consecutive_correct_count >=
      settings.consecutive_correct_required;

    if (shouldAdvance && updated.leitner_box < settings.leitner_box_count) {
      // Advance to next box
      updated.leitner_box += 1;
      updated.consecutive_correct_count = 0; // Reset for next box
    }

    // Double the interval (or use initial interval if this is first review)
    let interval: number;
    if (updated.interval_days === 0) {
      interval = INITIAL_INTERVAL;
    } else {
      interval = Math.min(updated.interval_days * 2, MAX_INTERVAL);
    }

    updated.last_interval_days = updated.interval_days;
    updated.interval_days = interval;

    // Calculate next review date
    const nextReviewDate = addDays(new Date(), interval);
    updated.next_review_date = nextReviewDate.toISOString();

    // Update legacy mastery level
    const total = updated.correct_count + updated.incorrect_count;
    const ratio = updated.correct_count / total;
    updated.mastery_level = Math.round(ratio * 5);

    // Reset session flags
    updated.failed_in_session = false;
    updated.retry_count = 0;

    return {
      updatedProgress: updated,
      boxChanged: updated.leitner_box !== previousBox,
      previousBox,
      newBox: updated.leitner_box,
      nextReviewDate,
      intervalDays: interval,
      message:
        shouldAdvance && updated.leitner_box !== previousBox
          ? `Excellent! Advanced to Box ${updated.leitner_box}! Next review in ${interval} day${interval !== 1 ? "s" : ""}`
          : `Correct! Interval doubled to ${interval} day${interval !== 1 ? "s" : ""}. ${updated.consecutive_correct_count}/${settings.consecutive_correct_required} towards next box.`,
    };
  }

  processIncorrectAnswer(
    wordProgress: WordProgress,
    settings: LearningSettings,
  ): ReviewResult {
    const updated = { ...wordProgress };
    const previousBox = updated.leitner_box;

    // Increment counters
    updated.incorrect_count += 1;
    updated.consecutive_correct_count = 0; // Reset consecutive count
    updated.total_reviews += 1;
    updated.last_practiced = new Date().toISOString();

    // Move back to box 1
    updated.leitner_box = 1;

    // Reset interval to initial
    updated.last_interval_days = updated.interval_days;
    updated.interval_days = INITIAL_INTERVAL;

    // Set next review for tomorrow (or immediate if show_failed_words_in_session)
    const nextReviewDate = settings.show_failed_words_in_session
      ? new Date() // Immediate retry in same session
      : addDays(new Date(), INITIAL_INTERVAL);

    updated.next_review_date = nextReviewDate.toISOString();

    // Update legacy mastery level
    const total = updated.correct_count + updated.incorrect_count;
    const ratio = total > 0 ? updated.correct_count / total : 0;
    updated.mastery_level = Math.round(ratio * 5);

    // Set session flags for re-queuing
    updated.failed_in_session = settings.show_failed_words_in_session;
    updated.retry_count = settings.show_failed_words_in_session
      ? updated.retry_count + 1
      : 0;

    return {
      updatedProgress: updated,
      boxChanged: updated.leitner_box !== previousBox,
      previousBox,
      newBox: updated.leitner_box,
      nextReviewDate,
      intervalDays: INITIAL_INTERVAL,
      message: settings.show_failed_words_in_session
        ? "Incorrect. Let's try this one again!"
        : `Incorrect. Reset to Box 1. Review again tomorrow.`,
    };
  }

  calculateNextReviewDate(wordProgress: WordProgress): Date {
    // Next interval will be double the current (or initial if current is 0)
    const interval =
      wordProgress.interval_days === 0
        ? INITIAL_INTERVAL
        : Math.min(wordProgress.interval_days * 2, MAX_INTERVAL);
    return addDays(new Date(), interval);
  }

  getBoxInterval(boxNumber: number, _settings: LearningSettings): number {
    // For the simple algorithm, we show reference intervals based on doubling
    // Box 1: 1d, Box 2: 2d, Box 3: 4d, Box 4: 8d, Box 5: 16d, etc.
    const interval = Math.pow(2, boxNumber - 1);
    return Math.min(interval, MAX_INTERVAL);
  }
}
