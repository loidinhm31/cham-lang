use crate::models::{
    Vocabulary, Definition, RelatedWord, WordRelationship, WordType
};
use crate::local_db::LocalDatabase;
use serde::{Deserialize, Serialize};
use tauri::State;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct CsvImportRequest {
    /// Either file_path or csv_text must be provided
    pub file_path: Option<String>,
    /// CSV content as plain text (alternative to file_path)
    pub csv_text: Option<String>,
    /// If provided, import all vocabularies into this collection
    /// If None, use collection_name from CSV (auto-create if needed)
    pub target_collection_id: Option<String>,
    pub create_missing_collections: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CsvImportResult {
    pub success: bool,
    pub rows_imported: usize,
    pub rows_failed: usize,
    pub errors: Vec<CsvImportError>,
    pub collections_created: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CsvImportError {
    pub row_number: usize,
    pub error_message: String,
    pub row_data: String,
}

/// CSV row structure for deserialization
#[derive(Debug, Deserialize)]
struct CsvRow {
    collection_name: String,
    collection_description: Option<String>,
    collection_language: String,
    word: String,
    word_type: String,
    level: String,
    ipa: Option<String>,
    audio_url: Option<String>,
    concept: Option<String>,
    language: String,
    definitions: String,
    example_sentences: Option<String>,
    topics: Option<String>,
    tags: Option<String>,
    related_words: Option<String>,
}

/// Unflatten definitions from delimited string
/// Format: "meaning1|translation1|example1;meaning2|translation2|example2"
fn unflatten_definitions(definitions_str: &str) -> Vec<Definition> {
    if definitions_str.trim().is_empty() {
        return vec![];
    }

    definitions_str.split(';')
        .filter_map(|def_str| {
            let parts: Vec<&str> = def_str.split('|').collect();
            if parts.is_empty() || parts[0].trim().is_empty() {
                return None;
            }

            Some(Definition {
                meaning: parts[0].trim().to_string(),
                translation: parts.get(1)
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.trim().to_string()),
                example: parts.get(2)
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.trim().to_string()),
            })
        })
        .collect()
}

/// Unflatten example sentences from pipe-delimited string
/// Format: "sentence1|sentence2|sentence3"
fn unflatten_examples(examples_str: Option<&String>) -> Vec<String> {
    examples_str
        .map(|s| {
            s.split('|')
                .filter_map(|ex| {
                    let trimmed = ex.trim();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(trimmed.to_string())
                    }
                })
                .collect()
        })
        .unwrap_or_default()
}

/// Unflatten topics from pipe-delimited string
/// Format: "topic1|topic2|topic3"
fn unflatten_topics(topics_str: Option<&String>) -> Vec<String> {
    topics_str
        .map(|s| {
            s.split('|')
                .filter_map(|topic| {
                    let trimmed = topic.trim();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(trimmed.to_string())
                    }
                })
                .collect()
        })
        .unwrap_or_default()
}

/// Unflatten tags from pipe-delimited string
/// Format: "tag1|tag2|tag3"
fn unflatten_tags(tags_str: Option<&String>) -> Vec<String> {
    tags_str
        .map(|s| {
            s.split('|')
                .filter_map(|tag| {
                    let trimmed = tag.trim();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(trimmed.to_string())
                    }
                })
                .collect()
        })
        .unwrap_or_default()
}

