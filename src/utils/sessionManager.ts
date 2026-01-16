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

// Maximum number of failures allowed per word before forcing completion
const MAX_FAILURES_PER_WORD = 5;

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
  // Validate and clamp values to prevent invalid data
  const box = Math.max(1, Math.min(wordProgress.leitner_box, 7)); // Clamp between 1-7
  const consecutive = Math.max(
    0,
    Math.min(wordProgress.consecutive_correct_count, 100),
  ); // Clamp between 0-100
  const totalReviews = Math.max(0, wordProgress.total_reviews); // Minimum 0

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
  private initialWordCount: number;

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
    this.initialWordCount = words.length;

    // Initialize word progress map
    const progressMap = new Map<string, WordProgress>();
    wordsProgress.forEach((wp) => {
      progressMap.set(wp.vocabulary_id, { ...wp });
    });

    // Initialize status and repetition tracking
    const wordStatusMap = new Map<string, WordStatus>();
    const wordRepetitionTracker = new Map<string, RepetitionProgress>();

    words.forEach((vocab) => {
      // Validate vocabulary ID
      if (!vocab.id || vocab.id.trim() === "") {
        throw new Error(
          `Invalid vocabulary ID for word "${vocab.word}". All words must have a valid ID.`,
        );
      }

      const vocabId = vocab.id;
      const progress = progressMap.get(vocabId);

      // Determine status
      const status = determineWordStatus(progress);
      wordStatusMap.set(vocabId, status);

      // Initialize repetition tracking
      wordRepetitionTracker.set(vocabId, {
        requiredRepetitions: REPETITION_REQUIREMENTS[status],
        completedRepetitions: 0,
        lastSeenAt: new Date(0),
        failureCount: 0,
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
   * Uses spacing (lastSeenAt) and randomization to avoid consecutive repetition of same words
   */
  getNextWord(): Vocabulary | null {
    const currentWordId = this.state.currentWord?.id ?? "";

    // Priority 1: Words in active queue needing more repetitions
    const activeNeedingReps = this.state.activeQueue.filter((vocab) => {
      const vocabId = vocab.id;
      if (!vocabId) return false; // Skip invalid words
      const tracker = this.state.wordRepetitionTracker.get(vocabId);
      return (
        tracker && tracker.completedRepetitions < tracker.requiredRepetitions
      );
    });

    if (activeNeedingReps.length > 0) {
      const nextWord = this.selectNextWordWithSpacing(
        activeNeedingReps,
        currentWordId,
      );
      if (nextWord) {
        this.state.currentWord = nextWord;
        return nextWord;
      }
    }

    // Check if first pass complete (all words have been shown at least once)
    if (
      !this.state.firstPassComplete &&
      this.state.activeQueue.every((vocab) => {
        const vocabId = vocab.id;
        if (!vocabId) return true; // Skip invalid words in check
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
      const nextWord = this.selectNextWordWithSpacing(
        this.state.failedWordsQueue,
        currentWordId,
      );

      if (nextWord) {
        // Remove from failed queue
        const idx = this.state.failedWordsQueue.findIndex(
          (w) => w.id === nextWord.id,
        );
        if (idx >= 0) {
          this.state.failedWordsQueue.splice(idx, 1);
        }
        this.state.currentWord = nextWord;
        return nextWord;
      }
    }

    return null; // Session complete
  }

  /**
   * Select next word with spacing and randomization
   * Prioritizes words not seen recently and adds randomness for variety
   */
  private selectNextWordWithSpacing(
    candidates: Vocabulary[],
    excludeId: string,
  ): Vocabulary | null {
    if (candidates.length === 0) return null;

    // Filter out the current word to avoid immediate repetition
    let availableCandidates = candidates.filter((w) => w.id !== excludeId);
    if (availableCandidates.length === 0) {
      availableCandidates = [...candidates];
    }

    // Sort by lastSeenAt (oldest first) for natural spacing
    availableCandidates.sort((a, b) => {
      const trackerA = this.state.wordRepetitionTracker.get(a.id || "");
      const trackerB = this.state.wordRepetitionTracker.get(b.id || "");
      const timeA = trackerA?.lastSeenAt.getTime() || 0;
      const timeB = trackerB?.lastSeenAt.getTime() || 0;
      return timeA - timeB;
    });

    // Pick randomly from the oldest portion for variety
    // Use at least half the candidates to ensure good distribution
    const poolSize = Math.max(1, Math.ceil(availableCandidates.length / 2));
    const pickPool = availableCandidates.slice(0, poolSize);
    const randomIndex = Math.floor(Math.random() * pickPool.length);

    return pickPool[randomIndex];
  }

  /**
   * Handle a correct answer with repetition and multi-mode completion tracking
   */
  handleCorrectAnswer(
    vocabulary: Vocabulary,
    timeSpentSeconds: number,
  ): ReviewResult {
    // Validate vocabulary ID
    if (!vocabulary.id) {
      throw new Error("Cannot handle answer for word without valid ID");
    }

    const vocabularyId = vocabulary.id;

    // Update repetition tracker
    const repTracker = this.state.wordRepetitionTracker.get(vocabularyId);
    if (repTracker) {
      repTracker.completedRepetitions += 1;
      repTracker.lastSeenAt = new Date();
      // Reset failure count on correct answer
      repTracker.failureCount = 0;
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
        (w) => w.id === vocabularyId,
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

          // Update repetition requirements if status changed due to box advancement
          if (reviewResult.boxChanged && repTracker) {
            const newStatus = determineProgressStatus(
              reviewResult.updatedProgress,
            );
            const newRequirement = REPETITION_REQUIREMENTS[newStatus];
            // Update both the status and the requirement
            this.state.wordStatusMap.set(vocabularyId, newStatus);
            // Only update if new requirement is lower (prevent increasing difficulty mid-session)
            if (newRequirement < repTracker.requiredRepetitions) {
              repTracker.requiredRepetitions = newRequirement;
            }
          }
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
    // Validate vocabulary ID
    if (!vocabulary.id) {
      throw new Error("Cannot handle answer for word without valid ID");
    }

    const vocabularyId = vocabulary.id;

    // CRITICAL: Reset repetition counter and increment failure count
    const repTracker = this.state.wordRepetitionTracker.get(vocabularyId);
    if (repTracker) {
      repTracker.completedRepetitions = 0;
      repTracker.lastSeenAt = new Date();
      repTracker.failureCount += 1;
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

    // Check if max failures exceeded - force complete the word to prevent infinite loop
    const maxFailuresExceeded =
      repTracker && repTracker.failureCount >= MAX_FAILURES_PER_WORD;

    if (maxFailuresExceeded) {
      // Force-complete the word after too many failures
      const idx = this.state.activeQueue.findIndex(
        (w) => w.id === vocabularyId,
      );
      if (idx >= 0) {
        this.state.activeQueue.splice(idx, 1);
      }
      this.state.completedWords.push(vocabulary);

      // Remove from failed queue if present
      const failedIdx = this.state.failedWordsQueue.findIndex(
        (w) => w.id === vocabularyId,
      );
      if (failedIdx >= 0) {
        this.state.failedWordsQueue.splice(failedIdx, 1);
      }
    } else if (this.settings.show_failed_words_in_session) {
      // Re-queue if settings allow and not exceeded max failures
      const alreadyInQueue = this.state.failedWordsQueue.some(
        (w) => w.id === vocabularyId,
      );

      if (!alreadyInQueue) {
        this.state.failedWordsQueue.push(vocabulary);
      }
      // Keep in activeQueue to allow retry
    } else {
      // Move to completed even though failed (setting disabled re-queue)
      const idx = this.state.activeQueue.findIndex(
        (w) => w.id === vocabularyId,
      );
      if (idx >= 0) {
        this.state.activeQueue.splice(idx, 1);
      }
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
        message: maxFailuresExceeded
          ? `Skipped after ${MAX_FAILURES_PER_WORD} failures (study mode)`
          : "Study mode - progress not tracked",
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

    // Update message if max failures exceeded
    if (maxFailuresExceeded) {
      reviewResult.message = `Word skipped after ${MAX_FAILURES_PER_WORD} failures. Moved back to box 1.`;
    }

    // Update word progress in map
    this.state.wordProgressMap.set(vocabularyId, reviewResult.updatedProgress);

    return reviewResult;
  }

  /**
   * Skip a word (counted as incorrect for now)
   */
  skipWord(vocabulary: Vocabulary): void {
    if (!vocabulary.id) {
      return; // Skip invalid words
    }

    const vocabularyId = vocabulary.id;

    // Remove from active queue
    const idx = this.state.activeQueue.findIndex((w) => w.id === vocabularyId);
    if (idx >= 0) {
      this.state.activeQueue.splice(idx, 1);
    }

    // Remove from failed queue if present
    const failedIdx = this.state.failedWordsQueue.findIndex(
      (w) => w.id === vocabularyId,
    );
    if (failedIdx >= 0) {
      this.state.failedWordsQueue.splice(failedIdx, 1);
    }

    // Move to completed
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
    return this.initialWordCount;
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
        failureCount: 0,
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
