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
  deleted?: 0 | 1;
  deletedAt?: number;
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
  deleted?: 0 | 1;
  deletedAt?: number;
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
  deleted?: 0 | 1;
  deletedAt?: number;
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
  deleted?: 0 | 1;
  deletedAt?: number;
}

export interface IDBTag {
  id: string;
  name: string;
  createdAt: string;
  syncVersion?: number;
  syncedAt?: number;
  deleted?: 0 | 1;
  deletedAt?: number;
}

export interface IDBUserLearningLanguage {
  id: string;
  language: string;
  createdAt: string;
  syncVersion?: number;
  syncedAt?: number;
  deleted?: 0 | 1;
  deletedAt?: number;
}

export interface IDBCollectionSharedUser {
  id: string;
  collectionId: string;
  userId: string;
  createdAt: string;
  syncVersion?: number;
  syncedAt?: number;
  deleted?: 0 | 1;
  deletedAt?: number;
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

  constructor(dbName = "ChamLangDB") {
    super(dbName);

    this.version(1).stores({
      vocabularies:    "id, word, language, collectionId, level, createdAt, updatedAt, syncedAt, deleted",
      collections:     "id, name, language, sharedBy, isPublic, createdAt, syncedAt, deleted",
      practiceSessions:"id, collectionId, language, mode, startedAt, syncedAt",
      wordProgress:    "id, language, vocabularyId, nextReviewDate, leitnerBox, [language+vocabularyId], syncedAt",
      practiceProgress:"id, language, syncedAt, deleted",
      learningSettings:"id, syncedAt",
      topics:          "id, name, syncedAt, deleted",
      tags:            "id, name, syncedAt, deleted",
      userLearningLanguages: "id, language, syncedAt, deleted",
      collectionSharedUsers: "id, collectionId, userId, syncedAt, deleted",
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

// =============================================================================
// Per-user DB management
// =============================================================================

let _db: ChamLangDatabase | null = null;
let _currentUserId: string | null = null;

async function hashUserId(userId: string): Promise<string> {
  const encoded = new TextEncoder().encode(userId);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

/**
 * Initialize (or reinitialize) the DB for a specific user.
 * If userId is undefined (standalone mode), uses the legacy "ChamLangDB" name.
 * Calling with the same userId is a no-op.
 */
export async function initDb(userId?: string): Promise<ChamLangDatabase> {
  if (!userId) {
    // Standalone fallback: legacy singleton name preserves existing behavior.
    // If currently open for a user, close it first.
    if (!_db || _currentUserId !== null) {
      if (_db) _db.close();
      _db = new ChamLangDatabase("ChamLangDB");
      _currentUserId = null;
    }
    return _db;
  }
  if (_db && _currentUserId === userId) return _db;
  if (_db) _db.close();
  const prefix = await hashUserId(userId);
  _db = new ChamLangDatabase(`ChamLangDB_${prefix}`);
  _currentUserId = userId;
  return _db;
}

/** Returns the active DB instance. Throws if initDb() has not been called. */
export function getDb(): ChamLangDatabase {
  if (!_db) throw new Error("ChamLangDB not initialized. Call initDb() first.");
  return _db;
}

/** Close and delete the current user's IndexedDB. Used on logout. */
export async function deleteCurrentDb(): Promise<void> {
  if (_db) {
    const name = _db.name;
    _db.close();
    await Dexie.delete(name);
    _db = null;
    _currentUserId = null;
  }
}

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
