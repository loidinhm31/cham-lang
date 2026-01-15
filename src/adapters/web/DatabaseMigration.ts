/**
 * Database Migration Utility
 * Handles SQLite backup to IndexedDB migration for web platform
 */

import { db, generateId, now } from "./db";
import type { Collection } from "@/types/collection";
import type { Vocabulary } from "@/types/vocabulary";
import type { PracticeSession, UserPracticeProgress } from "@/types/practice";
import type { LearningSettings } from "@/types/settings";

/**
 * SQLite Backup Data Structure
 * This matches the JSON format exported by the Tauri app via Google Drive
 */
export interface SQLiteBackupData {
  version: string;
  exported_at: string;
  collections: Collection[];
  vocabularies: Vocabulary[];
  practice_sessions: PracticeSession[];
  practice_progress: UserPracticeProgress[];
  learning_settings: LearningSettings | null;
}

/**
 * Migration Result
 */
export interface MigrationResult {
  success: boolean;
  imported: {
    collections: number;
    vocabularies: number;
    practiceSessions: number;
    practiceProgress: number;
    learningSettings: boolean;
  };
  errors: string[];
}

/**
 * Database Migration Class
 * Handles importing SQLite backup data to IndexedDB
 */
export class DatabaseMigration {
  /**
   * Import data from a SQLite backup (JSON export from Google Drive)
   * into the web's IndexedDB database
   */
  async importFromSQLiteBackup(
    backupJson: SQLiteBackupData,
    clearExisting: boolean = true,
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      imported: {
        collections: 0,
        vocabularies: 0,
        practiceSessions: 0,
        practiceProgress: 0,
        learningSettings: false,
      },
      errors: [],
    };

    try {
      // Clear existing data if requested
      if (clearExisting) {
        await this.clearDatabase();
      }

      const timestamp = now();

      // Import collections
      for (const collection of backupJson.collections || []) {
        try {
          await db.collections.add({
            id: collection.id || generateId(),
            name: collection.name,
            description: collection.description,
            language: collection.language,
            owner_id: collection.owner_id || "local-user",
            shared_with: collection.shared_with || [],
            is_public: collection.is_public,
            word_count: collection.word_count || 0,
            created_at: collection.created_at || timestamp,
            updated_at: collection.updated_at || timestamp,
          });
          result.imported.collections++;
        } catch (error) {
          result.errors.push(
            `Failed to import collection "${collection.name}": ${error}`,
          );
        }
      }

      // Import vocabularies
      for (const vocab of backupJson.vocabularies || []) {
        try {
          await db.vocabularies.add({
            id: vocab.id || generateId(),
            word: vocab.word,
            word_type: vocab.word_type,
            level: vocab.level,
            ipa: vocab.ipa,
            audio_url: vocab.audio_url,
            concept: vocab.concept,
            definitions: vocab.definitions || [],
            example_sentences: vocab.example_sentences || [],
            topics: vocab.topics || [],
            tags: vocab.tags || [],
            related_words: vocab.related_words || [],
            language: vocab.language,
            collection_id: vocab.collection_id,
            user_id: vocab.user_id || "local-user",
            created_at: vocab.created_at || timestamp,
            updated_at: vocab.updated_at || timestamp,
          });
          result.imported.vocabularies++;
        } catch (error) {
          result.errors.push(
            `Failed to import vocabulary "${vocab.word}": ${error}`,
          );
        }
      }

      // Import practice sessions
      for (const session of backupJson.practice_sessions || []) {
        try {
          await db.practiceSessions.add({
            id: session.id || generateId(),
            collection_id: session.collection_id,
            mode: session.mode,
            language: session.language,
            topic: session.topic,
            level: session.level,
            results: session.results || [],
            total_questions: session.total_questions,
            correct_answers: session.correct_answers,
            started_at: session.started_at,
            completed_at: session.completed_at,
            duration_seconds: session.duration_seconds,
          });
          result.imported.practiceSessions++;
        } catch (error) {
          result.errors.push(`Failed to import practice session: ${error}`);
        }
      }

      // Import practice progress
      for (const progress of backupJson.practice_progress || []) {
        try {
          await db.practiceProgress.add({
            id: progress.id || generateId(),
            language: progress.language,
            words_progress: progress.words_progress || [],
            total_sessions: progress.total_sessions,
            total_words_practiced: progress.total_words_practiced,
            current_streak: progress.current_streak,
            longest_streak: progress.longest_streak,
            last_practice_date: progress.last_practice_date,
            created_at: progress.created_at || timestamp,
            updated_at: progress.updated_at || timestamp,
          });
          result.imported.practiceProgress++;
        } catch (error) {
          result.errors.push(`Failed to import practice progress: ${error}`);
        }
      }

      // Import learning settings
      if (backupJson.learning_settings) {
        try {
          const settings = backupJson.learning_settings;
          await db.learningSettings.add({
            id: settings.id || generateId(),
            user_id: settings.user_id || "local-user",
            sr_algorithm: settings.sr_algorithm,
            leitner_box_count: settings.leitner_box_count,
            consecutive_correct_required: settings.consecutive_correct_required,
            show_failed_words_in_session: settings.show_failed_words_in_session,
            new_words_per_day: settings.new_words_per_day,
            daily_review_limit: settings.daily_review_limit,
            auto_advance_timeout_seconds: settings.auto_advance_timeout_seconds,
            show_hint_in_fillword: settings.show_hint_in_fillword,
            reminder_enabled: settings.reminder_enabled,
            reminder_time: settings.reminder_time,
            created_at: settings.created_at || timestamp,
            updated_at: settings.updated_at || timestamp,
          });
          result.imported.learningSettings = true;
        } catch (error) {
          result.errors.push(`Failed to import learning settings: ${error}`);
        }
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.errors.push(`Migration failed: ${error}`);
    }

    return result;
  }

