use tauri::State;
use mongodb::bson::{doc, to_document};
use chrono::Utc;
use futures::stream::TryStreamExt;

use crate::database::{DatabaseManager, parse_object_id};
use crate::models::{
    Vocabulary, CreateVocabularyRequest, UpdateVocabularyRequest,
    SearchQuery, UserPreferences, PracticeSession, CreatePracticeSessionRequest,
    UserPracticeProgress, WordProgress, UpdateProgressRequest
};

// Database connection commands
#[tauri::command]
pub async fn connect_database(
    db_manager: State<'_, DatabaseManager>,
    connection_string: String,
) -> Result<String, String> {
    db_manager.connect(&connection_string).await?;
    Ok("Connected successfully".to_string())
}

#[tauri::command]
pub async fn disconnect_database(db_manager: State<'_, DatabaseManager>) -> Result<String, String> {
    db_manager.disconnect().await?;
    Ok("Disconnected successfully".to_string())
}

#[tauri::command]
pub async fn is_database_connected(db_manager: State<'_, DatabaseManager>) -> Result<bool, String> {
    Ok(db_manager.is_connected().await)
}

// Vocabulary CRUD commands
#[tauri::command]
pub async fn create_vocabulary(
    db_manager: State<'_, DatabaseManager>,
    user_id: String,
    request: CreateVocabularyRequest,
) -> Result<String, String> {
    let collection = db_manager.get_vocabulary_collection().await?;

    let now = Utc::now();
    let vocabulary = Vocabulary {
        id: None,
        word: request.word,
        word_type: request.word_type,
        level: request.level,
        ipa: request.ipa,
        definitions: request.definitions,
        example_sentences: request.example_sentences,
        topics: request.topics,
        related_words: request.related_words,
        language: request.language,
        collection_id: request.collection_id.clone(),
        user_id,
        created_at: now,
        updated_at: now,
    };

    let result = collection
        .insert_one(&vocabulary)
        .await
        .map_err(|e| format!("Failed to create vocabulary: {}", e))?;

    // Update collection word count
    let _ = crate::collection_commands::update_collection_word_count(db_manager.clone(), request.collection_id).await;

    Ok(result.inserted_id.as_object_id().unwrap().to_hex())
}

#[tauri::command]
pub async fn get_vocabulary(
    db_manager: State<'_, DatabaseManager>,
    id: String,
) -> Result<Vocabulary, String> {
    let collection = db_manager.get_vocabulary_collection().await?;
    let object_id = parse_object_id(&id)?;

    let vocabulary = collection
        .find_one(doc! {"_id": object_id})
        .await
        .map_err(|e| format!("Failed to get vocabulary: {}", e))?
        .ok_or_else(|| "Vocabulary not found".to_string())?;

    Ok(vocabulary)
}

