/**
 * Web Practice Adapter
 * Implements practice operations using IndexedDB via Dexie.js
 */

import type { IPracticeService } from "@/adapters";
import type {
  CreatePracticeSessionRequest,
  PracticeSession,
  UpdateProgressRequest,
  UserPracticeProgress,
  WordProgress,
} from "@/types/practice";
import { db, generateId, now } from "./db";

export class WebPracticeAdapter implements IPracticeService {
  async createPracticeSession(
    request: CreatePracticeSessionRequest,
  ): Promise<string> {
    const id = generateId();
    const timestamp = now();

    const correctAnswers = request.results.filter((r) => r.correct).length;

    await db.practiceSessions.add({
      id,
      collection_id: request.collection_id,
      mode: request.mode,
      language: request.language,
      topic: request.topic,
      level: request.level,
      results: request.results,
      total_questions: request.results.length,
      correct_answers: correctAnswers,
      started_at: timestamp,
      completed_at: timestamp,
      duration_seconds: request.duration_seconds,
    });

    return id;
  }

  async getPracticeSessions(
    language: string,
    limit?: number,
  ): Promise<PracticeSession[]> {
    let sessions = await db.practiceSessions
      .where("language")
      .equals(language)
      .reverse() // Most recent first
      .toArray();

    if (limit && limit > 0) {
      sessions = sessions.slice(0, limit);
    }

    return sessions;
  }

  async updatePracticeProgress(
    request: UpdateProgressRequest,
  ): Promise<string> {
    const timestamp = now();

    // Get or create user progress for this language
    let progress = await db.practiceProgress
      .where("language")
      .equals(request.language)
      .first();

    if (!progress) {
      // Create new progress record
      const id = generateId();
      progress = {
        id,
        language: request.language,
        words_progress: [],
        total_sessions: 0,
        total_words_practiced: 0,
        current_streak: 0,
        longest_streak: 0,
        last_practice_date: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
      };
      await db.practiceProgress.add(progress);
    }

    // Find or create word progress
    const wordProgressIndex = progress.words_progress.findIndex(
      (wp) => wp.vocabulary_id === request.vocabulary_id,
    );

    const wordProgress: WordProgress = {
      vocabulary_id: request.vocabulary_id,
      word: request.word,
      correct_count: request.correct_count,
      incorrect_count: request.incorrect_count,
      last_practiced: timestamp,
      mastery_level: Math.floor(request.correct_count / 3), // Simple mastery calculation
      next_review_date: request.next_review_date,
      interval_days: request.interval_days,
      easiness_factor: request.easiness_factor,
      consecutive_correct_count: request.consecutive_correct_count,
      leitner_box: request.leitner_box,
      last_interval_days: request.last_interval_days,
      total_reviews: request.total_reviews,
      failed_in_session: !request.correct,
      retry_count: 0,
      completed_modes_in_cycle: request.completed_modes_in_cycle,
    };

    if (wordProgressIndex >= 0) {
      progress.words_progress[wordProgressIndex] = wordProgress;
    } else {
      progress.words_progress.push(wordProgress);
      progress.total_words_practiced++;
    }

    // Update streak logic
    const lastPracticeDate = new Date(progress.last_practice_date);
    const today = new Date();
    const daysDiff = Math.floor(
      (today.getTime() - lastPracticeDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDiff === 1) {
      progress.current_streak++;
      if (progress.current_streak > progress.longest_streak) {
        progress.longest_streak = progress.current_streak;
      }
    } else if (daysDiff > 1) {
      progress.current_streak = 1;
    }

    progress.last_practice_date = timestamp;
    progress.updated_at = timestamp;

    await db.practiceProgress.put(progress);

    return progress.id;
  }

  async getPracticeProgress(
    language: string,
  ): Promise<UserPracticeProgress | null> {
    const progress = await db.practiceProgress
      .where("language")
      .equals(language)
      .first();

    return progress || null;
  }

  async getWordProgress(
    language: string,
    vocabularyId: string,
  ): Promise<WordProgress | null> {
    const progress = await db.practiceProgress
      .where("language")
      .equals(language)
      .first();

    if (!progress) {
      return null;
    }

    const wordProgress = progress.words_progress.find(
      (wp) => wp.vocabulary_id === vocabularyId,
    );

    return wordProgress || null;
  }
}
