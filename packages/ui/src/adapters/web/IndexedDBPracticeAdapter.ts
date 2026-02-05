import type { IPracticeService } from "@cham-lang/ui/adapters/factory/interfaces";
import type {
  CreatePracticeSessionRequest,
  PracticeSession,
  UpdateProgressRequest,
  UserPracticeProgress,
  WordProgress,
} from "@cham-lang/shared/types";
import { db, generateId, getCurrentTimestamp } from "./database";

export class IndexedDBPracticeAdapter implements IPracticeService {
  async createPracticeSession(
    request: CreatePracticeSessionRequest,
  ): Promise<string> {
    const id = generateId();
    const now = getCurrentTimestamp();
    await db.practiceSessions.add({
      id,
      collection_id: request.collection_id,
      mode: request.mode,
      language: request.language,
      topic: request.topic,
      level: request.level,
      results: request.results,
      total_questions: request.results.length,
      correct_answers: request.results.filter((r) => r.correct).length,
      started_at: now,
      completed_at: now,
      duration_seconds: request.duration_seconds,
    });

    // Update practice progress
    let progress = await db.practiceProgress
      .where("language")
      .equals(request.language)
      .first();

    if (!progress) {
      progress = {
        id: generateId(),
        language: request.language,
        total_sessions: 0,
        total_words_practiced: 0,
        current_streak: 0,
        longest_streak: 0,
        last_practice_date: now,
        created_at: now,
        updated_at: now,
      };
      await db.practiceProgress.add(progress);
    }

    const today = new Date().toISOString().split("T")[0];
    const lastDate = progress.last_practice_date
      ? new Date(progress.last_practice_date).toISOString().split("T")[0]
      : "";

    let newStreak = progress.current_streak;
    if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      newStreak = lastDate === yesterdayStr ? progress.current_streak + 1 : 1;
    }

    await db.practiceProgress.update(progress.id, {
      total_sessions: progress.total_sessions + 1,
      total_words_practiced:
        progress.total_words_practiced + request.results.length,
      current_streak: newStreak,
      longest_streak: Math.max(progress.longest_streak, newStreak),
      last_practice_date: now,
      updated_at: now,
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
      .toArray();
    sessions.sort((a, b) => b.started_at.localeCompare(a.started_at));
    if (limit) sessions = sessions.slice(0, limit);
    return sessions as PracticeSession[];
  }

  async updatePracticeProgress(
    request: UpdateProgressRequest,
  ): Promise<string> {
    // Find existing word progress
    const existing = await db.wordProgress
      .where("[language+vocabulary_id]")
      .equals([request.language, request.vocabulary_id])
      .first();

    const now = getCurrentTimestamp();

    if (existing) {
      await db.wordProgress.update(existing.id, {
        word: request.word,
        correct_count: request.correct_count,
        incorrect_count: request.incorrect_count,
        next_review_date: request.next_review_date,
        interval_days: request.interval_days,
        easiness_factor: request.easiness_factor,
        consecutive_correct_count: request.consecutive_correct_count,
        leitner_box: request.leitner_box,
        last_interval_days: request.last_interval_days,
        total_reviews: request.total_reviews,
        completed_modes_in_cycle: request.completed_modes_in_cycle,
        last_practiced: now,
      });
    } else {
      await db.wordProgress.add({
        id: generateId(),
        language: request.language,
        vocabulary_id: request.vocabulary_id,
        word: request.word,
        correct_count: request.correct_count,
        incorrect_count: request.incorrect_count,
        last_practiced: now,
        mastery_level: 0,
        next_review_date: request.next_review_date,
        interval_days: request.interval_days,
        easiness_factor: request.easiness_factor,
        consecutive_correct_count: request.consecutive_correct_count,
        leitner_box: request.leitner_box,
        last_interval_days: request.last_interval_days,
        total_reviews: request.total_reviews,
        failed_in_session: false,
        retry_count: 0,
        completed_modes_in_cycle: request.completed_modes_in_cycle,
      });
    }

    return "Progress updated successfully";
  }

  async getPracticeProgress(
    language: string,
  ): Promise<UserPracticeProgress | null> {
    const progress = await db.practiceProgress
      .where("language")
      .equals(language)
      .first();

    if (!progress) return null;

    const wordsProgress = await db.wordProgress
      .where("language")
      .equals(language)
      .toArray();

    return {
      id: progress.id,
      language: progress.language,
      words_progress: wordsProgress as WordProgress[],
      total_sessions: progress.total_sessions,
      total_words_practiced: progress.total_words_practiced,
      current_streak: progress.current_streak,
      longest_streak: progress.longest_streak,
      last_practice_date: progress.last_practice_date,
      created_at: progress.created_at,
      updated_at: progress.updated_at,
    };
  }

  async getWordProgress(
    language: string,
    vocabularyId: string,
  ): Promise<WordProgress | null> {
    const wp = await db.wordProgress
      .where("[language+vocabulary_id]")
      .equals([language, vocabularyId])
      .first();
    return (wp as WordProgress) || null;
  }
}
