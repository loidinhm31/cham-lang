mod models;
mod database;
mod commands;

use database::DatabaseManager;
use commands::*;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_manager = DatabaseManager::new("cham_lang".to_string());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(db_manager)
        .invoke_handler(tauri::generate_handler![
            greet,
            // Database connection
            connect_database,
            disconnect_database,
            is_database_connected,
            // Vocabulary CRUD
            create_vocabulary,
            get_vocabulary,
            get_all_vocabularies,
            update_vocabulary,
            delete_vocabulary,
            search_vocabularies,
            get_vocabularies_by_topic,
            get_vocabularies_by_level,
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
