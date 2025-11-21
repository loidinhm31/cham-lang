use tauri::State;

use crate::local_db::LocalDatabase;
use crate::models::{
    Vocabulary, CreateVocabularyRequest, UpdateVocabularyRequest,
    UserPreferences, PracticeSession, CreatePracticeSessionRequest,
    UserPracticeProgress, UpdateProgressRequest,
    LearningSettings, UpdateLearningSettingsRequest
};

// Vocabulary CRUD commands

#[tauri::command]
pub fn create_vocabulary(
    local_db: State<'_, LocalDatabase>,
    request: CreateVocabularyRequest,
) -> Result<String, String> {
    let user_id = local_db.get_local_user_id();
    let vocab = Vocabulary {
        id: None,
        word: request.word,
        word_type: request.word_type,
        level: request.level,
        ipa: request.ipa,
        concept: request.concept,
        definitions: request.definitions,
        example_sentences: request.example_sentences,
        topics: request.topics,
        related_words: request.related_words,
        language: request.language,
        collection_id: request.collection_id.clone(),
        user_id: user_id.to_string(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
    };

    let vocab_id = local_db
        .create_vocabulary(&vocab, user_id)
        .map_err(|e| format!("Failed to create vocabulary: {}", e))?;

    // Update collection word count
    let _ = local_db.update_collection_word_count(&request.collection_id);

    println!("✓ Vocabulary created: {} ({})", vocab.word, vocab_id);
    Ok(vocab_id)
}

#[tauri::command]
pub fn get_vocabulary(
    local_db: State<'_, LocalDatabase>,
    id: String,
) -> Result<Vocabulary, String> {
    local_db
        .get_vocabulary(&id)
        .map_err(|e| format!("Database error: {}", e))?
        .ok_or_else(|| "Vocabulary not found".to_string())
}

#[tauri::command]
pub fn get_all_vocabularies(
    local_db: State<'_, LocalDatabase>,
    language: Option<String>,
    limit: Option<i64>,
) -> Result<Vec<Vocabulary>, String> {
    let user_id = local_db.get_local_user_id();
    local_db
        .get_all_vocabularies(user_id, language.as_deref(), limit)
        .map_err(|e| format!("Database error: {}", e))
}

#[tauri::command]
pub fn get_vocabularies_by_collection(
    local_db: State<'_, LocalDatabase>,
    collection_id: String,
    limit: Option<i64>,
) -> Result<Vec<Vocabulary>, String> {
    local_db
        .get_vocabularies_by_collection(&collection_id, limit)
        .map_err(|e| format!("Database error: {}", e))
}

#[tauri::command]
pub fn search_vocabularies(
    local_db: State<'_, LocalDatabase>,
    query: String,
    language: Option<String>,
) -> Result<Vec<Vocabulary>, String> {
    local_db
        .search_vocabularies(&query, language.as_deref())
        .map_err(|e| format!("Database error: {}", e))
}

#[tauri::command]
pub fn update_vocabulary(
    local_db: State<'_, LocalDatabase>,
    request: UpdateVocabularyRequest,
) -> Result<String, String> {
    local_db
        .update_vocabulary(&request.id, &request)
        .map_err(|e| format!("Failed to update vocabulary: {}", e))?;

    println!("✓ Vocabulary updated: {}", request.id);
    Ok("Updated successfully".to_string())
}

#[tauri::command]
pub fn delete_vocabulary(
    local_db: State<'_, LocalDatabase>,
    id: String,
) -> Result<String, String> {
    local_db
        .delete_vocabulary(&id)
        .map_err(|e| format!("Database error: {}", e))?;

    println!("✓ Vocabulary deleted: {}", id);
    Ok("Deleted successfully".to_string())
}

// User preferences commands

#[tauri::command]
pub fn save_preferences(
    local_db: State<'_, LocalDatabase>,
    preferences: UserPreferences,
) -> Result<String, String> {
    let user_id = local_db.get_local_user_id();
    local_db
        .save_preferences(user_id, &preferences)
        .map_err(|e| format!("Database error: {}", e))?;

    println!("✓ User preferences saved");
    Ok("Preferences saved successfully".to_string())
}

#[tauri::command]
pub fn get_preferences(
    local_db: State<'_, LocalDatabase>,
) -> Result<Option<UserPreferences>, String> {
    let user_id = local_db.get_local_user_id();
    local_db
        .get_preferences(user_id)
        .map_err(|e| format!("Database error: {}", e))
}

// Practice commands

#[tauri::command]
pub fn create_practice_session(
    local_db: State<'_, LocalDatabase>,
    request: CreatePracticeSessionRequest,
) -> Result<String, String> {
    let user_id = local_db.get_local_user_id();
    local_db
        .create_practice_session(&request, user_id)
        .map_err(|e| format!("Failed to create practice session: {}", e))
}

#[tauri::command]
pub fn get_practice_sessions(
    local_db: State<'_, LocalDatabase>,
    language: String,
    limit: Option<i64>,
) -> Result<Vec<PracticeSession>, String> {
    let user_id = local_db.get_local_user_id();
    local_db
        .get_practice_sessions(user_id, &language, limit)
        .map_err(|e| format!("Failed to get practice sessions: {}", e))
}

#[tauri::command]
pub fn update_practice_progress(
    local_db: State<'_, LocalDatabase>,
    request: UpdateProgressRequest,
) -> Result<String, String> {
    let user_id = local_db.get_local_user_id();
    local_db
        .update_practice_progress(&request, user_id)
        .map_err(|e| format!("Failed to update practice progress: {}", e))?;
    Ok("Progress updated successfully".to_string())
}

#[tauri::command]
pub fn get_practice_progress(
    local_db: State<'_, LocalDatabase>,
    language: String,
) -> Result<Option<UserPracticeProgress>, String> {
    let user_id = local_db.get_local_user_id();
    local_db
        .get_practice_progress(user_id, &language)
        .map_err(|e| format!("Failed to get practice progress: {}", e))
}

// Level configuration command
#[tauri::command]
pub fn get_level_configuration(language: String) -> Result<Vec<String>, String> {
    Ok(crate::models::get_level_config(&language))
}

#[tauri::command]
pub fn get_all_languages(
    local_db: State<'_, LocalDatabase>,
) -> Result<Vec<String>, String> {
    let user_id = local_db.get_local_user_id();
    local_db
        .get_all_languages(user_id)
        .map_err(|e| format!("Failed to get languages: {}", e))
}

// Learning Settings Commands (Spaced Repetition)
#[tauri::command]
pub fn get_learning_settings(
    local_db: State<'_, LocalDatabase>,
) -> Result<Option<LearningSettings>, String> {
    let user_id = local_db.get_local_user_id();
    local_db
        .get_learning_settings(user_id)
        .map_err(|e| format!("Failed to get learning settings: {}", e))
}

#[tauri::command]
pub fn get_or_create_learning_settings(
    local_db: State<'_, LocalDatabase>,
) -> Result<LearningSettings, String> {
    let user_id = local_db.get_local_user_id();
    local_db
        .get_or_create_learning_settings(user_id)
        .map_err(|e| format!("Failed to get or create learning settings: {}", e))
}

#[tauri::command]
pub fn update_learning_settings(
    local_db: State<'_, LocalDatabase>,
    request: UpdateLearningSettingsRequest,
) -> Result<LearningSettings, String> {
    let user_id = local_db.get_local_user_id();
    local_db
        .update_learning_settings(user_id, &request)
        .map_err(|e| format!("Failed to update learning settings: {}", e))
}
