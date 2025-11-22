use crate::models::{Vocabulary, Collection};
use crate::local_db::LocalDatabase;
use serde::{Deserialize, Serialize};
use tauri::State;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct CsvExportRequest {
    pub collection_ids: Vec<String>,
}

/// Flatten definitions array to delimited string
/// Format: "meaning1|translation1|example1;meaning2|translation2|example2"
fn flatten_definitions(vocabulary: &Vocabulary) -> String {
    vocabulary.definitions.iter()
        .map(|def| {
            let mut parts = vec![def.meaning.clone()];
            if let Some(trans) = &def.translation {
                parts.push(trans.clone());
            } else {
                parts.push(String::new());
            }
            if let Some(ex) = &def.example {
                parts.push(ex.clone());
            } else {
                parts.push(String::new());
            }
            parts.join("|")
        })
        .collect::<Vec<_>>()
        .join(";")
}

/// Flatten example sentences to pipe-delimited string
/// Format: "sentence1|sentence2|sentence3"
fn flatten_examples(vocabulary: &Vocabulary) -> String {
    vocabulary.example_sentences.join("|")
}

/// Flatten topics to pipe-delimited string
/// Format: "topic1|topic2|topic3"
fn flatten_topics(vocabulary: &Vocabulary) -> String {
    vocabulary.topics.join("|")
}

/// Flatten related words to delimited string
/// Format: "word1:synonym|word2:antonym|word3:related"
fn flatten_related_words(vocabulary: &Vocabulary) -> String {
    vocabulary.related_words.iter()
        .map(|rw| format!("{}:{:?}", rw.word, rw.relationship))
        .collect::<Vec<_>>()
        .join("|")
}

/// CSV row structure matching the schema
#[derive(Debug, Serialize)]
struct CsvRow {
    collection_name: String,
    collection_description: String,
    collection_language: String,
    word: String,
    word_type: String,
    level: String,
    ipa: String,
    concept: String,
    language: String,
    definitions: String,
    example_sentences: String,
    topics: String,
    related_words: String,
}

impl CsvRow {
    fn from_vocabulary(vocab: &Vocabulary, collection: &Collection) -> Self {
        CsvRow {
            collection_name: collection.name.clone(),
            collection_description: collection.description.clone(),
            collection_language: collection.language.clone(),
            word: vocab.word.clone(),
            word_type: format!("{:?}", vocab.word_type),
            level: vocab.level.clone(),
            ipa: vocab.ipa.clone(),
            concept: vocab.concept.clone().unwrap_or_default(),
            language: vocab.language.clone(),
            definitions: flatten_definitions(vocab),
            example_sentences: flatten_examples(vocab),
            topics: flatten_topics(vocab),
            related_words: flatten_related_words(vocab),
        }
    }
}

/// Export collections and their vocabularies to CSV file
#[tauri::command]
pub fn export_collections_csv(
    local_db: State<'_, LocalDatabase>,
    request: CsvExportRequest,
    file_path: String,
) -> Result<String, String> {
    println!("📤 Starting CSV export for {} collections", request.collection_ids.len());

    let mut csv_rows: Vec<CsvRow> = Vec::new();
    let mut total_vocabularies = 0;

    // Collect all vocabularies from selected collections
    for collection_id in &request.collection_ids {
        // Get collection info
        let collection = local_db.get_collection(collection_id)
            .map_err(|e| format!("Failed to get collection {}: {}", collection_id, e))?
            .ok_or_else(|| format!("Collection not found: {}", collection_id))?;

        // Get vocabularies for this collection
        let vocabularies = local_db.get_vocabularies_by_collection(collection_id, None)
            .map_err(|e| format!("Failed to get vocabularies for collection {}: {}", collection_id, e))?;

        println!("  📚 Collection '{}': {} vocabularies", collection.name, vocabularies.len());

        // Convert each vocabulary to CSV row
        for vocab in vocabularies {
            csv_rows.push(CsvRow::from_vocabulary(&vocab, &collection));
            total_vocabularies += 1;
        }
    }

    // Write to CSV file
    let path = PathBuf::from(&file_path);
    let mut writer = csv::Writer::from_path(&path)
        .map_err(|e| format!("Failed to create CSV file: {}", e))?;

    // Write all rows
    for row in csv_rows {
        writer.serialize(&row)
            .map_err(|e| format!("Failed to write CSV row: {}", e))?;
    }

    writer.flush()
        .map_err(|e| format!("Failed to save CSV file: {}", e))?;

    println!("✅ CSV export complete: {} vocabularies exported to {}", total_vocabularies, file_path);

    Ok(format!("Successfully exported {} vocabularies from {} collections",
               total_vocabularies, request.collection_ids.len()))
}

/// Open file save dialog for CSV export
#[tauri::command]
pub async fn choose_csv_save_location() -> Result<Option<String>, String> {
    // Note: In Tauri 2, the dialog is called from frontend using tauri-plugin-dialog
    // This command is kept for future use if needed
    Ok(None)
}

/// Generate a CSV template with example data for users to follow
#[tauri::command]
pub fn generate_csv_template(file_path: String) -> Result<String, String> {
    println!("📝 Generating CSV template at: {}", file_path);

    let path = PathBuf::from(&file_path);
    let mut writer = csv::Writer::from_path(&path)
        .map_err(|e| format!("Failed to create CSV template file: {}", e))?;

    // Write header
    writer.write_record(&[
        "collection_name",
        "collection_description",
        "collection_language",
        "word",
        "word_type",
        "level",
        "ipa",
        "concept",
        "language",
        "definitions",
        "example_sentences",
        "topics",
        "related_words",
    ])
    .map_err(|e| format!("Failed to write CSV header: {}", e))?;

    // Write example rows
    let examples = vec![
        vec![
            "Animals",
            "Common animals vocabulary",
            "en",
            "cat",
            "noun",
            "A1",
            "/kæt/",
            "a domestic feline",
            "en",
            "a small domesticated carnivorous mammal|con mèo|I have a cat",
            "The cat is sleeping on the sofa|Cats are independent animals",
            "animals|pets|mammals",
            "dog:related|kitten:derivative",
        ],
        vec![
            "Animals",
            "Common animals vocabulary",
            "en",
            "dog",
            "noun",
            "A1",
            "/dɔːɡ/",
            "a domestic canine",
            "en",
            "a domesticated carnivorous mammal|con chó|She walks her dog every morning",
            "Dogs are loyal companions|The dog barked loudly",
            "animals|pets|mammals",
            "cat:related|puppy:derivative",
        ],
        vec![
            "Basic Verbs",
            "Essential action words",
            "en",
            "run",
            "verb",
            "A1",
            "/rʌn/",
            "move at speed using legs",
            "en",
            "to move swiftly on foot|chạy|I run every morning;to operate or function|vận hành|The engine runs smoothly",
            "She runs 5 kilometers daily|He ran to catch the bus",
            "sports|movement|exercise",
            "walk:antonym|sprint:synonym|jog:similar",
        ],
    ];

    for example in examples {
        writer.write_record(&example)
            .map_err(|e| format!("Failed to write example row: {}", e))?;
    }

    writer.flush()
        .map_err(|e| format!("Failed to save CSV template: {}", e))?;

    println!("✅ CSV template generated successfully");

    Ok("CSV template generated successfully".to_string())
}
