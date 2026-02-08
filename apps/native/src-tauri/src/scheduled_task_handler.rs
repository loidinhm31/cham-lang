use tauri::{AppHandle, Runtime};
use tauri_plugin_schedule_task::{ScheduledTaskHandler, Result};
use std::collections::HashMap;

pub struct NotificationTaskHandler;

impl<R: Runtime> ScheduledTaskHandler<R> for NotificationTaskHandler {
    fn handle_scheduled_task(
        &self,
        task_name: &str,
        parameters: HashMap<String, String>,
        _app: &AppHandle<R>,
    ) -> Result<()> {
        // Initialize logger for Android (safe to call multiple times)
        #[cfg(target_os = "android")]
        {
            let _ = android_logger::init_once(
                android_logger::Config::default()
                    .with_max_level(log::LevelFilter::Debug)
                    .with_tag("ScheduledTask"),
            );
        }

        log::error!("=== SCHEDULED TASK HANDLER CALLED ===");
        log::error!("Task name: {}", task_name);
        log::error!("Parameters: {:?}", parameters);

        // Get notification details from parameters
        let title = parameters
            .get("title")
            .cloned()
            .unwrap_or_else(|| "Scheduled Notification".to_string());

        let body = parameters
            .get("body")
            .cloned()
            .unwrap_or_else(|| "Your scheduled notification is ready!".to_string());

        log::error!("Will send notification - title: '{}', body: '{}'", title, body);

        // Send the notification
        #[cfg(not(target_os = "android"))]
        {
            use tauri_plugin_notification::NotificationExt;
            log::error!("Sending notification now...");

            match _app.notification()
                .builder()
                .title(&title)
                .body(&body)
                .show()
            {
                Ok(_) => {
                    log::error!("Notification sent successfully!");
                }
                Err(e) => {
                    log::error!("Failed to send notification: {}", e);
                }
            }
        }

        #[cfg(target_os = "android")]
        {
            log::error!("On Android, notification will be sent by Worker directly");
            log::error!("Title: '{}', Body: '{}'", title, body);
        }

        // Handle daily reminder rescheduling (app-specific logic)
        let is_daily = parameters.get("is_daily").map(|s| s == "true").unwrap_or(false);

        if is_daily && task_name == "daily_reminder" {
            log::error!("Daily reminder triggered - will reschedule for tomorrow");

            if let Some(time_str) = parameters.get("time") {
                log::error!("Rescheduling daily reminder for time: {}", time_str);

                // Reschedule for tomorrow using the notification_commands module
                // This runs async, so we spawn it in a background task
                let app = _app.clone();
                let time = time_str.clone();
                let title_clone = title.clone();
                let body_clone = body.clone();

                tauri::async_runtime::spawn(async move {
                    use crate::notification_commands::{schedule_daily_reminder, DailyReminderRequest};

                    let request = DailyReminderRequest {
                        time,
                        title: title_clone,
                        body: body_clone,
                    };

                    match schedule_daily_reminder(app, request).await {
                        Ok(msg) => log::error!("Successfully rescheduled daily reminder: {}", msg),
                        Err(e) => log::error!("Failed to reschedule daily reminder: {}", e),
                    }
                });
            }
        }

        Ok(())
    }
}
