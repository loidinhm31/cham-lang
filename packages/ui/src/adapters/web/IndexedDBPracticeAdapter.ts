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
      collectionId: request.collectionId,
      mode: request.mode,
      language: request.language,
      topic: request.topic,
      level: request.level,
      results: request.results,
      totalQuestions: request.results.length,
      correctAnswers: request.results.filter((r) => r.correct).length,
      startedAt: now,
      completedAt: now,
      durationSeconds: request.durationSeconds,
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
        totalSessions: 0,
        totalWordsPracticed: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastPracticeDate: now,
        createdAt: now,
        updatedAt: now,
      };
      await db.practiceProgress.add(progress);
    }

    const today = new Date().toISOString().split("T")[0];
    const lastDate = progress.lastPracticeDate
      ? new Date(progress.lastPracticeDate).toISOString().split("T")[0]
      : "";

    let newStreak = progress.currentStreak;
    if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      newStreak = lastDate === yesterdayStr ? progress.currentStreak + 1 : 1;
    }

    await db.practiceProgress.update(progress.id, {
      totalSessions: progress.totalSessions + 1,
      totalWordsPracticed:
        progress.totalWordsPracticed + request.results.length,
      currentStreak: newStreak,
      longestStreak: Math.max(progress.longestStreak, newStreak),
      lastPracticeDate: now,
      updatedAt: now,
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
    sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    if (limit) sessions = sessions.slice(0, limit);
    return sessions as PracticeSession[];
  }

  async updatePracticeProgress(
    request: UpdateProgressRequest,
  ): Promise<string> {
    // Find existing word progress
    const existing = await db.wordProgress
      .where("[language+vocabularyId]")
      .equals([request.language, request.vocabularyId])
      .first();

    const now = getCurrentTimestamp();

    if (existing) {
      await db.wordProgress.update(existing.id, {
        word: request.word,
        correctCount: request.correctCount,
        incorrectCount: request.incorrectCount,
        nextReviewDate: request.nextReviewDate,
        intervalDays: request.intervalDays,
        easinessFactor: request.easinessFactor,
        consecutiveCorrectCount: request.consecutiveCorrectCount,
        leitnerBox: request.leitnerBox,
        lastIntervalDays: request.lastIntervalDays,
        totalReviews: request.totalReviews,
        completedModesInCycle: request.completedModesInCycle,
        lastPracticed: now,
      });
    } else {
      await db.wordProgress.add({
        id: generateId(),
        language: request.language,
        vocabularyId: request.vocabularyId,
        word: request.word,
        correctCount: request.correctCount,
        incorrectCount: request.incorrectCount,
        lastPracticed: now,
        masteryLevel: 0,
        nextReviewDate: request.nextReviewDate,
        intervalDays: request.intervalDays,
        easinessFactor: request.easinessFactor,
        consecutiveCorrectCount: request.consecutiveCorrectCount,
        leitnerBox: request.leitnerBox,
        lastIntervalDays: request.lastIntervalDays,
        totalReviews: request.totalReviews,
        failedInSession: false,
        retryCount: 0,
        completedModesInCycle: request.completedModesInCycle,
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
      wordsProgress: wordsProgress as WordProgress[],
      totalSessions: progress.totalSessions,
      totalWordsPracticed: progress.totalWordsPracticed,
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      lastPracticeDate: progress.lastPracticeDate,
      createdAt: progress.createdAt,
      updatedAt: progress.updatedAt,
    };
  }

  async getWordProgress(
    language: string,
    vocabularyId: string,
  ): Promise<WordProgress | null> {
    const wp = await db.wordProgress
      .where("[language+vocabularyId]")
      .equals([language, vocabularyId])
      .first();
    return (wp as WordProgress) || null;
  }
}
