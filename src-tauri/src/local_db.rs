use rusqlite::{Connection, Result as SqlResult, params};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use chrono::{DateTime, Utc};
use serde_json;
use uuid::Uuid;

use crate::models::*;

/// Local SQLite database manager for offline-first functionality
#[derive(Clone)]
pub struct LocalDatabase {
    conn: Arc<Mutex<Connection>>,
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

        // Drop all tables including metadata to start fresh
        conn.execute("DROP TABLE IF EXISTS practice_sessions", [])?;
        conn.execute("DROP TABLE IF EXISTS practice_progress", [])?;
        conn.execute("DROP TABLE IF EXISTS user_preferences", [])?;
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
                shared_with TEXT,
                is_public BOOLEAN DEFAULT 0,
                word_count INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER,
                FOREIGN KEY (owner_id) REFERENCES users(id)
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
                definitions TEXT NOT NULL,
                example_sentences TEXT,
                topics TEXT,
                related_words TEXT,
                language TEXT NOT NULL,
                collection_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                deleted_at INTEGER,
                FOREIGN KEY (collection_id) REFERENCES collections(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )",
            [],
        )?;

        // Migration: Add concept column if it doesn't exist (for existing databases)
        let _ = conn.execute(
            "ALTER TABLE vocabularies ADD COLUMN concept TEXT",
            [],
        );

        // User preferences table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS user_preferences (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL UNIQUE,
                interface_language TEXT,
                native_language TEXT,
                learning_languages TEXT,
                theme TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
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
                results TEXT NOT NULL,
                total_questions INTEGER NOT NULL,
                correct_answers INTEGER NOT NULL,
                started_at INTEGER NOT NULL,
                completed_at INTEGER NOT NULL,
                duration_seconds INTEGER NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (collection_id) REFERENCES collections(id)
            )",
            [],
        )?;

        // Practice progress table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS practice_progress (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                language TEXT NOT NULL,
                words_progress TEXT NOT NULL,
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
        conn.execute("CREATE INDEX IF NOT EXISTS idx_vocabularies_collection ON vocabularies(collection_id)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_vocabularies_user ON vocabularies(user_id)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_vocabularies_language ON vocabularies(language)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_collections_owner ON collections(owner_id)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_practice_sessions_user ON practice_sessions(user_id)", [])?;

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
        version_str.parse::<i64>()
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

    //==========================================================================
    // COLLECTION OPERATIONS
    //==========================================================================

    pub fn create_collection(
        &self,
        name: &str,
        description: &str,
        language: &str,
        owner_id: &str,
        is_public: bool,
    ) -> SqlResult<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp();

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO collections
             (id, name, description, language, owner_id, is_public, word_count, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8)",
            params![id, name, description, language, owner_id, is_public, now, now],
        )?;

        Ok(id)
    }

    pub fn get_collection(&self, collection_id: &str) -> SqlResult<Option<Collection>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, description, language, owner_id, shared_with, is_public,
                    word_count, created_at, updated_at
             FROM collections WHERE id = ?1 AND deleted_at IS NULL"
        )?;

        let mut rows = stmt.query(params![collection_id])?;

        if let Some(row) = rows.next()? {
            let shared_with_json: Option<String> = row.get(5)?;
            let shared_with = shared_with_json
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_else(Vec::new);

            Ok(Some(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                language: row.get(3)?,
                owner_id: row.get(4)?,
                shared_with,
                is_public: row.get(6)?,
                word_count: row.get(7)?,
                created_at: timestamp_to_datetime(row.get(8)?),
                updated_at: timestamp_to_datetime(row.get(9)?),
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_user_collections(&self, user_id: &str) -> SqlResult<Vec<Collection>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, description, language, owner_id, shared_with, is_public,
                    word_count, created_at, updated_at
             FROM collections
             WHERE owner_id = ?1 AND deleted_at IS NULL
             ORDER BY updated_at DESC"
        )?;

        let rows = stmt.query_map(params![user_id], |row| {
            let shared_with_json: Option<String> = row.get(5)?;
            let shared_with = shared_with_json
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_else(Vec::new);

            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                language: row.get(3)?,
                owner_id: row.get(4)?,
                shared_with,
                is_public: row.get(6)?,
                word_count: row.get(7)?,
                created_at: timestamp_to_datetime(row.get(8)?),
                updated_at: timestamp_to_datetime(row.get(9)?),
            })
        })?;

        rows.collect()
    }

    pub fn update_collection_word_count(&self, collection_id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();

        // Count vocabularies in this collection
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM vocabularies WHERE collection_id = ?1 AND deleted_at IS NULL",
            params![collection_id],
            |row| row.get(0),
        )?;

        let now = Utc::now().timestamp();
        conn.execute(
            "UPDATE collections SET word_count = ?1, updated_at = ?2
             WHERE id = ?3",
            params![count, now, collection_id],
        )?;

        Ok(())
    }

    pub fn update_collection(
        &self,
        collection_id: &str,
        name: &str,
        description: &str,
        is_public: bool,
    ) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp();

        conn.execute(
            "UPDATE collections SET name = ?1, description = ?2, is_public = ?3, updated_at = ?4
             WHERE id = ?5",
            params![name, description, is_public, now, collection_id],
        )?;

        Ok(())
    }

    pub fn delete_collection(&self, collection_id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp();

        // Soft delete
        conn.execute(
            "UPDATE collections SET deleted_at = ?1, updated_at = ?2
             WHERE id = ?3",
            params![now, now, collection_id],
        )?;

        Ok(())
    }

    //==========================================================================
    // VOCABULARY OPERATIONS
    //==========================================================================

    pub fn create_vocabulary(&self, vocab: &Vocabulary, user_id: &str) -> SqlResult<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp();

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO vocabularies
             (id, word, word_type, level, ipa, concept, definitions, example_sentences, topics,
              related_words, language, collection_id, user_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                id,
                vocab.word,
                serde_json::to_string(&vocab.word_type).unwrap(),
                vocab.level,
                vocab.ipa,
                vocab.concept,
                serde_json::to_string(&vocab.definitions).unwrap(),
                serde_json::to_string(&vocab.example_sentences).unwrap(),
                serde_json::to_string(&vocab.topics).unwrap(),
                serde_json::to_string(&vocab.related_words).unwrap(),
                vocab.language,
                vocab.collection_id,
                user_id,
                now,
                now,
            ],
        )?;

        Ok(id)
    }

    pub fn get_vocabulary(&self, vocab_id: &str) -> SqlResult<Option<Vocabulary>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, word, word_type, level, ipa, concept, definitions, example_sentences, topics,
                    related_words, language, collection_id, user_id, created_at, updated_at
             FROM vocabularies WHERE id = ?1 AND deleted_at IS NULL"
        )?;

        let mut rows = stmt.query(params![vocab_id])?;

        if let Some(row) = rows.next()? {
            Ok(Some(row_to_vocabulary(row)?))
        } else {
            Ok(None)
        }
    }

    pub fn get_all_vocabularies(
        &self,
        user_id: &str,
        language: Option<&str>,
        limit: Option<i64>,
    ) -> SqlResult<Vec<Vocabulary>> {
        let conn = self.conn.lock().unwrap();

        let (sql, params_vec): (String, Vec<Box<dyn rusqlite::ToSql>>) = if let Some(lang) = language {
            (
                format!(
                    "SELECT id, word, word_type, level, ipa, concept, definitions, example_sentences, topics,
                            related_words, language, collection_id, user_id, created_at, updated_at
                     FROM vocabularies
                     WHERE user_id = ?1 AND language = ?2 AND deleted_at IS NULL
                     ORDER BY created_at DESC
                     LIMIT {}",
                    limit.unwrap_or(1000)
                ),
                vec![Box::new(user_id.to_string()), Box::new(lang.to_string())]
            )
        } else {
            (
                format!(
                    "SELECT id, word, word_type, level, ipa, concept, definitions, example_sentences, topics,
                            related_words, language, collection_id, user_id, created_at, updated_at
                     FROM vocabularies
                     WHERE user_id = ?1 AND deleted_at IS NULL
                     ORDER BY created_at DESC
                     LIMIT {}",
                    limit.unwrap_or(1000)
                ),
                vec![Box::new(user_id.to_string())]
            )
        };

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(params_refs.as_slice(), row_to_vocabulary)?;
        rows.collect()
    }

    pub fn get_vocabularies_by_collection(
        &self,
        collection_id: &str,
        limit: Option<i64>,
    ) -> SqlResult<Vec<Vocabulary>> {
        let conn = self.conn.lock().unwrap();
        let sql = format!(
            "SELECT id, word, word_type, level, ipa, concept, definitions, example_sentences, topics,
                    related_words, language, collection_id, user_id, created_at, updated_at
             FROM vocabularies
             WHERE collection_id = ?1 AND deleted_at IS NULL
             ORDER BY created_at DESC
             LIMIT {}",
            limit.unwrap_or(100)
        );

        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(params![collection_id], row_to_vocabulary)?;
        rows.collect()
    }

    pub fn search_vocabularies(&self, query: &str, language: Option<&str>) -> SqlResult<Vec<Vocabulary>> {
        let conn = self.conn.lock().unwrap();
        let sql = if let Some(_lang) = language {
            "SELECT id, word, word_type, level, ipa, concept, definitions, example_sentences, topics,
                    related_words, language, collection_id, user_id, created_at, updated_at
             FROM vocabularies
             WHERE word LIKE ?1 AND language = ?2 AND deleted_at IS NULL
             ORDER BY word
             LIMIT 50"
        } else {
            "SELECT id, word, word_type, level, ipa, concept, definitions, example_sentences, topics,
                    related_words, language, collection_id, user_id, created_at, updated_at
             FROM vocabularies
             WHERE word LIKE ?1 AND deleted_at IS NULL
             ORDER BY word
             LIMIT 50"
        };

        let search_pattern = format!("%{}%", query);
        let mut stmt = conn.prepare(sql)?;

        let rows = if let Some(lang) = language {
            stmt.query_map(params![search_pattern, lang], row_to_vocabulary)?
        } else {
            stmt.query_map(params![search_pattern], row_to_vocabulary)?
        };

        rows.collect()
    }

    pub fn update_vocabulary(
        &self,
        vocab_id: &str,
        request: &crate::models::UpdateVocabularyRequest,
    ) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp();

        // Build dynamic SQL based on what fields are provided
        let mut updates = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(ref word) = request.word {
            updates.push("word = ?");
            params.push(Box::new(word.clone()));
        }
        if let Some(ref word_type) = request.word_type {
            updates.push("word_type = ?");
            params.push(Box::new(serde_json::to_string(&word_type).unwrap()));
        }
        if let Some(ref level) = request.level {
            updates.push("level = ?");
            params.push(Box::new(level.clone()));
        }
        if let Some(ref ipa) = request.ipa {
            updates.push("ipa = ?");
            params.push(Box::new(ipa.clone()));
        }
        if let Some(ref concept) = request.concept {
            updates.push("concept = ?");
            params.push(Box::new(concept.clone()));
        }
        if let Some(ref definitions) = request.definitions {
            updates.push("definitions = ?");
            params.push(Box::new(serde_json::to_string(&definitions).unwrap()));
        }
        if let Some(ref example_sentences) = request.example_sentences {
            updates.push("example_sentences = ?");
            params.push(Box::new(serde_json::to_string(&example_sentences).unwrap()));
        }
        if let Some(ref topics) = request.topics {
            updates.push("topics = ?");
            params.push(Box::new(serde_json::to_string(&topics).unwrap()));
        }
        if let Some(ref related_words) = request.related_words {
            updates.push("related_words = ?");
            params.push(Box::new(serde_json::to_string(&related_words).unwrap()));
        }

        // Always update the updated_at timestamp
        updates.push("updated_at = ?");
        params.push(Box::new(now));

        if updates.is_empty() {
            return Ok(()); // Nothing to update
        }

        // Add the vocab_id as the last parameter
        params.push(Box::new(vocab_id.to_string()));

        let sql = format!(
            "UPDATE vocabularies SET {} WHERE id = ?",
            updates.join(", ")
        );

        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        conn.execute(&sql, params_refs.as_slice())?;

        Ok(())
    }

    pub fn delete_vocabulary(&self, vocab_id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp();

        conn.execute(
            "UPDATE vocabularies SET deleted_at = ?1, updated_at = ?2
             WHERE id = ?3",
            params![now, now, vocab_id],
        )?;

        Ok(())
    }

    // Practice session methods

    pub fn create_practice_session(
        &self,
        request: &CreatePracticeSessionRequest,
        user_id: &str,
    ) -> SqlResult<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp();

        let correct_count = request.results.iter().filter(|r| r.correct).count() as i32;
        let total_count = request.results.len() as i32;

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO practice_sessions
             (id, user_id, collection_id, mode, language, topic, level, results,
              total_questions, correct_answers, started_at, completed_at, duration_seconds)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                id,
                user_id,
                request.collection_id,
                serde_json::to_string(&request.mode).unwrap(),
                request.language,
                request.topic,
                request.level,
                serde_json::to_string(&request.results).unwrap(),
                total_count,
                correct_count,
                now - request.duration_seconds as i64,
                now,
                request.duration_seconds,
            ],
        )?;

        Ok(id)
    }

    pub fn update_practice_progress(
        &self,
        request: &UpdateProgressRequest,
        user_id: &str,
    ) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp();

        // Get existing progress or create new
        let existing: Option<(String, String)> = conn
            .query_row(
                "SELECT id, words_progress FROM practice_progress
                 WHERE user_id = ?1 AND language = ?2",
                params![user_id, request.language],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .ok();

        if let Some((progress_id, words_progress_str)) = existing {
            // Update existing progress
            let mut words_progress: Vec<WordProgress> =
                serde_json::from_str(&words_progress_str).unwrap_or_else(|_| Vec::new());

            // Find or create word progress
            if let Some(word_prog) = words_progress
                .iter_mut()
                .find(|w| w.vocabulary_id == request.vocabulary_id)
            {
                // Update existing word
                if request.correct {
                    word_prog.correct_count += 1;
                } else {
                    word_prog.incorrect_count += 1;
                }
                word_prog.last_practiced = Utc::now();
                // Update mastery level (0-5 scale)
                let total = word_prog.correct_count + word_prog.incorrect_count;
                let ratio = word_prog.correct_count as f32 / total as f32;
                word_prog.mastery_level = (ratio * 5.0).round() as i32;
            } else {
                // Add new word progress
                words_progress.push(WordProgress {
                    vocabulary_id: request.vocabulary_id.clone(),
                    word: request.word.clone(),
                    correct_count: if request.correct { 1 } else { 0 },
                    incorrect_count: if request.correct { 0 } else { 1 },
                    last_practiced: Utc::now(),
                    mastery_level: if request.correct { 5 } else { 0 },
                });
            }

            conn.execute(
                "UPDATE practice_progress
                 SET words_progress = ?1, total_words_practiced = ?2, last_practice_date = ?3, updated_at = ?4
                 WHERE id = ?5",
                params![
                    serde_json::to_string(&words_progress).unwrap(),
                    words_progress.len() as i32,
                    now,
                    now,
                    progress_id
                ],
            )?;
        } else {
            // Create new progress
            let word_progress = WordProgress {
                vocabulary_id: request.vocabulary_id.clone(),
                word: request.word.clone(),
                correct_count: if request.correct { 1 } else { 0 },
                incorrect_count: if request.correct { 0 } else { 1 },
                last_practiced: Utc::now(),
                mastery_level: if request.correct { 5 } else { 0 },
            };

            let progress_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO practice_progress
                 (id, user_id, language, words_progress, total_sessions, total_words_practiced,
                  current_streak, longest_streak, last_practice_date, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, 0, 1, 0, 0, ?5, ?6, ?7)",
                params![
                    progress_id,
                    user_id,
                    request.language,
                    serde_json::to_string(&vec![word_progress]).unwrap(),
                    now,
                    now,
                    now,
                ],
            )?;
        }

        Ok(())
    }

    pub fn get_practice_progress(
        &self,
        user_id: &str,
        language: &str,
    ) -> SqlResult<Option<UserPracticeProgress>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, language, words_progress, total_sessions, total_words_practiced,
                    current_streak, longest_streak, last_practice_date, created_at, updated_at
             FROM practice_progress
             WHERE user_id = ?1 AND language = ?2"
        )?;

        let mut rows = stmt.query(params![user_id, language])?;

        if let Some(row) = rows.next()? {
            let words_progress_str: String = row.get(2)?;
            let words_progress: Vec<WordProgress> =
                serde_json::from_str(&words_progress_str).unwrap_or_else(|_| Vec::new());

            Ok(Some(UserPracticeProgress {
                id: row.get(0)?,
                user_id: user_id.to_string(),
                language: row.get(1)?,
                words_progress,
                total_sessions: row.get(3)?,
                total_words_practiced: row.get(4)?,
                current_streak: row.get(5)?,
                longest_streak: row.get(6)?,
                last_practice_date: timestamp_to_datetime(row.get(7)?),
                created_at: timestamp_to_datetime(row.get(8)?),
                updated_at: timestamp_to_datetime(row.get(9)?),
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_practice_sessions(
        &self,
        user_id: &str,
        language: &str,
        limit: Option<i64>,
    ) -> SqlResult<Vec<PracticeSession>> {
        let conn = self.conn.lock().unwrap();
        let sql = format!(
            "SELECT id, collection_id, mode, language, topic, level, results,
                    total_questions, correct_answers, started_at, completed_at, duration_seconds
             FROM practice_sessions
             WHERE user_id = ?1 AND language = ?2
             ORDER BY completed_at DESC
             LIMIT {}",
            limit.unwrap_or(50)
        );

        let user_id_owned = user_id.to_string();
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(params![user_id, language], move |row| {
            let results_str: String = row.get(6)?;
            let results: Vec<PracticeResult> =
                serde_json::from_str(&results_str).unwrap_or_else(|_| Vec::new());
            let mode_str: String = row.get(2)?;
            let mode: PracticeMode =
                serde_json::from_str(&mode_str).unwrap_or(PracticeMode::Flashcard);

            Ok(PracticeSession {
                id: row.get(0)?,
                user_id: user_id_owned.clone(),
                collection_id: row.get(1)?,
                mode,
                language: row.get(3)?,
                topic: row.get(4)?,
                level: row.get(5)?,
                results,
                total_questions: row.get(7)?,
                correct_answers: row.get(8)?,
                started_at: timestamp_to_datetime(row.get(9)?),
                completed_at: timestamp_to_datetime(row.get(10)?),
                duration_seconds: row.get(11)?,
            })
        })?;

        rows.collect()
    }

    pub fn get_all_languages(&self, user_id: &str) -> SqlResult<Vec<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT DISTINCT language FROM collections WHERE owner_id = ?1 AND deleted_at IS NULL"
        )?;

        let rows = stmt.query_map(params![user_id], |row| row.get(0))?;
        rows.collect()
    }

}

//==============================================================================
// HELPER FUNCTIONS
//==============================================================================

fn timestamp_to_datetime(timestamp: i64) -> DateTime<Utc> {
    DateTime::from_timestamp(timestamp, 0).unwrap_or_else(Utc::now)
}

fn row_to_vocabulary(row: &rusqlite::Row) -> SqlResult<Vocabulary> {
    let word_type_str: String = row.get(2)?;
    let concept: Option<String> = row.get(5)?;
    let definitions_str: String = row.get(6)?;
    let example_sentences_str: String = row.get(7)?;
    let topics_str: String = row.get(8)?;
    let related_words_str: String = row.get(9)?;

    Ok(Vocabulary {
        id: row.get(0)?,
        word: row.get(1)?,
        word_type: serde_json::from_str(&word_type_str).unwrap_or(WordType::Noun),
        level: row.get(3)?,
        ipa: row.get(4)?,
        concept,
        definitions: serde_json::from_str(&definitions_str).unwrap_or_else(|_| Vec::new()),
        example_sentences: serde_json::from_str(&example_sentences_str).unwrap_or_else(|_| Vec::new()),
        topics: serde_json::from_str(&topics_str).unwrap_or_else(|_| Vec::new()),
        related_words: serde_json::from_str(&related_words_str).unwrap_or_else(|_| Vec::new()),
        language: row.get(10)?,
        collection_id: row.get(11)?,
        user_id: row.get(12)?,
        created_at: timestamp_to_datetime(row.get(13)?),
        updated_at: timestamp_to_datetime(row.get(14)?),
    })
}
