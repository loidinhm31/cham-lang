/**
 * Practice Session State Manager
 * Manages the state of a practice session including word queue and progress tracking
 */

import type { Vocabulary } from "../types/vocabulary";
import type {
  PracticeMode,
  PracticeResult,
  WordProgress,
} from "../types/practice";
import type { LearningSettings } from "../types/settings";
import { getAlgorithm } from "./spacedRepetition";
import type { ReviewResult } from "./spacedRepetition/types";

export interface SessionState {
  // Word queues
  activeQueue: Vocabulary[]; // Words to be practiced
  completedWords: Vocabulary[]; // Words that have been practiced
  failedWordsQueue: Vocabulary[]; // Words that failed and need retry
  currentWord: Vocabulary | null; // Currently displayed word

  // Progress tracking
  wordProgressMap: Map<string, WordProgress>; // vocabulary_id -> WordProgress
  sessionResults: PracticeResult[]; // Results for this session

  // Session metadata
  mode: PracticeMode;
  collectionId: string;
  language: string;
  startTime: Date;

  // Statistics
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
}

export class SessionManager {
  private state: SessionState;
  private settings: LearningSettings;

  constructor(
    words: Vocabulary[],
    wordsProgress: WordProgress[],
    settings: LearningSettings,
    mode: PracticeMode,
    collectionId: string,
    language: string,
  ) {
    this.settings = settings;

    // Initialize word progress map
    const progressMap = new Map<string, WordProgress>();
    wordsProgress.forEach((wp) => {
      progressMap.set(wp.vocabulary_id, { ...wp });
    });

    this.state = {
      activeQueue: [...words],
      completedWords: [],
      failedWordsQueue: [],
      currentWord: null,
      wordProgressMap: progressMap,
      sessionResults: [],
      mode,
      collectionId,
      language,
      startTime: new Date(),
      totalQuestions: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
    };
  }

  /**
   * Get the next word to practice
   * Returns null if no more words available
   * Skips the current word to avoid showing the same word twice in a row
   */
  getNextWord(): Vocabulary | null {
    const currentWordId = this.state.currentWord?.id || "";

    // Helper function to get next word from a queue, skipping the current word
    const getFromQueue = (queue: Vocabulary[]): Vocabulary | null => {
      // If current word is in this queue, find the next different word
      let nextWord: Vocabulary | null = null;
      let attempts = 0;
      const maxAttempts = queue.length;

      while (attempts < maxAttempts && queue.length > 0) {
        const word = queue.shift();
        if (word && (word.id || "") !== currentWordId) {
          nextWord = word;
          break;
        } else if (word) {
          // Put current word back at the end to try again later
          queue.push(word);
        }
        attempts++;
      }

      return nextWord;
    };

    // First, check failed words queue (higher priority)
    if (this.state.failedWordsQueue.length > 0) {
      const nextWord = getFromQueue(this.state.failedWordsQueue);
      if (nextWord) {
        this.state.currentWord = nextWord;
        return nextWord;
      }
    }

    // Then, check active queue
    if (this.state.activeQueue.length > 0) {
      const nextWord = getFromQueue(this.state.activeQueue);
      if (nextWord) {
        this.state.currentWord = nextWord;
        return nextWord;
      }
    }

    // If we only have the current word left, return it anyway
    // (This handles the case where there's only one word in the session)
    if (this.state.failedWordsQueue.length > 0) {
      const word = this.state.failedWordsQueue.shift() || null;
      this.state.currentWord = word;
      return word;
    }

    if (this.state.activeQueue.length > 0) {
      const word = this.state.activeQueue.shift() || null;
      this.state.currentWord = word;
      return word;
    }

    return null;
  }

  /**
   * Handle a correct answer with multi-mode completion tracking
   */
  handleCorrectAnswer(
    vocabulary: Vocabulary,
    timeSpentSeconds: number,
  ): ReviewResult {
    const vocabularyId = vocabulary.id || "";
    const algorithm = getAlgorithm(this.settings);

    // Get or create word progress
    let wordProgress = this.state.wordProgressMap.get(vocabularyId);
    if (!wordProgress) {
      wordProgress = this.createInitialWordProgress(
        vocabularyId,
        vocabulary.word,
      );
      this.state.wordProgressMap.set(vocabularyId, wordProgress);
    }

    // Add current mode to completed modes in cycle
    const completedModes = wordProgress.completed_modes_in_cycle || [];
    if (!completedModes.includes(this.state.mode)) {
      completedModes.push(this.state.mode);
    }

    // Check if all three modes are completed
    const allModesCompleted =
      completedModes.includes("flashcard") &&
      completedModes.includes("fillword") &&
      completedModes.includes("multiplechoice");

    let reviewResult: ReviewResult;

    if (allModesCompleted) {
      // All modes completed - advance the word (box, interval, etc.)
      reviewResult = algorithm.processCorrectAnswer(
        wordProgress,
        this.settings,
      );

      // Reset completed modes for next cycle
      reviewResult.updatedProgress.completed_modes_in_cycle = [];
    } else {
      // Not all modes completed yet - update mode list but don't advance
      const updatedProgress = {
        ...wordProgress,
        completed_modes_in_cycle: completedModes,
        correct_count: wordProgress.correct_count + 1,
        last_practiced: new Date().toISOString(),
        total_reviews: wordProgress.total_reviews + 1,
      };

      reviewResult = {
        updatedProgress,
        boxChanged: false,
        previousBox: wordProgress.leitner_box,
        newBox: wordProgress.leitner_box,
        nextReviewDate: new Date(wordProgress.next_review_date),
        intervalDays: wordProgress.interval_days,
        message: `Mode completed! Complete ${3 - completedModes.length} more mode(s) to advance.`,
      };
    }

    // Update word progress in map
    this.state.wordProgressMap.set(vocabularyId, reviewResult.updatedProgress);

    // Add to session results
    this.state.sessionResults.push({
      vocabulary_id: vocabularyId,
      word: vocabulary.word,
      correct: true,
      mode: this.state.mode,
      time_spent_seconds: timeSpentSeconds,
    });

    // Update statistics
    this.state.totalQuestions++;
    this.state.correctAnswers++;

    // Move to completed
    this.state.completedWords.push(vocabulary);

    return reviewResult;
  }

