/**
 * Dexie.js database schema for web platform
 * Mirrors the SQLite schema used in Tauri backend
 */

import Dexie, { type Table } from "dexie";
import type { Collection } from "@/types/collection";
import type { Vocabulary } from "@/types/vocabulary";
import type { PracticeSession, UserPracticeProgress } from "@/types/practice";
import type { LearningSettings } from "@/types/settings";

/**
 * Record types for IndexedDB with required id field
 * Using intersection types to ensure id is always present
 */
export type CollectionRecord = Collection & { id: string };
export type VocabularyRecord = Vocabulary & { id: string };
export type PracticeSessionRecord = PracticeSession & { id: string };
export type UserPracticeProgressRecord = UserPracticeProgress & { id: string };
export type LearningSettingsRecord = LearningSettings & { id: string };

/**
 * ChamLang IndexedDB Database
 */
export class ChamLangDB extends Dexie {
  collections!: Table<CollectionRecord, string>;
  vocabularies!: Table<VocabularyRecord, string>;
  practiceSessions!: Table<PracticeSessionRecord, string>;
  practiceProgress!: Table<UserPracticeProgressRecord, string>;
  learningSettings!: Table<LearningSettingsRecord, string>;

  constructor() {
    super("ChamLangDB");

    // Define database schema
    // Version 1: Initial schema
    this.version(1).stores({
      // Collections table
      // Indexed on: id (primary), language, owner_id, is_public
      collections: "id, language, owner_id, is_public, created_at, updated_at",

      // Vocabularies table
      // Indexed on: id (primary), collection_id, language, word, level
      vocabularies:
        "id, collection_id, language, word, level, *topics, *tags, created_at, updated_at",

      // Practice sessions table
      // Indexed on: id (primary), collection_id, language, mode
      practiceSessions: "id, collection_id, language, mode, started_at",

      // User practice progress table
      // Indexed on: id (primary), language
      practiceProgress: "id, language, last_practice_date",

      // Learning settings table
      // Indexed on: id (primary), user_id
      learningSettings: "id, user_id, updated_at",
    });
  }
}

// Singleton database instance
export const db = new ChamLangDB();

/**
 * Generate a new UUID
 */
export const generateId = (): string => {
  return crypto.randomUUID();
};

/**
 * Get current ISO timestamp
 */
export const now = (): string => {
  return new Date().toISOString();
};
