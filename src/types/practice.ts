export type PracticeMode = 'flashcard' | 'fillword' | 'multiplechoice';

export interface PracticeResult {
  vocabulary_id: string;
  word: string;
  correct: boolean;
  mode: PracticeMode;
  time_spent_seconds: number;
}

export interface PracticeSession {
  id?: string;
  collection_id: string;
  mode: PracticeMode;
  language: string;
  topic?: string;
  level?: string;
  results: PracticeResult[];
  total_questions: number;
  correct_answers: number;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
}

export interface WordProgress {
  vocabulary_id: string;
  word: string;
  correct_count: number;
  incorrect_count: number;
  last_practiced: string;
  mastery_level: number; // 0-5 (legacy, kept for backward compatibility)

  // Spaced Repetition Fields
  next_review_date: string; // ISO date string - when this word should be reviewed next
  interval_days: number; // Current interval between reviews in days
  easiness_factor: number; // SM-2 easiness factor (1.3 - 2.5), default 2.5
  consecutive_correct_count: number; // Number of consecutive correct answers (resets to 0 on failure)

  // Leitner System Fields
  leitner_box: number; // Current box number (1 to max_boxes)
  last_interval_days: number; // Previous interval for tracking progression

  // Session Tracking
  total_reviews: number; // Total number of times this word has been reviewed
  failed_in_session: boolean; // Flag to track if word failed in current session (for re-queuing)
  retry_count: number; // Number of times word has been retried in current session
}

export interface UserPracticeProgress {
  id?: string;
  language: string;
  words_progress: WordProgress[];
  total_sessions: number;
  total_words_practiced: number;
  current_streak: number;
  longest_streak: number;
  last_practice_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePracticeSessionRequest {
  collection_id: string;
  mode: PracticeMode;
  language: string;
  topic?: string;
  level?: string;
  results: PracticeResult[];
  duration_seconds: number;
}

export interface UpdateProgressRequest {
  language: string;
  vocabulary_id: string;
  word: string;
  correct: boolean;
}

export interface PracticeQuestion {
  vocabulary_id: string;
  word: string;
  definition: string;
  ipa: string;
  options?: string[]; // For multiple choice
  correctAnswer?: string; // For fill word and multiple choice
}

// Helper function to create initial WordProgress for new words
export function createInitialWordProgress(vocabularyId: string, word: string): WordProgress {
  const now = new Date().toISOString();
  return {
    vocabulary_id: vocabularyId,
    word: word,
    correct_count: 0,
    incorrect_count: 0,
    last_practiced: now,
    mastery_level: 0,

    // Spaced Repetition defaults
    next_review_date: now, // Available for review immediately
    interval_days: 0,
    easiness_factor: 2.5, // SM-2 default
    consecutive_correct_count: 0,

    // Leitner System defaults
    leitner_box: 1, // Start in box 1 (new words)
    last_interval_days: 0,

    // Session tracking defaults
    total_reviews: 0,
    failed_in_session: false,
    retry_count: 0,
  };
}