  /**
   * Handle an incorrect answer with multi-mode completion tracking
   */
  handleIncorrectAnswer(
    vocabulary: Vocabulary,
    timeSpentSeconds: number,
  ): ReviewResult {
    const vocabularyId = vocabulary.id || "";
    const algorithm = getAlgorithm(this.settings);

    // Get or create word progress
    let wordProgress = this.state.wordProgressMap.get(vocabularyId);
    if (!wordProgress) {
      wordProgress = this.createInitialWordProgress(
        vocabularyId,
        vocabulary.word,
      );
      this.state.wordProgressMap.set(vocabularyId, wordProgress);
    }

    // Process the incorrect answer using the algorithm
    const reviewResult = algorithm.processIncorrectAnswer(
      wordProgress,
      this.settings,
    );

    // Reset completed modes in cycle since the word was answered incorrectly
    // User must complete all modes correctly in the same review cycle
    reviewResult.updatedProgress.completed_modes_in_cycle = [];

    // Update word progress in map
    this.state.wordProgressMap.set(vocabularyId, reviewResult.updatedProgress);

    // Add to session results
    this.state.sessionResults.push({
      vocabulary_id: vocabularyId,
      word: vocabulary.word,
      correct: false,
      mode: this.state.mode,
      time_spent_seconds: timeSpentSeconds,
    });

    // Update statistics
    this.state.totalQuestions++;
    this.state.incorrectAnswers++;

    // Re-queue if settings allow
    if (this.settings.show_failed_words_in_session) {
      // Check if already in failed queue to avoid duplicates
      const alreadyInQueue = this.state.failedWordsQueue.some(
        (w) => (w.id || "") === vocabularyId,
      );

      if (!alreadyInQueue) {
        this.state.failedWordsQueue.push(vocabulary);
      }
    } else {
      // Move to completed even though failed
      this.state.completedWords.push(vocabulary);
    }

    return reviewResult;
  }

  /**
   * Skip a word (counted as incorrect for now)
   */
  skipWord(vocabulary: Vocabulary): void {
    // For now, treat skip as incorrect but don't add to results
    // Just move to completed
    this.state.completedWords.push(vocabulary);
  }

  /**
   * Check if session is complete
   */
  isSessionComplete(): boolean {
    return (
      this.state.activeQueue.length === 0 &&
      this.state.failedWordsQueue.length === 0
    );
  }

  /**
   * Get session statistics
   */
  getStatistics() {
    return {
      totalQuestions: this.state.totalQuestions,
      correctAnswers: this.state.correctAnswers,
      incorrectAnswers: this.state.incorrectAnswers,
      accuracy:
        this.state.totalQuestions > 0
          ? Math.round(
              (this.state.correctAnswers / this.state.totalQuestions) * 100,
            )
          : 0,
      wordsCompleted: this.state.completedWords.length,
      wordsRemaining:
        this.state.activeQueue.length + this.state.failedWordsQueue.length,
      durationSeconds: Math.floor(
        (Date.now() - this.state.startTime.getTime()) / 1000,
      ),
    };
  }

  /**
   * Get session results for saving
   */
  getSessionResults(): PracticeResult[] {
    return this.state.sessionResults;
  }

  /**
   * Get updated word progress for all words in session
   */
  getUpdatedWordProgress(): WordProgress[] {
    return Array.from(this.state.wordProgressMap.values());
  }

  /**
   * Get remaining words count
   */
  getRemainingWordsCount(): number {
    return this.state.activeQueue.length + this.state.failedWordsQueue.length;
  }

  /**
   * Get total words in session
   */
  getTotalWordsCount(): number {
    return (
      this.state.activeQueue.length +
      this.state.failedWordsQueue.length +
      this.state.completedWords.length
    );
  }

  /**
   * Get progress percentage
   */
  getProgressPercentage(): number {
    const total = this.getTotalWordsCount();
    if (total === 0) return 100;
    return Math.round((this.state.completedWords.length / total) * 100);
  }

  /**
   * Get current session state (for debugging)
   */
  getState(): SessionState {
    return { ...this.state };
  }

  /**
   * Create initial word progress for new words
   */
  private createInitialWordProgress(
    vocabularyId: string,
    word: string,
  ): WordProgress {
    const now = new Date().toISOString();
    return {
      vocabulary_id: vocabularyId,
      word: word,
      correct_count: 0,
      incorrect_count: 0,
      last_practiced: now,
      mastery_level: 0,
      next_review_date: now,
      interval_days: 0,
      easiness_factor: 2.5,
      consecutive_correct_count: 0,
      leitner_box: 1,
      last_interval_days: 0,
      total_reviews: 0,
      failed_in_session: false,
      retry_count: 0,
      completed_modes_in_cycle: [],
    };
  }
}
