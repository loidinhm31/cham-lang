use chrono::{DateTime, Utc};
use crate::models::{WordType, WordRelationship};

/// Convert Unix timestamp to DateTime<Utc>
pub fn timestamp_to_datetime(timestamp: i64) -> DateTime<Utc> {
    DateTime::from_timestamp(timestamp, 0).unwrap_or_else(Utc::now)
}

/// Parse string to WordType enum
pub fn parse_word_type(s: &str) -> WordType {
    match s {
        "n/a" => WordType::NA,
        "noun" => WordType::Noun,
        "verb" => WordType::Verb,
        "adjective" => WordType::Adjective,
        "adverb" => WordType::Adverb,
        "pronoun" => WordType::Pronoun,
        "preposition" => WordType::Preposition,
        "conjunction" => WordType::Conjunction,
        "interjection" => WordType::Interjection,
        "phrase" => WordType::Phrase,
        _ => WordType::NA, // Default to N/A
    }
}

/// Convert WordType enum to lowercase string
pub fn word_type_to_string(word_type: &WordType) -> &'static str {
    match word_type {
        WordType::NA => "n/a",
        WordType::Noun => "noun",
        WordType::Verb => "verb",
        WordType::Adjective => "adjective",
        WordType::Adverb => "adverb",
        WordType::Pronoun => "pronoun",
        WordType::Preposition => "preposition",
        WordType::Conjunction => "conjunction",
        WordType::Interjection => "interjection",
        WordType::Phrase => "phrase",
    }
}

/// Parse string to WordRelationship enum
pub fn parse_word_relationship(s: &str) -> WordRelationship {
    match s {
        "synonym" => WordRelationship::Synonym,
        "antonym" => WordRelationship::Antonym,
        "similar" => WordRelationship::Similar,
        "related" => WordRelationship::Related,
        "derivative" => WordRelationship::Derivative,
        _ => WordRelationship::Related, // Default
    }
}

/// Convert WordRelationship enum to lowercase string
pub fn word_relationship_to_string(relationship: &WordRelationship) -> &'static str {
    match relationship {
        WordRelationship::Synonym => "synonym",
        WordRelationship::Antonym => "antonym",
        WordRelationship::Similar => "similar",
        WordRelationship::Related => "related",
        WordRelationship::Derivative => "derivative",
    }
}
