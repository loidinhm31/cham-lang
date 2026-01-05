/**
 * Practice Session State Manager
 * Manages the state of a practice session including word queue and progress tracking
 */

import type { Vocabulary } from "../types/vocabulary";
import type {
  PracticeMode,
  PracticeResult,
  WordProgress,
  WordStatus,
  RepetitionProgress,
} from "../types/practice";
import type { LearningSettings } from "../types/settings";
import { getAlgorithm } from "./spacedRepetition";
import type { ReviewResult } from "./spacedRepetition/types";

const REPETITION_REQUIREMENTS: Record<WordStatus, number> = {
  NEW: 3,
  STILL_LEARNING: 2,
  ALMOST_DONE: 1,
  MASTERED: 1,
};

/**
 * Determine word status based on progress
 */
function determineWordStatus(
  wordProgress: WordProgress | undefined,
): WordStatus {
  // NEW if no progress or no prior practice
  if (!wordProgress || wordProgress.total_reviews === 0) {
    return "NEW";
  }

  // Determine status based on progress data
  return determineProgressStatus(wordProgress);
}

/**
 * Determine status from existing progress data
 */
function determineProgressStatus(wordProgress: WordProgress): WordStatus {
  const box = wordProgress.leitner_box;
  const consecutive = wordProgress.consecutive_correct_count;
  const totalReviews = wordProgress.total_reviews;

  // MASTERED: In final box (5+) or box 3 with strong performance
  if (box >= 5 || (box === 3 && consecutive >= 2)) {
    return "MASTERED";
  }

  // ALMOST_DONE: Box 4-5 or box 3 with some progress
  if (box >= 4 || (box === 3 && consecutive >= 1)) {
    return "ALMOST_DONE";
  }

  // STILL_LEARNING: Box 2-3 or 3+ total reviews
  if (box >= 2 || totalReviews >= 3) {
    return "STILL_LEARNING";
  }

  // Fallback (shouldn't reach here)
  return "STILL_LEARNING";
}

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
  firstPassComplete: boolean; // Track if we've gone through all initial words once

  // Statistics
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;

  // Status-based repetition tracking
  wordStatusMap: Map<string, WordStatus>;
  wordRepetitionTracker: Map<string, RepetitionProgress>;
}

export class SessionManager {
  private state: SessionState;
  private settings: LearningSettings;
  private trackProgress: boolean;

