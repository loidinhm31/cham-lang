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

import type { SpacedRepetitionAlgorithm, ReviewResult } from '../types';
import type { WordProgress } from '../../../types/practice';
import type { LearningSettings } from '../../../types/settings';
import { addDays, BOX_INTERVAL_PRESETS } from '../types';

const MIN_EASINESS_FACTOR = 1.3;
const MAX_EASINESS_FACTOR = 2.5;
const DEFAULT_EASINESS_FACTOR = 2.5;

export class SM2Algorithm implements SpacedRepetitionAlgorithm {
  getName(): string {
    return 'SM-2 (SuperMemo 2)';
  }

  getDescription(): string {
    return 'Classic algorithm with dynamic easiness factor. Intervals adapt based on your performance.';
  }

  processCorrectAnswer(
    wordProgress: WordProgress,
    settings: LearningSettings
  ): ReviewResult {
    const updated = { ...wordProgress };
    const previousBox = updated.leitner_box;

    // Increment counters
    updated.correct_count += 1;
    updated.consecutive_correct_count += 1;
    updated.total_reviews += 1;
    updated.last_practiced = new Date().toISOString();

    // Update easiness factor (increase slightly for correct answer)
    updated.easiness_factor = this.calculateEasinessFactor(
      updated.easiness_factor,
      5 // Quality 5 = perfect response
    );

    // Check if should advance to next box
    const shouldAdvance = updated.consecutive_correct_count >= settings.consecutive_correct_required;

    if (shouldAdvance && updated.leitner_box < settings.leitner_box_count) {
      // Advance to next box
      updated.leitner_box += 1;
      updated.consecutive_correct_count = 0; // Reset for next box
    }

    // Calculate next interval using SM-2 formula
    const interval = this.calculateInterval(updated, settings);
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
      message: shouldAdvance && updated.leitner_box !== previousBox
        ? `Excellent! Advanced to Box ${updated.leitner_box}!`
        : `Correct! Next review in ${interval} day${interval !== 1 ? 's' : ''}`,
    };
  }

  processIncorrectAnswer(
    wordProgress: WordProgress,
    settings: LearningSettings
  ): ReviewResult {
    const updated = { ...wordProgress };
    const previousBox = updated.leitner_box;

    // Increment counters
    updated.incorrect_count += 1;
    updated.consecutive_correct_count = 0; // Reset consecutive count
    updated.total_reviews += 1;
    updated.last_practiced = new Date().toISOString();

    // Update easiness factor (decrease for incorrect answer)
    updated.easiness_factor = this.calculateEasinessFactor(
      updated.easiness_factor,
      0 // Quality 0 = complete blackout
    );

    // Move back to box 1
    updated.leitner_box = 1;

    // Reset interval to minimum (1 day)
    updated.last_interval_days = updated.interval_days;
    updated.interval_days = 1;

    // Set next review for tomorrow (or immediate if show_failed_words_in_session)
    const nextReviewDate = settings.show_failed_words_in_session
      ? new Date() // Immediate retry in same session
      : addDays(new Date(), 1);

    updated.next_review_date = nextReviewDate.toISOString();

    // Update legacy mastery level
    const total = updated.correct_count + updated.incorrect_count;
    const ratio = total > 0 ? updated.correct_count / total : 0;
    updated.mastery_level = Math.round(ratio * 5);

    // Set session flags for re-queuing
    updated.failed_in_session = settings.show_failed_words_in_session;
    updated.retry_count = settings.show_failed_words_in_session ? updated.retry_count + 1 : 0;

    return {
      updatedProgress: updated,
      boxChanged: updated.leitner_box !== previousBox,
      previousBox,
      newBox: updated.leitner_box,
      nextReviewDate,
      intervalDays: updated.interval_days,
      message: settings.show_failed_words_in_session
        ? 'Incorrect. Let\'s try this one again!'
        : 'Incorrect. Moved to Box 1. Review again tomorrow.',
    };
  }

  calculateNextReviewDate(
    wordProgress: WordProgress,
    settings: LearningSettings
  ): Date {
    const interval = this.calculateInterval(wordProgress, settings);
    return addDays(new Date(), interval);
  }

  getBoxInterval(boxNumber: number, settings: LearningSettings): number {
    // For SM-2, we don't use fixed box intervals, but we provide a reference
    const presets = BOX_INTERVAL_PRESETS[settings.leitner_box_count];
    return presets[boxNumber - 1] || presets[presets.length - 1];
  }

  /**
   * Calculate the next interval using SM-2 formula
   */
  private calculateInterval(wordProgress: WordProgress, settings: LearningSettings): number {
    const { consecutive_correct_count, interval_days, easiness_factor, leitner_box } = wordProgress;

    // First review in current box
    if (consecutive_correct_count === 0) {
      return 1;
    }

    // Second review in current box
    if (consecutive_correct_count === 1) {
      return 6;
    }

    // Subsequent reviews: multiply previous interval by easiness factor
    // Also consider the Leitner box as a multiplier
    const boxMultiplier = Math.pow(1.5, leitner_box - 1);
    const newInterval = Math.round(interval_days * easiness_factor * boxMultiplier);

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
    const newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    // Clamp between MIN and MAX
    return Math.max(MIN_EASINESS_FACTOR, Math.min(MAX_EASINESS_FACTOR, newEF));
  }
}
