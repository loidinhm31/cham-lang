use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub offset: i64,
    pub limit: i64,
    pub has_more: bool,
}

impl<T> PaginatedResponse<T> {
    pub fn new(items: Vec<T>, total: i64, offset: i64, limit: i64) -> Self {
        let has_more = offset + (items.len() as i64) < total;
        Self {
            items,
            total,
            offset,
            limit,
            has_more,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Vocabulary {
    pub id: Option<String>,
    pub word: String,
    pub word_type: WordType,
    pub level: String, // Flexible level system (CEFR: A1-C2, Korean: Basic/Intermediate/Advanced, etc.)
    pub ipa: String,
    pub audio_url: Option<String>, // Optional audio pronunciation URL
    pub concept: Option<String>,   // Optional concept field for alternative learning mode
    pub definitions: Vec<Definition>,
    pub example_sentences: Vec<String>,
    pub topics: Vec<String>,
    pub tags: Vec<String>,
    pub related_words: Vec<RelatedWord>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub language: String,      // "en", "vi", "ko", etc.
    pub collection_id: String, // Reference to Collection
    pub user_id: String,       // Reference to User who created it
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum WordType {
    #[serde(rename = "n/a")]
    NA,
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

// Common level systems
pub fn get_level_config(language: &str) -> Vec<String> {
    match language {
        "en" | "vi" | "es" | "fr" | "de" => vec![
            "N/A".to_string(),
            "A1".to_string(),
            "A2".to_string(),
            "B1".to_string(),
            "B2".to_string(),
            "C1".to_string(),
            "C2".to_string(),
        ],
        "ko" | "ja" | "zh" => vec![
            "N/A".to_string(),
            "Basic".to_string(),
            "Intermediate".to_string(),
            "Advanced".to_string(),
        ],
        _ => vec![
            "N/A".to_string(),
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

// Collection Model
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub description: String,
    pub language: String,
    pub owner_id: String,         // User ID
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

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateVocabularyRequest {
    pub word: String,
    pub word_type: WordType,
    pub level: String,
    pub ipa: String,
    pub audio_url: Option<String>,
    pub concept: Option<String>,
    pub definitions: Vec<Definition>,
    pub example_sentences: Vec<String>,
    pub topics: Vec<String>,
    pub tags: Vec<String>,
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
    pub audio_url: Option<String>,
    pub concept: Option<String>,
    pub definitions: Option<Vec<Definition>>,
    pub example_sentences: Option<Vec<String>>,
    pub topics: Option<Vec<String>>,
    pub tags: Option<Vec<String>>,
    pub related_words: Option<Vec<RelatedWord>>,
    pub collection_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BulkMoveRequest {
    pub vocabulary_ids: Vec<String>,
    pub target_collection_id: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BulkMoveResult {
    pub moved_count: usize,
    pub skipped_count: usize,
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
    pub mastery_level: i32, // 0-5 (legacy, kept for backward compatibility)

    // Spaced Repetition Fields
    pub next_review_date: DateTime<Utc>, // When this word should be reviewed next
    pub interval_days: i32,              // Current interval between reviews in days
    pub easiness_factor: f32,            // SM-2 easiness factor (1.3 - 2.5), default 2.5
    pub consecutive_correct_count: i32, // Number of consecutive correct answers (resets to 0 on failure)

    // Leitner System Fields
    pub leitner_box: i32,        // Current box number (1 to max_boxes)
    pub last_interval_days: i32, // Previous interval for tracking progression

    // Session Tracking
    pub total_reviews: i32, // Total number of times this word has been reviewed
    pub failed_in_session: bool, // Flag to track if word failed in current session (for re-queuing)
    pub retry_count: i32,   // Number of times word has been retried in current session

    // Multi-Mode Completion Tracking
    #[serde(default)] // Provides empty Vec for backward compatibility with old data
    pub completed_modes_in_cycle: Vec<String>, // Tracks which modes (flashcard, fillword, multiplechoice) have been completed in current review cycle
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
    pub completed_modes_in_cycle: Vec<String>, // Array of modes completed in current cycle

    // Spaced Repetition Fields
    pub next_review_date: String, // ISO date string
    pub interval_days: i32,
    pub easiness_factor: f32,
    pub consecutive_correct_count: i32,
    pub leitner_box: i32,
    pub last_interval_days: i32,
    pub total_reviews: i32,
    pub correct_count: i32,
    pub incorrect_count: i32,
}

// Learning Settings for Spaced Repetition & Leitner System
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum SpacedRepetitionAlgorithm {
    SM2,
    ModifiedSM2,
    Simple,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LearningSettings {
    pub id: String,
    pub user_id: String,

    // Spaced Repetition Configuration
    pub sr_algorithm: SpacedRepetitionAlgorithm,

    // Leitner System Configuration
    pub leitner_box_count: i32, // 3, 5, or 7

    // Learning Rules
    pub consecutive_correct_required: i32, // Number of consecutive correct answers to advance to next box
    pub show_failed_words_in_session: bool, // Re-queue failed words in the same session

    // Optional Advanced Settings
    pub new_words_per_day: Option<i32>, // Limit new words introduced daily
    pub daily_review_limit: Option<i32>, // Maximum reviews per day

    // UI Preferences
    pub auto_advance_timeout_seconds: i32, // Auto-advance timeout in seconds (default: 2)
    pub show_hint_in_fillword: bool,       // Show/hide hint in fill word mode (default: true)

    // Daily Reminder Settings
    pub reminder_enabled: bool, // Enable/disable daily reminder (default: false)
    pub reminder_time: String,  // Time for daily reminder in HH:MM format (default: "19:00")

    // Timestamps
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateLearningSettingsRequest {
    pub sr_algorithm: Option<SpacedRepetitionAlgorithm>,
    pub leitner_box_count: Option<i32>,
    pub consecutive_correct_required: Option<i32>,
    pub show_failed_words_in_session: Option<bool>,
    pub new_words_per_day: Option<i32>,
    pub daily_review_limit: Option<i32>,
    pub auto_advance_timeout_seconds: Option<i32>,
    pub show_hint_in_fillword: Option<bool>,
    pub reminder_enabled: Option<bool>,
    pub reminder_time: Option<String>,
}
