use std::sync::Arc;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use qm_sync_client::{Checkpoint, ReqwestHttpClient, QmSyncClient, SyncClientConfig, SyncRecord};

use crate::auth::AuthService;
use crate::db::LocalDatabase;
use crate::sync_table_map::sync_to_db;

/// All synced table names
const SYNCED_TABLES: &[&str] = &[
    "collections",
    "vocabularies",
    "wordProgress",
    "learningSettings",
    "practiceSessions",
    "practiceProgress",
    "userLearningLanguages",
    "topics",
    "tags",
    "collectionSharedUsers",
];

/// Sync service for synchronizing local data with qm-sync
#[derive(Clone)]
pub struct SyncService {
    db: Arc<LocalDatabase>,
    auth: Arc<std::sync::Mutex<AuthService>>,
}

/// Result of a sync operation
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncResult {
    pub pushed: usize,
    pub pulled: usize,
    pub conflicts: usize,
    pub success: bool,
    pub error: Option<String>,
    pub synced_at: i64,
}

/// Sync status
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub configured: bool,
    pub authenticated: bool,
    pub last_sync_at: Option<i64>,
    pub pending_changes: usize,
    pub server_url: Option<String>,
}

impl SyncService {
    pub fn new(
        db: Arc<LocalDatabase>,
        auth: Arc<std::sync::Mutex<AuthService>>,
    ) -> Self {
        Self { db, auth }
    }

    pub async fn get_sync_status(
        &self,
        app_handle: &tauri::AppHandle,
    ) -> Result<SyncStatus, String> {
        let is_authenticated = {
            let auth = self.auth.lock().map_err(|e| format!("Failed to lock auth: {}", e))?.clone();
            auth.is_authenticated(app_handle).await
        };

        let last_sync_at = self.get_last_sync_timestamp()?;
        let pending_changes = self.count_pending_changes()?;
        let server_url = std::env::var("SYNC_SERVER_URL").ok();

        Ok(SyncStatus {
            configured: server_url.is_some(),
            authenticated: is_authenticated,
            last_sync_at,
            pending_changes,
            server_url,
        })
    }

    pub async fn sync_now(
        &self,
        app_handle: &tauri::AppHandle,
    ) -> Result<SyncResult, String> {
        let start_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| format!("Time error: {}", e))?
            .as_secs() as i64;

        let (server_url, app_id, api_key, access_token, refresh_token) = {
            let auth = self.auth.lock().map_err(|e| format!("Failed to lock auth: {}", e))?.clone();
            let access_token = auth.get_access_token(app_handle).await?;
            let refresh_token = auth.get_refresh_token(app_handle).await?;
            let server_url = std::env::var("SYNC_SERVER_URL")
                .map_err(|_| "SYNC_SERVER_URL not configured")?;
            let app_id = self.get_app_id(app_handle).await?;
            let api_key = auth.get_stored_api_key(app_handle)?;
            (server_url, app_id, api_key, access_token, refresh_token)
        };

        let config = SyncClientConfig::new(&server_url, &app_id, &api_key);
        let http = ReqwestHttpClient::new();
        let client = QmSyncClient::new(config, http);

        client.set_tokens(access_token, refresh_token, None).await;

        let local_changes = self.collect_local_changes()?;
        let checkpoint = self.get_checkpoint()?;

        println!("Syncing {} local changes, checkpoint: {:?}", local_changes.len(), checkpoint);

        let response = client.delta(local_changes.clone(), checkpoint).await
            .map_err(|e| format!("Sync failed: {}", e))?;

        let mut pushed = 0;
        let mut conflicts = 0;
        let mut pulled = 0;

        if let Some(push) = &response.push {
            pushed = push.synced;
            conflicts = push.conflicts.len();
            self.mark_records_synced(&local_changes, start_time)?;
        }

        if let Some(pull) = &response.pull {
            pulled = pull.records.len();

            let sync_records: Vec<SyncRecord> = pull.records.iter().map(|r| SyncRecord {
                table_name: r.table_name.clone(),
                row_id: r.row_id.clone(),
                data: r.data.clone(),
                version: r.version,
                deleted: r.deleted,
            }).collect();

            self.apply_remote_changes(&sync_records)?;
            self.save_checkpoint(&pull.checkpoint)?;
        }

