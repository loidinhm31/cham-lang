mod auth;
mod collection_commands;
mod commands;
mod csv_export;
mod csv_import;
pub mod db; // New modular database structure
mod gdrive;
mod local_db;
mod models;
mod notification_commands;
mod scheduled_task_handler;
mod sync;

// Desktop-only: Embedded web server and session management
#[cfg(desktop)]
mod http_api;
#[cfg(desktop)]
mod session;
#[cfg(desktop)]
mod web_server;

use collection_commands::*;
use commands::*;
use csv_export::*;
use csv_import::*;
use gdrive::*;
use local_db::LocalDatabase;
use notification_commands::*;
use scheduled_task_handler::NotificationTaskHandler;
use tauri::Manager;

use auth::AuthService;
use sync::SyncService;
use std::sync::{Arc, Mutex};

#[cfg(desktop)]
use tauri::{
    menu::{MenuBuilder, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

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

#[cfg(desktop)]
fn init_logging() {
    env_logger::init();
}

//=============================================================================
// Browser Sync Commands (Desktop only)
//=============================================================================

/// Start the browser sync server and return the URL with session token
#[cfg(desktop)]
#[tauri::command]
fn start_browser_sync(
    db: tauri::State<'_, LocalDatabase>,
    session_manager: tauri::State<'_, session::SharedSessionManager>,
) -> Result<String, String> {
    use session::SharedSessionManager;

    // Check if already running
    if web_server::is_server_running() {
        return Err("Browser sync server is already running".to_string());
    }

    // Clone what we need for the web server
    let db_clone = (*db).clone();
    let session_manager_clone: SharedSessionManager = (*session_manager).clone();

    // Start the web server and get the token
    let token = web_server::start_web_server(db_clone, session_manager_clone);

    // In dev mode, open browser to Vite dev server for HMR support
    // In production, open to the embedded web server
    let is_dev_mode =
        std::env::var("TAURI_DEV_HOST").is_ok() || std::env::var("CARGO_MANIFEST_DIR").is_ok();

    let browser_port = if is_dev_mode {
        1420 // Vite dev server
    } else {
        web_server::WEB_SERVER_PORT // Embedded server (25091)
    };

    let url = format!("http://localhost:{}?session={}", browser_port, token);

    println!("Browser sync started: {}", url);
    if is_dev_mode {
        println!("   Dev mode: Opening Vite (1420), API on 25091");
    }
    Ok(url)
}

/// Stop the browser sync server
#[cfg(desktop)]
#[tauri::command]
fn stop_browser_sync(
    session_manager: tauri::State<'_, session::SharedSessionManager>,
) -> Result<String, String> {
    // Stop the server
    web_server::stop_web_server();

    // Clear the session token
    session_manager.clear_token();

    Ok("Browser sync stopped".to_string())
}

/// Check if browser sync is currently active
#[cfg(desktop)]
#[tauri::command]
fn is_browser_sync_active() -> bool {
    web_server::is_server_running()
}

//=============================================================================
// Auth & Sync Commands
//=============================================================================

#[tauri::command]
async fn auth_configure_sync(
    auth: tauri::State<'_, Arc<Mutex<AuthService>>>,
    app_handle: tauri::AppHandle,
    server_url: Option<String>,
    app_id: Option<String>,
    api_key: Option<String>,
) -> Result<(), String> {
    let auth = auth.lock().map_err(|e| format!("Lock error: {}", e))?.clone();
    auth.configure_sync(&app_handle, server_url, app_id, api_key).await
}

#[tauri::command]
async fn auth_register(
    auth: tauri::State<'_, Arc<Mutex<AuthService>>>,
    app_handle: tauri::AppHandle,
    username: String,
    email: String,
    password: String,
) -> Result<auth::AuthResponse, String> {
    let auth = auth.lock().map_err(|e| format!("Lock error: {}", e))?.clone();
    auth.register(&app_handle, username, email, password).await
}

#[tauri::command]
async fn auth_login(
    auth: tauri::State<'_, Arc<Mutex<AuthService>>>,
    app_handle: tauri::AppHandle,
    email: String,
    password: String,
) -> Result<auth::AuthResponse, String> {
    let auth = auth.lock().map_err(|e| format!("Lock error: {}", e))?.clone();
    auth.login(&app_handle, email, password).await
}

#[tauri::command]
async fn auth_logout(
    auth: tauri::State<'_, Arc<Mutex<AuthService>>>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let auth = auth.lock().map_err(|e| format!("Lock error: {}", e))?.clone();
    auth.logout(&app_handle).await
}

#[tauri::command]
async fn auth_refresh_token(
    auth: tauri::State<'_, Arc<Mutex<AuthService>>>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let auth = auth.lock().map_err(|e| format!("Lock error: {}", e))?.clone();
    auth.refresh_token(&app_handle).await
}

#[tauri::command]
async fn auth_get_status(
    auth: tauri::State<'_, Arc<Mutex<AuthService>>>,
    app_handle: tauri::AppHandle,
) -> Result<auth::AuthStatus, String> {
    let auth = auth.lock().map_err(|e| format!("Lock error: {}", e))?.clone();
    Ok(auth.get_auth_status(&app_handle).await)
}

#[tauri::command]
async fn auth_is_authenticated(
    auth: tauri::State<'_, Arc<Mutex<AuthService>>>,
    app_handle: tauri::AppHandle,
) -> Result<bool, String> {
    let auth = auth.lock().map_err(|e| format!("Lock error: {}", e))?.clone();
    Ok(auth.is_authenticated(&app_handle).await)
}

#[tauri::command]
async fn auth_get_access_token(
    auth: tauri::State<'_, Arc<Mutex<AuthService>>>,
    app_handle: tauri::AppHandle,
) -> Result<String, String> {
    let auth = auth.lock().map_err(|e| format!("Lock error: {}", e))?.clone();
    auth.get_access_token(&app_handle).await
}

#[tauri::command]
async fn sync_now(
    sync_service: tauri::State<'_, Arc<Mutex<SyncService>>>,
    app_handle: tauri::AppHandle,
) -> Result<sync::SyncResult, String> {
    let sync_service = sync_service.lock().map_err(|e| format!("Lock error: {}", e))?.clone();
    sync_service.sync_now(&app_handle).await
}

#[tauri::command]
async fn sync_get_status(
    sync_service: tauri::State<'_, Arc<Mutex<SyncService>>>,
    app_handle: tauri::AppHandle,
) -> Result<sync::SyncStatus, String> {
    let sync_service = sync_service.lock().map_err(|e| format!("Lock error: {}", e))?.clone();
    sync_service.get_sync_status(&app_handle).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    println!("Starting Cham Lang...");

    // Load .env file if present
    dotenvy::dotenv().ok();

    init_logging();

    let mut builder = tauri::Builder::default();

    // IMPORTANT: Single-instance plugin must be registered FIRST to work correctly
    // This ensures only one instance of the app can run at a time (desktop only)
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // When a new instance is attempted, focus the existing window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }));
    }

    builder
        // IMPORTANT: schedule-task plugin must be initialized first to allow
        // desktop scheduling routines to execute before full app startup
        .plugin(tauri_plugin_schedule_task::init_with_handler(
            NotificationTaskHandler,
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_google_auth::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            // Get application data directory using Tauri's API (works on all platforms including Android)
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Could not determine app data directory");

            // Create data directory if it doesn't exist
            std::fs::create_dir_all(&app_data_dir).expect("Could not create app data directory");

            // Initialize local SQLite database
            let db_path = app_data_dir.join("chamlang.db");
            println!("Database location: {:?}", db_path);

            let local_db =
                LocalDatabase::new(db_path.clone()).expect("Failed to initialize local database");

            println!("Local database initialized");
            println!("Cham Lang ready - all data stored locally!");
            println!("Google Drive sync available - configure in Profile");

            // Store the database in app state
            let local_db_arc = Arc::new(local_db.clone());
            app.manage(local_db);

            // Initialize auth and sync services
            let server_url = std::env::var("SYNC_SERVER_URL")
                .unwrap_or_else(|_| "http://localhost:3000".to_string());
            let app_id = std::env::var("SYNC_CENTER_APP_ID")
                .unwrap_or_else(|_| "cham-lang".to_string());
            let api_key = std::env::var("SYNC_CENTER_API_KEY")
                .unwrap_or_default();

            let auth_service = AuthService::new(
                server_url,
                app_id,
                api_key,
            );
            let auth_arc = Arc::new(Mutex::new(auth_service));
            app.manage(auth_arc.clone());

            let sync_service = SyncService::new(local_db_arc, auth_arc);
            app.manage(Arc::new(Mutex::new(sync_service)));

            println!("Sync infrastructure initialized");

            // Initialize session manager for browser sync (desktop only)
            #[cfg(desktop)]
            {
                let session_manager = session::create_session_manager();
                app.manage(session_manager);
                println!("Browser sync available - use 'Open in Browser' in Profile");
            }

            // Setup tray icon (desktop only)
            #[cfg(desktop)]
            {
                let show_hide =
                    MenuItem::with_id(app, "show_hide", "Show/Hide", true, None::<&str>)?;
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
            // Browser Sync (desktop only)
            #[cfg(desktop)]
            start_browser_sync,
            #[cfg(desktop)]
            stop_browser_sync,
            #[cfg(desktop)]
            is_browser_sync_active,
            // Auth & Sync
            auth_configure_sync,
            auth_register,
            auth_login,
            auth_logout,
            auth_refresh_token,
            auth_get_status,
            auth_is_authenticated,
            auth_get_access_token,
            sync_now,
            sync_get_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
