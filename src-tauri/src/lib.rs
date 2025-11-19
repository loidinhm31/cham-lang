mod models;
mod local_db;
mod commands;
mod collection_commands;
mod gdrive_sync;
mod gdrive_commands;

use local_db::LocalDatabase;
use commands::*;
use collection_commands::*;
use gdrive_commands::*;
use std::sync::Arc;
use tokio::sync::Mutex;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("🚀 Starting Cham Lang (local-only mode)...");

    // Get application data directory
    let app_dirs = directories::ProjectDirs::from("com", "chamlang", "ChamLang")
        .expect("Could not determine app directories");

    // Create data directory if it doesn't exist
    std::fs::create_dir_all(app_dirs.data_dir())
        .expect("Could not create app data directory");

    // Initialize local SQLite database
    let db_path = app_dirs.data_dir().join("chamlang.db");
    println!("📁 Database location: {:?}", db_path);

    let local_db = LocalDatabase::new(db_path.clone())
        .expect("Failed to initialize local database");

    // Initialize Google Drive sync state
    let gdrive_state = gdrive_commands::GDriveState {
        access_token: Arc::new(Mutex::new(None)),
        db_path: db_path.clone(),
    };

    println!("✓ Local database initialized");
    println!("✓ Cham Lang ready - all data stored locally!");
    println!("💡 Google Drive sync available - configure in Profile");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(local_db)
        .manage(gdrive_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            // Collections
            create_collection,
            get_collection,
            get_user_collections,
            get_public_collections,
            update_collection,
            delete_collection,
            share_collection,
            unshare_collection,
            // Level configuration
            get_level_configuration,
            // Vocabulary CRUD
            create_vocabulary,
            get_vocabulary,
            get_vocabularies_by_collection,
            search_vocabularies,
            update_vocabulary,
            delete_vocabulary,
            // User preferences
            save_preferences,
            get_preferences,
            // Practice
            create_practice_session,
            get_practice_sessions,
            update_practice_progress,
            get_practice_progress,
            // Google Drive Sync
            set_gdrive_token,
            backup_to_gdrive,
            restore_from_gdrive,
            get_gdrive_backup_info,
            is_gdrive_configured,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
