/**
 * Word Selection Service
 * Smart word selection for practice sessions using Spaced Repetition logic
 */

import type { Vocabulary } from "@/types/vocabulary";
import type { WordProgress } from "@/types/practice";
import type { LearningSettings } from "@/types/settings";
import { getWordsDueToday, getWordsInBox } from "@/utils/spacedRepetition";

export interface WordSelectionOptions {
  // Include words due for review
  includeDueWords: boolean;

  // Include new words (never practiced)
  includeNewWords: boolean;

  // Maximum number of words to select
  maxWords?: number;

  // Maximum number of new words to introduce
  maxNewWords?: number;

  // Random shuffle after selection
  shuffle: boolean;

  // Current practice mode (for mode-specific filtering)
  currentMode?: "flashcard" | "fillword" | "multiplechoice";
}

export class WordSelectionService {
  /**
   * Select words for a practice session using spaced repetition logic
   *
   * Priority order:
   * 1. Words due for review (next_review_date <= today) AND not yet completed in current mode
   * 2. New words (never practiced)
   * 3. Least recently practiced words not completed in current mode
   *
   * Multi-Mode Filtering:
   * - If currentMode is specified, only include words that haven't completed this mode in the current cycle
   * - Words that completed all modes and advanced get new empty completed_modes_in_cycle
   */
  static selectWordsForPractice(
    vocabularies: Vocabulary[],
    wordsProgress: WordProgress[],
    settings: LearningSettings,
    options: WordSelectionOptions = {
      includeDueWords: true,
      includeNewWords: true,
      shuffle: true,
    },
  ): Vocabulary[] {
    const selected: Vocabulary[] = [];
    const vocabularyMap = new Map(vocabularies.map((v) => [v.id || "", v]));
    const progressMap = new Map(
      wordsProgress.map((wp) => [wp.vocabulary_id, wp]),
    );

    // Helper function to check if a word is available for the current mode
    const isAvailableForMode = (vocabularyId: string): boolean => {
      if (!options.currentMode) return true; // No mode filtering

      const progress = progressMap.get(vocabularyId);
      if (!progress) return true; // New words are always available

      // Check if this mode is already completed in the current cycle
      const completedModes = progress.completed_modes_in_cycle || [];
      return !completedModes.includes(options.currentMode);
    };

    // 1. Add due words (highest priority) that haven't completed current mode
    if (options.includeDueWords) {
      const dueWords = getWordsDueToday(wordsProgress);
      for (const wordProgress of dueWords) {
        if (isAvailableForMode(wordProgress.vocabulary_id)) {
          const vocab = vocabularyMap.get(wordProgress.vocabulary_id);
          if (vocab) {
            selected.push(vocab);
            vocabularyMap.delete(wordProgress.vocabulary_id); // Remove to avoid duplicates
          }
        }
      }
    }

    // 2. Add new words (never practiced before)
    if (options.includeNewWords) {
      const maxNew = options.maxNewWords || settings.new_words_per_day || 20;
      const newWords: Vocabulary[] = [];

      for (const vocab of vocabularyMap.values()) {
        const hasProgress = progressMap.has(vocab.id || "");
        if (!hasProgress) {
          newWords.push(vocab);
        }
      }

      // Shuffle new words and take up to maxNew
      this.shuffleArray(newWords);
      const newWordsToAdd = newWords.slice(0, maxNew);
      selected.push(...newWordsToAdd);

      // Remove added words from map
      newWordsToAdd.forEach((v) => vocabularyMap.delete(v.id || ""));
    }

    // 3. Fill remaining slots with least recently practiced words not completed in current mode
    const maxWords = options.maxWords || settings.daily_review_limit || 100;
    if (selected.length < maxWords) {
      const remaining = Array.from(vocabularyMap.values()).filter((v) =>
        isAvailableForMode(v.id || ""),
      );

      // Sort by last practiced (oldest first)
      remaining.sort((a, b) => {
        const progressA = progressMap.get(a.id || "");
        const progressB = progressMap.get(b.id || "");

        if (!progressA && !progressB) return 0;
        if (!progressA) return 1; // New words at the end
        if (!progressB) return -1;

        const dateA = new Date(progressA.last_practiced).getTime();
        const dateB = new Date(progressB.last_practiced).getTime();
        return dateA - dateB; // Oldest first
      });

      const remainingSlots = maxWords - selected.length;
      selected.push(...remaining.slice(0, remainingSlots));
    }

    // 4. Shuffle if requested
    if (options.shuffle) {
      this.shuffleArray(selected);
    }

    return selected;
  }

