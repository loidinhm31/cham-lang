/**
 * IndexedDB Database Setup using Dexie
 *
 * Schema uses camelCase field names to match the sync protocol directly.
 */

import Dexie, { type EntityTable } from "dexie";

// =============================================================================
// IndexedDB Table Types (flattened for IDB - no JOINs needed)
// =============================================================================

export interface IDBVocabulary {
  id: string;
  word: string;
  wordType: string;
  level: string;
  ipa: string;
  audioUrl?: string;
  concept?: string;
  definitions: Array<{
    meaning: string;
    translation?: string;
    example?: string;
  }>;
  exampleSentences: string[];
  topics: string[];
  tags: string[];
  relatedWords: Array<{
    wordId?: string;
    word: string;
    relationship: string;
  }>;
  language: string;
  collectionId: string;
  createdAt: string;
  updatedAt: string;
  syncVersion?: number;
  syncedAt?: number;
}

export interface IDBCollection {
  id: string;
  name: string;
  description: string;
  language: string;
  sharedBy?: string;
  sharedWith: Array<{ userId: string; permission: string }>;
  isPublic: boolean;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  syncVersion?: number;
  syncedAt?: number;
}

export interface IDBPracticeSession {
  id: string;
  collectionId: string;
  mode: string;
  language: string;
  topic?: string;
  level?: string;
  results: Array<{
    vocabularyId: string;
    word: string;
    correct: boolean;
    mode: string;
    timeSpentSeconds: number;
  }>;
  totalQuestions: number;
  correctAnswers: number;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  syncVersion?: number;
  syncedAt?: number;
}

export interface IDBWordProgress {
  id: string;
  language: string;
  vocabularyId: string;
  word: string;
  correctCount: number;
  incorrectCount: number;
  lastPracticed: string;
  masteryLevel: number;
  nextReviewDate: string;
  intervalDays: number;
  easinessFactor: number;
  consecutiveCorrectCount: number;
  leitnerBox: number;
  lastIntervalDays: number;
  totalReviews: number;
  failedInSession: boolean;
  retryCount: number;
  completedModesInCycle: string[];
  syncVersion?: number;
  syncedAt?: number;
}

export interface IDBPracticeProgress {
  id: string;
  language: string;
  totalSessions: number;
  totalWordsPracticed: number;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string;
  createdAt: string;
  updatedAt: string;
  syncVersion?: number;
  syncedAt?: number;
}

export interface IDBLearningSettings {
  id: string;
  srAlgorithm: string;
  leitnerBoxCount: number;
  consecutiveCorrectRequired: number;
  showFailedWordsInSession: boolean;
  newWordsPerDay?: number;
  dailyReviewLimit?: number;
  autoAdvanceTimeoutSeconds: number;
  showHintInFillword: boolean;
  reminderEnabled?: boolean;
  reminderTime?: string;
  createdAt: string;
  updatedAt: string;
  syncVersion?: number;
  syncedAt?: number;
}

export interface IDBTopic {
  id: string;
  name: string;
  createdAt: string;
  syncVersion?: number;
  syncedAt?: number;
}

export interface IDBTag {
  id: string;
  name: string;
  createdAt: string;
  syncVersion?: number;
  syncedAt?: number;
}

export interface IDBUserLearningLanguage {
  id: string;
  language: string;
  createdAt: string;
  syncVersion?: number;
  syncedAt?: number;
}

export interface IDBCollectionSharedUser {
  id: string;
  collectionId: string;
  userId: string;
  permission: string;
  createdAt: string;
  syncVersion?: number;
  syncedAt?: number;
}

// =============================================================================
// Sync Meta Types
// =============================================================================

export interface SyncMeta {
  key: string;
  value: string;
}

export interface PendingChange {
  id: string;
  tableName: string;
  recordId: string;
  operation: "delete";
  syncVersion: number;
  createdAt: number;
}

export const SYNC_META_KEYS = {
  CHECKPOINT_UPDATED_AT: "checkpoint_updated_at",
  CHECKPOINT_ID: "checkpoint_id",
  LAST_SYNC_AT: "last_sync_at",
  MIGRATION_COMPLETED: "migration_completed",
} as const;

// =============================================================================
// Database Class
// =============================================================================

