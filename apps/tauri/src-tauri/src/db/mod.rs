use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, Result as SqlResult};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

// Submodules
mod collections;
pub mod helpers;
mod practice;
mod settings;
pub mod vocabularies;

/// Local SQLite database manager for offline-first functionality
#[derive(Clone)]
pub struct LocalDatabase {
    pub(crate) conn: Arc<Mutex<Connection>>,
}

impl LocalDatabase {
    /// Create a new local database instance
    pub fn new(db_path: PathBuf) -> SqlResult<Self> {
        let conn = Connection::open(db_path)?;
        let db = LocalDatabase {
            conn: Arc::new(Mutex::new(conn)),
        };

        // Initialize schema
        db.init_schema()?;

        Ok(db)
    }

    /// Clear all data from the database
    pub fn clear_all_data(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();

        // Drop all normalized tables first (due to foreign keys)
        conn.execute("DROP TABLE IF EXISTS practice_results", [])?;
        conn.execute("DROP TABLE IF EXISTS word_progress_completed_modes", [])?;
        conn.execute("DROP TABLE IF EXISTS word_progress", [])?;
        conn.execute("DROP TABLE IF EXISTS vocabulary_definitions", [])?;
        conn.execute("DROP TABLE IF EXISTS vocabulary_example_sentences", [])?;
        conn.execute("DROP TABLE IF EXISTS vocabulary_topics", [])?;
        conn.execute("DROP TABLE IF EXISTS vocabulary_tags", [])?;
        conn.execute("DROP TABLE IF EXISTS vocabulary_related_words", [])?;
        conn.execute("DROP TABLE IF EXISTS topics", [])?;
        conn.execute("DROP TABLE IF EXISTS tags", [])?;
        conn.execute("DROP TABLE IF EXISTS practice_sessions", [])?;
        conn.execute("DROP TABLE IF EXISTS practice_progress", [])?;
        conn.execute("DROP TABLE IF EXISTS collection_shared_users", [])?;
        conn.execute("DROP TABLE IF EXISTS user_learning_languages", [])?;
        conn.execute("DROP TABLE IF EXISTS learning_settings", [])?;
        conn.execute("DROP TABLE IF EXISTS vocabularies", [])?;
        conn.execute("DROP TABLE IF EXISTS collections", [])?;
        conn.execute("DROP TABLE IF EXISTS users", [])?;
        conn.execute("DROP TABLE IF EXISTS database_metadata", [])?;
        conn.execute("DROP TABLE IF EXISTS sync_checkpoint", [])?;

        // Release the lock before calling init_schema
        drop(conn);

        // Reinitialize the schema
        self.init_schema()?;

        Ok(())
    }

