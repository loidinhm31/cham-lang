use rusqlite::{Result as SqlResult, params, OptionalExtension};
use chrono::Utc;
use uuid::Uuid;

use crate::models::{Vocabulary, UpdateVocabularyRequest};
use super::LocalDatabase;
use super::helpers::{timestamp_to_datetime, parse_word_type, parse_word_relationship, word_type_to_string, word_relationship_to_string};

impl LocalDatabase {
    /// Create a new vocabulary with all related data
    pub fn create_vocabulary(&self, vocab: &Vocabulary, user_id: &str) -> SqlResult<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp();

        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        // Insert main vocabulary record
        tx.execute(
            "INSERT INTO vocabularies
             (id, word, word_type, level, ipa, audio_url, concept, language, collection_id, user_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                id,
                vocab.word,
                word_type_to_string(&vocab.word_type),
                vocab.level,
                vocab.ipa,
                vocab.audio_url,
                vocab.concept,
                vocab.language,
                vocab.collection_id,
                user_id,
                now,
                now,
            ],
        )?;

        // Insert definitions
        for (index, definition) in vocab.definitions.iter().enumerate() {
            let def_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO vocabulary_definitions
                 (id, vocabulary_id, meaning, translation, example, order_index, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    def_id,
                    id,
                    definition.meaning,
                    definition.translation,
                    definition.example,
                    index as i32,
                    now,
                ],
            )?;
        }

        // Insert example sentences
        for (index, sentence) in vocab.example_sentences.iter().enumerate() {
            let ex_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT INTO vocabulary_example_sentences
                 (id, vocabulary_id, sentence, order_index, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![ex_id, id, sentence, index as i32, now],
            )?;
        }

        // Insert topics (find or create, then link)
        for topic_name in &vocab.topics {
            // Try to find existing topic
            let topic_id: Result<String, _> = tx.query_row(
                "SELECT id FROM topics WHERE name = ?1",
                params![topic_name],
                |row| row.get(0),
            );

            let topic_id = if let Ok(existing_id) = topic_id {
                existing_id
            } else {
                // Create new topic
                let new_topic_id = Uuid::new_v4().to_string();
                tx.execute(
                    "INSERT INTO topics (id, name, created_at) VALUES (?1, ?2, ?3)",
                    params![new_topic_id, topic_name, now],
                )?;
                new_topic_id
            };

            // Link vocabulary to topic
            let vt_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT OR IGNORE INTO vocabulary_topics (id, vocabulary_id, topic_id, created_at)
                 VALUES (?1, ?2, ?3, ?4)",
                params![vt_id, id, topic_id, now],
            )?;
        }

        // Insert tags (find or create, then link)
        for tag_name in &vocab.tags {
            // Try to find existing tag
            let tag_id: Result<String, _> = tx.query_row(
                "SELECT id FROM tags WHERE name = ?1",
                params![tag_name],
                |row| row.get(0),
            );

            let tag_id = if let Ok(existing_id) = tag_id {
                existing_id
            } else {
                // Create new tag
                let new_tag_id = Uuid::new_v4().to_string();
                tx.execute(
                    "INSERT INTO tags (id, name, created_at) VALUES (?1, ?2, ?3)",
                    params![new_tag_id, tag_name, now],
                )?;
                new_tag_id
            };

            // Link vocabulary to tag
            let vtag_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT OR IGNORE INTO vocabulary_tags (id, vocabulary_id, tag_id, created_at)
                 VALUES (?1, ?2, ?3, ?4)",
                params![vtag_id, id, tag_id, now],
            )?;
        }

        // Insert related words
        for related_word in &vocab.related_words {
            let rw_id = Uuid::new_v4().to_string();
            tx.execute(
                "INSERT OR IGNORE INTO vocabulary_related_words
                 (id, vocabulary_id, related_vocabulary_id, relationship_type, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![rw_id, id, related_word.word_id, word_relationship_to_string(&related_word.relationship), now],
            )?;
        }

        tx.commit()?;
        Ok(id)
    }

    /// Get a single vocabulary by ID with all related data
    pub fn get_vocabulary(&self, vocab_id: &str) -> SqlResult<Option<Vocabulary>> {
        let conn = self.conn.lock().unwrap();

        // Get main vocabulary record
        let mut stmt = conn.prepare(
            "SELECT id, word, word_type, level, ipa, audio_url, concept, language, collection_id, user_id, created_at, updated_at
             FROM vocabularies WHERE id = ?1"
        )?;

        let mut rows = stmt.query(params![vocab_id])?;

        if let Some(row) = rows.next()? {
            let vocab_id: String = row.get(0)?;
            let word: String = row.get(1)?;
            let word_type_str: String = row.get(2)?;
            let level: String = row.get(3)?;
            let ipa: String = row.get::<_, Option<String>>(4)?.unwrap_or_default();
            let audio_url: Option<String> = row.get(5)?;
            let concept: Option<String> = row.get(6)?;
            let language: String = row.get(7)?;
            let collection_id: String = row.get(8)?;
            let user_id: String = row.get(9)?;
            let created_at = timestamp_to_datetime(row.get(10)?);
            let updated_at = timestamp_to_datetime(row.get(11)?);

            let word_type = parse_word_type(&word_type_str);

            drop(rows);
            drop(stmt);

            // Fetch definitions
            let mut def_stmt = conn.prepare(
                "SELECT meaning, translation, example, order_index
                 FROM vocabulary_definitions
                 WHERE vocabulary_id = ?1
                 ORDER BY order_index"
            )?;
            let definitions: Vec<crate::models::Definition> = def_stmt
                .query_map(params![&vocab_id], |row| {
                    Ok(crate::models::Definition {
                        meaning: row.get(0)?,
                        translation: row.get(1)?,
                        example: row.get(2)?,
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;

            // Fetch example sentences
            let mut ex_stmt = conn.prepare(
                "SELECT sentence, order_index
                 FROM vocabulary_example_sentences
                 WHERE vocabulary_id = ?1
                 ORDER BY order_index"
            )?;
            let example_sentences: Vec<String> = ex_stmt
                .query_map(params![&vocab_id], |row| row.get(0))?
                .collect::<Result<Vec<_>, _>>()?;

            // Fetch topics
            let mut topic_stmt = conn.prepare(
                "SELECT t.name
                 FROM vocabulary_topics vt
                 JOIN topics t ON vt.topic_id = t.id
                 WHERE vt.vocabulary_id = ?1"
            )?;
            let topics: Vec<String> = topic_stmt
                .query_map(params![&vocab_id], |row| row.get(0))?
                .collect::<Result<Vec<_>, _>>()?;

            // Fetch tags
            let mut tag_stmt = conn.prepare(
                "SELECT t.name
                 FROM vocabulary_tags vt
                 JOIN tags t ON vt.tag_id = t.id
                 WHERE vt.vocabulary_id = ?1"
            )?;
            let tags: Vec<String> = tag_stmt
                .query_map(params![&vocab_id], |row| row.get(0))?
                .collect::<Result<Vec<_>, _>>()?;

            // Fetch related words
            let mut rel_stmt = conn.prepare(
                "SELECT related_vocabulary_id, relationship_type
                 FROM vocabulary_related_words
                 WHERE vocabulary_id = ?1"
            )?;
            let related_words: Vec<crate::models::RelatedWord> = rel_stmt
                .query_map(params![&vocab_id], |row| {
                    let related_vocab_id: String = row.get(0)?;
                    let relationship_str: String = row.get(1)?;

                    // Fetch the related word's text
                    let related_word: String = conn.query_row(
                        "SELECT word FROM vocabularies WHERE id = ?1",
                        params![&related_vocab_id],
                        |r| r.get(0),
                    ).unwrap_or_else(|_| String::new());

                    Ok(crate::models::RelatedWord {
                        word_id: related_vocab_id,
                        word: related_word,
                        relationship: parse_word_relationship(&relationship_str),
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;

            Ok(Some(Vocabulary {
                id: Some(vocab_id),
                word,
                word_type,
                level,
                ipa,
                audio_url,
                concept,
                definitions,
                example_sentences,
                topics,
                tags,
                related_words,
                language,
                collection_id,
                user_id,
                created_at,
                updated_at,
            }))
        } else {
            Ok(None)
        }
    }

    /// Get all vocabularies for a user with optional language filter
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
                    "SELECT id
                     FROM vocabularies
                     WHERE user_id = ?1 AND language = ?2
                     ORDER BY created_at DESC
                     LIMIT {}",
                    limit.unwrap_or(999999)
                ),
                vec![Box::new(user_id.to_string()), Box::new(lang.to_string())]
            )
        } else {
            (
                format!(
                    "SELECT id
                     FROM vocabularies
                     WHERE user_id = ?1
                     ORDER BY created_at DESC
                     LIMIT {}",
                    limit.unwrap_or(999999)
                ),
                vec![Box::new(user_id.to_string())]
            )
        };

        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let mut stmt = conn.prepare(&sql)?;
        let vocab_ids: Vec<String> = stmt
            .query_map(params_refs.as_slice(), |row| row.get(0))?
            .collect::<Result<Vec<_>, _>>()?;

        drop(stmt);
        drop(conn);

        // Load each vocabulary (N+1 for now, can optimize later)
        let mut result = Vec::new();
        for id in vocab_ids {
            if let Some(vocab) = self.get_vocabulary(&id)? {
                result.push(vocab);
            }
        }
        Ok(result)
    }

    /// Get vocabularies by collection ID
    pub fn get_vocabularies_by_collection(
        &self,
        collection_id: &str,
        limit: Option<i64>,
    ) -> SqlResult<Vec<Vocabulary>> {
        let paginated = self.get_vocabularies_by_collection_paginated(collection_id, limit, None)?;
        Ok(paginated.items)
    }

    pub fn get_vocabularies_by_collection_paginated(
        &self,
        collection_id: &str,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> SqlResult<crate::models::PaginatedResponse<Vocabulary>> {
        use crate::models::PaginatedResponse;

        let limit = limit.unwrap_or(999999);
        let offset = offset.unwrap_or(0);

        let conn = self.conn.lock().unwrap();

        // Get total count
        let total: i64 = conn.query_row(
            "SELECT COUNT(*) FROM vocabularies WHERE collection_id = ?1",
            params![collection_id],
            |row| row.get(0),
        )?;

        // Get paginated IDs
        let sql = format!(
            "SELECT id
             FROM vocabularies
             WHERE collection_id = ?1
             ORDER BY created_at DESC
             LIMIT {} OFFSET {}",
            limit, offset
        );

        let mut stmt = conn.prepare(&sql)?;
        let vocab_ids: Vec<String> = stmt
            .query_map(params![collection_id], |row| row.get(0))?
            .collect::<Result<Vec<_>, _>>()?;

        drop(stmt);
        drop(conn);

        // Load each vocabulary
        let mut items = Vec::new();
        for id in vocab_ids {
            if let Some(vocab) = self.get_vocabulary(&id)? {
                items.push(vocab);
            }
        }

        Ok(PaginatedResponse::new(items, total, offset, limit))
    }

    /// Search vocabularies by word pattern
    pub fn search_vocabularies(&self, query: &str, language: Option<&str>) -> SqlResult<Vec<Vocabulary>> {
        let conn = self.conn.lock().unwrap();
        let sql = if let Some(_lang) = language {
            "SELECT id
             FROM vocabularies
             WHERE word LIKE ?1 AND language = ?2
             ORDER BY word
             LIMIT 50"
        } else {
            "SELECT id
             FROM vocabularies
             WHERE word LIKE ?1
             ORDER BY word
             LIMIT 50"
        };

        let search_pattern = format!("%{}%", query);
        let mut stmt = conn.prepare(sql)?;

        let vocab_ids: Vec<String> = if let Some(lang) = language {
            stmt.query_map(params![search_pattern, lang], |row| row.get(0))?
                .collect::<Result<Vec<_>, _>>()?
        } else {
            stmt.query_map(params![search_pattern], |row| row.get(0))?
                .collect::<Result<Vec<_>, _>>()?
        };

        drop(stmt);
        drop(conn);

        // Load each vocabulary
        let mut result = Vec::new();
        for id in vocab_ids {
            if let Some(vocab) = self.get_vocabulary(&id)? {
                result.push(vocab);
            }
        }
        Ok(result)
    }

    /// Update vocabulary with all related data (replace strategy)
    pub fn update_vocabulary(
        &self,
        vocab_id: &str,
        request: &UpdateVocabularyRequest,
    ) -> SqlResult<()> {
        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        let now = Utc::now().timestamp();

        // Get old collection_id before updating (if collection_id is changing)
        let old_collection_id: Option<String> = if request.collection_id.is_some() {
            tx.query_row(
                "SELECT collection_id FROM vocabularies WHERE id = ?1",
                params![vocab_id],
                |row| row.get(0),
            ).optional()?
        } else {
            None
        };

        // Build dynamic SQL for main vocabulary table
        let mut updates = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(ref word) = request.word {
            updates.push("word = ?");
            params.push(Box::new(word.clone()));
        }
        if let Some(ref word_type) = request.word_type {
            updates.push("word_type = ?");
            params.push(Box::new(word_type_to_string(word_type).to_string()));
        }
        if let Some(ref level) = request.level {
            updates.push("level = ?");
            params.push(Box::new(level.clone()));
        }
        if let Some(ref ipa) = request.ipa {
            updates.push("ipa = ?");
            params.push(Box::new(ipa.clone()));
        }
        if let Some(ref audio_url) = request.audio_url {
            updates.push("audio_url = ?");
            // Convert empty string to NULL
            if audio_url.trim().is_empty() {
                params.push(Box::new(None::<String>));
            } else {
                params.push(Box::new(Some(audio_url.clone())));
            }
        }
        if let Some(ref concept) = request.concept {
            updates.push("concept = ?");
            // Convert empty string to NULL
            if concept.trim().is_empty() {
                params.push(Box::new(None::<String>));
            } else {
                params.push(Box::new(Some(concept.clone())));
            }
        }
        if let Some(ref collection_id) = request.collection_id {
            updates.push("collection_id = ?");
            params.push(Box::new(collection_id.clone()));
        }

        // Always update the updated_at timestamp
        updates.push("updated_at = ?");
        params.push(Box::new(now));

        if !updates.is_empty() {
            params.push(Box::new(vocab_id.to_string()));
            let sql = format!(
                "UPDATE vocabularies SET {} WHERE id = ?",
                updates.join(", ")
            );
            let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
            tx.execute(&sql, params_refs.as_slice())?;
        }

        // Update definitions (replace strategy)
        if let Some(ref definitions) = request.definitions {
            tx.execute(
                "DELETE FROM vocabulary_definitions WHERE vocabulary_id = ?1",
                params![vocab_id],
            )?;

            for (index, definition) in definitions.iter().enumerate() {
                let def_id = Uuid::new_v4().to_string();
                tx.execute(
                    "INSERT INTO vocabulary_definitions
                     (id, vocabulary_id, meaning, translation, example, order_index, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![
                        def_id,
                        vocab_id,
                        definition.meaning,
                        definition.translation,
                        definition.example,
                        index as i32,
                        now,
                    ],
                )?;
            }
        }

        // Update example sentences (replace strategy)
        if let Some(ref example_sentences) = request.example_sentences {
            tx.execute(
                "DELETE FROM vocabulary_example_sentences WHERE vocabulary_id = ?1",
                params![vocab_id],
            )?;

            for (index, sentence) in example_sentences.iter().enumerate() {
                let ex_id = Uuid::new_v4().to_string();
                tx.execute(
                    "INSERT INTO vocabulary_example_sentences
                     (id, vocabulary_id, sentence, order_index, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![ex_id, vocab_id, sentence, index as i32, now],
                )?;
            }
        }

        // Update topics (replace strategy)
        if let Some(ref topics) = request.topics {
            tx.execute(
                "DELETE FROM vocabulary_topics WHERE vocabulary_id = ?1",
                params![vocab_id],
            )?;

            for topic_name in topics {
                // Find or create topic
                let topic_id: Result<String, _> = tx.query_row(
                    "SELECT id FROM topics WHERE name = ?1",
                    params![topic_name],
                    |row| row.get(0),
                );

                let topic_id = if let Ok(existing_id) = topic_id {
                    existing_id
                } else {
                    let new_topic_id = Uuid::new_v4().to_string();
                    tx.execute(
                        "INSERT INTO topics (id, name, created_at) VALUES (?1, ?2, ?3)",
                        params![new_topic_id, topic_name, now],
                    )?;
                    new_topic_id
                };

                let vt_id = Uuid::new_v4().to_string();
                tx.execute(
                    "INSERT OR IGNORE INTO vocabulary_topics (id, vocabulary_id, topic_id, created_at)
                     VALUES (?1, ?2, ?3, ?4)",
                    params![vt_id, vocab_id, topic_id, now],
                )?;
            }
        }

        // Update tags (replace strategy)
        if let Some(ref tags) = request.tags {
            tx.execute(
                "DELETE FROM vocabulary_tags WHERE vocabulary_id = ?1",
                params![vocab_id],
            )?;

            for tag_name in tags {
                // Find or create tag
                let tag_id: Result<String, _> = tx.query_row(
                    "SELECT id FROM tags WHERE name = ?1",
                    params![tag_name],
                    |row| row.get(0),
                );

                let tag_id = if let Ok(existing_id) = tag_id {
                    existing_id
                } else {
                    let new_tag_id = Uuid::new_v4().to_string();
                    tx.execute(
                        "INSERT INTO tags (id, name, created_at) VALUES (?1, ?2, ?3)",
                        params![new_tag_id, tag_name, now],
                    )?;
                    new_tag_id
                };

                let vtag_id = Uuid::new_v4().to_string();
                tx.execute(
                    "INSERT OR IGNORE INTO vocabulary_tags (id, vocabulary_id, tag_id, created_at)
                     VALUES (?1, ?2, ?3, ?4)",
                    params![vtag_id, vocab_id, tag_id, now],
                )?;
            }
        }

        // Update related words (replace strategy)
        if let Some(ref related_words) = request.related_words {
            tx.execute(
                "DELETE FROM vocabulary_related_words WHERE vocabulary_id = ?1",
                params![vocab_id],
            )?;

            for related_word in related_words {
                let rw_id = Uuid::new_v4().to_string();
                tx.execute(
                    "INSERT OR IGNORE INTO vocabulary_related_words
                     (id, vocabulary_id, related_vocabulary_id, relationship_type, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![rw_id, vocab_id, related_word.word_id, word_relationship_to_string(&related_word.relationship), now],
                )?;
            }
        }

        // Update word counts if collection_id changed
        if let (Some(old_coll_id), Some(new_coll_id)) = (old_collection_id, &request.collection_id) {
            if &old_coll_id != new_coll_id {
                // Update old collection word count
                let old_count: i32 = tx.query_row(
                    "SELECT COUNT(*) FROM vocabularies WHERE collection_id = ?1",
                    params![old_coll_id],
                    |row| row.get(0),
                )?;
                tx.execute(
                    "UPDATE collections SET word_count = ?1, updated_at = ?2 WHERE id = ?3",
                    params![old_count, now, old_coll_id],
                )?;

                // Update new collection word count
                let new_count: i32 = tx.query_row(
                    "SELECT COUNT(*) FROM vocabularies WHERE collection_id = ?1",
                    params![new_coll_id],
                    |row| row.get(0),
                )?;
                tx.execute(
                    "UPDATE collections SET word_count = ?1, updated_at = ?2 WHERE id = ?3",
                    params![new_count, now, new_coll_id],
                )?;
            }
        }

        tx.commit()?;
        Ok(())
    }

    /// Delete a vocabulary (hard delete - cascades to related data)
    pub fn delete_vocabulary(&self, vocab_id: &str) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();

        // Hard delete - ON DELETE CASCADE will handle related tables
        conn.execute(
            "DELETE FROM vocabularies WHERE id = ?1",
            params![vocab_id],
        )?;

        Ok(())
    }

    /// Bulk move vocabularies to a different collection
    pub fn bulk_move_vocabularies(
        &self,
        vocab_ids: &[String],
        target_collection_id: &str,
        user_id: &str,
    ) -> SqlResult<crate::models::BulkMoveResult> {
        use std::collections::HashSet;

        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;
        let now = Utc::now().timestamp();

        // Verify target collection exists and belongs to user
        let target_exists: bool = tx
            .query_row(
                "SELECT 1 FROM collections
                 WHERE id = ?1 AND owner_id = ?2",
                params![target_collection_id, user_id],
                |_row| Ok(true),
            )
            .optional()?
            .unwrap_or(false);

        if !target_exists {
            return Err(rusqlite::Error::QueryReturnedNoRows);
        }

        // Get target collection language
        let target_language: String = tx.query_row(
            "SELECT language FROM collections WHERE id = ?1",
            params![target_collection_id],
            |row| row.get(0),
        )?;

        // Collect source collection IDs and validate vocabularies
        let mut source_collections = HashSet::new();
        let mut moved_count = 0;

        for vocab_id in vocab_ids {
            // Get vocabulary info (collection_id and language) if it exists and belongs to user
            let vocab_info: Option<(String, String)> = tx
                .query_row(
                    "SELECT collection_id, language FROM vocabularies
                     WHERE id = ?1 AND user_id = ?2",
                    params![vocab_id, user_id],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
                .optional()?;

            if let Some((source_collection_id, vocab_language)) = vocab_info {
                // Only move if language matches and not already in target collection
                if vocab_language == target_language && source_collection_id != target_collection_id {
                    source_collections.insert(source_collection_id);

                    // Update vocabulary collection_id
                    tx.execute(
                        "UPDATE vocabularies
                         SET collection_id = ?1, updated_at = ?2
                         WHERE id = ?3",
                        params![target_collection_id, now, vocab_id],
                    )?;

                    moved_count += 1;
                }
            }
        }

        // Update word counts for all affected collections
        for collection_id in source_collections.iter() {
            let count: i32 = tx.query_row(
                "SELECT COUNT(*) FROM vocabularies
                 WHERE collection_id = ?1",
                params![collection_id],
                |row| row.get(0),
            )?;

            tx.execute(
                "UPDATE collections
                 SET word_count = ?1, updated_at = ?2
                 WHERE id = ?3",
                params![count, now, collection_id],
            )?;
        }

        // Update target collection word count
        let target_count: i32 = tx.query_row(
            "SELECT COUNT(*) FROM vocabularies
             WHERE collection_id = ?1",
            params![target_collection_id],
            |row| row.get(0),
        )?;

        tx.execute(
            "UPDATE collections
             SET word_count = ?1, updated_at = ?2
             WHERE id = ?3",
            params![target_count, now, target_collection_id],
        )?;

        tx.commit()?;

        Ok(crate::models::BulkMoveResult {
            moved_count,
            skipped_count: vocab_ids.len() - moved_count,
        })
    }
}
