mod models;
mod local_db;
pub mod db;  // New modular database structure
mod commands;
mod collection_commands;
mod gdrive;
mod csv_export;
mod csv_import;
mod notification_commands;
mod scheduled_task_handler;

use collection_commands::*;
use commands::*;
use csv_export::*;
use csv_import::*;
use gdrive::*;
use notification_commands::*;
use scheduled_task_handler::NotificationTaskHandler;
use local_db::LocalDatabase;
use tauri::Manager;

#[cfg(desktop)]
use tauri::{menu::{MenuBuilder, MenuItem}, tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState}};


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
        // IMPORTANT: schedule-task plugin must be initialized first to allow
        // desktop scheduling routines to execute before full app startup
        .plugin(tauri_plugin_schedule_task::init_with_handler(
            NotificationTaskHandler,
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_google_auth::init())
        .plugin(tauri_plugin_dialog::init())
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

            // Setup tray icon (desktop only)
            #[cfg(desktop)]
            {
                let show_hide = MenuItem::with_id(app, "show_hide", "Show/Hide", true, None::<&str>)?;
                let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

                let menu = MenuBuilder::new(app)
                    .item(&show_hide)
                    .separator()
                    .item(&quit)
                    .build()?;

                let _tray = TrayIconBuilder::new()
                    .icon(app.default_window_icon().unwrap().clone())
                    .menu(&menu)
                    .on_menu_event(|app, event| {
                        match event.id().as_ref() {
                            "show_hide" => {
                                if let Some(window) = app.get_webview_window("main") {
                                    match window.is_visible() {
                                        Ok(true) => {
                                            let _ = window.hide();
                                        }
                                        _ => {
                                            // Properly restore window state
                                            let _ = window.unminimize();
                                            let _ = window.show();
                                            let _ = window.set_focus();
                                        }
                                    }
                                }
                            }
                            "quit" => {
                                app.exit(0);
                            }
                            _ => {}
                        }
                    })
                    .on_tray_icon_event(|tray, event| {
                        match event {
                            TrayIconEvent::Click {
                                button: MouseButton::Left,
                                button_state: MouseButtonState::Up,
                                ..
                            } => {
                                let app = tray.app_handle();
                                if let Some(window) = app.get_webview_window("main") {
                                    match window.is_visible() {
                                        Ok(true) => {
                                            let _ = window.hide();
                                        }
                                        _ => {
                                            // Properly restore window state
                                            let _ = window.unminimize();
                                            let _ = window.show();
                                            let _ = window.set_focus();
                                        }
                                    }
                                }
                            }
                            _ => {
                                println!("unhandled event {event:?}");
                            }
                        }
                    })
                    .build(app)?;
            }

            // Setup window event handlers to hide on close and minimize (desktop only)
            #[cfg(desktop)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let window_clone = window.clone();
                    let _ = window.on_window_event(move |event| {
                        match event {
                            tauri::WindowEvent::CloseRequested { api, .. } => {
                                // Prevent window from closing, hide it instead
                                api.prevent_close();
                                let _ = window_clone.hide();
                            }
                            #[cfg(target_os = "linux")]
                            tauri::WindowEvent::Resized(_) => {
                                // On Linux, check if window is minimized
                                if let Ok(false) = window_clone.is_minimized() {
                                    // Window is not minimized, do nothing
                                } else if let Ok(true) = window_clone.is_minimized() {
                                    // Window is minimized, hide it to tray
                                    let _ = window_clone.hide();
                                }
                            }
                            #[cfg(any(target_os = "windows", target_os = "macos"))]
                            tauri::WindowEvent::Focused(false) => {
                                // On Windows/macOS, check if minimized when focus is lost
                                if let Ok(true) = window_clone.is_minimized() {
                                    let _ = window_clone.hide();
                                }
                            }
                            _ => {}
                        }
                    });
                }
            }

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
            get_all_languages,
            // Vocabulary CRUD
            create_vocabulary,
            get_vocabulary,
            get_all_vocabularies,
            get_vocabularies_by_collection,
            get_vocabularies_by_collection_paginated,
            search_vocabularies,
            update_vocabulary,
            delete_vocabulary,
            bulk_move_vocabularies,
            get_all_topics,
            get_all_tags,
            // Practice
            create_practice_session,
            get_practice_sessions,
            update_practice_progress,
            get_practice_progress,
            // Learning Settings (Spaced Repetition)
            get_learning_settings,
            get_or_create_learning_settings,
            update_learning_settings,
            // Google Drive sync
            backup_to_gdrive,
            restore_from_gdrive,
            get_gdrive_backup_info,
            clear_local_database,
            check_version_difference,
            // CSV Import/Export
            export_collections_csv,
            choose_csv_save_location,
            get_export_directory,
            open_export_directory,
            import_vocabularies_csv,
            import_simple_vocabularies,
            generate_csv_template,
            // Notifications
            schedule_notification,
            send_test_notification,
            schedule_test_notification_one_minute,
            schedule_daily_reminder,
            cancel_daily_reminder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
