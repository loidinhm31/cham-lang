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
  mastery_level: number; // 0-5
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
