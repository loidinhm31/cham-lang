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
  sharedWith: Array<{ userId: string }>;
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

    this.version(1).stores({
      vocabularies:    "id, word, language, collectionId, level, createdAt, updatedAt, syncedAt",
      collections:     "id, name, language, sharedBy, isPublic, createdAt, syncedAt",
      practiceSessions:"id, collectionId, language, mode, startedAt, syncedAt",
      wordProgress:    "id, language, vocabularyId, nextReviewDate, leitnerBox, [language+vocabularyId], syncedAt",
      practiceProgress:"id, language, syncedAt",
      learningSettings:"id, syncedAt",
      topics:          "id, name, syncedAt",
      tags:            "id, name, syncedAt",
      userLearningLanguages: "id, language, syncedAt",
      collectionSharedUsers: "id, collectionId, userId, syncedAt",
      _syncMeta:       "key",
      _pendingChanges: "id, tableName, recordId",
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
