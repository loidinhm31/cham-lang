mod notification_commands;
mod scheduled_task_handler;

use notification_commands::*;
use scheduled_task_handler::NotificationTaskHandler;
use tauri::Manager;

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
            println!("Cham Lang ready!");
            println!("Google Drive backup available - configure in Profile");

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
