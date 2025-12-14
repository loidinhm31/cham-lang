use chrono::Utc;
use rusqlite::{params, Result as SqlResult};
use uuid::Uuid;

use super::helpers::timestamp_to_datetime;
use super::LocalDatabase;
use crate::models::{
    LearningSettings, SpacedRepetitionAlgorithm, UpdateLearningSettingsRequest
};

impl LocalDatabase {
    //==========================================================================
    // LEARNING SETTINGS OPERATIONS
    //==========================================================================

    /// Get learning settings for a user
    pub fn get_learning_settings(
        &self,
        user_id: &str,
    ) -> SqlResult<Option<LearningSettings>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, sr_algorithm, leitner_box_count, consecutive_correct_required,
                    show_failed_words_in_session, new_words_per_day, daily_review_limit,
                    auto_advance_timeout_seconds, show_hint_in_fillword,
                    created_at, updated_at
             FROM learning_settings
             WHERE user_id = ?1"
        )?;

        let mut rows = stmt.query(params![user_id])?;

        if let Some(row) = rows.next()? {
            let sr_algorithm_str: String = row.get(1)?;
            let sr_algorithm: SpacedRepetitionAlgorithm =
                serde_json::from_str(&format!("\"{}\"", sr_algorithm_str))
                    .unwrap_or(SpacedRepetitionAlgorithm::ModifiedSM2);

            Ok(Some(LearningSettings {
                id: row.get(0)?,
                user_id: user_id.to_string(),
                sr_algorithm,
                leitner_box_count: row.get(2)?,
                consecutive_correct_required: row.get(3)?,
                show_failed_words_in_session: row.get::<_, i32>(4)? != 0,
                new_words_per_day: row.get(5)?,
                daily_review_limit: row.get(6)?,
                auto_advance_timeout_seconds: row.get::<_, Option<i32>>(7)?.unwrap_or(2),
                show_hint_in_fillword: row.get::<_, Option<i32>>(8)?.unwrap_or(1) != 0,
                created_at: timestamp_to_datetime(row.get(9)?),
                updated_at: timestamp_to_datetime(row.get(10)?),
            }))
        } else {
            Ok(None)
        }
    }

    /// Create new learning settings for a user
    pub fn create_learning_settings(
        &self,
        user_id: &str,
        sr_algorithm: &SpacedRepetitionAlgorithm,
        leitner_box_count: i32,
        consecutive_correct_required: i32,
        show_failed_words_in_session: bool,
        new_words_per_day: Option<i32>,
        daily_review_limit: Option<i32>,
        auto_advance_timeout_seconds: i32,
        show_hint_in_fillword: bool,
    ) -> SqlResult<LearningSettings> {
        let conn = self.conn.lock().unwrap();
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let sr_algorithm_str = match sr_algorithm {
            SpacedRepetitionAlgorithm::SM2 => "sm2",
            SpacedRepetitionAlgorithm::ModifiedSM2 => "modifiedsm2",
            SpacedRepetitionAlgorithm::Simple => "simple",
        };

        conn.execute(
            "INSERT INTO learning_settings
             (id, user_id, sr_algorithm, leitner_box_count, consecutive_correct_required,
              show_failed_words_in_session, new_words_per_day, daily_review_limit,
              auto_advance_timeout_seconds, show_hint_in_fillword, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                &id,
                user_id,
                sr_algorithm_str,
                leitner_box_count,
                consecutive_correct_required,
                if show_failed_words_in_session { 1 } else { 0 },
                new_words_per_day,
                daily_review_limit,
                auto_advance_timeout_seconds,
                if show_hint_in_fillword { 1 } else { 0 },
                now.timestamp(),
                now.timestamp(),
            ],
        )?;

        Ok(LearningSettings {
            id,
            user_id: user_id.to_string(),
            sr_algorithm: sr_algorithm.clone(),
            leitner_box_count,
            consecutive_correct_required,
            show_failed_words_in_session,
            new_words_per_day,
            daily_review_limit,
            auto_advance_timeout_seconds,
            show_hint_in_fillword,
            created_at: now,
            updated_at: now,
        })
    }

    /// Update learning settings for a user
    pub fn update_learning_settings(
        &self,
        user_id: &str,
        request: &UpdateLearningSettingsRequest,
    ) -> SqlResult<LearningSettings> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now();

        // Get existing settings
        let mut stmt = conn.prepare(
            "SELECT id, sr_algorithm, leitner_box_count, consecutive_correct_required,
                    show_failed_words_in_session, new_words_per_day, daily_review_limit,
                    auto_advance_timeout_seconds, show_hint_in_fillword, created_at
             FROM learning_settings
             WHERE user_id = ?1"
        )?;

        let mut rows = stmt.query(params![user_id])?;

        if let Some(row) = rows.next()? {
            let id: String = row.get(0)?;
            let current_algorithm_str: String = row.get(1)?;
            let current_algorithm: SpacedRepetitionAlgorithm =
                serde_json::from_str(&format!("\"{}\"", current_algorithm_str))
                    .unwrap_or(SpacedRepetitionAlgorithm::ModifiedSM2);

            // Extract all values from the row before dropping
            let current_leitner_box_count: i32 = row.get(2)?;
            let current_consecutive_correct: i32 = row.get(3)?;
            let current_show_failed: i32 = row.get(4)?;
            let current_new_words: Option<i32> = row.get(5)?;
            let current_review_limit: Option<i32> = row.get(6)?;
            let current_timeout: i32 = row.get::<_, Option<i32>>(7)?.unwrap_or(2);
            let current_show_hint: i32 = row.get::<_, Option<i32>>(8)?.unwrap_or(1);
            let created_at = timestamp_to_datetime(row.get(9)?);

            drop(rows);
            drop(stmt);

            // Build update values
            let sr_algorithm = request.sr_algorithm.as_ref().unwrap_or(&current_algorithm);
            let leitner_box_count = request.leitner_box_count.unwrap_or(current_leitner_box_count);
            let consecutive_correct_required = request.consecutive_correct_required.unwrap_or(current_consecutive_correct);
            let show_failed_words_in_session = request.show_failed_words_in_session.unwrap_or(current_show_failed != 0);
            let new_words_per_day = request.new_words_per_day.or(current_new_words);
            let daily_review_limit = request.daily_review_limit.or(current_review_limit);
            let auto_advance_timeout_seconds = request.auto_advance_timeout_seconds.unwrap_or(current_timeout);
            let show_hint_in_fillword = request.show_hint_in_fillword.unwrap_or(current_show_hint != 0);

            let sr_algorithm_str = match sr_algorithm {
                SpacedRepetitionAlgorithm::SM2 => "sm2",
                SpacedRepetitionAlgorithm::ModifiedSM2 => "modifiedsm2",
                SpacedRepetitionAlgorithm::Simple => "simple",
            };

            conn.execute(
                "UPDATE learning_settings
                 SET sr_algorithm = ?1, leitner_box_count = ?2, consecutive_correct_required = ?3,
                     show_failed_words_in_session = ?4, new_words_per_day = ?5, daily_review_limit = ?6,
                     auto_advance_timeout_seconds = ?7, show_hint_in_fillword = ?8, updated_at = ?9
                 WHERE user_id = ?10",
                params![
                    sr_algorithm_str,
                    leitner_box_count,
                    consecutive_correct_required,
                    if show_failed_words_in_session { 1 } else { 0 },
                    new_words_per_day,
                    daily_review_limit,
                    auto_advance_timeout_seconds,
                    if show_hint_in_fillword { 1 } else { 0 },
                    now.timestamp(),
                    user_id,
                ],
            )?;

            Ok(LearningSettings {
                id,
                user_id: user_id.to_string(),
                sr_algorithm: sr_algorithm.clone(),
                leitner_box_count,
                consecutive_correct_required,
                show_failed_words_in_session,
                new_words_per_day,
                daily_review_limit,
                auto_advance_timeout_seconds,
                show_hint_in_fillword,
                created_at,
                updated_at: now,
            })
        } else {
            // If no settings exist, create default ones first
            let default_algorithm = request.sr_algorithm.as_ref().unwrap_or(&SpacedRepetitionAlgorithm::ModifiedSM2);
            self.create_learning_settings(
                user_id,
                default_algorithm,
                request.leitner_box_count.unwrap_or(5),
                request.consecutive_correct_required.unwrap_or(3),
                request.show_failed_words_in_session.unwrap_or(true),
                request.new_words_per_day.or(Some(20)),
                request.daily_review_limit.or(Some(100)),
                request.auto_advance_timeout_seconds.unwrap_or(2),
                request.show_hint_in_fillword.unwrap_or(true),
            )
        }
    }

    /// Get learning settings for a user, creating default settings if none exist
    pub fn get_or_create_learning_settings(
        &self,
        user_id: &str,
    ) -> SqlResult<LearningSettings> {
        if let Some(settings) = self.get_learning_settings(user_id)? {
            Ok(settings)
        } else {
            // Create default settings
            self.create_learning_settings(
                user_id,
                &SpacedRepetitionAlgorithm::ModifiedSM2,
                5, // 5 boxes
                3, // 3 consecutive correct required
                true, // show failed words in session
                Some(20), // 20 new words per day
                Some(100), // 100 daily review limit
                2, // 2 seconds auto-advance timeout
                true, // show hint in fillword
            )
        }
    }
}