  /**
   * Select only words that are due for review
   */
  static selectDueWords(
    vocabularies: Vocabulary[],
    wordsProgress: WordProgress[],
  ): Vocabulary[] {
    const vocabularyMap = new Map(vocabularies.map((v) => [v.id || "", v]));
    const dueWords = getWordsDueToday(wordsProgress);

    const selected: Vocabulary[] = [];
    for (const wordProgress of dueWords) {
      const vocab = vocabularyMap.get(wordProgress.vocabulary_id);
      if (vocab) {
        selected.push(vocab);
      }
    }

    return selected;
  }

  /**
   * Select only new words (never practiced)
   */
  static selectNewWords(
    vocabularies: Vocabulary[],
    wordsProgress: WordProgress[],
    maxWords: number = 20,
  ): Vocabulary[] {
    const progressMap = new Map(
      wordsProgress.map((wp) => [wp.vocabulary_id, wp]),
    );
    const newWords: Vocabulary[] = [];

    for (const vocab of vocabularies) {
      const hasProgress = progressMap.has(vocab.id || "");
      if (!hasProgress) {
        newWords.push(vocab);
      }
    }

    this.shuffleArray(newWords);
    return newWords.slice(0, maxWords);
  }

  /**
   * Select words from a specific Leitner box
   */
  static selectWordsFromBox(
    vocabularies: Vocabulary[],
    wordsProgress: WordProgress[],
    boxNumber: number,
    maxWords?: number,
  ): Vocabulary[] {
    const vocabularyMap = new Map(vocabularies.map((v) => [v.id || "", v]));
    const wordsInBox = getWordsInBox(wordsProgress, boxNumber);

    const selected: Vocabulary[] = [];
    const wordsToSelect = maxWords ? wordsInBox.slice(0, maxWords) : wordsInBox;

    for (const wordProgress of wordsToSelect) {
      const vocab = vocabularyMap.get(wordProgress.vocabulary_id);
      if (vocab) {
        selected.push(vocab);
      }
    }

    return selected;
  }

  /**
   * Filter failed words from a practice session that need to be retried
   */
  static filterFailedWords(wordsProgress: WordProgress[]): WordProgress[] {
    return wordsProgress.filter((wp) => wp.failed_in_session);
  }

  /**
   * Re-queue failed words for immediate retry in the same session
   */
  static reQueueFailedWords(
    vocabularies: Vocabulary[],
    wordsProgress: WordProgress[],
  ): Vocabulary[] {
    const vocabularyMap = new Map(vocabularies.map((v) => [v.id || "", v]));
    const failedWords = this.filterFailedWords(wordsProgress);

    const reQueued: Vocabulary[] = [];
    for (const wordProgress of failedWords) {
      const vocab = vocabularyMap.get(wordProgress.vocabulary_id);
      if (vocab) {
        reQueued.push(vocab);
      }
    }

    return reQueued;
  }

  /**
   * Get statistics about available words
   */
  static getWordStatistics(
    vocabularies: Vocabulary[],
    wordsProgress: WordProgress[],
    _settings: LearningSettings,
  ): {
    total: number;
    dueForReview: number;
    newWords: number;
    practicedWords: number;
  } {
    const progressMap = new Map(
      wordsProgress.map((wp) => [wp.vocabulary_id, wp]),
    );
    const dueWords = getWordsDueToday(wordsProgress);

    let newWords = 0;
    for (const vocab of vocabularies) {
      if (!progressMap.has(vocab.id || "")) {
        newWords++;
      }
    }

    return {
      total: vocabularies.length,
      dueForReview: dueWords.length,
      newWords,
      practicedWords: wordsProgress.length,
    };
  }

  /**
   * Shuffle an array in place (Fisher-Yates algorithm)
   */
  private static shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
