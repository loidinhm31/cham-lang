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

import type { ReviewResult, SpacedRepetitionAlgorithm } from "../types";
import { addDays, BOX_INTERVAL_PRESETS } from "../types";
import type { WordProgress } from "../../../types/practice";
import type { LearningSettings } from "../../../types/settings";

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
    const previousBox = updated.leitner_box;

    // Increment counters
    updated.correct_count += 1;
    updated.consecutive_correct_count += 1;
    updated.total_reviews += 1;
    updated.last_practiced = new Date().toISOString();

    // Keep easiness factor stable (not used for interval calculation in this algorithm)
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

    // Get fixed interval for current box
    const interval = this.getBoxInterval(updated.leitner_box, settings);
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
          : `Correct! ${updated.consecutive_correct_count}/${settings.consecutive_correct_required} towards next box. Review in ${interval} day${interval !== 1 ? "s" : ""}`,
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

    // Get interval for box 1 (always 1 day)
    const interval = this.getBoxInterval(1, settings);
    updated.last_interval_days = updated.interval_days;
    updated.interval_days = interval;

    // Set next review for tomorrow (or immediate if show_failed_words_in_session)
    const nextReviewDate = settings.show_failed_words_in_session
      ? new Date() // Immediate retry in same session
      : addDays(new Date(), interval);

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
      intervalDays: interval,
      message: settings.show_failed_words_in_session
        ? "Incorrect. Let's try this one again!"
        : `Incorrect. Moved to Box 1. Review again in ${interval} day${interval !== 1 ? "s" : ""}.`,
    };
  }

  calculateNextReviewDate(
    wordProgress: WordProgress,
    settings: LearningSettings,
  ): Date {
    const interval = this.getBoxInterval(wordProgress.leitner_box, settings);
    return addDays(new Date(), interval);
  }

  getBoxInterval(boxNumber: number, settings: LearningSettings): number {
    const presets = BOX_INTERVAL_PRESETS[settings.leitner_box_count];
    const index = boxNumber - 1; // Convert to 0-indexed

    // Return the interval for this box, or the last interval if box number exceeds array
    return presets[index] !== undefined
      ? presets[index]
      : presets[presets.length - 1];
  }
}
