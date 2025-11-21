use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Vocabulary {
    pub id: Option<String>,
    pub word: String,
    pub word_type: WordType,
    pub level: String, // Flexible level system (CEFR: A1-C2, Korean: Basic/Intermediate/Advanced, etc.)
    pub ipa: String,
    pub concept: Option<String>, // Optional concept field for alternative learning mode
    pub definitions: Vec<Definition>,
    pub example_sentences: Vec<String>,
    pub topics: Vec<String>,
    pub related_words: Vec<RelatedWord>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub language: String, // "en", "vi", "ko", etc.
    pub collection_id: String, // Reference to Collection
    pub user_id: String, // Reference to User who created it
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum WordType {
    Noun,
    Verb,
    Adjective,
    Adverb,
    Pronoun,
    Preposition,
    Conjunction,
    Interjection,
    Phrase,
}

// Language level configurations
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LevelConfig {
    pub language: String,
    pub levels: Vec<String>,
}

// Common level systems
pub fn get_level_config(language: &str) -> Vec<String> {
    match language {
        "en" | "vi" | "es" | "fr" | "de" => vec![
            "A1".to_string(),
            "A2".to_string(),
            "B1".to_string(),
            "B2".to_string(),
            "C1".to_string(),
            "C2".to_string(),
        ],
        "ko" | "ja" | "zh" => vec![
            "Basic".to_string(),
            "Intermediate".to_string(),
            "Advanced".to_string(),
        ],
        _ => vec![
            "Beginner".to_string(),
            "Intermediate".to_string(),
            "Advanced".to_string(),
        ],
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Definition {
    pub meaning: String,
    pub translation: Option<String>, // Translation in user's native language
    pub example: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RelatedWord {
    pub word_id: String,
    pub word: String,
    pub relationship: WordRelationship,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum WordRelationship {
    Synonym,
    Antonym,
    Similar,
    Related,
    Derivative,
}

// User Authentication
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub username: String,
    pub email: String,
    pub password_hash: String, // bcrypt hash
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserSession {
    pub user_id: String,
    pub username: String,
    pub email: String,
}

// Collection Model
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub description: String,
    pub language: String,
    pub owner_id: String, // User ID
    pub shared_with: Vec<String>, // User IDs who can access
    pub is_public: bool,
    pub word_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCollectionRequest {
    pub name: String,
    pub description: String,
    pub language: String,
    pub is_public: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateCollectionRequest {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub is_public: Option<bool>,
    pub shared_with: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserPreferences {
    pub id: String,
    pub user_id: String,
    pub interface_language: String, // "en", "vi"
    pub native_language: String,
    pub learning_languages: Vec<String>,
    pub theme: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateVocabularyRequest {
    pub word: String,
    pub word_type: WordType,
    pub level: String,
    pub ipa: String,
    pub concept: Option<String>,
    pub definitions: Vec<Definition>,
    pub example_sentences: Vec<String>,
    pub topics: Vec<String>,
    pub related_words: Vec<RelatedWord>,
    pub language: String,
    pub collection_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateVocabularyRequest {
    pub id: String,
    pub word: Option<String>,
    pub word_type: Option<WordType>,
    pub level: Option<String>,
    pub ipa: Option<String>,
    pub concept: Option<String>,
    pub definitions: Option<Vec<Definition>>,
    pub example_sentences: Option<Vec<String>>,
    pub topics: Option<Vec<String>>,
    pub related_words: Option<Vec<RelatedWord>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchQuery {
    pub query: String,
    pub word_type: Option<WordType>,
    pub level: Option<String>,
    pub topics: Option<Vec<String>>,
    pub language: Option<String>,
    pub collection_id: Option<String>,
}

// Practice Models
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum PracticeMode {
    Flashcard,
    FillWord,
    MultipleChoice,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PracticeResult {
    pub vocabulary_id: String,
    pub word: String,
    pub correct: bool,
    pub mode: PracticeMode,
    pub time_spent_seconds: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PracticeSession {
    pub id: String,
    pub user_id: String,
    pub collection_id: String,
    pub mode: PracticeMode,
    pub language: String,
    pub topic: Option<String>,
    pub level: Option<String>,
    pub results: Vec<PracticeResult>,
    pub total_questions: i32,
    pub correct_answers: i32,
    pub started_at: DateTime<Utc>,
    pub completed_at: DateTime<Utc>,
    pub duration_seconds: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WordProgress {
    pub vocabulary_id: String,
    pub word: String,
    pub correct_count: i32,
    pub incorrect_count: i32,
    pub last_practiced: DateTime<Utc>,
    pub mastery_level: i32, // 0-5
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserPracticeProgress {
    pub id: String,
    pub user_id: String,
    pub language: String,
    pub words_progress: Vec<WordProgress>,
    pub total_sessions: i32,
    pub total_words_practiced: i32,
    pub current_streak: i32,
    pub longest_streak: i32,
    pub last_practice_date: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePracticeSessionRequest {
    pub collection_id: String,
    pub mode: PracticeMode,
    pub language: String,
    pub topic: Option<String>,
    pub level: Option<String>,
    pub results: Vec<PracticeResult>,
    pub duration_seconds: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateProgressRequest {
    pub language: String,
    pub vocabulary_id: String,
    pub word: String,
    pub correct: bool,
}