export class ChamLangDatabase extends Dexie {
  vocabularies!: EntityTable<IDBVocabulary, "id">;
  collections!: EntityTable<IDBCollection, "id">;
  practiceSessions!: EntityTable<IDBPracticeSession, "id">;
  wordProgress!: EntityTable<IDBWordProgress, "id">;
  practiceProgress!: EntityTable<IDBPracticeProgress, "id">;
  learningSettings!: EntityTable<IDBLearningSettings, "id">;
  topics!: EntityTable<IDBTopic, "id">;
  tags!: EntityTable<IDBTag, "id">;
  userLearningLanguages!: EntityTable<IDBUserLearningLanguage, "id">;
  collectionSharedUsers!: EntityTable<IDBCollectionSharedUser, "id">;
  _syncMeta!: EntityTable<SyncMeta, "key">;
  _pendingChanges!: EntityTable<PendingChange, "id">;

  constructor() {
    super("ChamLangDB");

    // Version 1-3: Legacy snake_case schema (kept for migration path)
    this.version(1).stores({
      vocabularies:
        "id, word, language, collection_id, level, created_at, updated_at, synced_at",
      collections:
        "id, name, language, owner_id, is_public, created_at, synced_at",
      practiceSessions:
        "id, collection_id, language, mode, started_at, synced_at",
      wordProgress:
        "id, language, vocabulary_id, next_review_date, leitner_box, [language+vocabulary_id], synced_at",
      practiceProgress: "id, language, synced_at",
      learningSettings: "id, user_id, synced_at",
      topics: "id, name, synced_at",
      tags: "id, name, synced_at",
      userLearningLanguages: "id, user_id, language, synced_at",
      collectionSharedUsers: "id, collection_id, user_id, synced_at",
      _syncMeta: "key",
      _pendingChanges: "id, tableName, recordId",
    });

    this.version(2).stores({
      vocabularies:
        "id, word, language, collection_id, level, created_at, updated_at, synced_at",
      collections:
        "id, name, language, owner_id, is_public, created_at, synced_at",
      practiceSessions:
        "id, collection_id, language, mode, started_at, synced_at",
      wordProgress:
        "id, language, vocabulary_id, next_review_date, leitner_box, [language+vocabulary_id], synced_at",
      practiceProgress: "id, language, synced_at",
      learningSettings: "id, synced_at",
      topics: "id, name, synced_at",
      tags: "id, name, synced_at",
      userLearningLanguages: "id, language, synced_at",
      collectionSharedUsers: "id, collection_id, user_id, synced_at",
      _syncMeta: "key",
      _pendingChanges: "id, tableName, recordId",
    });

    this.version(3).stores({
      collections:
        "id, name, language, shared_by, is_public, created_at, synced_at",
    });

    // Version 4: Migration to camelCase schema
    this.version(4)
      .stores({
        vocabularies:
          "id, word, language, collectionId, level, createdAt, updatedAt, syncedAt",
        collections:
          "id, name, language, sharedBy, isPublic, createdAt, syncedAt",
        practiceSessions:
          "id, collectionId, language, mode, startedAt, syncedAt",
        wordProgress:
          "id, language, vocabularyId, nextReviewDate, leitnerBox, [language+vocabularyId], syncedAt",
        practiceProgress: "id, language, syncedAt",
        learningSettings: "id, syncedAt",
        topics: "id, name, syncedAt",
        tags: "id, name, syncedAt",
        userLearningLanguages: "id, language, syncedAt",
        collectionSharedUsers: "id, collectionId, userId, syncedAt",
        _syncMeta: "key",
        _pendingChanges: "id, tableName, recordId",
      })
      .upgrade(async (tx) => {
        // Migrate vocabularies: snake_case → camelCase
        await tx
          .table("vocabularies")
          .toCollection()
          .modify((v: Record<string, unknown>) => {
            if (v.word_type !== undefined) {
              v.wordType = v.word_type;
              delete v.word_type;
            }
            if (v.audio_url !== undefined) {
              v.audioUrl = v.audio_url;
              delete v.audio_url;
            }
            if (v.example_sentences !== undefined) {
              v.exampleSentences = v.example_sentences;
              delete v.example_sentences;
            }
            if (v.related_words !== undefined) {
              // Also convert nested fields in relatedWords
              const rw = v.related_words as Array<Record<string, unknown>>;
              v.relatedWords = rw.map((r) => ({
                wordId: r.word_id,
                word: r.word,
                relationship: r.relationship,
              }));
              delete v.related_words;
            }
            if (v.collection_id !== undefined) {
              v.collectionId = v.collection_id;
              delete v.collection_id;
            }
            if (v.created_at !== undefined) {
              v.createdAt = v.created_at;
              delete v.created_at;
            }
            if (v.updated_at !== undefined) {
              v.updatedAt = v.updated_at;
              delete v.updated_at;
            }
            if (v.sync_version !== undefined) {
              v.syncVersion = v.sync_version;
              delete v.sync_version;
            }
            if (v.synced_at !== undefined) {
              v.syncedAt = v.synced_at;
              delete v.synced_at;
            }
          });

        // Migrate collections: snake_case → camelCase
        await tx
          .table("collections")
          .toCollection()
          .modify((c: Record<string, unknown>) => {
            if (c.shared_by !== undefined) {
              c.sharedBy = c.shared_by;
              delete c.shared_by;
            }
            if (c.shared_with !== undefined) {
              // Convert nested fields in sharedWith
              const sw = c.shared_with as Array<Record<string, unknown>>;
              c.sharedWith = sw.map((s) => ({
                userId: s.user_id,
                permission: s.permission,
              }));
              delete c.shared_with;
            }
            if (c.is_public !== undefined) {
              c.isPublic = c.is_public;
              delete c.is_public;
            }
            if (c.word_count !== undefined) {
              c.wordCount = c.word_count;
              delete c.word_count;
            }
            if (c.created_at !== undefined) {
              c.createdAt = c.created_at;
              delete c.created_at;
            }
            if (c.updated_at !== undefined) {
              c.updatedAt = c.updated_at;
              delete c.updated_at;
            }
            if (c.sync_version !== undefined) {
              c.syncVersion = c.sync_version;
              delete c.sync_version;
            }
            if (c.synced_at !== undefined) {
              c.syncedAt = c.synced_at;
              delete c.synced_at;
            }
          });

        // Migrate practiceSessions: snake_case → camelCase
        await tx
          .table("practiceSessions")
          .toCollection()
          .modify((ps: Record<string, unknown>) => {
            if (ps.collection_id !== undefined) {
              ps.collectionId = ps.collection_id;
              delete ps.collection_id;
            }
            if (ps.total_questions !== undefined) {
              ps.totalQuestions = ps.total_questions;
              delete ps.total_questions;
            }
            if (ps.correct_answers !== undefined) {
              ps.correctAnswers = ps.correct_answers;
              delete ps.correct_answers;
            }
            if (ps.started_at !== undefined) {
              ps.startedAt = ps.started_at;
              delete ps.started_at;
            }
            if (ps.completed_at !== undefined) {
              ps.completedAt = ps.completed_at;
              delete ps.completed_at;
            }
            if (ps.duration_seconds !== undefined) {
              ps.durationSeconds = ps.duration_seconds;
              delete ps.duration_seconds;
            }
            // Convert results array
            if (ps.results !== undefined) {
              const results = ps.results as Array<Record<string, unknown>>;
              ps.results = results.map((r) => ({
                vocabularyId: r.vocabulary_id ?? r.vocabularyId,
                word: r.word,
                correct: r.correct,
                mode: r.mode,
                timeSpentSeconds: r.time_spent_seconds ?? r.timeSpentSeconds,
              }));
            }
            if (ps.sync_version !== undefined) {
              ps.syncVersion = ps.sync_version;
              delete ps.sync_version;
            }
            if (ps.synced_at !== undefined) {
              ps.syncedAt = ps.synced_at;
              delete ps.synced_at;
            }
          });

        // Migrate wordProgress: snake_case → camelCase
        await tx
          .table("wordProgress")
          .toCollection()
          .modify((wp: Record<string, unknown>) => {
            if (wp.vocabulary_id !== undefined) {
              wp.vocabularyId = wp.vocabulary_id;
              delete wp.vocabulary_id;
            }
            if (wp.correct_count !== undefined) {
              wp.correctCount = wp.correct_count;
              delete wp.correct_count;
            }
            if (wp.incorrect_count !== undefined) {
              wp.incorrectCount = wp.incorrect_count;
              delete wp.incorrect_count;
            }
            if (wp.last_practiced !== undefined) {
              wp.lastPracticed = wp.last_practiced;
              delete wp.last_practiced;
            }
            if (wp.mastery_level !== undefined) {
              wp.masteryLevel = wp.mastery_level;
              delete wp.mastery_level;
            }
            if (wp.next_review_date !== undefined) {
              wp.nextReviewDate = wp.next_review_date;
              delete wp.next_review_date;
            }
            if (wp.interval_days !== undefined) {
              wp.intervalDays = wp.interval_days;
              delete wp.interval_days;
            }
            if (wp.easiness_factor !== undefined) {
              wp.easinessFactor = wp.easiness_factor;
              delete wp.easiness_factor;
            }
            if (wp.consecutive_correct_count !== undefined) {
              wp.consecutiveCorrectCount = wp.consecutive_correct_count;
              delete wp.consecutive_correct_count;
            }
            if (wp.leitner_box !== undefined) {
              wp.leitnerBox = wp.leitner_box;
              delete wp.leitner_box;
            }
            if (wp.last_interval_days !== undefined) {
              wp.lastIntervalDays = wp.last_interval_days;
              delete wp.last_interval_days;
            }
            if (wp.total_reviews !== undefined) {
              wp.totalReviews = wp.total_reviews;
              delete wp.total_reviews;
            }
            if (wp.failed_in_session !== undefined) {
              wp.failedInSession = wp.failed_in_session;
              delete wp.failed_in_session;
            }
            if (wp.retry_count !== undefined) {
              wp.retryCount = wp.retry_count;
              delete wp.retry_count;
            }
            if (wp.completed_modes_in_cycle !== undefined) {
              wp.completedModesInCycle = wp.completed_modes_in_cycle;
              delete wp.completed_modes_in_cycle;
            }
            if (wp.sync_version !== undefined) {
              wp.syncVersion = wp.sync_version;
              delete wp.sync_version;
            }
            if (wp.synced_at !== undefined) {
              wp.syncedAt = wp.synced_at;
              delete wp.synced_at;
            }
          });

        // Migrate practiceProgress: snake_case → camelCase
        await tx
          .table("practiceProgress")
          .toCollection()
          .modify((pp: Record<string, unknown>) => {
            if (pp.total_sessions !== undefined) {
              pp.totalSessions = pp.total_sessions;
              delete pp.total_sessions;
            }
            if (pp.total_words_practiced !== undefined) {
              pp.totalWordsPracticed = pp.total_words_practiced;
              delete pp.total_words_practiced;
            }
            if (pp.current_streak !== undefined) {
              pp.currentStreak = pp.current_streak;
              delete pp.current_streak;
            }
            if (pp.longest_streak !== undefined) {
              pp.longestStreak = pp.longest_streak;
              delete pp.longest_streak;
            }
            if (pp.last_practice_date !== undefined) {
              pp.lastPracticeDate = pp.last_practice_date;
              delete pp.last_practice_date;
            }
            if (pp.created_at !== undefined) {
              pp.createdAt = pp.created_at;
              delete pp.created_at;
            }
            if (pp.updated_at !== undefined) {
              pp.updatedAt = pp.updated_at;
              delete pp.updated_at;
            }
            if (pp.sync_version !== undefined) {
              pp.syncVersion = pp.sync_version;
              delete pp.sync_version;
            }
            if (pp.synced_at !== undefined) {
              pp.syncedAt = pp.synced_at;
              delete pp.synced_at;
            }
          });

        // Migrate learningSettings: snake_case → camelCase
        await tx
          .table("learningSettings")
          .toCollection()
          .modify((ls: Record<string, unknown>) => {
            if (ls.sr_algorithm !== undefined) {
              ls.srAlgorithm = ls.sr_algorithm;
              delete ls.sr_algorithm;
            }
            if (ls.leitner_box_count !== undefined) {
              ls.leitnerBoxCount = ls.leitner_box_count;
              delete ls.leitner_box_count;
            }
            if (ls.consecutive_correct_required !== undefined) {
              ls.consecutiveCorrectRequired = ls.consecutive_correct_required;
              delete ls.consecutive_correct_required;
            }
            if (ls.show_failed_words_in_session !== undefined) {
              ls.showFailedWordsInSession = ls.show_failed_words_in_session;
              delete ls.show_failed_words_in_session;
            }
            if (ls.new_words_per_day !== undefined) {
              ls.newWordsPerDay = ls.new_words_per_day;
              delete ls.new_words_per_day;
            }
            if (ls.daily_review_limit !== undefined) {
              ls.dailyReviewLimit = ls.daily_review_limit;
              delete ls.daily_review_limit;
            }
            if (ls.auto_advance_timeout_seconds !== undefined) {
              ls.autoAdvanceTimeoutSeconds = ls.auto_advance_timeout_seconds;
              delete ls.auto_advance_timeout_seconds;
            }
            if (ls.show_hint_in_fillword !== undefined) {
              ls.showHintInFillword = ls.show_hint_in_fillword;
              delete ls.show_hint_in_fillword;
            }
            if (ls.reminder_enabled !== undefined) {
              ls.reminderEnabled = ls.reminder_enabled;
              delete ls.reminder_enabled;
            }
            if (ls.reminder_time !== undefined) {
              ls.reminderTime = ls.reminder_time;
              delete ls.reminder_time;
            }
            if (ls.created_at !== undefined) {
              ls.createdAt = ls.created_at;
              delete ls.created_at;
            }
            if (ls.updated_at !== undefined) {
              ls.updatedAt = ls.updated_at;
              delete ls.updated_at;
            }
            if (ls.sync_version !== undefined) {
              ls.syncVersion = ls.sync_version;
              delete ls.sync_version;
            }
            if (ls.synced_at !== undefined) {
              ls.syncedAt = ls.synced_at;
              delete ls.synced_at;
            }
          });

        // Migrate topics: snake_case → camelCase
        await tx
          .table("topics")
          .toCollection()
          .modify((t: Record<string, unknown>) => {
            if (t.created_at !== undefined) {
              t.createdAt = t.created_at;
              delete t.created_at;
            }
            if (t.sync_version !== undefined) {
              t.syncVersion = t.sync_version;
              delete t.sync_version;
            }
            if (t.synced_at !== undefined) {
              t.syncedAt = t.synced_at;
              delete t.synced_at;
            }
          });

        // Migrate tags: snake_case → camelCase
        await tx
          .table("tags")
          .toCollection()
          .modify((t: Record<string, unknown>) => {
            if (t.created_at !== undefined) {
              t.createdAt = t.created_at;
              delete t.created_at;
            }
            if (t.sync_version !== undefined) {
              t.syncVersion = t.sync_version;
              delete t.sync_version;
            }
            if (t.synced_at !== undefined) {
              t.syncedAt = t.synced_at;
              delete t.synced_at;
            }
          });

        // Migrate userLearningLanguages: snake_case → camelCase
        await tx
          .table("userLearningLanguages")
          .toCollection()
          .modify((ull: Record<string, unknown>) => {
            if (ull.created_at !== undefined) {
              ull.createdAt = ull.created_at;
              delete ull.created_at;
            }
            if (ull.sync_version !== undefined) {
              ull.syncVersion = ull.sync_version;
              delete ull.sync_version;
            }
            if (ull.synced_at !== undefined) {
              ull.syncedAt = ull.synced_at;
              delete ull.synced_at;
            }
          });

        // Migrate collectionSharedUsers: snake_case → camelCase
        await tx
          .table("collectionSharedUsers")
          .toCollection()
          .modify((csu: Record<string, unknown>) => {
            if (csu.collection_id !== undefined) {
              csu.collectionId = csu.collection_id;
              delete csu.collection_id;
            }
            if (csu.user_id !== undefined) {
              csu.userId = csu.user_id;
              delete csu.user_id;
            }
            if (csu.created_at !== undefined) {
              csu.createdAt = csu.created_at;
              delete csu.created_at;
            }
            if (csu.sync_version !== undefined) {
              csu.syncVersion = csu.sync_version;
              delete csu.sync_version;
            }
            if (csu.synced_at !== undefined) {
              csu.syncedAt = csu.synced_at;
              delete csu.synced_at;
            }
          });
      });

    this.vocabularies = this.table("vocabularies");
    this.collections = this.table("collections");
    this.practiceSessions = this.table("practiceSessions");
    this.wordProgress = this.table("wordProgress");
    this.practiceProgress = this.table("practiceProgress");
    this.learningSettings = this.table("learningSettings");
    this.topics = this.table("topics");
    this.tags = this.table("tags");
    this.userLearningLanguages = this.table("userLearningLanguages");
    this.collectionSharedUsers = this.table("collectionSharedUsers");
    this._syncMeta = this.table("_syncMeta");
    this._pendingChanges = this.table("_pendingChanges");
  }

  async getSyncMeta(key: string): Promise<string | undefined> {
    const meta = await this._syncMeta.get(key);
    return meta?.value;
  }

  async setSyncMeta(key: string, value: string): Promise<void> {
    await this._syncMeta.put({ key, value });
  }
}

// Singleton database instance
export const db = new ChamLangDatabase();

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current ISO timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