  /**
   * Export current IndexedDB data to JSON format
   * compatible with Tauri app import
   */
  async exportToJSON(): Promise<SQLiteBackupData> {
    const collections = await db.collections.toArray();
    const vocabularies = await db.vocabularies.toArray();
    const practice_sessions = await db.practiceSessions.toArray();
    const practice_progress = await db.practiceProgress.toArray();
    const learning_settings = await db.learningSettings.toCollection().first();

    return {
      version: "1.0",
      exported_at: now(),
      collections,
      vocabularies,
      practice_sessions,
      practice_progress,
      learning_settings: learning_settings || null,
    };
  }

  /**
   * Clear all data from IndexedDB
   */
  async clearDatabase(): Promise<void> {
    await db.collections.clear();
    await db.vocabularies.clear();
    await db.practiceSessions.clear();
    await db.practiceProgress.clear();
    await db.learningSettings.clear();
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    collections: number;
    vocabularies: number;
    practiceSessions: number;
    practiceProgress: number;
    hasSettings: boolean;
  }> {
    return {
      collections: await db.collections.count(),
      vocabularies: await db.vocabularies.count(),
      practiceSessions: await db.practiceSessions.count(),
      practiceProgress: await db.practiceProgress.count(),
      hasSettings: (await db.learningSettings.count()) > 0,
    };
  }

  /**
   * Parse backup file from Google Drive or local file
   */
  parseBackupFile(fileContent: string): SQLiteBackupData {
    try {
      const data = JSON.parse(fileContent);

      // Validate required fields
      if (!data.version || !data.exported_at) {
        throw new Error(
          "Invalid backup format: missing version or exported_at",
        );
      }

      return data as SQLiteBackupData;
    } catch (error) {
      throw new Error(`Failed to parse backup file: ${error}`);
    }
  }

  /**
   * Download backup as JSON file
   */
  async downloadBackup(): Promise<void> {
    const data = await this.exportToJSON();
    const jsonString = JSON.stringify(data, null, 2);

    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chamlang_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Import from file input element
   */
  async importFromFile(file: File): Promise<MigrationResult> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const backupData = this.parseBackupFile(content);
          const result = await this.importFromSQLiteBackup(backupData, true);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}

// Singleton instance
export const databaseMigration = new DatabaseMigration();