/// Unflatten related words from delimited string
/// Format: "word1:synonym|word2:antonym|word3:related"
fn unflatten_related_words(related_str: Option<&String>) -> Vec<RelatedWord> {
    related_str
        .map(|s| {
            s.split('|')
                .filter_map(|rw_str| {
                    let parts: Vec<&str> = rw_str.split(':').collect();
                    if parts.len() != 2 {
                        return None;
                    }

                    let word = parts[0].trim().to_string();
                    let relationship = match parts[1].trim().to_lowercase().as_str() {
                        "synonym" => WordRelationship::Synonym,
                        "antonym" => WordRelationship::Antonym,
                        "similar" => WordRelationship::Similar,
                        "derivative" => WordRelationship::Derivative,
                        _ => WordRelationship::Related,
                    };

                    Some(RelatedWord {
                        word_id: String::new(), // Will be set during processing if needed
                        word,
                        relationship,
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

/// Parse WordType from string
fn parse_word_type(word_type_str: &str) -> WordType {
    match word_type_str.trim().to_lowercase().as_str() {
        "noun" => WordType::Noun,
        "verb" => WordType::Verb,
        "adjective" => WordType::Adjective,
        "adverb" => WordType::Adverb,
        "pronoun" => WordType::Pronoun,
        "preposition" => WordType::Preposition,
        "conjunction" => WordType::Conjunction,
        "interjection" => WordType::Interjection,
        "phrase" => WordType::Phrase,
        _ => WordType::Noun, // Default to noun if unknown
    }
}

/// Find or create collection by name and language
fn find_or_create_collection(
    local_db: &LocalDatabase,
    name: &str,
    language: &str,
    description: Option<&str>,
    create_if_missing: bool,
) -> Result<String, String> {
    // Try to find existing collection by name and language
    let collections = local_db.get_user_collections("local")
        .map_err(|e| format!("Failed to get collections: {}", e))?;

    for collection in collections {
        if collection.name == name && collection.language == language {
            return Ok(collection.id);
        }
    }

    // If not found and creation is allowed, create new collection
    if create_if_missing {
        let collection_id = local_db.create_collection(
            name,
            description.unwrap_or(""),
            language,
            "local",
            false, // is_public
        )
        .map_err(|e| format!("Failed to create collection: {}", e))?;

        println!("  ✨ Created new collection: {} ({})", name, language);
        Ok(collection_id)
    } else {
        Err(format!("Collection '{}' with language '{}' not found and auto-create is disabled", name, language))
    }
}

/// Simple import request for 3-column format (collection_name, word, definition)
#[derive(Debug, Serialize, Deserialize)]
pub struct SimpleImportRequest {
    /// Tab-separated values: collection_name, word, definition
    pub csv_text: String,
    /// Default language for new collections (e.g., "ko", "en", "vi")
    pub default_language: String,
    /// If provided, import all vocabularies into this collection
    pub target_collection_id: Option<String>,
    /// Auto-create collections if they don't exist
    pub create_missing_collections: bool,
}

/// Import vocabularies from simple 3-column format
#[tauri::command]
pub fn import_simple_vocabularies(
    local_db: State<'_, LocalDatabase>,
    request: SimpleImportRequest,
) -> Result<CsvImportResult, String> {
    println!("📥 Starting simple CSV import ({} bytes)", request.csv_text.len());

    let mut rows_imported = 0;
    let mut rows_failed = 0;
    let mut errors = Vec::new();
    let mut collections_created = Vec::new();
    let mut affected_collections = std::collections::HashSet::new();
    let mut row_number = 0;

    // Parse tab-separated values
    for line in request.csv_text.lines() {
        row_number += 1;

        // Skip empty lines
        if line.trim().is_empty() {
            continue;
        }

        // Split by tab
        let parts: Vec<&str> = line.split('\t').collect();

        // Expect at least 3 columns: collection_name, word, definition
        if parts.len() < 3 {
            rows_failed += 1;
            errors.push(CsvImportError {
                row_number,
                error_message: format!("Expected 3 columns (collection_name, word, definition), found {}", parts.len()),
                row_data: line.to_string(),
            });
            continue;
        }

        let collection_name = parts[0].trim();
        let word = parts[1].trim();
        let definition = parts[2].trim();

        // Skip rows with empty word (might be section markers)
        if word.is_empty() {
            continue;
        }

        // Skip rows with empty collection name
        if collection_name.is_empty() {
            rows_failed += 1;
            errors.push(CsvImportError {
                row_number,
                error_message: "Collection name is empty".to_string(),
                row_data: line.to_string(),
            });
            continue;
        }

        // Determine which collection to use
        let collection_id = if let Some(ref target_id) = request.target_collection_id {
            target_id.clone()
        } else {
            // Find or create collection from CSV data
            match find_or_create_collection(
                &local_db,
                collection_name,
                &request.default_language,
                None, // No description for simple import
                request.create_missing_collections,
            ) {
                Ok(id) => {
                    // Track if this is a newly created collection
                    if !collections_created.contains(&id) && request.create_missing_collections {
                        if let Ok(Some(collection)) = local_db.get_collection(&id) {
                            if collection.word_count == 0 {
                                collections_created.push(id.clone());
                            }
                        }
                    }
                    id
                }
                Err(e) => {
                    rows_failed += 1;
                    errors.push(CsvImportError {
                        row_number,
                        error_message: e,
                        row_data: line.to_string(),
                    });
                    continue;
                }
            }
        };

        // Create simple vocabulary with single definition
        let vocab = Vocabulary {
            id: None,
            word: word.to_string(),
            word_type: WordType::Noun, // Default to noun for simple import
            level: "N/A".to_string(), // Default level
            ipa: String::new(),
            audio_url: None, // Simple import doesn't have audio_url
            concept: None,
            definitions: vec![Definition {
                meaning: definition.to_string(),
                translation: None,
                example: None,
            }],
            example_sentences: vec![],
            topics: vec![],
            tags: vec![],
            related_words: vec![],
            language: request.default_language.clone(),
            collection_id: collection_id.clone(),
            user_id: "local".to_string(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        // Create vocabulary
        match local_db.create_vocabulary(&vocab, "local") {
            Ok(_) => {
                rows_imported += 1;
                affected_collections.insert(collection_id.clone());
            }
            Err(e) => {
                rows_failed += 1;
                errors.push(CsvImportError {
                    row_number,
                    error_message: format!("Failed to create vocabulary: {}", e),
                    row_data: line.to_string(),
                });
            }
        }
    }

    // Update word counts for all affected collections
    println!("📊 Updating word counts for {} affected collections...", affected_collections.len());
    for collection_id in &affected_collections {
        if let Err(e) = local_db.update_collection_word_count(collection_id) {
            println!("⚠️ Warning: Failed to update word count for collection {}: {}", collection_id, e);
        }
    }

    println!("✅ Simple CSV import complete: {} imported, {} failed", rows_imported, rows_failed);

    Ok(CsvImportResult {
        success: rows_failed == 0,
        rows_imported,
        rows_failed,
        errors,
        collections_created,
    })
}

/// Import vocabularies from CSV file or text
#[tauri::command]
pub fn import_vocabularies_csv(
    local_db: State<'_, LocalDatabase>,
    request: CsvImportRequest,
) -> Result<CsvImportResult, String> {
    // Determine the source of CSV data
    let mut reader: csv::Reader<Box<dyn std::io::Read>> = if let Some(ref csv_text) = request.csv_text {
        println!("📥 Starting CSV import from pasted text ({} bytes)", csv_text.len());
        // Create reader from string
        let cursor = std::io::Cursor::new(csv_text.clone());
        csv::Reader::from_reader(Box::new(cursor) as Box<dyn std::io::Read>)
    } else if let Some(ref file_path) = request.file_path {
        println!("📥 Starting CSV import from file: {}", file_path);
        // Create reader from file
        let path = PathBuf::from(file_path);
        let file = std::fs::File::open(&path)
            .map_err(|e| format!("Failed to open CSV file: {}", e))?;
        csv::Reader::from_reader(Box::new(file) as Box<dyn std::io::Read>)
    } else {
        return Err("Either file_path or csv_text must be provided".to_string());
    };

    let mut rows_imported = 0;
    let mut rows_failed = 0;
    let mut errors = Vec::new();
    let mut collections_created = Vec::new();
    let mut affected_collections = std::collections::HashSet::new(); // Track collections to update word count
    let mut row_number = 1; // Start from 1 (excluding header)

    // Process each row
    for result in reader.deserialize() {
        row_number += 1;

        let row: CsvRow = match result {
            Ok(r) => r,
            Err(e) => {
                rows_failed += 1;
                errors.push(CsvImportError {
                    row_number,
                    error_message: format!("Failed to parse CSV row: {}", e),
                    row_data: String::new(),
                });
                continue;
            }
        };

        // Determine which collection to use
        let collection_id = if let Some(ref target_id) = request.target_collection_id {
            // Use the specified target collection
            target_id.clone()
        } else {
            // Find or create collection from CSV data
            match find_or_create_collection(
                &local_db,
                &row.collection_name,
                &row.collection_language,
                row.collection_description.as_deref(),
                request.create_missing_collections,
            ) {
                Ok(id) => {
                    // Track if this is a newly created collection
                    if !collections_created.contains(&id) && request.create_missing_collections {
                        // Check if it was just created by checking word_count
                        if let Ok(Some(collection)) = local_db.get_collection(&id) {
                            if collection.word_count == 0 {
                                collections_created.push(id.clone());
                            }
                        }
                    }
                    id
                }
                Err(e) => {
                    rows_failed += 1;
                    errors.push(CsvImportError {
                        row_number,
                        error_message: e,
                        row_data: format!("{} - {}", row.collection_name, row.word),
                    });
                    continue;
                }
            }
        };

        // Parse and create vocabulary
        let vocab = Vocabulary {
            id: None,
            word: row.word.clone(),
            word_type: parse_word_type(&row.word_type),
            level: if row.level.trim().is_empty() {
                "N/A".to_string()
            } else {
                row.level.clone()
            },
            ipa: row.ipa.unwrap_or_default(),
            audio_url: row.audio_url.clone().and_then(|url| {
                let trimmed = url.trim();
                if trimmed.is_empty() {
                    None
                } else {
                    Some(trimmed.to_string())
                }
            }),
            concept: row.concept,
            definitions: unflatten_definitions(&row.definitions),
            example_sentences: unflatten_examples(row.example_sentences.as_ref()),
            topics: unflatten_topics(row.topics.as_ref()),
            tags: unflatten_tags(row.tags.as_ref()),
            related_words: unflatten_related_words(row.related_words.as_ref()),
            language: row.language.clone(),
            collection_id: collection_id.clone(),
            user_id: "local".to_string(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        // Create vocabulary
        match local_db.create_vocabulary(&vocab, "local") {
            Ok(_) => {
                rows_imported += 1;
                // Track this collection for word count update
                affected_collections.insert(collection_id.clone());
            }
            Err(e) => {
                rows_failed += 1;
                errors.push(CsvImportError {
                    row_number,
                    error_message: format!("Failed to create vocabulary: {}", e),
                    row_data: row.word.clone(),
                });
            }
        }
    }

    // Update word counts for all affected collections
    println!("📊 Updating word counts for {} affected collections...", affected_collections.len());
    for collection_id in &affected_collections {
        if let Err(e) = local_db.update_collection_word_count(collection_id) {
            println!("⚠️ Warning: Failed to update word count for collection {}: {}", collection_id, e);
        }
    }

    println!("✅ CSV import complete: {} imported, {} failed", rows_imported, rows_failed);

    Ok(CsvImportResult {
        success: rows_failed == 0,
        rows_imported,
        rows_failed,
        errors,
        collections_created,
    })
}