  constructor(
    words: Vocabulary[],
    wordsProgress: WordProgress[],
    settings: LearningSettings,
    mode: PracticeMode,
    collectionId: string,
    language: string,
    trackProgress: boolean = true,
  ) {
    this.trackProgress = trackProgress;
    this.settings = settings;

    // Initialize word progress map
    const progressMap = new Map<string, WordProgress>();
    wordsProgress.forEach((wp) => {
      progressMap.set(wp.vocabulary_id, { ...wp });
    });

    // Initialize status and repetition tracking
    const wordStatusMap = new Map<string, WordStatus>();
    const wordRepetitionTracker = new Map<string, RepetitionProgress>();

    words.forEach((vocab) => {
      const vocabId = vocab.id || "";
      const progress = progressMap.get(vocabId);

      // Determine status
      const status = determineWordStatus(progress);
      wordStatusMap.set(vocabId, status);

      // Initialize repetition tracking
      wordRepetitionTracker.set(vocabId, {
        requiredRepetitions: REPETITION_REQUIREMENTS[status],
        completedRepetitions: 0,
        lastSeenAt: new Date(0),
      });
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
      firstPassComplete: false,
      totalQuestions: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      wordStatusMap,
      wordRepetitionTracker,
    };
  }

  /**
   * Get the next word to practice
   * Returns null if no more words available
   * Skips the current word to avoid showing the same word twice in a row
   * Prioritizes words that need more repetitions
   */
  getNextWord(): Vocabulary | null {
    const currentWordId = this.state.currentWord?.id || "";

    // Priority 1: Words in active queue needing more repetitions
    const activeNeedingReps = this.state.activeQueue.filter((vocab) => {
      const vocabId = vocab.id || "";
      const tracker = this.state.wordRepetitionTracker.get(vocabId);
      return (
        tracker && tracker.completedRepetitions < tracker.requiredRepetitions
      );
    });

    if (activeNeedingReps.length > 0) {
      // Try to get a different word than current
      const differentWords = activeNeedingReps.filter(
        (w) => w.id !== currentWordId,
      );
      const nextWord =
        differentWords.length > 0 ? differentWords[0] : activeNeedingReps[0];

      this.state.currentWord = nextWord;
      return nextWord;
    }

    // Check if first pass complete (all words have been shown at least once)
    if (
      !this.state.firstPassComplete &&
      this.state.activeQueue.every((vocab) => {
        const vocabId = vocab.id || "";
        const tracker = this.state.wordRepetitionTracker.get(vocabId);
        return (
          tracker && tracker.completedRepetitions >= tracker.requiredRepetitions
        );
      })
    ) {
      this.state.firstPassComplete = true;
    }

    // Priority 2: Failed words queue (after first pass complete)
    if (
      this.state.firstPassComplete &&
      this.state.failedWordsQueue.length > 0
    ) {
      const differentWords = this.state.failedWordsQueue.filter(
        (w) => w.id !== currentWordId,
      );
      const nextWord =
        differentWords.length > 0
          ? this.state.failedWordsQueue.shift()!
          : this.state.failedWordsQueue.shift() || null;

      if (nextWord) {
        this.state.currentWord = nextWord;
        return nextWord;
      }
    }

    return null; // Session complete
  }

  /**
   * Handle a correct answer with repetition and multi-mode completion tracking
   */
  handleCorrectAnswer(
    vocabulary: Vocabulary,
    timeSpentSeconds: number,
  ): ReviewResult {
    const vocabularyId = vocabulary.id || "";

    // Update repetition tracker
    const repTracker = this.state.wordRepetitionTracker.get(vocabularyId);
    if (repTracker) {
      repTracker.completedRepetitions += 1;
      repTracker.lastSeenAt = new Date();
    }

    const completedAllReps =
      repTracker &&
      repTracker.completedRepetitions >= repTracker.requiredRepetitions;

    // Get or create word progress
    let wordProgress = this.state.wordProgressMap.get(vocabularyId);
    if (!wordProgress) {
      wordProgress = this.createInitialWordProgress(
        vocabularyId,
        vocabulary.word,
      );
      this.state.wordProgressMap.set(vocabularyId, wordProgress);
    }

    // Update statistics (always)
    this.state.totalQuestions++;
    this.state.correctAnswers++;

    // Record session result
    this.state.sessionResults.push({
      vocabulary_id: vocabularyId,
      word: vocabulary.word,
      correct: true,
      mode: this.state.mode,
      time_spent_seconds: timeSpentSeconds,
    });

    let reviewResult: ReviewResult;

    if (completedAllReps) {
      // Move to completed queue
      const idx = this.state.activeQueue.findIndex(
        (w) => (w.id || "") === vocabularyId,
      );
      if (idx >= 0) {
        this.state.activeQueue.splice(idx, 1);
        this.state.completedWords.push(vocabulary);
      }

      // Handle multi-mode cycle logic
      if (!this.trackProgress) {
        // Study mode - don't update progress
        reviewResult = {
          updatedProgress: wordProgress,
          boxChanged: false,
          previousBox: wordProgress.leitner_box,
          newBox: wordProgress.leitner_box,
          nextReviewDate: new Date(wordProgress.next_review_date),
          intervalDays: wordProgress.interval_days,
          message: "Study mode - progress not tracked",
        };
      } else {
        // Practice mode - update progress
        const completedModes = [
          ...(wordProgress.completed_modes_in_cycle || []),
        ];
        if (!completedModes.includes(this.state.mode)) {
          completedModes.push(this.state.mode);
        }

        const allModesCompleted =
          completedModes.includes("flashcard") &&
          completedModes.includes("fillword") &&
          completedModes.includes("multiplechoice");

        const algorithm = getAlgorithm(this.settings);

        if (allModesCompleted) {
          // Advance in SR/Leitner system
          reviewResult = algorithm.processCorrectAnswer(
            wordProgress,
            this.settings,
          );
          reviewResult.updatedProgress.completed_modes_in_cycle = [];
          reviewResult.message = `Word mastered! Advanced to box ${reviewResult.updatedProgress.leitner_box}`;
        } else {
          // Mode completed but not all modes yet
          reviewResult = {
            updatedProgress: {
              ...wordProgress,
              completed_modes_in_cycle: completedModes,
              total_reviews: wordProgress.total_reviews + 1,
              correct_count: wordProgress.correct_count + 1,
              last_practiced: new Date().toISOString(),
            },
            boxChanged: false,
            previousBox: wordProgress.leitner_box,
            newBox: wordProgress.leitner_box,
            nextReviewDate: new Date(wordProgress.next_review_date),
            intervalDays: wordProgress.interval_days,
            message: `Mode completed! ${3 - completedModes.length} more mode(s) to advance.`,
          };
        }

        this.state.wordProgressMap.set(
          vocabularyId,
          reviewResult.updatedProgress,
        );
      }
    } else {
      // Not all repetitions complete - keep in active queue
      const status = this.state.wordStatusMap.get(vocabularyId) || "NEW";
      reviewResult = {
        updatedProgress: wordProgress,
        boxChanged: false,
        previousBox: wordProgress.leitner_box,
        newBox: wordProgress.leitner_box,
        nextReviewDate: new Date(wordProgress.next_review_date),
        intervalDays: wordProgress.interval_days,
        message: `Correct! ${repTracker?.completedRepetitions}/${repTracker?.requiredRepetitions} repetitions (${status})`,
      };
    }

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

    // CRITICAL: Reset repetition counter on incorrect answer
    const repTracker = this.state.wordRepetitionTracker.get(vocabularyId);
    if (repTracker) {
      repTracker.completedRepetitions = 0;
      repTracker.lastSeenAt = new Date();
    }

    // Update statistics (always track stats)
    this.state.totalQuestions++;
    this.state.incorrectAnswers++;

    // Add to session results (always track session results)
    this.state.sessionResults.push({
      vocabulary_id: vocabularyId,
      word: vocabulary.word,
      correct: false,
      mode: this.state.mode,
      time_spent_seconds: timeSpentSeconds,
    });

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

    // If not tracking progress, return a simple result without updating progress
    if (!this.trackProgress) {
      const wordProgress =
        this.state.wordProgressMap.get(vocabularyId) ||
        this.createInitialWordProgress(vocabularyId, vocabulary.word);

      return {
        updatedProgress: wordProgress,
        boxChanged: false,
        previousBox: wordProgress.leitner_box,
        newBox: wordProgress.leitner_box,
        nextReviewDate: new Date(wordProgress.next_review_date),
        intervalDays: wordProgress.interval_days,
        message: "Study mode - progress not tracked",
      };
    }

    // Normal progress tracking logic
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
      wordsRemaining: this.getRemainingWordsCount(),
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
    const currentWordCount = this.state.currentWord ? 1 : 0;
    return (
      this.state.activeQueue.length +
      this.state.failedWordsQueue.length +
      currentWordCount
    );
  }

  /**
   * Get total words in session
   */
  getTotalWordsCount(): number {
    const currentWordCount = this.state.currentWord ? 1 : 0;
    return (
      this.state.activeQueue.length +
      this.state.failedWordsQueue.length +
      this.state.completedWords.length +
      currentWordCount
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
   * Get word status
   */
  getWordStatus(vocabularyId: string): WordStatus {
    return this.state.wordStatusMap.get(vocabularyId) || "NEW";
  }

  /**
   * Get word repetition progress
   */
  getWordRepetitionProgress(vocabularyId: string): RepetitionProgress {
    return (
      this.state.wordRepetitionTracker.get(vocabularyId) || {
        requiredRepetitions: 1,
        completedRepetitions: 0,
        lastSeenAt: new Date(),
      }
    );
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return {
      totalQuestions: this.state.totalQuestions,
      correctAnswers: this.state.correctAnswers,
      incorrectAnswers: this.state.incorrectAnswers,
      wordsCompleted: this.state.completedWords.length,
    };
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
