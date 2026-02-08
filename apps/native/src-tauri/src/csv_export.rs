use crate::local_db::LocalDatabase;
use crate::models::{Collection, Vocabulary};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportResult {
    pub message: String,
    pub file_path: String,
    pub file_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CsvExportRequest {
    pub collection_ids: Vec<String>,
}

/// Flatten definitions array to delimited string
/// Format: "meaning1|translation1|example1;meaning2|translation2|example2"
fn flatten_definitions(vocabulary: &Vocabulary) -> String {
    vocabulary
        .definitions
        .iter()
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

/// Flatten tags to pipe-delimited string
/// Format: "tag1|tag2|tag3"
fn flatten_tags(vocabulary: &Vocabulary) -> String {
    vocabulary.tags.join("|")
}

/// Flatten related words to delimited string
/// Format: "word1:synonym|word2:antonym|word3:related"
fn flatten_related_words(vocabulary: &Vocabulary) -> String {
    vocabulary
        .related_words
        .iter()
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
    audio_url: String,
    concept: String,
    language: String,
    definitions: String,
    example_sentences: String,
    topics: String,
    tags: String,
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
            audio_url: vocab.audio_url.clone().unwrap_or_default(),
            concept: vocab.concept.clone().unwrap_or_default(),
            language: vocab.language.clone(),
            definitions: flatten_definitions(vocab),
            example_sentences: flatten_examples(vocab),
            topics: flatten_topics(vocab),
            tags: flatten_tags(vocab),
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
) -> Result<ExportResult, String> {
    println!(
        "Starting CSV export for {} collections",
        request.collection_ids.len()
    );

    let mut csv_rows: Vec<CsvRow> = Vec::new();
    let mut total_vocabularies = 0;

    // Collect all vocabularies from selected collections
    for collection_id in &request.collection_ids {
        // Get collection info
        let collection = local_db
            .get_collection(collection_id)
            .map_err(|e| format!("Failed to get collection {}: {}", collection_id, e))?
            .ok_or_else(|| format!("Collection not found: {}", collection_id))?;

        // Get vocabularies for this collection
        let vocabularies = local_db
            .get_vocabularies_by_collection(collection_id, None)
            .map_err(|e| {
                format!(
                    "Failed to get vocabularies for collection {}: {}",
                    collection_id, e
                )
            })?;

        println!(
            "  Collection '{}': {} vocabularies",
            collection.name,
            vocabularies.len()
        );

        // Convert each vocabulary to CSV row
        for vocab in vocabularies {
            csv_rows.push(CsvRow::from_vocabulary(&vocab, &collection));
            total_vocabularies += 1;
        }
    }

    // Generate CSV content in memory first
    let mut csv_buffer = Vec::new();
    {
        let mut writer = csv::Writer::from_writer(&mut csv_buffer);

        // Write all rows
        for row in csv_rows {
            writer
                .serialize(&row)
                .map_err(|e| format!("Failed to write CSV row: {}", e))?;
        }

        writer
            .flush()
            .map_err(|e| format!("Failed to flush CSV buffer: {}", e))?;
    }

    // Determine the actual write path
    let write_path = PathBuf::from(&file_path);

    // Ensure parent directory exists
    if let Some(parent) = write_path.parent() {
        if !parent.exists() {
            println!("Creating parent directory: {:?}", parent);
            fs::create_dir_all(parent).map_err(|e| {
                format!(
                    "Failed to create directory {:?}: {} (OS error: {})",
                    parent,
                    e,
                    e.raw_os_error().unwrap_or(-1)
                )
            })?;
        }
    }

    // Write the CSV buffer to the file
    println!("Writing {} bytes to: {:?}", csv_buffer.len(), write_path);
    fs::write(&write_path, csv_buffer).map_err(|e| {
        let os_error = e.raw_os_error().unwrap_or(-1);
        let err_msg = format!(
            "Failed to save CSV file to {:?}: {} (OS error: {})",
            write_path, e, os_error
        );
        eprintln!("{}", err_msg);
        err_msg
    })?;

    println!(
        "CSV export complete: {} vocabularies exported to {}",
        total_vocabularies, file_path
    );

    let file_name = write_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("export.csv")
        .to_string();

    Ok(ExportResult {
        message: format!(
            "Successfully exported {} vocabularies from {} collections",
            total_vocabularies,
            request.collection_ids.len()
        ),
        file_path: file_path.clone(),
        file_name,
    })
}

/// Open file save dialog for CSV export
#[tauri::command]
pub async fn choose_csv_save_location() -> Result<Option<String>, String> {
    // Note: In Tauri 2, the dialog is called from frontend using tauri-plugin-dialog
    // This command is kept for future use if needed
    Ok(None)
}

/// Get the app's document directory for Android-safe file exports
/// Returns a path that's guaranteed to be writable on both desktop and Android
#[tauri::command]
pub fn get_export_directory(app: AppHandle) -> Result<String, String> {
    // Try to get the app's data directory
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    // Create an exports subdirectory
    let export_dir = data_dir.join("exports");

    // Ensure it exists
    if !export_dir.exists() {
        fs::create_dir_all(&export_dir)
            .map_err(|e| format!("Failed to create exports directory: {}", e))?;
    }

    export_dir
        .to_str()
        .ok_or_else(|| "Failed to convert path to string".to_string())
        .map(|s| s.to_string())
}

/// Open the exports directory in the system file manager
#[tauri::command]
pub fn open_export_directory(app: AppHandle) -> Result<(), String> {
    let export_dir = get_export_directory(app)?;

    #[cfg(target_os = "android")]
    {
        // On Android, we can't open the app's data directory in the file manager
        // because it's in a protected location. Return an error message.
        Err(format!(
            "Exports are saved to the app's data directory.\nPath: {}",
            export_dir
        ))
    }

    #[cfg(not(target_os = "android"))]
    {
        // On desktop, try to open the directory using system commands
        #[cfg(target_os = "windows")]
        std::process::Command::new("explorer")
            .arg(&export_dir)
            .spawn()
            .map_err(|e| format!("Failed to open exports directory: {}", e))?;

        #[cfg(target_os = "macos")]
        std::process::Command::new("open")
            .arg(&export_dir)
            .spawn()
            .map_err(|e| format!("Failed to open exports directory: {}", e))?;

        #[cfg(target_os = "linux")]
        std::process::Command::new("xdg-open")
            .arg(&export_dir)
            .spawn()
            .map_err(|e| format!("Failed to open exports directory: {}", e))?;

        Ok(())
    }
}

/// Generate a CSV template with example data for users to follow
#[tauri::command]
pub fn generate_csv_template(file_path: String) -> Result<String, String> {
    println!("Generating CSV template at: {}", file_path);

    let path = PathBuf::from(&file_path);

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            println!("Creating parent directory: {:?}", parent);
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory {:?}: {}", parent, e))?;
        }
    }

    let mut writer = csv::Writer::from_path(&path)
        .map_err(|e| format!("Failed to create CSV template file: {}", e))?;

    // Write header
    writer
        .write_record(&[
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
            "tags",
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
            "beginner|common",
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
            "beginner|common|important",
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
            "common|basic",
            "walk:antonym|sprint:synonym|jog:similar",
        ],
    ];

    for example in examples {
        writer
            .write_record(&example)
            .map_err(|e| format!("Failed to write example row: {}", e))?;
    }

    writer
        .flush()
        .map_err(|e| format!("Failed to save CSV template: {}", e))?;

    println!("CSV template generated successfully");

    Ok("CSV template generated successfully".to_string())
}
