import { invoke } from "@tauri-apps/api/core";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";

/**
 * Daily Reminder Request
 * Matches the Rust DailyReminderRequest struct
 */
export interface DailyReminderRequest {
  time: string; // HH:MM format (e.g., "19:00")
  title: string;
  body: string;
}

/**
 * Schedule Notification Request
 * For one-time notifications
 */
export interface ScheduleNotificationRequest {
  title: string;
  body: string;
  delay_seconds: number;
}

/**
 * Notification Service
 * Handles all notification-related operations including scheduled reminders
 */
export class NotificationService {
  /**
   * Check if notification permission is granted
   */
  static async isPermissionGranted(): Promise<boolean> {
    return isPermissionGranted();
  }

  /**
   * Request notification permission from user
   */
  static async requestPermission(): Promise<"granted" | "denied" | "default"> {
    return requestPermission();
  }

  /**
   * Ensure notification permission is granted, request if needed
   * @returns true if permission granted, false otherwise
   */
  static async ensurePermission(): Promise<boolean> {
    let permissionGranted = await this.isPermissionGranted();

    if (!permissionGranted) {
      const permission = await this.requestPermission();
      permissionGranted = permission === "granted";
    }

    return permissionGranted;
  }

  /**
   * Send a test notification immediately
   */
  static async sendTestNotification(): Promise<string> {
    return invoke("send_test_notification");
  }

  /**
   * Schedule a one-time notification
   */
  static async scheduleNotification(
    request: ScheduleNotificationRequest,
  ): Promise<string> {
    return invoke("schedule_notification", { request });
  }

  /**
   * Schedule a test notification for 1 minute from now
   */
  static async scheduleTestNotificationOneMinute(): Promise<string> {
    return invoke("schedule_test_notification_one_minute");
  }

  /**
   * Schedule a daily reminder notification
   * Automatically cancels any existing daily reminder before scheduling
   */
  static async scheduleDailyReminder(
    request: DailyReminderRequest,
  ): Promise<string> {
    return invoke("schedule_daily_reminder", { request });
  }

  /**
   * Cancel the daily reminder
   */
  static async cancelDailyReminder(): Promise<string> {
    return invoke("cancel_daily_reminder");
  }

  /**
   * Helper: Schedule daily reminder with permission check
   * @returns Object with success status and message
   */
  static async scheduleDailyReminderWithPermission(
    request: DailyReminderRequest,
  ): Promise<{ success: boolean; message: string }> {
    const hasPermission = await this.ensurePermission();

    if (!hasPermission) {
      return {
        success: false,
        message:
          "Notification permission denied. Please enable notifications in settings.",
      };
    }

    try {
      const message = await this.scheduleDailyReminder(request);
      return { success: true, message };
    } catch (error) {
      return {
        success: false,
        message: `Failed to schedule daily reminder: ${error}`,
      };
    }
  }

  /**
   * Helper: Schedule test notification with permission check
   * @returns Object with success status and message
   */
  static async scheduleTestNotificationWithPermission(): Promise<{
    success: boolean;
    message: string;
  }> {
    const hasPermission = await this.ensurePermission();

    if (!hasPermission) {
      return {
        success: false,
        message:
          "Notification permission denied. Please enable notifications in settings.",
      };
    }

    try {
      const message = await this.scheduleTestNotificationOneMinute();
      return { success: true, message };
    } catch (error) {
      return {
        success: false,
        message: `Failed to schedule notification: ${error}`,
      };
    }
  }
}
