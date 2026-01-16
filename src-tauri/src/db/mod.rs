use chrono::Utc;
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
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )",
            [],
        )?;

        // Migration: Add audio_url column to vocabularies table if it doesn't exist
        conn.execute("ALTER TABLE vocabularies ADD COLUMN audio_url TEXT", [])
            .ok(); // Ignore error if column already exists

        // Migration: Add reminder settings columns to learning_settings table
        conn.execute(
            "ALTER TABLE learning_settings ADD COLUMN reminder_enabled INTEGER DEFAULT 0",
            [],
        )
        .ok(); // Ignore error if column already exists

        conn.execute(
            "ALTER TABLE learning_settings ADD COLUMN reminder_time TEXT DEFAULT '19:00'",
            [],
        )
        .ok(); // Ignore error if column already exists

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
                created_at INTEGER NOT NULL
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
                created_at INTEGER NOT NULL
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
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id)
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
            conn.prepare("SELECT DISTINCT language FROM collections WHERE owner_id = ?1")?;

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
             WHERE v.user_id = ?1
             ORDER BY t.name",
        )?;

        let rows = stmt.query_map(params![user_id], |row| row.get(0))?;
        rows.collect()
    }

    /// Get all distinct tags from user's vocabularies
    pub fn get_all_tags(&self, user_id: &str) -> SqlResult<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT DISTINCT t.name
             FROM tags t
             JOIN vocabulary_tags vt ON t.id = vt.tag_id
             JOIN vocabularies v ON vt.vocabulary_id = v.id
             WHERE v.user_id = ?1
             ORDER BY t.name",
        )?;

        let rows = stmt.query_map(params![user_id], |row| row.get(0))?;
        rows.collect()
    }
}