#[tauri::command]
pub async fn get_all_vocabularies(
    db_manager: State<'_, DatabaseManager>,
    language: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<Vocabulary>, String> {
    let collection = db_manager.get_vocabulary_collection().await?;

    let filter = if let Some(lang) = language {
        doc! {"language": lang}
    } else {
        doc! {}
    };

    let mut cursor = collection
        .find(filter)
        .limit(limit.unwrap_or(100))
        .await
        .map_err(|e| format!("Failed to get vocabularies: {}", e))?;

    let mut vocabularies = Vec::new();
    while let Some(vocabulary) = cursor
        .try_next()
        .await
        .map_err(|e| format!("Failed to iterate vocabularies: {}", e))?
    {
        vocabularies.push(vocabulary);
    }

    Ok(vocabularies)
}

#[tauri::command]
pub async fn update_vocabulary(
    db_manager: State<'_, DatabaseManager>,
    request: UpdateVocabularyRequest,
) -> Result<String, String> {
    let collection = db_manager.get_vocabulary_collection().await?;
    let object_id = parse_object_id(&request.id)?;

    let now = Utc::now();
    let mut update_doc = doc! {
        "$set": {
            "updated_at": mongodb::bson::to_bson(&now).unwrap()
        }
    };

    let set_doc = update_doc.get_document_mut("$set").unwrap();

    if let Some(word) = request.word {
        set_doc.insert("word", word);
    }
    if let Some(word_type) = request.word_type {
        set_doc.insert("word_type", to_document(&word_type).unwrap());
    }
    if let Some(level) = request.level {
        set_doc.insert("level", to_document(&level).unwrap());
    }
    if let Some(ipa) = request.ipa {
        set_doc.insert("ipa", ipa);
    }
    if let Some(definitions) = request.definitions {
        set_doc.insert("definitions", to_document(&definitions).unwrap());
    }
    if let Some(example_sentences) = request.example_sentences {
        set_doc.insert("example_sentences", example_sentences);
    }
    if let Some(topics) = request.topics {
        set_doc.insert("topics", topics);
    }
    if let Some(related_words) = request.related_words {
        set_doc.insert("related_words", to_document(&related_words).unwrap());
    }

    let result = collection
        .update_one(doc! {"_id": object_id}, update_doc)
        .await
        .map_err(|e| format!("Failed to update vocabulary: {}", e))?;

    if result.modified_count == 0 {
        return Err("No vocabulary was updated".to_string());
    }

    Ok("Updated successfully".to_string())
}

#[tauri::command]
pub async fn delete_vocabulary(
    db_manager: State<'_, DatabaseManager>,
    id: String,
) -> Result<String, String> {
    let collection = db_manager.get_vocabulary_collection().await?;
    let object_id = parse_object_id(&id)?;

    let result = collection
        .delete_one(doc! {"_id": object_id})
        .await
        .map_err(|e| format!("Failed to delete vocabulary: {}", e))?;

    if result.deleted_count == 0 {
        return Err("No vocabulary was deleted".to_string());
    }

    Ok("Deleted successfully".to_string())
}

#[tauri::command]
pub async fn search_vocabularies(
    db_manager: State<'_, DatabaseManager>,
    query: SearchQuery,
) -> Result<Vec<Vocabulary>, String> {
    let collection = db_manager.get_vocabulary_collection().await?;

    let mut filter = doc! {};

    // Text search on word field
    if !query.query.is_empty() {
        filter.insert(
            "word",
            doc! {"$regex": query.query, "$options": "i"},
        );
    }

    if let Some(word_type) = query.word_type {
        filter.insert("word_type", to_document(&word_type).unwrap());
    }

    if let Some(level) = query.level {
        filter.insert("level", to_document(&level).unwrap());
    }

    if let Some(topics) = query.topics {
        filter.insert("topics", doc! {"$in": topics});
    }

    if let Some(language) = query.language {
        filter.insert("language", language);
    }

    let mut cursor = collection
        .find(filter)
        .limit(50)
        .await
        .map_err(|e| format!("Failed to search vocabularies: {}", e))?;

    let mut vocabularies = Vec::new();
    while let Some(vocabulary) = cursor
        .try_next()
        .await
        .map_err(|e| format!("Failed to iterate vocabularies: {}", e))?
    {
        vocabularies.push(vocabulary);
    }

    Ok(vocabularies)
}

#[tauri::command]
pub async fn get_vocabularies_by_topic(
    db_manager: State<'_, DatabaseManager>,
    topic: String,
    language: Option<String>,
) -> Result<Vec<Vocabulary>, String> {
    let collection = db_manager.get_vocabulary_collection().await?;

    let mut filter = doc! {"topics": topic};
    if let Some(lang) = language {
        filter.insert("language", lang);
    }

    let mut cursor = collection
        .find(filter)
        .await
        .map_err(|e| format!("Failed to get vocabularies by topic: {}", e))?;

    let mut vocabularies = Vec::new();
    while let Some(vocabulary) = cursor
        .try_next()
        .await
        .map_err(|e| format!("Failed to iterate vocabularies: {}", e))?
    {
        vocabularies.push(vocabulary);
    }

    Ok(vocabularies)
}

#[tauri::command]
pub async fn get_vocabularies_by_level(
    db_manager: State<'_, DatabaseManager>,
    level: String,
    language: Option<String>,
) -> Result<Vec<Vocabulary>, String> {
    let collection = db_manager.get_vocabulary_collection().await?;

    let mut filter = doc! {"level": level};
    if let Some(lang) = language {
        filter.insert("language", lang);
    }

    let mut cursor = collection
        .find(filter)
        .await
        .map_err(|e| format!("Failed to get vocabularies by level: {}", e))?;

    let mut vocabularies = Vec::new();
    while let Some(vocabulary) = cursor
        .try_next()
        .await
        .map_err(|e| format!("Failed to iterate vocabularies: {}", e))?
    {
        vocabularies.push(vocabulary);
    }

    Ok(vocabularies)
}

// User Preferences commands
#[tauri::command]
pub async fn save_preferences(
    db_manager: State<'_, DatabaseManager>,
    preferences: UserPreferences,
) -> Result<String, String> {
    let collection = db_manager.get_preferences_collection().await?;

    let filter = doc! { "user_id": &preferences.user_id };
    let mut prefs = preferences;
    prefs.updated_at = Utc::now();

    let update = doc! {
        "$set": to_document(&prefs).map_err(|e| format!("Failed to serialize preferences: {}", e))?
    };

    let options = mongodb::options::UpdateOptions::builder().upsert(true).build();
    collection
        .update_one(filter, update)
        .with_options(options)
        .await
        .map_err(|e| format!("Failed to save preferences: {}", e))?;

    Ok("Preferences saved successfully".to_string())
}

#[tauri::command]
pub async fn get_preferences(
    db_manager: State<'_, DatabaseManager>,
    user_id: String,
) -> Result<Option<UserPreferences>, String> {
    let collection = db_manager.get_preferences_collection().await?;

    let preferences = collection
        .find_one(doc! { "user_id": &user_id })
        .await
        .map_err(|e| format!("Failed to get preferences: {}", e))?;

    Ok(preferences)
}

// Practice Commands
#[tauri::command]
pub async fn create_practice_session(
    db_manager: State<'_, DatabaseManager>,
    request: CreatePracticeSessionRequest,
) -> Result<String, String> {
    let collection = db_manager.get_practice_sessions_collection().await?;

    let now = Utc::now();
    let correct_answers = request.results.iter().filter(|r| r.correct).count() as i32;
    let total_questions = request.results.len() as i32;

    let session = PracticeSession {
        id: None,
        user_id: request.user_id,
        collection_id: request.collection_id,
        mode: request.mode,
        language: request.language,
        topic: request.topic,
        level: request.level,
        results: request.results,
        total_questions,
        correct_answers,
        started_at: now - chrono::Duration::seconds(request.duration_seconds as i64),
        completed_at: now,
        duration_seconds: request.duration_seconds,
    };

    let result = collection
        .insert_one(&session)
        .await
        .map_err(|e| format!("Failed to create practice session: {}", e))?;

    Ok(result.inserted_id.as_object_id().unwrap().to_hex())
}

#[tauri::command]
pub async fn get_practice_sessions(
    db_manager: State<'_, DatabaseManager>,
    language: String,
    limit: Option<i64>,
) -> Result<Vec<PracticeSession>, String> {
    let collection = db_manager.get_practice_sessions_collection().await?;

    let filter = doc! {"language": language};

    let mut cursor = collection
        .find(filter)
        .sort(doc! {"completed_at": -1})
        .limit(limit.unwrap_or(20))
        .await
        .map_err(|e| format!("Failed to get practice sessions: {}", e))?;

    let mut sessions = Vec::new();
    while let Some(session) = cursor
        .try_next()
        .await
        .map_err(|e| format!("Failed to iterate practice sessions: {}", e))?
    {
        sessions.push(session);
    }

    Ok(sessions)
}

#[tauri::command]
pub async fn update_practice_progress(
    db_manager: State<'_, DatabaseManager>,
    request: UpdateProgressRequest,
) -> Result<String, String> {
    let collection = db_manager.get_practice_progress_collection().await?;

    let filter = doc! {"language": &request.language};

    // Try to find existing progress
    let existing = collection
        .find_one(filter.clone())
        .await
        .map_err(|e| format!("Failed to find progress: {}", e))?;

    let now = Utc::now();

    match existing {
        Some(mut progress) => {
            // Update existing progress
            let mut word_found = false;

            for word_progress in &mut progress.words_progress {
                if word_progress.vocabulary_id == request.vocabulary_id {
                    word_found = true;
                    if request.correct {
                        word_progress.correct_count += 1;
                    } else {
                        word_progress.incorrect_count += 1;
                    }
                    word_progress.last_practiced = now;
                    // Update mastery level (0-5)
                    let total = word_progress.correct_count + word_progress.incorrect_count;
                    if total > 0 {
                        let accuracy = word_progress.correct_count as f32 / total as f32;
                        word_progress.mastery_level = (accuracy * 5.0).round() as i32;
                    }
                    break;
                }
            }

            if !word_found {
                progress.words_progress.push(WordProgress {
                    vocabulary_id: request.vocabulary_id,
                    word: request.word,
                    correct_count: if request.correct { 1 } else { 0 },
                    incorrect_count: if request.correct { 0 } else { 1 },
                    last_practiced: now,
                    mastery_level: if request.correct { 5 } else { 0 },
                });
            }

            progress.total_words_practiced = progress.words_progress.len() as i32;
            progress.updated_at = now;

            // Update streak
            let days_since_last = (now - progress.last_practice_date).num_days();
            if days_since_last == 0 {
                // Same day, keep streak
            } else if days_since_last == 1 {
                // Next day, increment streak
                progress.current_streak += 1;
                if progress.current_streak > progress.longest_streak {
                    progress.longest_streak = progress.current_streak;
                }
            } else if days_since_last > 1 {
                // Streak broken
                progress.current_streak = 1;
            }
            progress.last_practice_date = now;

            let update_doc = doc! {
                "$set": to_document(&progress).map_err(|e| format!("Failed to serialize progress: {}", e))?
            };

            collection
                .update_one(filter, update_doc)
                .await
                .map_err(|e| format!("Failed to update progress: {}", e))?;
        }
        None => {
            // Create new progress
            let progress = UserPracticeProgress {
                id: None,
                user_id: request.user_id,
                language: request.language,
                words_progress: vec![WordProgress {
                    vocabulary_id: request.vocabulary_id,
                    word: request.word,
                    correct_count: if request.correct { 1 } else { 0 },
                    incorrect_count: if request.correct { 0 } else { 1 },
                    last_practiced: now,
                    mastery_level: if request.correct { 5 } else { 0 },
                }],
                total_sessions: 1,
                total_words_practiced: 1,
                current_streak: 1,
                longest_streak: 1,
                last_practice_date: now,
                created_at: now,
                updated_at: now,
            };

            collection
                .insert_one(&progress)
                .await
                .map_err(|e| format!("Failed to create progress: {}", e))?;
        }
    }

    Ok("Progress updated successfully".to_string())
}

#[tauri::command]
pub async fn get_practice_progress(
    db_manager: State<'_, DatabaseManager>,
    language: String,
) -> Result<Option<UserPracticeProgress>, String> {
    let collection = db_manager.get_practice_progress_collection().await?;

    let filter = doc! {"language": language};

    let progress = collection
        .find_one(filter)
        .await
        .map_err(|e| format!("Failed to get practice progress: {}", e))?;

    Ok(progress)
}

#[tauri::command]
pub async fn get_word_progress(
    db_manager: State<'_, DatabaseManager>,
    language: String,
    vocabulary_id: String,
) -> Result<Option<WordProgress>, String> {
    let collection = db_manager.get_practice_progress_collection().await?;

    let filter = doc! {"language": &language};

    let progress = collection
        .find_one(filter)
        .await
        .map_err(|e| format!("Failed to get practice progress: {}", e))?;

    if let Some(prog) = progress {
        for word_prog in prog.words_progress {
            if word_prog.vocabulary_id == vocabulary_id {
                return Ok(Some(word_prog));
            }
        }
    }

    Ok(None)
}

// Level configuration command
#[tauri::command]
pub async fn get_level_configuration(language: String) -> Result<Vec<String>, String> {
    Ok(crate::models::get_level_config(&language))
}

// Get vocabularies by collection
#[tauri::command]
pub async fn get_vocabularies_by_collection(
    db_manager: State<'_, DatabaseManager>,
    collection_id: String,
    limit: Option<i64>,
) -> Result<Vec<Vocabulary>, String> {
    let collection = db_manager.get_vocabulary_collection().await?;

    let filter = doc! {"collection_id": collection_id};

    let mut cursor = collection
        .find(filter)
        .limit(limit.unwrap_or(100))
        .await
        .map_err(|e| format!("Failed to get vocabularies: {}", e))?;

    let mut vocabularies = Vec::new();
    while let Some(vocabulary) = cursor
        .try_next()
        .await
        .map_err(|e| format!("Failed to iterate vocabularies: {}", e))?
    {
        vocabularies.push(vocabulary);
    }

    Ok(vocabularies)
}
