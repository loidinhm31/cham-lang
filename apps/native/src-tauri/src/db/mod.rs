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

/// Safely recreate a table with foreign keys disabled to prevent cascade deletes.
/// When `PRAGMA foreign_keys = ON`, `DROP TABLE` performs an implicit DELETE that
/// triggers ON DELETE CASCADE, destroying data in all referencing tables.
fn safe_migrate_table(conn: &Connection, migration_sql: &str) -> SqlResult<()> {
    let full_sql = format!(
        "PRAGMA foreign_keys = OFF;\n\
         BEGIN TRANSACTION;\n\
         {}\n\
         COMMIT;\n\
         PRAGMA foreign_keys = ON;",
        migration_sql
    );
    conn.execute_batch(&full_sql)
}

/// Check if a table has a specific column
fn table_has_column(conn: &Connection, table: &str, column: &str) -> bool {
    conn.prepare(&format!("PRAGMA table_info({})", table))
        .and_then(|mut stmt| {
            let mut rows = stmt.query([])?;
            while let Some(row) = rows.next()? {
                let col_name: String = row.get(1)?;
                if col_name == column {
                    return Ok(true);
                }
            }
            Ok(false)
        })
        .unwrap_or(false)
}

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

        // Collections table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS collections (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                language TEXT NOT NULL,
                shared_by TEXT,
                is_public BOOLEAN DEFAULT 0,
                word_count INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                sync_version INTEGER NOT NULL DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER
            )",
            [],
        )?;

        // Collection shared users table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS collection_shared_users (
                id TEXT PRIMARY KEY,
                collection_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                permission TEXT NOT NULL DEFAULT 'viewer',
                created_at INTEGER NOT NULL,
                sync_version INTEGER NOT NULL DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER,
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
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
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                sync_version INTEGER NOT NULL DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER,
                FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
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
                language TEXT NOT NULL UNIQUE,
                created_at INTEGER NOT NULL,
                sync_version INTEGER NOT NULL DEFAULT 1,
                synced_at INTEGER,
                deleted INTEGER DEFAULT 0,
                deleted_at INTEGER
            )",
            [],
        )?;

        // Practice sessions table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS practice_sessions (
                id TEXT PRIMARY KEY,
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
                language TEXT NOT NULL UNIQUE,
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
                deleted_at INTEGER
            )",
            [],
        )?;

        // Word progress table (replaces words_progress JSON array)
        conn.execute(
            "CREATE TABLE IF NOT EXISTS word_progress (
                id TEXT PRIMARY KEY,
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
                FOREIGN KEY (vocabulary_id) REFERENCES vocabularies(id) ON DELETE CASCADE,
                UNIQUE(language, vocabulary_id)
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
                deleted_at INTEGER
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

        // Migration: Add shared_by column to collections if it doesn't exist
        if !table_has_column(&conn, "collections", "shared_by") {
            println!("Migration: Adding shared_by column to collections...");
            conn.execute("ALTER TABLE collections ADD COLUMN shared_by TEXT", [])?;
        }

        // =====================================================================
        // MIGRATION: Add missing columns to existing tables from old schemas.
        // CREATE TABLE IF NOT EXISTS doesn't add new columns to existing tables,
        // so we must ALTER TABLE for any columns added after initial creation.
        // =====================================================================

        // collection_shared_users: add permission column
        if !table_has_column(&conn, "collection_shared_users", "permission") {
            println!("Migration: Adding permission column to collection_shared_users...");
            conn.execute(
                "ALTER TABLE collection_shared_users ADD COLUMN permission TEXT NOT NULL DEFAULT 'viewer'",
                [],
            )?;
        }

        // Add sync columns to tables that predate the sync feature
        let tables_needing_sync = ["collection_shared_users", "topics", "tags"];
        for table in &tables_needing_sync {
            if !table_has_column(&conn, table, "sync_version") {
                println!("Migration: Adding sync columns to {}...", table);
                conn.execute(
                    &format!("ALTER TABLE {} ADD COLUMN sync_version INTEGER NOT NULL DEFAULT 1", table),
                    [],
                )?;
                conn.execute(
                    &format!("ALTER TABLE {} ADD COLUMN synced_at INTEGER", table),
                    [],
                )?;
            }
            if !table_has_column(&conn, table, "deleted") {
                conn.execute(
                    &format!("ALTER TABLE {} ADD COLUMN deleted INTEGER DEFAULT 0", table),
                    [],
                )?;
                conn.execute(
                    &format!("ALTER TABLE {} ADD COLUMN deleted_at INTEGER", table),
                    [],
                )?;
            }
        }

        // Create indexes
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_vocabularies_collection ON vocabularies(collection_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_vocabularies_language ON vocabularies(language)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_collections_shared_by ON collections(shared_by)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_practice_sessions_collection ON practice_sessions(collection_id)",
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
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_word_progress_lang ON word_progress(language)",
            [],
        )?;
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

        // // TODO: remove future
        // // =====================================================================
        // // MIGRATION: Remove users table and user_id columns
        // // Uses safe_migrate_table to prevent CASCADE deletes from DROP TABLE.
        // // When PRAGMA foreign_keys = ON, DROP TABLE does an implicit DELETE
        // // that triggers ON DELETE CASCADE, destroying child table data.
        // //
        // // IMPORTANT: Child tables with FK references to `users` must be migrated
        // // BEFORE dropping the users table, otherwise DROP TABLE users fails with
        // // SQLITE_CONSTRAINT_FOREIGNKEY when foreign keys are enabled.
        // // =====================================================================
        //
        // // Remove user_id column from vocabularies if it exists
        // if table_has_column(&conn, "vocabularies", "user_id") {
        //     println!("Migration: Removing user_id column from vocabularies...");
        //     // Old schema may not have sync columns yet
        //     let sync_cols = if table_has_column(&conn, "vocabularies", "sync_version") {
        //         "sync_version, synced_at, deleted, deleted_at"
        //     } else {
        //         "1, NULL, 0, NULL"
        //     };
        //     safe_migrate_table(
        //         &conn,
        //         &format!(
        //             "CREATE TABLE vocabularies_new (
        //                 id TEXT PRIMARY KEY,
        //                 word TEXT NOT NULL,
        //                 word_type TEXT NOT NULL,
        //                 level TEXT NOT NULL,
        //                 ipa TEXT,
        //                 concept TEXT,
        //                 language TEXT NOT NULL,
        //                 collection_id TEXT NOT NULL,
        //                 audio_url TEXT,
        //                 created_at INTEGER NOT NULL,
        //                 updated_at INTEGER NOT NULL,
        //                 sync_version INTEGER NOT NULL DEFAULT 1,
        //                 synced_at INTEGER,
        //                 deleted INTEGER DEFAULT 0,
        //                 deleted_at INTEGER,
        //                 FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
        //             );
        //             INSERT INTO vocabularies_new SELECT
        //                 id, word, word_type, level, ipa, concept, language, collection_id,
        //                 audio_url, created_at, updated_at, {sync_cols}
        //             FROM vocabularies;
        //             DROP TABLE vocabularies;
        //             ALTER TABLE vocabularies_new RENAME TO vocabularies;
        //             CREATE INDEX IF NOT EXISTS idx_vocabularies_collection ON vocabularies(collection_id);
        //             CREATE INDEX IF NOT EXISTS idx_vocabularies_language ON vocabularies(language);"
        //         ),
        //     )?;
        // }
        //
        // // Remove user_id column from word_progress if it exists
        // if table_has_column(&conn, "word_progress", "user_id") {
        //     println!("Migration: Removing user_id column from word_progress...");
        //     let sync_cols = if table_has_column(&conn, "word_progress", "sync_version") {
        //         "sync_version, synced_at, deleted, deleted_at"
        //     } else {
        //         "1, NULL, 0, NULL"
        //     };
        //     safe_migrate_table(
        //         &conn,
        //         &format!(
        //             "CREATE TABLE word_progress_new (
        //                 id TEXT PRIMARY KEY,
        //                 language TEXT NOT NULL,
        //                 vocabulary_id TEXT NOT NULL,
        //                 word TEXT NOT NULL,
        //                 correct_count INTEGER DEFAULT 0,
        //                 incorrect_count INTEGER DEFAULT 0,
        //                 total_reviews INTEGER DEFAULT 0,
        //                 mastery_level INTEGER DEFAULT 0,
        //                 next_review_date INTEGER NOT NULL,
        //                 interval_days INTEGER DEFAULT 1,
        //                 easiness_factor REAL DEFAULT 2.5,
        //                 consecutive_correct_count INTEGER DEFAULT 0,
        //                 leitner_box INTEGER DEFAULT 1,
        //                 last_interval_days INTEGER DEFAULT 0,
        //                 failed_in_session INTEGER DEFAULT 0,
        //                 retry_count INTEGER DEFAULT 0,
        //                 last_practiced INTEGER NOT NULL,
        //                 created_at INTEGER NOT NULL,
        //                 updated_at INTEGER NOT NULL,
        //                 sync_version INTEGER NOT NULL DEFAULT 1,
        //                 synced_at INTEGER,
        //                 deleted INTEGER DEFAULT 0,
        //                 deleted_at INTEGER,
        //                 FOREIGN KEY (vocabulary_id) REFERENCES vocabularies(id) ON DELETE CASCADE,
        //                 UNIQUE(language, vocabulary_id)
        //             );
        //             INSERT INTO word_progress_new SELECT
        //                 id, language, vocabulary_id, word, correct_count, incorrect_count,
        //                 total_reviews, mastery_level, next_review_date, interval_days,
        //                 easiness_factor, consecutive_correct_count, leitner_box,
        //                 last_interval_days, failed_in_session, retry_count,
        //                 last_practiced, last_practiced, last_practiced,
        //                 {sync_cols}
        //             FROM word_progress;
        //             DROP TABLE word_progress;
        //             ALTER TABLE word_progress_new RENAME TO word_progress;
        //             CREATE INDEX IF NOT EXISTS idx_word_progress_lang ON word_progress(language);
        //             CREATE INDEX IF NOT EXISTS idx_word_progress_vocab ON word_progress(vocabulary_id);
        //             CREATE INDEX IF NOT EXISTS idx_word_progress_next_review ON word_progress(next_review_date);
        //             CREATE INDEX IF NOT EXISTS idx_word_progress_leitner ON word_progress(leitner_box);"
        //         ),
        //     )?;
        // }
        //
        // // Remove user_id column from learning_settings if it exists
        // if table_has_column(&conn, "learning_settings", "user_id") {
        //     println!("Migration: Removing user_id column from learning_settings...");
        //     let sync_cols = if table_has_column(&conn, "learning_settings", "sync_version") {
        //         "sync_version, synced_at, deleted, deleted_at"
        //     } else {
        //         "1, NULL, 0, NULL"
        //     };
        //     safe_migrate_table(
        //         &conn,
        //         &format!(
        //             "CREATE TABLE learning_settings_new (
        //                 id TEXT PRIMARY KEY,
        //                 sr_algorithm TEXT NOT NULL,
        //                 leitner_box_count INTEGER NOT NULL,
        //                 consecutive_correct_required INTEGER NOT NULL,
        //                 show_failed_words_in_session INTEGER NOT NULL,
        //                 new_words_per_day INTEGER,
        //                 daily_review_limit INTEGER,
        //                 auto_advance_timeout_seconds INTEGER DEFAULT 2,
        //                 show_hint_in_fillword INTEGER DEFAULT 1,
        //                 reminder_enabled INTEGER DEFAULT 0,
        //                 reminder_time TEXT DEFAULT '19:00',
        //                 created_at INTEGER NOT NULL,
        //                 updated_at INTEGER NOT NULL,
        //                 sync_version INTEGER NOT NULL DEFAULT 1,
        //                 synced_at INTEGER,
        //                 deleted INTEGER DEFAULT 0,
        //                 deleted_at INTEGER
        //             );
        //             INSERT INTO learning_settings_new SELECT
        //                 id, sr_algorithm, leitner_box_count, consecutive_correct_required,
        //                 show_failed_words_in_session, new_words_per_day, daily_review_limit,
        //                 auto_advance_timeout_seconds, show_hint_in_fillword, reminder_enabled,
        //                 reminder_time, created_at, updated_at, {sync_cols}
        //             FROM learning_settings;
        //             DROP TABLE learning_settings;
        //             ALTER TABLE learning_settings_new RENAME TO learning_settings;"
        //         ),
        //     )?;
        // }
        //
        // // Remove user_id column from practice_sessions if it exists
        // if table_has_column(&conn, "practice_sessions", "user_id") {
        //     println!("Migration: Removing user_id column from practice_sessions...");
        //     let sync_cols = if table_has_column(&conn, "practice_sessions", "sync_version") {
        //         "sync_version, synced_at, deleted, deleted_at"
        //     } else {
        //         "1, NULL, 0, NULL"
        //     };
        //     safe_migrate_table(
        //         &conn,
        //         &format!(
        //             "CREATE TABLE practice_sessions_new (
        //                 id TEXT PRIMARY KEY,
        //                 collection_id TEXT NOT NULL,
        //                 mode TEXT NOT NULL,
        //                 language TEXT NOT NULL,
        //                 topic TEXT,
        //                 level TEXT,
        //                 total_questions INTEGER NOT NULL,
        //                 correct_answers INTEGER NOT NULL,
        //                 started_at INTEGER NOT NULL,
        //                 completed_at INTEGER NOT NULL,
        //                 duration_seconds INTEGER NOT NULL,
        //                 sync_version INTEGER NOT NULL DEFAULT 1,
        //                 synced_at INTEGER,
        //                 deleted INTEGER DEFAULT 0,
        //                 deleted_at INTEGER,
        //                 FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
        //             );
        //             INSERT INTO practice_sessions_new SELECT
        //                 id, collection_id, mode, language, topic, level, total_questions,
        //                 correct_answers, started_at, completed_at, duration_seconds,
        //                 {sync_cols}
        //             FROM practice_sessions;
        //             DROP TABLE practice_sessions;
        //             ALTER TABLE practice_sessions_new RENAME TO practice_sessions;
        //             CREATE INDEX IF NOT EXISTS idx_practice_sessions_collection ON practice_sessions(collection_id);"
        //         ),
        //     )?;
        // }
        //
        // // Remove user_id column from practice_progress if it exists
        // if table_has_column(&conn, "practice_progress", "user_id") {
        //     println!("Migration: Removing user_id column from practice_progress...");
        //     let sync_cols = if table_has_column(&conn, "practice_progress", "sync_version") {
        //         "sync_version, synced_at, deleted, deleted_at"
        //     } else {
        //         "1, NULL, 0, NULL"
        //     };
        //     safe_migrate_table(
        //         &conn,
        //         &format!(
        //             "CREATE TABLE practice_progress_new (
        //                 id TEXT PRIMARY KEY,
        //                 language TEXT NOT NULL,
        //                 total_sessions INTEGER DEFAULT 0,
        //                 total_words_practiced INTEGER DEFAULT 0,
        //                 current_streak INTEGER DEFAULT 0,
        //                 longest_streak INTEGER DEFAULT 0,
        //                 last_practice_date INTEGER NOT NULL,
        //                 created_at INTEGER NOT NULL,
        //                 updated_at INTEGER NOT NULL,
        //                 sync_version INTEGER NOT NULL DEFAULT 1,
        //                 synced_at INTEGER,
        //                 deleted INTEGER DEFAULT 0,
        //                 deleted_at INTEGER,
        //                 UNIQUE(language)
        //             );
        //             INSERT INTO practice_progress_new SELECT
        //                 id, language, total_sessions, total_words_practiced, current_streak,
        //                 longest_streak, last_practice_date, created_at, updated_at,
        //                 {sync_cols}
        //             FROM practice_progress;
        //             DROP TABLE practice_progress;
        //             ALTER TABLE practice_progress_new RENAME TO practice_progress;"
        //         ),
        //     )?;
        // }
        //
        // // Remove user_id column from user_learning_languages if it exists
        // if table_has_column(&conn, "user_learning_languages", "user_id") {
        //     println!("Migration: Removing user_id column from user_learning_languages...");
        //     let sync_cols = if table_has_column(&conn, "user_learning_languages", "sync_version") {
        //         "sync_version, synced_at, deleted, deleted_at"
        //     } else {
        //         "1, NULL, 0, NULL"
        //     };
        //     safe_migrate_table(
        //         &conn,
        //         &format!(
        //             "CREATE TABLE user_learning_languages_new (
        //                 id TEXT PRIMARY KEY,
        //                 language TEXT NOT NULL,
        //                 created_at INTEGER NOT NULL,
        //                 sync_version INTEGER NOT NULL DEFAULT 1,
        //                 synced_at INTEGER,
        //                 deleted INTEGER DEFAULT 0,
        //                 deleted_at INTEGER,
        //                 UNIQUE(language)
        //             );
        //             INSERT INTO user_learning_languages_new SELECT
        //                 id, language, created_at, {sync_cols}
        //             FROM user_learning_languages;
        //             DROP TABLE user_learning_languages;
        //             ALTER TABLE user_learning_languages_new RENAME TO user_learning_languages;"
        //         ),
        //     )?;
        // }
        //
        // // Now safe to drop users table — all child FK references have been removed above
        // let users_table_exists: bool = conn
        //     .query_row(
        //         "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='users'",
        //         [],
        //         |row| row.get::<_, i32>(0),
        //     )
        //     .unwrap_or(0)
        //     > 0;
        //
        // if users_table_exists {
        //     println!("Migration: Dropping users table (no longer needed)...");
        //     safe_migrate_table(&conn, "DROP TABLE IF EXISTS users;")?;
        // }
        //
        // // =====================================================================
        // // MIGRATION: Replace owner_id with shared_by in collections
        // // shared_by = NULL means user's own collection
        // // shared_by = <userId> means shared by that user
        // // =====================================================================
        // if table_has_column(&conn, "collections", "owner_id") {
        //     println!("Migration: Replacing owner_id with shared_by in collections...");
        //     let sync_cols = if table_has_column(&conn, "collections", "sync_version") {
        //         "sync_version, synced_at, deleted, deleted_at"
        //     } else {
        //         "1, NULL, 0, NULL"
        //     };
        //     safe_migrate_table(
        //         &conn,
        //         &format!(
        //             "CREATE TABLE collections_new (
        //                 id TEXT PRIMARY KEY,
        //                 name TEXT NOT NULL,
        //                 description TEXT,
        //                 language TEXT NOT NULL,
        //                 shared_by TEXT,
        //                 is_public BOOLEAN DEFAULT 0,
        //                 word_count INTEGER DEFAULT 0,
        //                 created_at INTEGER NOT NULL,
        //                 updated_at INTEGER NOT NULL,
        //                 sync_version INTEGER NOT NULL DEFAULT 1,
        //                 synced_at INTEGER,
        //                 deleted INTEGER DEFAULT 0,
        //                 deleted_at INTEGER
        //             );
        //             INSERT INTO collections_new SELECT
        //                 id, name, description, language, NULL, is_public, word_count,
        //                 created_at, updated_at, {sync_cols}
        //             FROM collections;
        //             DROP TABLE collections;
        //             ALTER TABLE collections_new RENAME TO collections;
        //             CREATE INDEX IF NOT EXISTS idx_collections_shared_by ON collections(shared_by);
        //             DROP INDEX IF EXISTS idx_collections_owner;"
        //         ),
        //     )?;
        // }

        Ok(())
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
    pub fn get_all_languages(&self) -> SqlResult<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt =
            conn.prepare("SELECT DISTINCT language FROM collections WHERE deleted = 0")?;

        let rows = stmt.query_map([], |row| row.get(0))?;
        rows.collect()
    }

    /// Get all distinct topics from vocabularies
    pub fn get_all_topics(&self) -> SqlResult<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT DISTINCT t.name
             FROM topics t
             JOIN vocabulary_topics vt ON t.id = vt.topic_id
             JOIN vocabularies v ON vt.vocabulary_id = v.id
             WHERE v.deleted = 0 AND t.deleted = 0
             ORDER BY t.name",
        )?;

        let rows = stmt.query_map([], |row| row.get(0))?;
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
        let params_refs: Vec<&dyn rusqlite::ToSql> = params_list
            .iter()
            .map(|s| s as &dyn rusqlite::ToSql)
            .collect();
        conn.execute(sql, params_refs.as_slice())?;
        Ok(())
    }

    /// Enable or disable foreign key constraints
    /// Used during sync to prevent FK violations when records arrive out of order
    pub fn set_foreign_keys(&self, enabled: bool) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let sql = if enabled {
            "PRAGMA foreign_keys = ON"
        } else {
            "PRAGMA foreign_keys = OFF"
        };
        conn.execute_batch(sql)
    }

    /// Query soft-deleted records from a table (for sync)
    pub fn query_deleted_records(&self, table_name: &str) -> SqlResult<Vec<(String, i64)>> {
        let conn = self.conn.lock().unwrap();
        let sql = format!(
            "SELECT id, sync_version FROM {} WHERE deleted = 1 AND synced_at IS NULL",
            table_name
        );
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?;
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
        let next_review_date = data["nextReviewDate"]
            .as_i64()
            .unwrap_or_else(|| Utc::now().timestamp());
        let interval_days = data["intervalDays"].as_i64().unwrap_or(0);
        let easiness_factor = data["easinessFactor"].as_f64().unwrap_or(2.5);
        let consecutive_correct_count = data["consecutiveCorrectCount"].as_i64().unwrap_or(0);
        let leitner_box = data["leitnerBox"].as_i64().unwrap_or(1);
        let last_interval_days = data["lastIntervalDays"].as_i64().unwrap_or(0);
        let failed_in_session = data["failedInSession"].as_bool().unwrap_or(false);
        let retry_count = data["retryCount"].as_i64().unwrap_or(0);
        let last_practiced = data["lastPracticed"]
            .as_i64()
            .unwrap_or_else(|| Utc::now().timestamp());

        // Get language from vocab or data
        let language = data["language"]
            .as_str()
            .map(|s| s.to_string())
            .unwrap_or_else(|| {
                let mut stmt = conn
                    .prepare("SELECT language FROM vocabularies WHERE id = ?1")
                    .ok();
                stmt.as_mut()
                    .and_then(|s| s.query_row(params![vocabulary_id], |row| row.get(0)).ok())
                    .unwrap_or_else(|| "en".to_string())
            });

        conn.execute(
            "INSERT INTO word_progress (
                id, language, vocabulary_id, word,
                correct_count, incorrect_count, total_reviews, mastery_level,
                next_review_date, interval_days, easiness_factor, consecutive_correct_count,
                leitner_box, last_interval_days, failed_in_session, retry_count,
                last_practiced, created_at, updated_at, sync_version, synced_at
            ) VALUES (
                ?1, ?2, ?3, ?4,
                ?5, ?6, ?7, ?8,
                ?9, ?10, ?11, ?12,
                ?13, ?14, ?15, ?16,
                ?17, ?18, ?18, ?19, ?20
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
                record.row_id,
                language,
                vocabulary_id,
                word,
                correct_count,
                incorrect_count,
                total_reviews,
                mastery_level,
                next_review_date,
                interval_days,
                easiness_factor,
                consecutive_correct_count,
                leitner_box,
                last_interval_days,
                failed_in_session,
                retry_count,
                last_practiced,
                Utc::now().timestamp(),
                record.version,
                Utc::now().timestamp()
            ],
        )?;

        // Handle completed_modes_in_cycle
        conn.execute(
            "DELETE FROM word_progress_completed_modes WHERE word_progress_id = ?1",
            params![record.row_id],
        )?;

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

        conn.execute(
            "INSERT INTO learning_settings (
                id, sr_algorithm, leitner_box_count, consecutive_correct_required,
                show_failed_words_in_session, new_words_per_day, daily_review_limit,
                auto_advance_timeout_seconds, show_hint_in_fillword, reminder_enabled, reminder_time,
                created_at, updated_at, sync_version, synced_at
            ) VALUES (
                ?1, ?2, ?3, ?4,
                ?5, ?6, ?7,
                ?8, ?9, ?10, ?11,
                ?12, ?13, ?14, ?15
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

        conn.execute(
            "INSERT INTO practice_sessions (
                id, collection_id, mode, language, topic, level,
                total_questions, correct_answers, started_at, completed_at, duration_seconds,
                sync_version, synced_at
            ) VALUES (
                ?1, ?2, ?3, ?4, ?5, ?6,
                ?7, ?8, ?9, ?10, ?11,
                ?12, ?13
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
                data["collectionId"].as_str().unwrap_or_default(),
                data["mode"].as_str().unwrap_or("flashcard"),
                data["language"].as_str().unwrap_or("en"),
                data["topic"].as_str(),
                data["level"].as_str(),
                data["totalQuestions"].as_i64().unwrap_or(0),
                data["correctAnswers"].as_i64().unwrap_or(0),
                data["startedAt"]
                    .as_i64()
                    .unwrap_or_else(|| Utc::now().timestamp()),
                data["completedAt"]
                    .as_i64()
                    .unwrap_or_else(|| Utc::now().timestamp()),
                data["durationSeconds"].as_i64().unwrap_or(0),
                record.version,
                Utc::now().timestamp()
            ],
        )?;

        // Handle results
        conn.execute(
            "DELETE FROM practice_results WHERE session_id = ?1",
            params![record.row_id],
        )?;

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
                    ],
                )?;
            }
        }

        Ok(())
    }

    /// Get unsynced word progress
    pub fn get_unsynced_word_progress(&self) -> SqlResult<Vec<crate::models::WordProgress>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, vocabulary_id, word, correct_count, incorrect_count, last_practiced,
                    mastery_level, next_review_date, interval_days, easiness_factor,
                    consecutive_correct_count, leitner_box, last_interval_days,
                    total_reviews, failed_in_session, retry_count, sync_version, synced_at
             FROM word_progress
             WHERE synced_at IS NULL AND deleted = 0",
        )?;

        let progress_iter = stmt.query_map([], |row| {
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
            let next_review_date =
                DateTime::from_timestamp(next_review_date_ts, 0).unwrap_or_default();

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
    pub fn get_unsynced_practice_sessions(&self) -> SqlResult<Vec<crate::models::PracticeSession>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, collection_id, mode, language, topic, level,
                    total_questions, correct_answers, started_at, completed_at, duration_seconds,
                    sync_version, synced_at
             FROM practice_sessions
             WHERE synced_at IS NULL AND deleted = 0",
        )?;

        let sessions_iter = stmt.query_map([], |row| {
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
                 ORDER BY order_index",
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

    /// Get unsynced practice progress records
    pub fn get_unsynced_practice_progress(
        &self,
    ) -> SqlResult<Vec<(String, String, i32, i32, i32, i32, i64, i64, i64, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, language, total_sessions, total_words_practiced, current_streak,
                    longest_streak, last_practice_date, created_at, updated_at, sync_version
             FROM practice_progress
             WHERE synced_at IS NULL AND deleted = 0",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
                row.get(8)?,
                row.get(9)?,
            ))
        })?;
        rows.collect()
    }

    /// Get unsynced user learning languages
    pub fn get_unsynced_user_learning_languages(&self) -> SqlResult<Vec<(String, String, i64, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, language, created_at, sync_version
             FROM user_learning_languages
             WHERE synced_at IS NULL AND deleted = 0",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })?;
        rows.collect()
    }

    /// Get unsynced topics
    pub fn get_unsynced_topics(&self) -> SqlResult<Vec<(String, String, i64, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, created_at, sync_version
             FROM topics
             WHERE synced_at IS NULL AND deleted = 0",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })?;
        rows.collect()
    }

    /// Get unsynced tags
    pub fn get_unsynced_tags(&self) -> SqlResult<Vec<(String, String, i64, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, created_at, sync_version
             FROM tags
             WHERE synced_at IS NULL AND deleted = 0",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
        })?;
        rows.collect()
    }

    /// Get unsynced collection shared users
    pub fn get_unsynced_collection_shared_users(
        &self,
    ) -> SqlResult<Vec<(String, String, String, String, i64, i64)>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, collection_id, user_id, permission, created_at, sync_version
             FROM collection_shared_users
             WHERE synced_at IS NULL AND deleted = 0",
        )?;

        let rows = stmt.query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
            ))
        })?;
        rows.collect()
    }

    /// Get all distinct tags from vocabularies
    pub fn get_all_tags(&self) -> SqlResult<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT DISTINCT t.name
             FROM tags t
             JOIN vocabulary_tags vt ON t.id = vt.tag_id
             JOIN vocabularies v ON vt.vocabulary_id = v.id
             WHERE v.deleted = 0 AND t.deleted = 0
             ORDER BY t.name",
        )?;

        let rows = stmt.query_map([], |row| row.get(0))?;
        rows.collect()
    }
}
