/**
 * BrowserSyncService
 *
 * Service for syncing data between the browser (IndexedDB) and the desktop app (SQLite)
 * when the web app is opened from the desktop via the "Open in Browser" feature.
 *
 * This service communicates with the embedded web server's REST API endpoints:
 * - GET /api/export?token=... - Export all SQLite data
 * - POST /api/import?token=... - Import data to SQLite
 *
 * Note: There are schema differences between the SQLite backend (simpler) and
 * the frontend TypeScript types (richer). This service handles the conversion.
 */

import { getSessionToken, WEB_APP_PORT } from "@/utils/platform";
import {
  db,
  type CollectionRecord,
  type VocabularyRecord,
} from "@/adapters/web/db";

// Session storage keys for tracking sync times
const LAST_LOAD_TIME_KEY = "browser_sync_last_load_time";
const LAST_SYNC_TIME_KEY = "browser_sync_last_sync_time";

interface SyncResult {
  success: boolean;
  message: string;
}

/**
 * SQLite backup data format - matches the Rust web_server.rs SQLiteBackupData struct
 * This is the backend format which is simpler than frontend TypeScript types
 */
interface SQLiteBackupData {
  version: string;
  exported_at: string;
  collections: SQLiteCollection[];
  vocabularies: SQLiteVocabulary[];
  practice_sessions: unknown[];
  practice_progress: unknown[];
  learning_settings?: SQLiteLearningSettings;
}

// Backend collection format (from SQLite)
interface SQLiteCollection {
  id: string;
  name: string;
  description: string;
  language: string;
  user_id: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  version: number;
}

// Backend vocabulary format (from SQLite) - simpler than frontend
interface SQLiteVocabulary {
  id: string;
  collection_id: string;
  word: string;
  meaning: string;
  example?: string;
  pronunciation?: string;
  audio_url?: string;
  image_url?: string;
  tags?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  version: number;
}

// Backend learning settings format
interface SQLiteLearningSettings {
  id: number;
  user_id: number;
  sr_algorithm: string;
  leitner_box_count: number;
  consecutive_correct_required: number;
  show_failed_words_in_session: boolean;
  new_words_per_day: number;
  daily_review_limit: number;
  auto_advance_timeout_seconds: number;
  show_hint_in_fillword: boolean;
  reminder_enabled?: boolean;
  reminder_time?: string;
}

class BrowserSyncService {
  private baseUrl = `http://localhost:${WEB_APP_PORT}`;

  /**
   * Parse tags from various formats (string, array, or undefined)
   */
  private parseTags(tags: string | string[] | undefined | null): string[] {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === "string") {
      return tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
    return [];
  }

  /**
   * Get the current session token
   */
  getToken(): string | null {
    return getSessionToken();
  }

  /**
   * Get the last time data was loaded from desktop
   */
  getLastLoadTime(): Date | null {
    const stored = sessionStorage.getItem(LAST_LOAD_TIME_KEY);
    return stored ? new Date(stored) : null;
  }

  /**
   * Get the last time data was synced to desktop
   */
  getLastSyncTime(): Date | null {
    const stored = sessionStorage.getItem(LAST_SYNC_TIME_KEY);
    return stored ? new Date(stored) : null;
  }

  /**
   * Load data from the desktop SQLite database into browser IndexedDB
   */
  async loadFromDesktop(): Promise<SyncResult> {
    const token = this.getToken();
    if (!token) {
      return {
        success: false,
        message: "No session token available. Please open from desktop app.",
      };
    }

    try {
      console.log("📥 Loading data from desktop SQLite...");

      // Call the export API
      const response = await fetch(
        `${this.baseUrl}/api/export?token=${encodeURIComponent(token)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Export API error:", response.status, errorText);
        return {
          success: false,
          message: `Failed to export from desktop: ${response.status} ${errorText}`,
        };
      }

      const backupData: SQLiteBackupData = await response.json();
      console.log("📦 Received data:", {
        collections: backupData.collections?.length || 0,
        vocabularies: backupData.vocabularies?.length || 0,
      });

      // Clear existing IndexedDB data and import
      await this.importToIndexedDB(backupData);

      // Store load time
      sessionStorage.setItem(LAST_LOAD_TIME_KEY, new Date().toISOString());

      return {
        success: true,
        message: `Loaded ${backupData.collections?.length || 0} collections and ${backupData.vocabularies?.length || 0} vocabularies from desktop.`,
      };
    } catch (error) {
      console.error("Load from desktop failed:", error);
      return {
        success: false,
        message: `Load failed: ${error}`,
      };
    }
  }

  /**
   * Sync data from browser IndexedDB to desktop SQLite
   */
  async syncToDesktop(): Promise<SyncResult> {
    const token = this.getToken();
    if (!token) {
      return {
        success: false,
        message: "No session token available. Please open from desktop app.",
      };
    }

    try {
      console.log("📤 Syncing data to desktop SQLite...");

      // Export from IndexedDB
      const backupData = await this.exportFromIndexedDB();
      console.log("📦 Exporting data:", {
        collections: backupData.collections?.length || 0,
        vocabularies: backupData.vocabularies?.length || 0,
      });

      // Call the import API
      const response = await fetch(
        `${this.baseUrl}/api/import?token=${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(backupData),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Import API error:", response.status, errorText);
        return {
          success: false,
          message: `Failed to import to desktop: ${response.status} ${errorText}`,
        };
      }

      const result = await response.json();
      console.log("📦 Import result:", result);

      // Store sync time
      sessionStorage.setItem(LAST_SYNC_TIME_KEY, new Date().toISOString());

      if (result.success && result.data) {
        return {
          success: true,
          message: `Synced ${result.data.collections || 0} collections and ${result.data.vocabularies || 0} vocabularies to desktop.`,
        };
      }

      return {
        success: true,
        message: "Data synced to desktop successfully.",
      };
    } catch (error) {
      console.error("Sync to desktop failed:", error);
      return {
        success: false,
        message: `Sync failed: ${error}`,
      };
    }
  }

  /**
   * Convert SQLite collection to frontend CollectionRecord format
   */
  private sqliteToCollection(c: SQLiteCollection): CollectionRecord {
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      language: c.language,
      owner_id: String(c.user_id),
      shared_with: [],
      is_public: c.is_public,
      word_count: 0, // Will be calculated
      created_at: c.created_at,
      updated_at: c.updated_at,
    };
  }

