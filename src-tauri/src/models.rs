use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Vocabulary {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub word: String,
    pub word_type: WordType,
    pub level: LanguageLevel,
    pub ipa: String,
    pub definitions: Vec<Definition>,
    pub example_sentences: Vec<String>,
    pub topics: Vec<String>,
    pub related_words: Vec<RelatedWord>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub language: String, // "en", "vi", etc.
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum LanguageLevel {
    A1,
    A2,
    B1,
    B2,
    C1,
    C2,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Definition {
    pub meaning: String,
    pub translation: Option<String>, // Translation in user's native language
    pub example: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RelatedWord {
    pub word_id: Option<ObjectId>,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserPreferences {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
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
    pub level: LanguageLevel,
    pub ipa: String,
    pub definitions: Vec<Definition>,
    pub example_sentences: Vec<String>,
    pub topics: Vec<String>,
    pub related_words: Vec<RelatedWord>,
    pub language: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateVocabularyRequest {
    pub id: String,
    pub word: Option<String>,
    pub word_type: Option<WordType>,
    pub level: Option<LanguageLevel>,
    pub ipa: Option<String>,
    pub definitions: Option<Vec<Definition>>,
    pub example_sentences: Option<Vec<String>>,
    pub topics: Option<Vec<String>>,
    pub related_words: Option<Vec<RelatedWord>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchQuery {
    pub query: String,
    pub word_type: Option<WordType>,
    pub level: Option<LanguageLevel>,
    pub topics: Option<Vec<String>>,
    pub language: Option<String>,
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
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub mode: PracticeMode,
    pub language: String,
    pub topic: Option<String>,
    pub level: Option<LanguageLevel>,
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
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
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
    pub mode: PracticeMode,
    pub language: String,
    pub topic: Option<String>,
    pub level: Option<LanguageLevel>,
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
