use rusqlite::{Result as SqlResult, params};
use chrono::Utc;
use uuid::Uuid;

use crate::models::{
    UpdateProgressRequest, UserPracticeProgress, WordProgress,
    CreatePracticeSessionRequest, PracticeSession, PracticeResult, PracticeMode,
};
use super::LocalDatabase;
use super::helpers::timestamp_to_datetime;

impl LocalDatabase {
    pub fn update_practice_progress(
        &self,
        request: &UpdateProgressRequest,
        user_id: &str,
    ) -> SqlResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().timestamp();

        // Check if word_progress exists
        let existing_word_progress: Option<String> = conn
            .query_row(
                "SELECT id FROM word_progress
                 WHERE user_id = ?1 AND language = ?2 AND vocabulary_id = ?3",
                params![user_id, request.language, request.vocabulary_id],
                |row| row.get(0),
            )
            .ok();

        // Parse next_review_date from ISO string to timestamp
        let next_review_timestamp = chrono::DateTime::parse_from_rfc3339(&request.next_review_date)
            .map(|dt| dt.timestamp())
            .unwrap_or(now);

        if let Some(word_progress_id) = existing_word_progress {
            // Update existing word progress with all spaced repetition fields
            conn.execute(
                "UPDATE word_progress
                 SET correct_count = ?1,
                     incorrect_count = ?2,
                     total_reviews = ?3,
                     next_review_date = ?4,
                     interval_days = ?5,
                     easiness_factor = ?6,
                     consecutive_correct_count = ?7,
                     leitner_box = ?8,
                     last_interval_days = ?9,
                     last_practiced = ?10,
                     updated_at = ?11,
                     mastery_level = CAST(
                         ROUND((CAST(?12 AS REAL) / NULLIF(?13, 0)) * 5.0)
                         AS INTEGER)
                 WHERE id = ?14",
                params![
                    request.correct_count,
                    request.incorrect_count,
                    request.total_reviews,
                    next_review_timestamp,
                    request.interval_days,
                    request.easiness_factor,
                    request.consecutive_correct_count,
                    request.leitner_box,
                    request.last_interval_days,
                    now,
                    now,
                    request.correct_count,
                    request.correct_count + request.incorrect_count,
                    word_progress_id
                ],
            )?;
        } else {
            // Create new word progress using values from request
            let word_progress_id = Uuid::new_v4().to_string();
            let mastery = if request.correct_count + request.incorrect_count > 0 {
                ((request.correct_count as f32 / (request.correct_count + request.incorrect_count) as f32) * 5.0).round() as i32
            } else {
                0
            };

            conn.execute(
                "INSERT INTO word_progress
                 (id, user_id, language, vocabulary_id, word, correct_count, incorrect_count,
                  total_reviews, mastery_level, next_review_date, interval_days, easiness_factor,
                  consecutive_correct_count, leitner_box, last_interval_days, failed_in_session,
                  retry_count, last_practiced, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
                params![
                    word_progress_id,
                    user_id,
                    request.language,
                    request.vocabulary_id,
                    request.word,
                    request.correct_count,
                    request.incorrect_count,
                    request.total_reviews,
                    mastery,
                    next_review_timestamp,
                    request.interval_days,
                    request.easiness_factor,
                    request.consecutive_correct_count,
                    request.leitner_box,
                    request.last_interval_days,
                    0, // failed_in_session (FALSE)
                    0, // retry_count
                    now, // last_practiced
                    now, // created_at
                    now, // updated_at
                ],
            )?;
        }

        // Update word_progress_completed_modes table
        // First, get the word_progress_id (either existing or newly created)
        let word_progress_id: String = conn.query_row(
            "SELECT id FROM word_progress
             WHERE user_id = ?1 AND language = ?2 AND vocabulary_id = ?3",
            params![user_id, request.language, request.vocabulary_id],
            |row| row.get(0),
        )?;

        // Delete existing completed modes for this word
        conn.execute(
            "DELETE FROM word_progress_completed_modes WHERE word_progress_id = ?1",
            params![word_progress_id],
        )?;

        // Insert new completed modes
        for mode in &request.completed_modes_in_cycle {
            let completed_mode_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO word_progress_completed_modes
                 (id, word_progress_id, practice_mode, completed_at)
                 VALUES (?1, ?2, ?3, ?4)",
                params![completed_mode_id, word_progress_id, mode, now],
            )?;
        }

        // Ensure practice_progress header exists
        let progress_exists: bool = conn
            .query_row(
                "SELECT 1 FROM practice_progress WHERE user_id = ?1 AND language = ?2",
                params![user_id, request.language],
                |_row| Ok(true),
            )
            .unwrap_or(false);

