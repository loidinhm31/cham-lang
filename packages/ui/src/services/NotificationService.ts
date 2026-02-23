/**
 * Notification Service
 * Direct passthrough to the platform adapter via ServiceFactory
 */

import { getNotificationService } from "@cham-lang/ui/adapters";

// Re-export types from the interface
export type {
  DailyReminderRequest,
  ScheduleNotificationRequest,
} from "@cham-lang/ui/adapters/factory/interfaces";

/**
 * Notification Service
 * Handles all notification-related operations including scheduled reminders
 */
export class NotificationService {
  /**
   * Check if notification permission is granted
   */
  static async isPermissionGranted(): Promise<boolean> {
    return getNotificationService().isPermissionGranted();
  }

  /**
   * Request notification permission from user
   */
  static async requestPermission(): Promise<"granted" | "denied" | "default"> {
    return getNotificationService().requestPermission();
  }

  /**
   * Ensure notification permission is granted, request if needed
   * @returns true if permission granted, false otherwise
   */
  static async ensurePermission(): Promise<boolean> {
    return getNotificationService().ensurePermission();
  }

  /**
   * Send a test notification immediately
   */
  static async sendTestNotification(): Promise<string> {
    return getNotificationService().sendTestNotification();
  }

  /**
   * Schedule a one-time notification
   */
  static async scheduleNotification(
    request: Parameters<
      ReturnType<typeof getNotificationService>["scheduleNotification"]
    >[0],
  ): Promise<string> {
    return getNotificationService().scheduleNotification(request);
  }

  /**
   * Schedule a test notification for 1 minute from now
   */
  static async scheduleTestNotificationOneMinute(): Promise<string> {
    return getNotificationService().scheduleTestNotificationOneMinute();
  }

  /**
   * Schedule a daily reminder notification
   * Automatically cancels any existing daily reminder before scheduling
   */
  static async scheduleDailyReminder(
    request: Parameters<
      ReturnType<typeof getNotificationService>["scheduleDailyReminder"]
    >[0],
  ): Promise<string> {
    return getNotificationService().scheduleDailyReminder(request);
  }

  /**
   * Cancel the daily reminder
   */
  static async cancelDailyReminder(): Promise<string> {
    return getNotificationService().cancelDailyReminder();
  }

  /**
   * Helper: Schedule daily reminder with permission check
   * @returns Object with success status and message
   */
  static async scheduleDailyReminderWithPermission(
    request: Parameters<
      ReturnType<typeof getNotificationService>["scheduleDailyReminder"]
    >[0],
  ): Promise<{ success: boolean; message: string }> {
    return getNotificationService().scheduleDailyReminderWithPermission(
      request,
    );
  }

  /**
   * Helper: Schedule test notification with permission check
   * @returns Object with success status and message
   */
  static async scheduleTestNotificationWithPermission(): Promise<{
    success: boolean;
    message: string;
  }> {
    return getNotificationService().scheduleTestNotificationWithPermission();
  }
}
