mod models;
mod database;
mod commands;
mod auth_commands;
mod collection_commands;

use database::DatabaseManager;
use commands::*;
use auth_commands::*;
use collection_commands::*;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load environment variables from .env file (if exists)
    // This will fail silently if .env doesn't exist, which is fine
    let _ = dotenvy::dotenv();

    let db_manager = DatabaseManager::new("cham_lang".to_string());

    // Auto-connect to MongoDB if MONGODB_URI is set in environment
    if let Ok(mongodb_uri) = std::env::var("MONGODB_URI") {
        println!("Found MONGODB_URI, attempting auto-connect...");
        let db_clone = db_manager.clone();
        tauri::async_runtime::spawn(async move {
            match db_clone.connect(&mongodb_uri).await {
                Ok(_) => println!("Successfully connected to MongoDB on startup"),
                Err(e) => eprintln!("Failed to auto-connect to MongoDB: {}", e),
            }
        });
    } else {
        println!("MONGODB_URI not found in environment. Database connection can be configured via UI.");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(db_manager)
        .invoke_handler(tauri::generate_handler![
            greet,
            // Database connection
            connect_database,
            disconnect_database,
            is_database_connected,
            // Authentication
            register_user,
            login_user,
            get_user_by_id,
            change_password,
            // Collections
            create_collection,
            get_collection,
            get_user_collections,
            get_public_collections,
            update_collection,
            delete_collection,
            share_collection,
            unshare_collection,
            update_collection_word_count,
            // Level configuration
            get_level_configuration,
            // Vocabulary CRUD
            create_vocabulary,
            get_vocabulary,
            get_all_vocabularies,
            update_vocabulary,
            delete_vocabulary,
            search_vocabularies,
            get_vocabularies_by_topic,
            get_vocabularies_by_level,
            get_vocabularies_by_collection,
            // User preferences
            save_preferences,
            get_preferences,
            // Practice
            create_practice_session,
            get_practice_sessions,
            update_practice_progress,
            get_practice_progress,
            get_word_progress,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