        if !progress_exists {
            // Create practice_progress header
            let progress_id = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO practice_progress
                 (id, user_id, language, total_sessions, total_words_practiced,
                  current_streak, longest_streak, last_practice_date, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 0, 1, 0, 0, ?4, ?5, ?6)",
                params![progress_id, user_id, request.language, now, now, now],
            )?;
        } else {
            // Update practice_progress header
            conn.execute(
                "UPDATE practice_progress
                 SET last_practice_date = ?1,
                     updated_at = ?2,
                     total_words_practiced = (
                         SELECT COUNT(DISTINCT vocabulary_id)
                         FROM word_progress
                         WHERE user_id = ?3 AND language = ?4
                     )
                 WHERE user_id = ?5 AND language = ?6",
                params![now, now, user_id, request.language, user_id, request.language],
            )?;
        }

        Ok(())
    }

    /// Get practice progress for a language (normalized version)
    pub fn get_practice_progress(
        &self,
        user_id: &str,
        language: &str,
    ) -> SqlResult<Option<UserPracticeProgress>> {
        let conn = self.conn.lock().unwrap();

        // Get practice_progress header
        let mut stmt = conn.prepare(
            "SELECT id, language, total_sessions, total_words_practiced,
                    current_streak, longest_streak, last_practice_date, created_at, updated_at
             FROM practice_progress
             WHERE user_id = ?1 AND language = ?2"
        )?;

        let mut rows = stmt.query(params![user_id, language])?;

        if let Some(row) = rows.next()? {
            let progress_id: String = row.get(0)?;
            let language: String = row.get(1)?;
            let total_sessions: i32 = row.get(2)?;
            let total_words_practiced: i32 = row.get(3)?;
            let current_streak: i32 = row.get(4)?;
            let longest_streak: i32 = row.get(5)?;
            let last_practice_date = timestamp_to_datetime(row.get(6)?);
            let created_at = timestamp_to_datetime(row.get(7)?);
            let updated_at = timestamp_to_datetime(row.get(8)?);

            drop(rows);
            drop(stmt);

            // Fetch all word progress for this user/language
            let mut word_stmt = conn.prepare(
                "SELECT id, vocabulary_id, word, correct_count, incorrect_count,
                        total_reviews, mastery_level, next_review_date, interval_days,
                        easiness_factor, consecutive_correct_count, leitner_box,
                        last_interval_days, failed_in_session, retry_count, last_practiced
                 FROM word_progress
                 WHERE user_id = ?1 AND language = ?2
                 ORDER BY last_practiced DESC"
            )?;

            let words_progress: Vec<WordProgress> = word_stmt
                .query_map(params![user_id, language], |row| {
                    let word_progress_id: String = row.get(0)?;
                    let vocabulary_id: String = row.get(1)?;
                    let word: String = row.get(2)?;
                    let correct_count: i32 = row.get(3)?;
                    let incorrect_count: i32 = row.get(4)?;
                    let total_reviews: i32 = row.get(5)?;
                    let mastery_level: i32 = row.get(6)?;
                    let next_review_date = timestamp_to_datetime(row.get(7)?);
                    let interval_days: i32 = row.get(8)?;
                    let easiness_factor: f32 = row.get(9)?;
                    let consecutive_correct_count: i32 = row.get(10)?;
                    let leitner_box: i32 = row.get(11)?;
                    let last_interval_days: i32 = row.get(12)?;
                    let failed_in_session: bool = row.get::<_, i32>(13)? != 0;
                    let retry_count: i32 = row.get(14)?;
                    let last_practiced = timestamp_to_datetime(row.get(15)?);

                    // Fetch completed modes for this word progress
                    let mut mode_stmt = conn.prepare(
                        "SELECT practice_mode FROM word_progress_completed_modes WHERE word_progress_id = ?1"
                    ).unwrap();
                    let completed_modes: Vec<String> = mode_stmt
                        .query_map(params![&word_progress_id], |r| r.get(0))
                        .unwrap()
                        .collect::<Result<Vec<_>, _>>()
                        .unwrap_or_else(|_| Vec::new());

                    Ok(WordProgress {
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
                        completed_modes_in_cycle: completed_modes,
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;

            Ok(Some(UserPracticeProgress {
                id: progress_id,
                user_id: user_id.to_string(),
                language,
                words_progress,
                total_sessions,
                total_words_practiced,
                current_streak,
                longest_streak,
                last_practice_date,
                created_at,
                updated_at,
            }))
        } else {
            Ok(None)
        }
    }

    /// Create a practice session with results (normalized version)
    pub fn create_practice_session(
        &self,
        request: &CreatePracticeSessionRequest,
        user_id: &str,
    ) -> SqlResult<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().timestamp();

        let correct_count = request.results.iter().filter(|r| r.correct).count() as i32;
        let total_count = request.results.len() as i32;

        let mut conn = self.conn.lock().unwrap();
        let tx = conn.transaction()?;

        // Convert PracticeMode enum to lowercase string
        let mode_str = match &request.mode {
            PracticeMode::Flashcard => "flashcard",
            PracticeMode::FillWord => "fillword",
            PracticeMode::MultipleChoice => "multiplechoice",
        };

        // Insert practice session
        tx.execute(
            "INSERT INTO practice_sessions
             (id, user_id, collection_id, mode, language, topic, level,
              total_questions, correct_answers, started_at, completed_at, duration_seconds)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                id,
                user_id,
                request.collection_id,
                mode_str,
                request.language,
                request.topic,
                request.level,
                total_count,
                correct_count,
                now - request.duration_seconds as i64,
                now,
                request.duration_seconds,
            ],
        )?;

        // Insert practice results
        for (index, result) in request.results.iter().enumerate() {
            let result_id = Uuid::new_v4().to_string();
            let result_mode_str = match &result.mode {
                PracticeMode::Flashcard => "flashcard",
                PracticeMode::FillWord => "fillword",
                PracticeMode::MultipleChoice => "multiplechoice",
            };

            tx.execute(
                "INSERT INTO practice_results
                 (id, session_id, vocabulary_id, word, correct, practice_mode, time_spent_seconds, order_index, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    result_id,
                    id,
                    result.vocabulary_id,
                    result.word,
                    if result.correct { 1 } else { 0 },
                    result_mode_str,
                    result.time_spent_seconds,
                    index as i32,
                    now,
                ],
            )?;
        }

        tx.commit()?;
        Ok(id)
    }

    /// Get practice sessions for a user/language (normalized version)
    pub fn get_practice_sessions(
        &self,
        user_id: &str,
        language: &str,
        limit: Option<i64>,
    ) -> SqlResult<Vec<PracticeSession>> {
        let conn = self.conn.lock().unwrap();

        let sql = format!(
            "SELECT id, collection_id, mode, language, topic, level,
                    total_questions, correct_answers, started_at, completed_at, duration_seconds
             FROM practice_sessions
             WHERE user_id = ?1 AND language = ?2
             ORDER BY completed_at DESC
             LIMIT {}",
            limit.unwrap_or(50)
        );

        let mut stmt = conn.prepare(&sql)?;
        let session_rows = stmt.query_map(params![user_id, language], |row| {
            Ok((
                row.get::<_, String>(0)?,  // id
                row.get::<_, String>(1)?,  // collection_id
                row.get::<_, String>(2)?,  // mode
                row.get::<_, String>(3)?,  // language
                row.get::<_, Option<String>>(4)?,  // topic
                row.get::<_, Option<String>>(5)?,  // level
                row.get::<_, i32>(6)?,     // total_questions
                row.get::<_, i32>(7)?,     // correct_answers
                row.get::<_, i64>(8)?,     // started_at
                row.get::<_, i64>(9)?,     // completed_at
                row.get::<_, i32>(10)?,    // duration_seconds
            ))
        })?;

        let session_data: Vec<_> = session_rows.collect::<Result<Vec<_>, _>>()?;

        drop(stmt);

        // Fetch results for each session
        let mut sessions = Vec::new();
        for (session_id, collection_id, mode_str, language, topic, level,
             total_questions, correct_answers, started_at, completed_at, duration_seconds) in session_data
        {
            // Parse mode
            let mode = match mode_str.as_str() {
                "flashcard" => PracticeMode::Flashcard,
                "fillword" => PracticeMode::FillWord,
                "multiplechoice" => PracticeMode::MultipleChoice,
                _ => PracticeMode::Flashcard, // Default
            };

            // Fetch results for this session
            let mut result_stmt = conn.prepare(
                "SELECT vocabulary_id, word, correct, practice_mode, time_spent_seconds
                 FROM practice_results
                 WHERE session_id = ?1
                 ORDER BY order_index"
            )?;

            let results: Vec<PracticeResult> = result_stmt
                .query_map(params![&session_id], |row| {
                    let result_mode_str: String = row.get(3)?;
                    let result_mode = match result_mode_str.as_str() {
                        "flashcard" => PracticeMode::Flashcard,
                        "fillword" => PracticeMode::FillWord,
                        "multiplechoice" => PracticeMode::MultipleChoice,
                        _ => PracticeMode::Flashcard,
                    };

                    Ok(PracticeResult {
                        vocabulary_id: row.get::<_, Option<String>>(0)?.unwrap_or_default(),
                        word: row.get(1)?,
                        correct: row.get::<_, i32>(2)? != 0,
                        mode: result_mode,
                        time_spent_seconds: row.get::<_, Option<i32>>(4)?.unwrap_or(0),
                    })
                })?
                .collect::<Result<Vec<_>, _>>()?;

            sessions.push(PracticeSession {
                id: session_id,
                user_id: user_id.to_string(),
                collection_id,
                mode,
                language,
                topic,
                level,
                results,
                total_questions,
                correct_answers,
                started_at: timestamp_to_datetime(started_at),
                completed_at: timestamp_to_datetime(completed_at),
                duration_seconds,
            });
        }

        Ok(sessions)
    }
}