        Ok(SyncResult {
            pushed,
            pulled,
            conflicts,
            success: true,
            error: None,
            synced_at: start_time,
        })
    }

    /// Collect local changes since last sync
    fn collect_local_changes(&self) -> Result<Vec<SyncRecord>, String> {
        let mut records = Vec::new();

        // Collect soft-deleted records from all synced tables
        for sync_name in SYNCED_TABLES {
            let db_name = sync_to_db(sync_name);
            let deleted_records = self.db.query_deleted_records(db_name).map_err(|e| e.to_string())?;
            for (id, sync_version) in deleted_records {
                records.push(SyncRecord {
                    table_name: sync_name.to_string(),
                    row_id: id,
                    data: serde_json::json!({}),
                    version: sync_version,
                    deleted: true,
                });
            }
        }

        // Collect unsynced active collections
        let user_id = self.db.get_local_user_id();
        let collections = self.db.get_user_collections(user_id).map_err(|e| e.to_string())?;
        for collection in &collections {
            if collection.synced_at.is_none() {
                records.push(self.collection_to_sync_record(collection)?);
            }
        }

        // Collect unsynced vocabularies
        let all_vocabs = self.db.get_all_vocabularies(user_id, None, None).map_err(|e| e.to_string())?;
        for vocab in &all_vocabs {
            if vocab.synced_at.is_none() {
                records.push(self.vocabulary_to_sync_record(vocab)?);
            }
        }

        // Collect unsynced word_progress
        let unsynced_progress = self.db.get_unsynced_word_progress(user_id).map_err(|e| e.to_string())?;
        for progress in &unsynced_progress {
             records.push(self.word_progress_to_sync_record(progress)?);
        }

        // Collect unsynced learning_settings
        if let Some(settings) = self.db.get_learning_settings(user_id).map_err(|e| e.to_string())? {
            if settings.synced_at.is_none() {
                records.push(self.learning_settings_to_sync_record(&settings)?);
            }
        }

        // Collect unsynced practice_sessions
        let unsynced_sessions = self.db.get_unsynced_practice_sessions(user_id).map_err(|e| e.to_string())?;
        for session in &unsynced_sessions {
            records.push(self.practice_session_to_sync_record(session)?);
        }

        // TODO: Collect unsynced practice_progress, user_learning_languages, topics, tags, collection_shared_users
        // These need dedicated getter methods to be added later

        Ok(records)
    }

    fn collection_to_sync_record(&self, collection: &crate::models::Collection) -> Result<SyncRecord, String> {
        let mut data = serde_json::json!({
            "id": collection.id,
            "name": collection.name,
            "description": collection.description,
            "language": collection.language,
            "ownerId": collection.owner_id,
            "isPublic": collection.is_public,
            "wordCount": collection.word_count,
            "createdAt": collection.created_at.timestamp(),
            "updatedAt": collection.updated_at.timestamp(),
            "syncVersion": collection.sync_version,
        });

        if let Some(obj) = data.as_object_mut() {
            obj.retain(|_, v| !v.is_null());
        }

        Ok(SyncRecord {
            table_name: "collections".to_string(),
            row_id: collection.id.clone(),
            data,
            version: collection.sync_version,
            deleted: false,
        })
    }

    fn vocabulary_to_sync_record(&self, vocab: &crate::models::Vocabulary) -> Result<SyncRecord, String> {
        let definitions: Vec<serde_json::Value> = vocab.definitions.iter().map(|d| {
            serde_json::json!({
                "meaning": d.meaning,
                "translation": d.translation,
                "example": d.example,
            })
        }).collect();

        let related_words: Vec<serde_json::Value> = vocab.related_words.iter().map(|r| {
            serde_json::json!({
                "wordId": r.word_id,
                "word": r.word,
                "relationship": format!("{:?}", r.relationship).to_lowercase(),
            })
        }).collect();

        let row_id = vocab.id.clone().unwrap_or_default();
        let mut data = serde_json::json!({
            "id": row_id,
            "word": vocab.word,
            "wordType": format!("{:?}", vocab.word_type).to_lowercase(),
            "level": vocab.level,
            "ipa": vocab.ipa,
            "audioUrl": vocab.audio_url,
            "concept": vocab.concept,
            "language": vocab.language,
            "collectionId": vocab.collection_id,
            "definitions": definitions,
            "exampleSentences": vocab.example_sentences,
            "topics": vocab.topics,
            "tags": vocab.tags,
            "relatedWords": related_words,
            "userId": vocab.user_id,
            "createdAt": vocab.created_at.timestamp(),
            "updatedAt": vocab.updated_at.timestamp(),
            "syncVersion": vocab.sync_version,
        });

        if let Some(obj) = data.as_object_mut() {
            obj.retain(|_, v| !v.is_null());
        }

        Ok(SyncRecord {
            table_name: "vocabularies".to_string(),
            row_id,
            data,
            version: vocab.sync_version,
            deleted: false,
        })
    }

    fn word_progress_to_sync_record(&self, progress: &crate::models::WordProgress) -> Result<SyncRecord, String> {
        let id = progress.id.clone().unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let now = Utc::now().timestamp();
        let mut data = serde_json::json!({
            "id": id,
            "userId": self.db.get_local_user_id(),
            "language": "",
            "vocabularyId": progress.vocabulary_id,
            "word": progress.word,
            "correctCount": progress.correct_count,
            "incorrectCount": progress.incorrect_count,
            "lastPracticed": progress.last_practiced.timestamp(),
            "masteryLevel": progress.mastery_level,
            "nextReviewDate": progress.next_review_date.timestamp(),
            "intervalDays": progress.interval_days,
            "easinessFactor": progress.easiness_factor,
            "consecutiveCorrectCount": progress.consecutive_correct_count,
            "leitnerBox": progress.leitner_box,
            "lastIntervalDays": progress.last_interval_days,
            "totalReviews": progress.total_reviews,
            "failedInSession": progress.failed_in_session,
            "retryCount": progress.retry_count,
            "completedModesInCycle": progress.completed_modes_in_cycle,
            "createdAt": now,
            "updatedAt": now,
            "syncVersion": progress.sync_version,
        });

        if let Some(obj) = data.as_object_mut() {
             obj.retain(|_, v| !v.is_null());
        }

        Ok(SyncRecord {
            table_name: "wordProgress".to_string(),
            row_id: id,
            data,
            version: progress.sync_version,
            deleted: false,
        })
    }

    fn learning_settings_to_sync_record(&self, settings: &crate::models::LearningSettings) -> Result<SyncRecord, String> {
        let mut data = serde_json::json!({
            "id": settings.id,
            "userId": settings.user_id,
            "srAlgorithm": format!("{:?}", settings.sr_algorithm).to_lowercase(),
            "leitnerBoxCount": settings.leitner_box_count,
            "consecutiveCorrectRequired": settings.consecutive_correct_required,
            "showFailedWordsInSession": settings.show_failed_words_in_session,
            "newWordsPerDay": settings.new_words_per_day,
            "dailyReviewLimit": settings.daily_review_limit,
            "autoAdvanceTimeoutSeconds": settings.auto_advance_timeout_seconds,
            "showHintInFillword": settings.show_hint_in_fillword,
            "reminderEnabled": settings.reminder_enabled,
            "reminderTime": settings.reminder_time,
            "createdAt": settings.created_at.timestamp(),
            "updatedAt": settings.updated_at.timestamp(),
            "syncVersion": settings.sync_version,
        });

        if let Some(obj) = data.as_object_mut() {
            obj.retain(|_, v| !v.is_null());
        }

        Ok(SyncRecord {
            table_name: "learningSettings".to_string(),
            row_id: settings.id.clone(),
            data,
            version: settings.sync_version,
            deleted: false,
        })
    }

    fn practice_session_to_sync_record(&self, session: &crate::models::PracticeSession) -> Result<SyncRecord, String> {
        let results: Vec<serde_json::Value> = session.results.iter().map(|r| {
             serde_json::json!({
                "vocabularyId": r.vocabulary_id,
                "word": r.word,
                "correct": r.correct,
                "mode": format!("{:?}", r.mode).to_lowercase(),
                "timeSpentSeconds": r.time_spent_seconds,
             })
        }).collect();

        let mut data = serde_json::json!({
            "id": session.id,
            "userId": session.user_id,
            "collectionId": session.collection_id,
            "mode": format!("{:?}", session.mode).to_lowercase(),
            "language": session.language,
            "topic": session.topic,
            "level": session.level,
            "totalQuestions": session.total_questions,
            "correctAnswers": session.correct_answers,
            "startedAt": session.started_at.timestamp(),
            "completedAt": session.completed_at.timestamp(),
            "durationSeconds": session.duration_seconds,
            "results": results,
            "syncVersion": session.sync_version,
        });

        if let Some(obj) = data.as_object_mut() {
             obj.retain(|_, v| !v.is_null());
        }

        Ok(SyncRecord {
            table_name: "practiceSessions".to_string(),
            row_id: session.id.clone(),
            data,
            version: session.sync_version,
            deleted: false,
        })
    }

    /// Apply remote changes to local database
    /// FK ordering: collections first for inserts, vocabularies first for deletes
    fn apply_remote_changes(&self, records: &[SyncRecord]) -> Result<(), String> {
        let mut non_deleted: Vec<&SyncRecord> = records.iter().filter(|r| !r.deleted).collect();
        let mut deleted: Vec<&SyncRecord> = records.iter().filter(|r| r.deleted).collect();

        // Non-deleted: parents first (collections, topics, tags) -> children
        non_deleted.sort_by_key(|r| match r.table_name.as_str() {
            "topics" => 0,
            "tags" => 1,
            "collections" => 2,
            "userLearningLanguages" => 3,
            "collectionSharedUsers" => 4,
            "vocabularies" => 5,
            "wordProgress" => 6,
            "learningSettings" => 7,
            "practiceSessions" => 8,
            "practiceProgress" => 9,
            _ => 10,
        });

        // Deleted: children first, parents last
        deleted.sort_by_key(|r| match r.table_name.as_str() {
            "practiceProgress" => 0,
            "practiceSessions" => 1,
            "wordProgress" => 2,
            "collectionSharedUsers" => 3,
            "vocabularies" => 4,
            "userLearningLanguages" => 5,
            "collections" => 6,
            "learningSettings" => 7,
            "topics" => 8,
            "tags" => 9,
            _ => 10,
        });

        for record in non_deleted {
            match record.table_name.as_str() {
                "collections" => self.apply_collection_change(record)?,
                "vocabularies" => self.apply_vocabulary_change(record)?,
                "wordProgress" => self.apply_word_progress_change(record)?,
                "learningSettings" => self.apply_learning_settings_change(record)?,
                "practiceSessions" => self.apply_practice_session_change(record)?,
                "practiceProgress" => self.apply_practice_progress_change(record)?,
                "userLearningLanguages" => self.apply_user_learning_language_change(record)?,
                "topics" => self.apply_topic_change(record)?,
                "tags" => self.apply_tag_change(record)?,
                "collectionSharedUsers" => self.apply_collection_shared_user_change(record)?,
                _ => {
                    eprintln!("Unknown table: {}", record.table_name);
                }
            }
        }

        for record in deleted {
            // For remote deletes, just hard-delete locally
            let db_table = sync_to_db(&record.table_name);
            self.db.hard_delete_record(db_table, &record.row_id)
                .map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    fn apply_collection_change(&self, record: &SyncRecord) -> Result<(), String> {
        let data = &record.data;
        let exists = self.db.get_collection(&record.row_id).map_err(|e| e.to_string())?.is_some();

        let name = data["name"].as_str().unwrap_or("").to_string();
        let description = data["description"].as_str().unwrap_or("").to_string();
        let language = data["language"].as_str().unwrap_or("").to_string();
        let is_public = data["isPublic"].as_bool().unwrap_or(false);

        if exists {
            self.db.update_collection(&record.row_id, &name, &description, is_public)
                .map_err(|e| e.to_string())?;
            self.db.execute_sql(
                "UPDATE collections SET sync_version = ?, synced_at = ? WHERE id = ?",
                &[&record.version.to_string(), &chrono::Utc::now().timestamp().to_string(), &record.row_id],
            ).map_err(|e| e.to_string())?;
        } else {
            self.db.import_collection_with_id(
                &record.row_id,
                &name,
                &description,
                &language,
                self.db.get_local_user_id(),
                is_public,
            ).map_err(|e| e.to_string())?;
            self.db.execute_sql(
                "UPDATE collections SET sync_version = ?, synced_at = ? WHERE id = ?",
                &[&record.version.to_string(), &chrono::Utc::now().timestamp().to_string(), &record.row_id],
            ).map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    fn apply_vocabulary_change(&self, record: &SyncRecord) -> Result<(), String> {
        let data = &record.data;
        let exists = self.db.get_vocabulary(&record.row_id).map_err(|e| e.to_string())?.is_some();

        let collection_id = data["collectionId"].as_str()
            .ok_or("Missing collectionId")?
            .to_string();

        let definitions: Vec<crate::models::Definition> = data["definitions"]
            .as_array()
            .map(|arr| {
                arr.iter().map(|d| crate::models::Definition {
                    meaning: d["meaning"].as_str().unwrap_or("").to_string(),
                    translation: d["translation"].as_str().map(|s| s.to_string()),
                    example: d["example"].as_str().map(|s| s.to_string()),
                }).collect()
            })
            .unwrap_or_default();

        let example_sentences: Vec<String> = data["exampleSentences"]
            .as_array()
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
            .unwrap_or_default();

        let topics: Vec<String> = data["topics"]
            .as_array()
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
            .unwrap_or_default();

        let tags: Vec<String> = data["tags"]
            .as_array()
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
            .unwrap_or_default();

        let related_words: Vec<crate::models::RelatedWord> = data["relatedWords"]
            .as_array()
            .map(|arr| {
                arr.iter().map(|r| crate::models::RelatedWord {
                    word_id: r["wordId"].as_str().unwrap_or("").to_string(),
                    word: r["word"].as_str().unwrap_or("").to_string(),
                    relationship: crate::db::helpers::parse_word_relationship(
                        r["relationship"].as_str().unwrap_or("related"),
                    ),
                }).collect()
            })
            .unwrap_or_default();

        let word_type_str = data["wordType"].as_str().unwrap_or("n/a");
        let word_type = crate::db::helpers::parse_word_type(word_type_str);

        let vocab = crate::models::Vocabulary {
            id: Some(record.row_id.clone()),
            word: data["word"].as_str().unwrap_or("").to_string(),
            word_type,
            level: data["level"].as_str().unwrap_or("").to_string(),
            ipa: data["ipa"].as_str().unwrap_or("").to_string(),
            audio_url: data["audioUrl"].as_str().map(|s| s.to_string()),
            concept: data["concept"].as_str().map(|s| s.to_string()),
            definitions,
            example_sentences,
            topics,
            tags,
            related_words,
            language: data["language"].as_str().unwrap_or("").to_string(),
            collection_id,
            user_id: self.db.get_local_user_id().to_string(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            sync_version: record.version,
            synced_at: Some(chrono::Utc::now().timestamp()),
        };

        if exists {
            let update_req = crate::models::UpdateVocabularyRequest {
                id: record.row_id.clone(),
                word: Some(vocab.word.clone()),
                word_type: Some(vocab.word_type.clone()),
                level: Some(vocab.level.clone()),
                ipa: Some(vocab.ipa.clone()),
                audio_url: vocab.audio_url.clone(),
                concept: vocab.concept.clone(),
                definitions: Some(vocab.definitions.clone()),
                example_sentences: Some(vocab.example_sentences.clone()),
                topics: Some(vocab.topics.clone()),
                tags: Some(vocab.tags.clone()),
                related_words: Some(vocab.related_words.clone()),
                collection_id: Some(vocab.collection_id.clone()),
            };
            self.db.update_vocabulary(&record.row_id, &update_req).map_err(|e| e.to_string())?;
        } else {
            self.db.import_vocabulary_with_id(&vocab).map_err(|e| e.to_string())?;
        }

        self.db.execute_sql(
            "UPDATE vocabularies SET sync_version = ?, synced_at = ? WHERE id = ?",
            &[&record.version.to_string(), &chrono::Utc::now().timestamp().to_string(), &record.row_id],
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    fn apply_word_progress_change(&self, record: &SyncRecord) -> Result<(), String> {
        self.db.import_word_progress(record).map_err(|e| e.to_string())?;
        self.db.execute_sql(
            "UPDATE word_progress SET sync_version = ?, synced_at = ? WHERE id = ?",
            &[&record.version.to_string(), &chrono::Utc::now().timestamp().to_string(), &record.row_id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn apply_learning_settings_change(&self, record: &SyncRecord) -> Result<(), String> {
        self.db.import_learning_settings(record).map_err(|e| e.to_string())?;
        self.db.execute_sql(
            "UPDATE learning_settings SET sync_version = ?, synced_at = ? WHERE id = ?",
            &[&record.version.to_string(), &chrono::Utc::now().timestamp().to_string(), &record.row_id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn apply_practice_session_change(&self, record: &SyncRecord) -> Result<(), String> {
        self.db.import_practice_session(record).map_err(|e| e.to_string())?;
        self.db.execute_sql(
            "UPDATE practice_sessions SET sync_version = ?, synced_at = ? WHERE id = ?",
            &[&record.version.to_string(), &chrono::Utc::now().timestamp().to_string(), &record.row_id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn apply_practice_progress_change(&self, record: &SyncRecord) -> Result<(), String> {
        let data = &record.data;
        let now = Utc::now().timestamp();
        self.db.execute_sql(
            "INSERT INTO practice_progress (id, user_id, language, total_sessions, total_words_practiced, current_streak, longest_streak, last_practice_date, created_at, updated_at, sync_version, synced_at)
             VALUES (?, 'local', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                total_sessions = excluded.total_sessions,
                total_words_practiced = excluded.total_words_practiced,
                current_streak = excluded.current_streak,
                longest_streak = excluded.longest_streak,
                last_practice_date = excluded.last_practice_date,
                updated_at = excluded.updated_at,
                sync_version = excluded.sync_version,
                synced_at = excluded.synced_at",
            &[
                &record.row_id,
                data["language"].as_str().unwrap_or("en"),
                &data["totalSessions"].as_i64().unwrap_or(0).to_string(),
                &data["totalWordsPracticed"].as_i64().unwrap_or(0).to_string(),
                &data["currentStreak"].as_i64().unwrap_or(0).to_string(),
                &data["longestStreak"].as_i64().unwrap_or(0).to_string(),
                &data["lastPracticeDate"].as_i64().unwrap_or(now).to_string(),
                &data["createdAt"].as_i64().unwrap_or(now).to_string(),
                &data["updatedAt"].as_i64().unwrap_or(now).to_string(),
                &record.version.to_string(),
                &now.to_string(),
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn apply_user_learning_language_change(&self, record: &SyncRecord) -> Result<(), String> {
        let data = &record.data;
        let now = Utc::now().timestamp();
        self.db.execute_sql(
            "INSERT INTO user_learning_languages (id, user_id, language, created_at, sync_version, synced_at)
             VALUES (?, 'local', ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                language = excluded.language,
                sync_version = excluded.sync_version,
                synced_at = excluded.synced_at",
            &[
                &record.row_id,
                data["language"].as_str().unwrap_or("en"),
                &data["createdAt"].as_i64().unwrap_or(now).to_string(),
                &record.version.to_string(),
                &now.to_string(),
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn apply_topic_change(&self, record: &SyncRecord) -> Result<(), String> {
        let data = &record.data;
        let now = Utc::now().timestamp();
        self.db.execute_sql(
            "INSERT INTO topics (id, name, created_at, sync_version, synced_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                sync_version = excluded.sync_version,
                synced_at = excluded.synced_at",
            &[
                &record.row_id,
                data["name"].as_str().unwrap_or(""),
                &data["createdAt"].as_i64().unwrap_or(now).to_string(),
                &record.version.to_string(),
                &now.to_string(),
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn apply_tag_change(&self, record: &SyncRecord) -> Result<(), String> {
        let data = &record.data;
        let now = Utc::now().timestamp();
        self.db.execute_sql(
            "INSERT INTO tags (id, name, created_at, sync_version, synced_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                sync_version = excluded.sync_version,
                synced_at = excluded.synced_at",
            &[
                &record.row_id,
                data["name"].as_str().unwrap_or(""),
                &data["createdAt"].as_i64().unwrap_or(now).to_string(),
                &record.version.to_string(),
                &now.to_string(),
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn apply_collection_shared_user_change(&self, record: &SyncRecord) -> Result<(), String> {
        let data = &record.data;
        let now = Utc::now().timestamp();
        self.db.execute_sql(
            "INSERT INTO collection_shared_users (id, collection_id, user_id, created_at, sync_version, synced_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                sync_version = excluded.sync_version,
                synced_at = excluded.synced_at",
            &[
                &record.row_id,
                data["collectionId"].as_str().unwrap_or(""),
                data["userId"].as_str().unwrap_or("local"),
                &data["createdAt"].as_i64().unwrap_or(now).to_string(),
                &record.version.to_string(),
                &now.to_string(),
            ],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    fn mark_records_synced(&self, records: &[SyncRecord], synced_at: i64) -> Result<(), String> {
        for record in records {
            let db_table = sync_to_db(&record.table_name);
            if record.deleted {
                // After push confirmed, hard-delete the soft-deleted record
                self.db.hard_delete_record(db_table, &record.row_id)
                    .map_err(|e| e.to_string())?;
            } else {
                let query = format!(
                    "UPDATE {} SET synced_at = ?, sync_version = sync_version + 1 WHERE id = ?",
                    db_table
                );
                self.db
                    .execute_sql(&query, &[&synced_at.to_string(), &record.row_id])
                    .map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }

    fn get_checkpoint(&self) -> Result<Option<Checkpoint>, String> {
        let result = self.db.get_checkpoint().map_err(|e| e.to_string())?;
        match result {
            Some((updated_at_str, id)) => {
                let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|e| format!("Failed to parse checkpoint timestamp: {}", e))?;
                Ok(Some(Checkpoint::new(updated_at, id)))
            }
            None => Ok(None),
        }
    }

    fn save_checkpoint(&self, checkpoint: &Checkpoint) -> Result<(), String> {
        let updated_at_str = checkpoint.updated_at.to_rfc3339();
        self.db.save_checkpoint(&updated_at_str, &checkpoint.id)
            .map_err(|e| e.to_string())
    }

    fn get_last_sync_timestamp(&self) -> Result<Option<i64>, String> {
        let result = self.db.get_checkpoint().map_err(|e| e.to_string())?;
        match result {
            Some((updated_at_str, _)) => {
                let updated_at = DateTime::parse_from_rfc3339(&updated_at_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .map_err(|e| format!("Failed to parse checkpoint timestamp: {}", e))?;
                Ok(Some(updated_at.timestamp()))
            }
            None => Ok(None),
        }
    }

    fn count_pending_changes(&self) -> Result<usize, String> {
        let mut count = 0;

        // Count unsynced active records
        for sync_name in SYNCED_TABLES {
            let db_table = sync_to_db(sync_name);
            let query = format!(
                "SELECT COUNT(*) FROM {} WHERE synced_at IS NULL",
                db_table
            );
            count += self.db
                .query_count(&query)
                .map_err(|e| e.to_string())?;
        }

        Ok(count)
    }

    async fn get_app_id(&self, app_handle: &tauri::AppHandle) -> Result<String, String> {
        use tauri_plugin_store::StoreExt;

        let store = app_handle
            .store("auth.json")
            .map_err(|e| format!("Failed to access store: {}", e))?;

        store
            .get("app_id")
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .ok_or_else(|| "No app ID found".to_string())
    }
}