  /**
   * Convert SQLite vocabulary to frontend VocabularyRecord format
   */
  private sqliteToVocabulary(v: SQLiteVocabulary): VocabularyRecord {
    return {
      id: v.id,
      word: v.word,
      word_type: "n/a",
      level: "",
      ipa: v.pronunciation || "",
      audio_url: v.audio_url || "",
      concept: "",
      definitions: v.meaning
        ? [{ meaning: v.meaning, translation: "", example: v.example || "" }]
        : [],
      example_sentences: v.example ? [v.example] : [],
      topics: [],
      tags: this.parseTags(v.tags),
      related_words: [],
      created_at: v.created_at,
      updated_at: v.updated_at,
      language: "", // Will be inferred from collection
      collection_id: v.collection_id,
      user_id: "",
    };
  }

  /**
   * Convert frontend CollectionRecord to SQLite format
   */
  private collectionToSQLite(c: CollectionRecord): SQLiteCollection {
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      language: c.language,
      user_id: parseInt(c.owner_id, 10) || 0,
      is_public: c.is_public,
      created_at: c.created_at,
      updated_at: c.updated_at,
      is_deleted: 0,
      version: 1,
    };
  }

  /**
   * Convert frontend VocabularyRecord to SQLite format
   */
  private vocabularyToSQLite(v: VocabularyRecord): SQLiteVocabulary {
    const firstDef = v.definitions?.[0];
    return {
      id: v.id,
      collection_id: v.collection_id,
      word: v.word,
      meaning: firstDef?.meaning || firstDef?.translation || "",
      example: v.example_sentences?.[0] || firstDef?.example || "",
      pronunciation: v.ipa || "",
      audio_url: v.audio_url || "",
      image_url: "",
      tags: v.tags?.join(", ") || "",
      notes: "",
      created_at: v.created_at,
      updated_at: v.updated_at,
      is_deleted: 0,
      version: 1,
    };
  }

  /**
   * Import backup data into IndexedDB
   */
  private async importToIndexedDB(backupData: SQLiteBackupData): Promise<void> {
    // Clear existing data
    await db.collections.clear();
    await db.vocabularies.clear();

    // Import collections
    if (backupData.collections && backupData.collections.length > 0) {
      const collections = backupData.collections.map((c) =>
        this.sqliteToCollection(c),
      );
      await db.collections.bulkPut(collections);
    }

    // Import vocabularies
    if (backupData.vocabularies && backupData.vocabularies.length > 0) {
      const vocabularies = backupData.vocabularies.map((v) =>
        this.sqliteToVocabulary(v),
      );
      await db.vocabularies.bulkPut(vocabularies);
    }

    // Import learning settings if available
    if (backupData.learning_settings) {
      const settings = backupData.learning_settings;
      await db.learningSettings.put({
        id: "1",
        user_id: String(settings.user_id),
        sr_algorithm: settings.sr_algorithm as "sm2" | "modifiedsm2" | "simple",
        leitner_box_count: settings.leitner_box_count as 3 | 5 | 7,
        consecutive_correct_required: settings.consecutive_correct_required,
        show_failed_words_in_session: settings.show_failed_words_in_session,
        new_words_per_day: settings.new_words_per_day,
        daily_review_limit: settings.daily_review_limit,
        auto_advance_timeout_seconds: settings.auto_advance_timeout_seconds,
        show_hint_in_fillword: settings.show_hint_in_fillword,
        reminder_enabled: settings.reminder_enabled || false,
        reminder_time: settings.reminder_time || "19:00",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    console.log("✅ IndexedDB import complete");
  }

  /**
   * Export data from IndexedDB to SQLite format
   */
  private async exportFromIndexedDB(): Promise<SQLiteBackupData> {
    const collections = await db.collections.toArray();
    const vocabularies = await db.vocabularies.toArray();
    const learningSettings = await db.learningSettings.get("1");

    return {
      version: "1.0",
      exported_at: new Date().toISOString(),
      collections: collections.map((c) => this.collectionToSQLite(c)),
      vocabularies: vocabularies.map((v) => this.vocabularyToSQLite(v)),
      practice_sessions: [],
      practice_progress: [],
      learning_settings: learningSettings
        ? {
            id: 1,
            user_id: parseInt(learningSettings.user_id, 10) || 0,
            sr_algorithm: learningSettings.sr_algorithm,
            leitner_box_count: learningSettings.leitner_box_count,
            consecutive_correct_required:
              learningSettings.consecutive_correct_required,
            show_failed_words_in_session:
              learningSettings.show_failed_words_in_session,
            new_words_per_day: learningSettings.new_words_per_day || 20,
            daily_review_limit: learningSettings.daily_review_limit || 100,
            auto_advance_timeout_seconds:
              learningSettings.auto_advance_timeout_seconds,
            show_hint_in_fillword: learningSettings.show_hint_in_fillword,
            reminder_enabled: learningSettings.reminder_enabled || false,
            reminder_time: learningSettings.reminder_time || "19:00",
          }
        : undefined,
    };
  }
}

// Export singleton instance
export const browserSyncService = new BrowserSyncService();
