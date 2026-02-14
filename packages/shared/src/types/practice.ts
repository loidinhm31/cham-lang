export type PracticeMode = "flashcard" | "fillword" | "multiplechoice";

export type WordStatus = "NEW" | "STILL_LEARNING" | "ALMOST_DONE" | "MASTERED";

export interface RepetitionProgress {
  requiredRepetitions: number;
  completedRepetitions: number;
  lastSeenAt: Date;
  failureCount: number;
}

export interface PracticeResult {
  vocabularyId: string;
  word: string;
  correct: boolean;
  mode: PracticeMode;
  timeSpentSeconds: number;
}

export interface PracticeSession {
  id?: string;
  collectionId: string;
  mode: PracticeMode;
  language: string;
  topic?: string;
  level?: string;
  results: PracticeResult[];
  totalQuestions: number;
  correctAnswers: number;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
}

export interface WordProgress {
  vocabularyId: string;
  word: string;
  correctCount: number;
  incorrectCount: number;
  lastPracticed: string;
  masteryLevel: number; // 0-5 (legacy, kept for backward compatibility)

  // Spaced Repetition Fields
  nextReviewDate: string; // ISO date string - when this word should be reviewed next
  intervalDays: number; // Current interval between reviews in days
  easinessFactor: number; // SM-2 easiness factor (1.3 - 2.5), default 2.5
  consecutiveCorrectCount: number; // Number of consecutive correct answers (resets to 0 on failure)

  // Leitner System Fields
  leitnerBox: number; // Current box number (1 to max_boxes)
  lastIntervalDays: number; // Previous interval for tracking progression

  // Session Tracking
  totalReviews: number; // Total number of times this word has been reviewed
  failedInSession: boolean; // Flag to track if word failed in current session (for re-queuing)
  retryCount: number; // Number of times word has been retried in current session

  // Multi-Mode Completion Tracking
  completedModesInCycle: string[]; // Tracks which modes (flashcard, fillword, multiplechoice) have been completed in current review cycle
}

export interface UserPracticeProgress {
  id?: string;
  language: string;
  wordsProgress: WordProgress[];
  totalSessions: number;
  totalWordsPracticed: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePracticeSessionRequest {
  collectionId: string;
  mode: PracticeMode;
  language: string;
  topic?: string;
  level?: string;
  results: PracticeResult[];
  durationSeconds: number;
}

export interface UpdateProgressRequest {
  language: string;
  vocabularyId: string;
  word: string;
  correct: boolean;
  completedModesInCycle: string[]; // Array of modes (flashcard, fillword, multiplechoice) completed in current cycle

  // Spaced Repetition Fields
  nextReviewDate: string; // ISO date string
  intervalDays: number;
  easinessFactor: number;
  consecutiveCorrectCount: number;
  leitnerBox: number;
  lastIntervalDays: number;
  totalReviews: number;
  correctCount: number;
  incorrectCount: number;
}

export interface PracticeQuestion {
  vocabularyId: string;
  word: string;
  definition: string;
  ipa: string;
  options?: string[]; // For multiple choice
  correctAnswer?: string; // For fill word and multiple choice
}

// Helper function to create initial WordProgress for new words
export function createInitialWordProgress(
  vocabularyId: string,
  word: string,
): WordProgress {
  const now = new Date().toISOString();
  return {
    vocabularyId: vocabularyId,
    word: word,
    correctCount: 0,
    incorrectCount: 0,
    lastPracticed: now,
    masteryLevel: 0,

    // Spaced Repetition defaults
    nextReviewDate: now, // Available for review immediately
    intervalDays: 0,
    easinessFactor: 2.5, // SM-2 default
    consecutiveCorrectCount: 0,

    // Leitner System defaults
    leitnerBox: 1, // Start in box 1 (new words)
    lastIntervalDays: 0,

    // Session tracking defaults
    totalReviews: 0,
    failedInSession: false,
    retryCount: 0,

    // Multi-mode completion tracking defaults
    completedModesInCycle: [],
  };
}
