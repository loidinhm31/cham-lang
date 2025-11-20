mod models;
mod local_db;
mod commands;
mod collection_commands;
mod gdrive;

use local_db::LocalDatabase;
use commands::*;
use collection_commands::*;
use gdrive::*;
use tauri::Manager;


// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg(target_os = "android")]
fn init_logging() {
    android_logger::init_once(
        android_logger::Config::default()
            .with_max_level(log::LevelFilter::Trace)
            .with_tag("{{app.name}}"),
    );
}

#[cfg(not(target_os = "android"))]
fn init_logging() {
    env_logger::init();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("🚀 Starting Cham Lang (local-only mode)...");

    init_logging();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_google_auth::init())
        .setup(|app| {
            // Get application data directory using Tauri's API (works on all platforms including Android)
            let app_data_dir = app.path().app_data_dir()
                .expect("Could not determine app data directory");

            // Create data directory if it doesn't exist
            std::fs::create_dir_all(&app_data_dir)
                .expect("Could not create app data directory");

            // Initialize local SQLite database
            let db_path = app_data_dir.join("chamlang.db");
            println!("📁 Database location: {:?}", db_path);

            let local_db = LocalDatabase::new(db_path.clone())
                .expect("Failed to initialize local database");

            println!("✓ Local database initialized");
            println!("✓ Cham Lang ready - all data stored locally!");
            println!("💡 Google Drive sync available - configure in Profile");

            // Store the database in app state
            app.manage(local_db);

            Ok(())
        })
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
            // Google Drive sync
            backup_to_gdrive,
            restore_from_gdrive,
            get_gdrive_backup_info,
            clear_local_database,
            check_version_difference,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
