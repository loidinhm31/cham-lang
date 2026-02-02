/**
 * IndexedDB Database Setup using Dexie
 *
 * Schema mirrors the SQLite schema from src-tauri/src/db/mod.rs
 */

import Dexie, { type EntityTable } from "dexie";

// =============================================================================
// IndexedDB Table Types (flattened for IDB - no JOINs needed)
// =============================================================================

export interface IDBVocabulary {
  id: string;
  word: string;
  word_type: string;
  level: string;
  ipa: string;
  audio_url?: string;
  concept?: string;
  definitions: Array<{
    meaning: string;
    translation?: string;
    example?: string;
  }>;
  example_sentences: string[];
  topics: string[];
  tags: string[];
  related_words: Array<{
    word_id?: string;
    word: string;
    relationship: string;
  }>;
  language: string;
  collection_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  sync_version?: number;
  synced_at?: number;
}

export interface IDBCollection {
  id: string;
  name: string;
  description: string;
  language: string;
  owner_id: string;
  shared_with: string[];
  is_public: boolean;
  word_count: number;
  created_at: string;
  updated_at: string;
  sync_version?: number;
  synced_at?: number;
}

export interface IDBPracticeSession {
  id: string;
  collection_id: string;
  mode: string;
  language: string;
  topic?: string;
  level?: string;
  results: Array<{
    vocabulary_id: string;
    word: string;
    correct: boolean;
    mode: string;
    time_spent_seconds: number;
  }>;
  total_questions: number;
  correct_answers: number;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  sync_version?: number;
  synced_at?: number;
}

export interface IDBWordProgress {
  id: string;
  language: string;
  vocabulary_id: string;
  word: string;
  correct_count: number;
  incorrect_count: number;
  last_practiced: string;
  mastery_level: number;
  next_review_date: string;
  interval_days: number;
  easiness_factor: number;
  consecutive_correct_count: number;
  leitner_box: number;
  last_interval_days: number;
  total_reviews: number;
  failed_in_session: boolean;
  retry_count: number;
  completed_modes_in_cycle: string[];
  sync_version?: number;
  synced_at?: number;
}

export interface IDBPracticeProgress {
  id: string;
  language: string;
  total_sessions: number;
  total_words_practiced: number;
  current_streak: number;
  longest_streak: number;
  last_practice_date: string;
  created_at: string;
  updated_at: string;
  sync_version?: number;
  synced_at?: number;
}

export interface IDBLearningSettings {
  id: string;
  user_id: string;
  sr_algorithm: string;
  leitner_box_count: number;
  consecutive_correct_required: number;
  show_failed_words_in_session: boolean;
  new_words_per_day?: number;
  daily_review_limit?: number;
  auto_advance_timeout_seconds: number;
  show_hint_in_fillword: boolean;
  reminder_enabled?: boolean;
  reminder_time?: string;
  created_at: string;
  updated_at: string;
  sync_version?: number;
  synced_at?: number;
}

export interface IDBTopic {
  id: string;
  name: string;
  created_at: string;
  sync_version?: number;
  synced_at?: number;
}

export interface IDBTag {
  id: string;
  name: string;
  created_at: string;
  sync_version?: number;
  synced_at?: number;
}

export interface IDBUserLearningLanguage {
  id: string;
  user_id: string;
  language: string;
  created_at: string;
  sync_version?: number;
  synced_at?: number;
}

export interface IDBCollectionSharedUser {
  id: string;
  collection_id: string;
  user_id: string;
  created_at: string;
  sync_version?: number;
  synced_at?: number;
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
