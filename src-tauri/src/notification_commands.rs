use tauri::{AppHandle, Runtime};
use tauri_plugin_notification::NotificationExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri_plugin_schedule_task::{ScheduleTaskRequest, ScheduleTime, ScheduleTaskExt, CancelTaskRequest};
use chrono::{Local, NaiveTime, TimeZone};

#[derive(Debug, Serialize, Deserialize)]
pub struct ScheduleNotificationRequest {
    pub title: String,
    pub body: String,
    pub delay_seconds: u64,
}

/// Schedule a notification to be shown after a delay using the schedule-task plugin
#[tauri::command]
pub async fn schedule_notification<R: Runtime>(
    app: AppHandle<R>,
    request: ScheduleNotificationRequest,
) -> Result<String, String> {
    log::error!("=== SCHEDULE NOTIFICATION COMMAND CALLED ===");
    log::error!(
        "Scheduling notification '{}' for {} seconds from now",
        request.title,
        request.delay_seconds
    );

    // Create parameters with notification details
    let mut parameters = HashMap::new();
    parameters.insert("title".to_string(), request.title.clone());
    parameters.insert("body".to_string(), request.body.clone());
    parameters.insert("delay_seconds".to_string(), request.delay_seconds.to_string());

    // Create the task request using duration
    let task_name = format!("notification_{}", chrono::Utc::now().timestamp());
    let task_request = ScheduleTaskRequest {
        task_name: task_name.clone(),
        schedule_time: ScheduleTime::Duration(request.delay_seconds),
        parameters: Some(parameters.clone()),
    };

    log::error!("Task name: {}", task_name);
    log::error!("Parameters: {:?}", parameters);
    log::error!("Schedule time: Duration({} seconds)", request.delay_seconds);

    // Use the schedule_task plugin API extension trait
    log::error!("Calling schedule_task plugin...");
    let response = app
        .schedule_task()
        .schedule_task(task_request)
        .await
        .map_err(|e| {
            log::error!("Failed to schedule task: {}", e);
            format!("Failed to schedule task: {}", e)
        })?;

    log::error!("Task scheduled successfully!");
    log::error!("Response: {:?}", response);

    Ok(format!(
        "Notification '{}' scheduled (task_id: {})",
        request.title,
        response.task_id
    ))
}

/// Send an immediate notification for testing
#[tauri::command]
pub async fn send_test_notification<R: Runtime>(app: AppHandle<R>) -> Result<String, String> {
    log::info!("Sending test notification");

    app.notification()
        .builder()
        .title("Test Notification")
        .body("This is a test notification from Cham Lang!")
        .show()
        .map_err(|e| format!("Failed to send notification: {}", e))?;

    Ok("Test notification sent successfully".to_string())
}

/// Schedule a notification for 1 minute from now (for testing)
#[tauri::command]
pub async fn schedule_test_notification_one_minute<R: Runtime>(
    app: AppHandle<R>,
) -> Result<String, String> {
    let request = ScheduleNotificationRequest {
        title: "Scheduled Notification Test".to_string(),
        body: "This notification was scheduled 1 minute ago!".to_string(),
        delay_seconds: 60,
    };

    schedule_notification(app, request).await
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyReminderRequest {
    pub time: String,   // HH:MM format (e.g., "19:00")
    pub title: String,
    pub body: String,
}

/// Parse time string (HH:MM) and return (hour, minute)
fn parse_time(time_str: &str) -> Option<(u32, u32)> {
    let parts: Vec<&str> = time_str.split(':').collect();
    if parts.len() != 2 {
        return None;
    }

    let hour = parts[0].parse::<u32>().ok()?;
    let minute = parts[1].parse::<u32>().ok()?;

    if hour > 23 || minute > 59 {
        return None;
    }

    Some((hour, minute))
}

/// Calculate seconds until next occurrence of specified time
fn calculate_seconds_until_time(hour: u32, minute: u32) -> u64 {
    let now = Local::now();
    let target_time = match NaiveTime::from_hms_opt(hour, minute, 0) {
        Some(time) => time,
        None => {
            log::error!("Invalid time: {}:{}", hour, minute);
            return 0;
        }
    };

    let mut target_datetime = now.date_naive().and_time(target_time);

    // If target time has passed today, schedule for tomorrow
    if now.time() >= target_time {
        target_datetime = (now + chrono::Duration::days(1)).date_naive().and_time(target_time);
    }

    let target_datetime_local = Local.from_local_datetime(&target_datetime).unwrap();
    let duration = target_datetime_local.signed_duration_since(now);

    duration.num_seconds().max(0) as u64
}

/// Schedule a daily reminder notification
#[tauri::command]
pub async fn schedule_daily_reminder<R: Runtime>(
    app: AppHandle<R>,
    request: DailyReminderRequest,
) -> Result<String, String> {
    log::info!(
        "Scheduling daily reminder for {} - {}",
        request.time,
        request.title
    );

    // Cancel any existing daily reminder first to avoid duplicates
    log::info!("Cancelling existing daily reminder (if any)");
    let _ = cancel_daily_reminder(app.clone()).await; // Ignore errors if no existing reminder

    // Parse and validate time
    let (hour, minute) = parse_time(&request.time)
        .ok_or_else(|| "Invalid time format. Expected HH:MM (e.g., 19:00)".to_string())?;

    // Calculate delay until target time
    let delay_seconds = calculate_seconds_until_time(hour, minute);

    log::info!("First notification will be sent in {} seconds", delay_seconds);

    // Create parameters with notification details and daily flag
    let mut parameters = HashMap::new();
    parameters.insert("title".to_string(), request.title.clone());
    parameters.insert("body".to_string(), request.body.clone());
    parameters.insert("is_daily".to_string(), "true".to_string());
    parameters.insert("time".to_string(), request.time.clone());

    // Create the task request
    let task_name = "daily_reminder".to_string();
    let task_request = ScheduleTaskRequest {
        task_name: task_name.clone(),
        schedule_time: ScheduleTime::Duration(delay_seconds),
        parameters: Some(parameters),
    };

    // Schedule the task
    let response = app
        .schedule_task()
        .schedule_task(task_request)
        .await
        .map_err(|e| {
            log::error!("Failed to schedule daily reminder: {}", e);
            format!("Failed to schedule daily reminder: {}", e)
        })?;

    log::info!("Daily reminder scheduled successfully!");
    Ok(format!(
        "Daily reminder scheduled for {} (task_id: {})",
        request.time, response.task_id
    ))
}

/// Cancel the daily reminder
#[tauri::command]
pub async fn cancel_daily_reminder<R: Runtime>(
    app: AppHandle<R>,
) -> Result<String, String> {
    log::info!("Cancelling daily reminder");

    // Cancel the task by name
    let cancel_request = CancelTaskRequest {
        task_id: "daily_reminder".to_string(),
    };

    app.schedule_task()
        .cancel_task(cancel_request)
        .map_err(|e| {
            log::error!("Failed to cancel daily reminder: {}", e);
            format!("Failed to cancel daily reminder: {}", e)
        })?;

    log::info!("Daily reminder cancelled successfully");
    Ok("Daily reminder cancelled successfully".to_string())
}