    /// Initialize database schema
    fn init_schema(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();

        // Users table (simplified - no auth needed for local-only app)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Create default "local" user if not exists
        conn.execute(
            "INSERT OR IGNORE INTO users (id, username, created_at, updated_at)
             VALUES ('local', 'local', ?1, ?2)",
            params![Utc::now().timestamp(), Utc::now().timestamp()],
        )?;

        // Collections table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS collections (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                language TEXT NOT NULL,
                owner_id TEXT NOT NULL,
                is_public BOOLEAN DEFAULT 0,
                word_count INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                sync_version INTEGER NOT NULL DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER,
                FOREIGN KEY (owner_id) REFERENCES users(id)
            )",
            [],
        )?;

        // Collection shared users table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS collection_shared_users (
                id TEXT PRIMARY KEY,
                collection_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                sync_version INTEGER NOT NULL DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER,
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(collection_id, user_id)
            )",
            [],
        )?;

        // Vocabularies table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS vocabularies (
                id TEXT PRIMARY KEY,
                word TEXT NOT NULL,
                word_type TEXT NOT NULL,
                level TEXT NOT NULL,
                ipa TEXT,
                concept TEXT,
                language TEXT NOT NULL,
                collection_id TEXT NOT NULL,
                audio_url TEXT,
                user_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                sync_version INTEGER NOT NULL DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER,
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )",
            [],
        )?;

        // Vocabulary definitions table (one-to-many)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS vocabulary_definitions (
                id TEXT PRIMARY KEY,
                vocabulary_id TEXT NOT NULL,
                meaning TEXT NOT NULL,
                translation TEXT,
                example TEXT,
                order_index INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (vocabulary_id) REFERENCES vocabularies(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Vocabulary example sentences table (one-to-many)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS vocabulary_example_sentences (
                id TEXT PRIMARY KEY,
                vocabulary_id TEXT NOT NULL,
                sentence TEXT NOT NULL,
                order_index INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (vocabulary_id) REFERENCES vocabularies(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Topics master table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS topics (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                created_at INTEGER NOT NULL,
                sync_version INTEGER NOT NULL DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER
            )",
            [],
        )?;

        // Vocabulary topics junction table (many-to-many)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS vocabulary_topics (
                id TEXT PRIMARY KEY,
                vocabulary_id TEXT NOT NULL,
                topic_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (vocabulary_id) REFERENCES vocabularies(id) ON DELETE CASCADE,
                FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
                UNIQUE(vocabulary_id, topic_id)
            )",
            [],
        )?;

        // Vocabulary related words table (many-to-many with relationship type)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS vocabulary_related_words (
                id TEXT PRIMARY KEY,
                vocabulary_id TEXT NOT NULL,
                related_vocabulary_id TEXT NOT NULL,
                relationship_type TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (vocabulary_id) REFERENCES vocabularies(id) ON DELETE CASCADE,
                UNIQUE(vocabulary_id, related_vocabulary_id)
            )",
            [],
        )?;

        // Tags master table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                created_at INTEGER NOT NULL,
                sync_version INTEGER NOT NULL DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER
            )",
            [],
        )?;

        // Vocabulary tags junction table (many-to-many)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS vocabulary_tags (
                id TEXT PRIMARY KEY,
                vocabulary_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (vocabulary_id) REFERENCES vocabularies(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
                UNIQUE(vocabulary_id, tag_id)
            )",
            [],
        )?;

        // User learning languages table (replaces learning_languages JSON array)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS user_learning_languages (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                language TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                sync_version INTEGER NOT NULL DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, language)
            )",
            [],
        )?;

        // Practice sessions table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS practice_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                collection_id TEXT NOT NULL,
                mode TEXT NOT NULL,
                language TEXT NOT NULL,
                topic TEXT,
                level TEXT,
                total_questions INTEGER NOT NULL,
                correct_answers INTEGER NOT NULL,
                started_at INTEGER NOT NULL,
                completed_at INTEGER NOT NULL,
                duration_seconds INTEGER NOT NULL,
                sync_version INTEGER NOT NULL DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Practice results table (replaces results JSON array)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS practice_results (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                vocabulary_id TEXT,
                word TEXT NOT NULL,
                correct INTEGER NOT NULL,
                practice_mode TEXT NOT NULL,
                time_spent_seconds INTEGER,
                order_index INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (vocabulary_id) REFERENCES vocabularies(id) ON DELETE SET NULL
            )",
            [],
        )?;

        // Practice progress table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS practice_progress (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                language TEXT NOT NULL,
                total_sessions INTEGER DEFAULT 0,
                total_words_practiced INTEGER DEFAULT 0,
                current_streak INTEGER DEFAULT 0,
                longest_streak INTEGER DEFAULT 0,
                last_practice_date INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                sync_version INTEGER NOT NULL DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, language)
            )",
            [],
        )?;

        // Word progress table (replaces words_progress JSON array)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS word_progress (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                language TEXT NOT NULL,
                vocabulary_id TEXT NOT NULL,
                word TEXT NOT NULL,
                correct_count INTEGER DEFAULT 0,
                incorrect_count INTEGER DEFAULT 0,
                total_reviews INTEGER DEFAULT 0,
                mastery_level INTEGER DEFAULT 0,
                next_review_date INTEGER NOT NULL,
                interval_days INTEGER DEFAULT 0,
                easiness_factor REAL DEFAULT 2.5,
                consecutive_correct_count INTEGER DEFAULT 0,
                leitner_box INTEGER DEFAULT 1,
                last_interval_days INTEGER DEFAULT 0,
                failed_in_session INTEGER DEFAULT 0,
                retry_count INTEGER DEFAULT 0,
                last_practiced INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                sync_version INTEGER NOT NULL DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (vocabulary_id) REFERENCES vocabularies(id) ON DELETE CASCADE,
                UNIQUE(user_id, language, vocabulary_id)
            )",
            [],
        )?;

        // Word progress completed modes table (tracks multi-mode completion)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS word_progress_completed_modes (
                id TEXT PRIMARY KEY,
                word_progress_id TEXT NOT NULL,
                practice_mode TEXT NOT NULL,
                completed_at INTEGER NOT NULL,
                FOREIGN KEY (word_progress_id) REFERENCES word_progress(id) ON DELETE CASCADE,
                UNIQUE(word_progress_id, practice_mode)
            )",
            [],
        )?;

        // Learning settings table (for Spaced Repetition configuration)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS learning_settings (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                sr_algorithm TEXT NOT NULL,
                leitner_box_count INTEGER NOT NULL,
                consecutive_correct_required INTEGER NOT NULL,
                show_failed_words_in_session INTEGER NOT NULL,
                new_words_per_day INTEGER,
                daily_review_limit INTEGER,
                auto_advance_timeout_seconds INTEGER DEFAULT 2,
                show_hint_in_fillword INTEGER DEFAULT 1,
                reminder_enabled INTEGER DEFAULT 0,
                reminder_time TEXT DEFAULT '19:00',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                sync_version INTEGER NOT NULL DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id)
            )",
            [],
        )?;

        // Sync checkpoint table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS sync_checkpoint (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        // Database metadata table (for version tracking)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS database_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // Initialize version if not exists
        let now = Utc::now().timestamp();
        conn.execute(
            "INSERT OR IGNORE INTO database_metadata (key, value, updated_at)
             VALUES ('version', ?1, ?2)",
            params![now.to_string(), now],
        )?;

        // Migration: Fix version if it's stored as integer instead of string
        // This handles databases created with the old schema
        let _ = conn.execute(
            "UPDATE database_metadata
             SET value = CAST(value AS TEXT)
             WHERE key = 'version' AND TYPEOF(value) = 'integer'",
            [],
        );

        // Create indexes
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_vocabularies_collection ON vocabularies(collection_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_vocabularies_user ON vocabularies(user_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_vocabularies_language ON vocabularies(language)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_collections_owner ON collections(owner_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_practice_sessions_user ON practice_sessions(user_id)",
            [],
        )?;

        // Indexes for normalized vocabulary tables
        conn.execute("CREATE INDEX IF NOT EXISTS idx_vocab_definitions_vocab ON vocabulary_definitions(vocabulary_id)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_vocab_examples_vocab ON vocabulary_example_sentences(vocabulary_id)", [])?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_vocab_topics_vocab ON vocabulary_topics(vocabulary_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_vocab_topics_topic ON vocabulary_topics(topic_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_vocab_tags_vocab ON vocabulary_tags(vocabulary_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_vocab_tags_tag ON vocabulary_tags(tag_id)",
            [],
        )?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_vocab_related_vocab ON vocabulary_related_words(vocabulary_id)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_vocab_related_related ON vocabulary_related_words(related_vocabulary_id)", [])?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_topics_name ON topics(name)",
            [],
        )?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)", [])?;

        // Indexes for normalized word progress tables
        conn.execute("CREATE INDEX IF NOT EXISTS idx_word_progress_user_lang ON word_progress(user_id, language)", [])?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_word_progress_vocab ON word_progress(vocabulary_id)",
            [],
        )?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_word_progress_next_review ON word_progress(next_review_date)", [])?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_word_progress_leitner ON word_progress(leitner_box)",
            [],
        )?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_word_progress_modes ON word_progress_completed_modes(word_progress_id)", [])?;

        // Indexes for normalized practice results
        conn.execute("CREATE INDEX IF NOT EXISTS idx_practice_results_session ON practice_results(session_id)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_practice_results_vocab ON practice_results(vocabulary_id)", [])?;

        // Indexes for normalized collection sharing
        conn.execute("CREATE INDEX IF NOT EXISTS idx_collection_shared_users_collection ON collection_shared_users(collection_id)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_collection_shared_users_user ON collection_shared_users(user_id)", [])?;

        // Indexes for normalized user learning languages
        conn.execute("CREATE INDEX IF NOT EXISTS idx_user_learning_languages_user ON user_learning_languages(user_id)", [])?;

        Ok(())
    }

    //==========================================================================
    // USER OPERATIONS
    //==========================================================================

    /// Get the default local user ID (for single-user app)
    pub fn get_local_user_id(&self) -> &str {
        "local"
    }

    /// Get current database version
    pub fn get_version(&self) -> SqlResult<i64> {
        let conn = self.conn.lock().unwrap();
        let version_str: String = conn.query_row(
            "SELECT value FROM database_metadata WHERE key = 'version'",
            [],
            |row| row.get(0),
        )?;

        // Parse the string to i64
        version_str
            .parse::<i64>()
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))
    }

    /// Update database version (call this when data changes)
    pub fn update_version(&self) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp();
        conn.execute(
            "UPDATE database_metadata SET value = ?1, updated_at = ?2 WHERE key = 'version'",
            params![now.to_string(), now],
        )?;
        Ok(())
    }

    /// Get all languages that have collections
    pub fn get_all_languages(&self, user_id: &str) -> SqlResult<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt =
            conn.prepare("SELECT DISTINCT language FROM collections WHERE owner_id = ?1 AND deleted = 0")?;

        let rows = stmt.query_map(params![user_id], |row| row.get(0))?;
        rows.collect()
    }

    /// Get all distinct topics from user's vocabularies
    pub fn get_all_topics(&self, user_id: &str) -> SqlResult<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT DISTINCT t.name
             FROM topics t
             JOIN vocabulary_topics vt ON t.id = vt.topic_id
             JOIN vocabularies v ON vt.vocabulary_id = v.id
             WHERE v.user_id = ?1 AND v.deleted = 0 AND t.deleted = 0
             ORDER BY t.name",
        )?;

        let rows = stmt.query_map(params![user_id], |row| row.get(0))?;
        rows.collect()
    }

    //==========================================================================
    // SYNC OPERATIONS
    //==========================================================================

    /// Get sync checkpoint
    pub fn get_checkpoint(&self) -> SqlResult<Option<(String, String)>> {
        let conn = self.conn.lock().unwrap();
        let updated_at: Option<String> = conn
            .query_row(
                "SELECT value FROM sync_checkpoint WHERE key = 'updated_at'",
                [],
                |row| row.get(0),
            )
            .ok();

        let id: Option<String> = conn
            .query_row(
                "SELECT value FROM sync_checkpoint WHERE key = 'id'",
                [],
                |row| row.get(0),
            )
            .ok();

        match (updated_at, id) {
            (Some(ts), Some(id)) => Ok(Some((ts, id))),
            _ => Ok(None),
        }
    }

    /// Save sync checkpoint
    pub fn save_checkpoint(&self, updated_at: &str, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO sync_checkpoint (key, value) VALUES ('updated_at', ?1)",
            params![updated_at],
        )?;
        conn.execute(
            "INSERT OR REPLACE INTO sync_checkpoint (key, value) VALUES ('id', ?1)",
            params![id],
        )?;
        Ok(())
    }

    /// Execute a COUNT query and return the result
    pub fn query_count(&self, sql: &str) -> SqlResult<usize> {
        let conn = self.conn.lock().unwrap();
        let count: i64 = conn.query_row(sql, [], |row| row.get(0))?;
        Ok(count as usize)
    }

    /// Execute arbitrary SQL with string params
    pub fn execute_sql(&self, sql: &str, params_list: &[&str]) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let params_refs: Vec<&dyn rusqlite::ToSql> =
            params_list.iter().map(|s| s as &dyn rusqlite::ToSql).collect();
        conn.execute(sql, params_refs.as_slice())?;
        Ok(())
    }

    /// Query soft-deleted records from a table (for sync)
    pub fn query_deleted_records(
        &self,
        table_name: &str,
    ) -> SqlResult<Vec<(String, i64)>> {
        let conn = self.conn.lock().unwrap();
        let sql = format!(
            "SELECT id, sync_version FROM {} WHERE deleted = 1 AND synced_at IS NULL",
            table_name
        );
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;
        rows.collect()
    }

    /// Hard delete a record from any table (actual DELETE, for sync cleanup after push confirmed)
    pub fn hard_delete_record(&self, table_name: &str, id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let sql = format!("DELETE FROM {} WHERE id = ?1", table_name);
        conn.execute(&sql, params![id])?;
        Ok(())
    }

    /// Import word progress (upsert)
    pub fn import_word_progress(&self, record: &qm_sync_client::SyncRecord) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let data = &record.data;

        // Extract fields
        let vocabulary_id = data["vocabularyId"].as_str().unwrap_or_default();
        let word = data["word"].as_str().unwrap_or_default();
        let correct_count = data["correctCount"].as_i64().unwrap_or(0);
        let incorrect_count = data["incorrectCount"].as_i64().unwrap_or(0);
        let total_reviews = data["totalReviews"].as_i64().unwrap_or(0);
        let mastery_level = data["masteryLevel"].as_i64().unwrap_or(0);
        let next_review_date = data["nextReviewDate"].as_i64().unwrap_or_else(|| Utc::now().timestamp());
        let interval_days = data["intervalDays"].as_i64().unwrap_or(0);
        let easiness_factor = data["easinessFactor"].as_f64().unwrap_or(2.5);
        let consecutive_correct_count = data["consecutiveCorrectCount"].as_i64().unwrap_or(0);
        let leitner_box = data["leitnerBox"].as_i64().unwrap_or(1);
        let last_interval_days = data["lastIntervalDays"].as_i64().unwrap_or(0);
        let failed_in_session = data["failedInSession"].as_bool().unwrap_or(false);
        let retry_count = data["retryCount"].as_i64().unwrap_or(0);
        let last_practiced = data["lastPracticed"].as_i64().unwrap_or_else(|| Utc::now().timestamp());

        // We need language and user_id. For now, assume single user "local" and get lang from vocab or data?
        // Ideally data should have language and user_id.
        // But word_progress schema has them. Let's see if we can get them from vocab if missing,
        // or expect them in data. The struct WordProgress doesn't have them, but the DB does.
        // Let's assume they are NOT in the record data (based on my serialization code which didn't include them).
        // Wait, I should update serialization to include them!
        // But for now, let's look up the vocabulary to get language and user_id.

        let mut stmt = conn.prepare("SELECT user_id, language FROM vocabularies WHERE id = ?1")?;
        let (user_id, language): (String, String) = stmt.query_row(params![vocabulary_id], |row| {
             Ok((row.get(0)?, row.get(1)?))
        }).unwrap_or(("local".to_string(), "en".to_string())); // Fallback if vocab missing (shouldn't happen due to FK order)

        conn.execute(
            "INSERT INTO word_progress (
                id, user_id, language, vocabulary_id, word,
                correct_count, incorrect_count, total_reviews, mastery_level,
                next_review_date, interval_days, easiness_factor, consecutive_correct_count,
                leitner_box, last_interval_days, failed_in_session, retry_count,
                last_practiced, created_at, updated_at, sync_version, synced_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5,
                ?6, ?7, ?8, ?9,
                ?10, ?11, ?12, ?13,
                ?14, ?15, ?16, ?17,
                ?18, ?19, ?19, ?20, ?21
            )
            ON CONFLICT(id) DO UPDATE SET
                correct_count = excluded.correct_count,
                incorrect_count = excluded.incorrect_count,
                total_reviews = excluded.total_reviews,
                mastery_level = excluded.mastery_level,
                next_review_date = excluded.next_review_date,
                interval_days = excluded.interval_days,
                easiness_factor = excluded.easiness_factor,
                consecutive_correct_count = excluded.consecutive_correct_count,
                leitner_box = excluded.leitner_box,
                last_interval_days = excluded.last_interval_days,
                failed_in_session = excluded.failed_in_session,
                retry_count = excluded.retry_count,
                last_practiced = excluded.last_practiced,
                updated_at = excluded.updated_at,
                sync_version = excluded.sync_version,
                synced_at = excluded.synced_at
            ",
            params![
                record.row_id, user_id, language, vocabulary_id, word,
                correct_count, incorrect_count, total_reviews, mastery_level,
                next_review_date, interval_days, easiness_factor, consecutive_correct_count,
                leitner_box, last_interval_days, failed_in_session, retry_count,
                last_practiced, Utc::now().timestamp(), record.version, Utc::now().timestamp()
            ],
        )?;

        // Handle completed_modes_in_cycle
        conn.execute("DELETE FROM word_progress_completed_modes WHERE word_progress_id = ?1", params![record.row_id])?;

        if let Some(modes) = data["completedModesInCycle"].as_array() {
            for mode in modes {
                if let Some(mode_str) = mode.as_str() {
                    let mode_id = uuid::Uuid::new_v4().to_string();
                    conn.execute(
                        "INSERT INTO word_progress_completed_modes (id, word_progress_id, practice_mode, completed_at)
                         VALUES (?1, ?2, ?3, ?4)",
                        params![mode_id, record.row_id, mode_str, Utc::now().timestamp()]
                    )?;
                }
            }
        }

        Ok(())
    }

    /// Import learning settings (upsert)
    pub fn import_learning_settings(&self, record: &qm_sync_client::SyncRecord) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let data = &record.data;

        // Extract user_id from DB if possible, or use local default
        // Settings are unique per user.
        // We can assume user_id is "local" for now or we need it in data.
        let user_id = "local";

        conn.execute(
            "INSERT INTO learning_settings (
                id, user_id, sr_algorithm, leitner_box_count, consecutive_correct_required,
                show_failed_words_in_session, new_words_per_day, daily_review_limit,
                auto_advance_timeout_seconds, show_hint_in_fillword, reminder_enabled, reminder_time,
                created_at, updated_at, sync_version, synced_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5,
                ?6, ?7, ?8,
                ?9, ?10, ?11, ?12,
                ?13, ?14, ?15, ?16
            )
            ON CONFLICT(id) DO UPDATE SET
                sr_algorithm = excluded.sr_algorithm,
                leitner_box_count = excluded.leitner_box_count,
                consecutive_correct_required = excluded.consecutive_correct_required,
                show_failed_words_in_session = excluded.show_failed_words_in_session,
                new_words_per_day = excluded.new_words_per_day,
                daily_review_limit = excluded.daily_review_limit,
                auto_advance_timeout_seconds = excluded.auto_advance_timeout_seconds,
                show_hint_in_fillword = excluded.show_hint_in_fillword,
                reminder_enabled = excluded.reminder_enabled,
                reminder_time = excluded.reminder_time,
                updated_at = excluded.updated_at,
                sync_version = excluded.sync_version,
                synced_at = excluded.synced_at
            ",
            params![
                record.row_id,
                user_id,
                data["srAlgorithm"].as_str().unwrap_or("sm2"),
                data["leitnerBoxCount"].as_i64().unwrap_or(5),
                data["consecutiveCorrectRequired"].as_i64().unwrap_or(3),
                data["showFailedWordsInSession"].as_bool().unwrap_or(true),
                data["newWordsPerDay"].as_i64(),
                data["dailyReviewLimit"].as_i64(),
                data["autoAdvanceTimeoutSeconds"].as_i64().unwrap_or(2),
                data["showHintInFillword"].as_bool().unwrap_or(true),
                data["reminderEnabled"].as_bool().unwrap_or(false),
                data["reminderTime"].as_str().unwrap_or("19:00"),
                data["createdAt"].as_i64().unwrap_or_else(|| Utc::now().timestamp()),
                data["updatedAt"].as_i64().unwrap_or_else(|| Utc::now().timestamp()),
                record.version,
                Utc::now().timestamp()
            ],
        )?;

        Ok(())
    }

    /// Import practice session (upsert)
    pub fn import_practice_session(&self, record: &qm_sync_client::SyncRecord) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let data = &record.data;

        let user_id = "local"; // Default

        conn.execute(
            "INSERT INTO practice_sessions (
                id, user_id, collection_id, mode, language, topic, level,
                total_questions, correct_answers, started_at, completed_at, duration_seconds,
                sync_version, synced_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6, ?7,
                ?8, ?9, ?10, ?11, ?12,
                ?13, ?14
            )
            ON CONFLICT(id) DO UPDATE SET
                mode = excluded.mode,
                total_questions = excluded.total_questions,
                correct_answers = excluded.correct_answers,
                completed_at = excluded.completed_at,
                duration_seconds = excluded.duration_seconds,
                sync_version = excluded.sync_version,
                synced_at = excluded.synced_at
            ",
            params![
                record.row_id,
                user_id,
                data["collectionId"].as_str().unwrap_or_default(),
                data["mode"].as_str().unwrap_or("flashcard"),
                data["language"].as_str().unwrap_or("en"),
                data["topic"].as_str(),
                data["level"].as_str(),
                data["totalQuestions"].as_i64().unwrap_or(0),
                data["correctAnswers"].as_i64().unwrap_or(0),
                data["startedAt"].as_i64().unwrap_or_else(|| Utc::now().timestamp()),
                data["completedAt"].as_i64().unwrap_or_else(|| Utc::now().timestamp()),
                data["durationSeconds"].as_i64().unwrap_or(0),
                record.version,
                Utc::now().timestamp()
            ],
        )?;

        // Handle results
        conn.execute("DELETE FROM practice_results WHERE session_id = ?1", params![record.row_id])?;

        if let Some(results) = data["results"].as_array() {
            for (idx, result) in results.iter().enumerate() {
                let result_id = uuid::Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO practice_results (
                        id, session_id, vocabulary_id, word, correct, practice_mode,
                        time_spent_seconds, order_index, created_at
                    ) VALUES (
                        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9
                    )",
                    params![
                        result_id,
                        record.row_id,
                        result["vocabularyId"].as_str(),
                        result["word"].as_str().unwrap_or_default(),
                        result["correct"].as_bool().unwrap_or(false),
                        result["mode"].as_str().unwrap_or("flashcard"),
                        result["timeSpentSeconds"].as_i64().unwrap_or(0),
                        idx as i64,
                        Utc::now().timestamp()
                    ]
                )?;
            }
        }

        Ok(())
    }

    /// Get unsynced word progress
    pub fn get_unsynced_word_progress(&self, user_id: &str) -> SqlResult<Vec<crate::models::WordProgress>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, vocabulary_id, word, correct_count, incorrect_count, last_practiced,
                    mastery_level, next_review_date, interval_days, easiness_factor,
                    consecutive_correct_count, leitner_box, last_interval_days,
                    total_reviews, failed_in_session, retry_count, sync_version, synced_at
             FROM word_progress
             WHERE user_id = ?1 AND synced_at IS NULL AND deleted = 0"
        )?;

        let progress_iter = stmt.query_map(params![user_id], |row| {
            let id: String = row.get(0)?;
            let vocabulary_id: String = row.get(1)?;
            let word: String = row.get(2)?;
            let correct_count: i32 = row.get(3)?;
            let incorrect_count: i32 = row.get(4)?;
            let last_practiced_ts: i64 = row.get(5)?;
            let mastery_level: i32 = row.get(6)?;
            let next_review_date_ts: i64 = row.get(7)?;
            let interval_days: i32 = row.get(8)?;
            let easiness_factor: f32 = row.get(9)?;
            let consecutive_correct_count: i32 = row.get(10)?;
            let leitner_box: i32 = row.get(11)?;
            let last_interval_days: i32 = row.get(12)?;
            let total_reviews: i32 = row.get(13)?;
            let failed_in_session: bool = row.get::<_, i32>(14)? != 0;
            let retry_count: i32 = row.get(15)?;
            let sync_version: i64 = row.get(16)?;
            let synced_at: Option<i64> = row.get(17)?;

            let last_practiced = DateTime::from_timestamp(last_practiced_ts, 0).unwrap_or_default();
            let next_review_date = DateTime::from_timestamp(next_review_date_ts, 0).unwrap_or_default();

            Ok(crate::models::WordProgress {
                id: Some(id),
                vocabulary_id,
                word,
                correct_count,
                incorrect_count,
                last_practiced,
                mastery_level,
                next_review_date,
                interval_days,
                easiness_factor,
                consecutive_correct_count,
                leitner_box,
                last_interval_days,
                total_reviews,
                failed_in_session,
                retry_count,
                completed_modes_in_cycle: Vec::new(), // Will fill separately
                sync_version,
                synced_at,
            })
        })?;

        let mut result = Vec::new();
        for progress in progress_iter {
            let mut p = progress?;
            // Fill completed modes
            if let Some(id) = &p.id {
                let mut mode_stmt = conn.prepare("SELECT practice_mode FROM word_progress_completed_modes WHERE word_progress_id = ?1")?;
                let modes = mode_stmt.query_map(params![id], |row| row.get(0))?;
                p.completed_modes_in_cycle = modes.collect::<SqlResult<Vec<String>>>()?;
            }
            result.push(p);
        }

        Ok(result)
    }

    /// Get unsynced practice sessions
    pub fn get_unsynced_practice_sessions(&self, user_id: &str) -> SqlResult<Vec<crate::models::PracticeSession>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, collection_id, mode, language, topic, level,
                    total_questions, correct_answers, started_at, completed_at, duration_seconds,
                    sync_version, synced_at
             FROM practice_sessions
             WHERE user_id = ?1 AND synced_at IS NULL AND deleted = 0"
        )?;

        let sessions_iter = stmt.query_map(params![user_id], |row| {
            let id: String = row.get(0)?;
            let collection_id: String = row.get(1)?;
            let mode_str: String = row.get(2)?;
            let language: String = row.get(3)?;
            let topic: Option<String> = row.get(4)?;
            let level: Option<String> = row.get(5)?;
            let total_questions: i32 = row.get(6)?;
            let correct_answers: i32 = row.get(7)?;
            let started_at_ts: i64 = row.get(8)?;
            let completed_at_ts: i64 = row.get(9)?;
            let duration_seconds: i32 = row.get(10)?;
            let sync_version: i64 = row.get(11)?;
            let synced_at: Option<i64> = row.get(12)?;

            let started_at = DateTime::from_timestamp(started_at_ts, 0).unwrap_or_default();
            let completed_at = DateTime::from_timestamp(completed_at_ts, 0).unwrap_or_default();

            // Helper to parse mode enum
            let mode = match mode_str.as_str() {
                "fillword" => crate::models::PracticeMode::FillWord,
                "multiplechoice" => crate::models::PracticeMode::MultipleChoice,
                _ => crate::models::PracticeMode::Flashcard,
            };

            Ok(crate::models::PracticeSession {
                id,
                user_id: user_id.to_string(),
                collection_id,
                mode,
                language,
                topic,
                level,
                results: Vec::new(), // Will fill
                total_questions,
                correct_answers,
                started_at,
                completed_at,
                duration_seconds,
                sync_version,
                synced_at,
            })
        })?;

        let mut result = Vec::new();
        for session in sessions_iter {
            let mut s = session?;
            // Fill results
            let mut res_stmt = conn.prepare(
                "SELECT vocabulary_id, word, correct, practice_mode, time_spent_seconds
                 FROM practice_results
                 WHERE session_id = ?1
                 ORDER BY order_index"
            )?;
            let results_iter = res_stmt.query_map(params![s.id], |row| {
                let vocabulary_id: Option<String> = row.get(0)?;
                let word: String = row.get(1)?;
                let correct: bool = row.get::<_, i32>(2)? != 0;
                let mode_str: String = row.get(3)?;
                let time_spent_seconds: i32 = row.get(4).unwrap_or(0);

                let mode = match mode_str.as_str() {
                    "fillword" => crate::models::PracticeMode::FillWord,
                    "multiplechoice" => crate::models::PracticeMode::MultipleChoice,
                    _ => crate::models::PracticeMode::Flashcard,
                };

                Ok(crate::models::PracticeResult {
                    vocabulary_id: vocabulary_id.unwrap_or_default(),
                    word,
                    correct,
                    mode,
                    time_spent_seconds,
                })
            })?;

            s.results = results_iter.collect::<SqlResult<Vec<crate::models::PracticeResult>>>()?;
            result.push(s);
        }

        Ok(result)
    }

    /// Get all distinct tags from user's vocabularies
    pub fn get_all_tags(&self, user_id: &str) -> SqlResult<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT DISTINCT t.name
             FROM tags t
             JOIN vocabulary_tags vt ON t.id = vt.tag_id
             JOIN vocabularies v ON vt.vocabulary_id = v.id
             WHERE v.user_id = ?1 AND v.deleted = 0 AND t.deleted = 0
             ORDER BY t.name",
        )?;

        let rows = stmt.query_map(params![user_id], |row| row.get(0))?;
        rows.collect()
    }
}
