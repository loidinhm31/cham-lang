/**
 * Notification Service
 * Uses platform adapter for cross-platform compatibility
 * Lazy service access + error handling pattern
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
    try {
      const service = getNotificationService();
      return await service.isPermissionGranted();
    } catch (error) {
      console.error("Error checking notification permission:", error);
      return false;
    }
  }

  /**
   * Request notification permission from user
   */
  static async requestPermission(): Promise<"granted" | "denied" | "default"> {
    try {
      const service = getNotificationService();
      return await service.requestPermission();
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return "denied";
    }
  }

  /**
   * Ensure notification permission is granted, request if needed
   * @returns true if permission granted, false otherwise
   */
  static async ensurePermission(): Promise<boolean> {
    try {
      const service = getNotificationService();
      return await service.ensurePermission();
    } catch (error) {
      console.error("Error ensuring notification permission:", error);
      return false;
    }
  }

  /**
   * Send a test notification immediately
   */
  static async sendTestNotification(): Promise<string> {
    try {
      const service = getNotificationService();
      return await service.sendTestNotification();
    } catch (error) {
      console.error("Error sending test notification:", error);
      throw NotificationService.handleError(error);
    }
  }

  /**
   * Schedule a one-time notification
   */
  static async scheduleNotification(
    request: Parameters<
      ReturnType<typeof getNotificationService>["scheduleNotification"]
    >[0],
  ): Promise<string> {
    try {
      const service = getNotificationService();
      return await service.scheduleNotification(request);
    } catch (error) {
      console.error("Error scheduling notification:", error);
      throw NotificationService.handleError(error);
    }
  }

  /**
   * Schedule a test notification for 1 minute from now
   */
  static async scheduleTestNotificationOneMinute(): Promise<string> {
    try {
      const service = getNotificationService();
      return await service.scheduleTestNotificationOneMinute();
    } catch (error) {
      console.error("Error scheduling test notification:", error);
      throw NotificationService.handleError(error);
    }
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
    try {
      const service = getNotificationService();
      return await service.scheduleDailyReminder(request);
    } catch (error) {
      console.error("Error scheduling daily reminder:", error);
      throw NotificationService.handleError(error);
    }
  }

  /**
   * Cancel the daily reminder
   */
  static async cancelDailyReminder(): Promise<string> {
    try {
      const service = getNotificationService();
      return await service.cancelDailyReminder();
    } catch (error) {
      console.error("Error canceling daily reminder:", error);
      throw NotificationService.handleError(error);
    }
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
    try {
      const service = getNotificationService();
      return await service.scheduleDailyReminderWithPermission(request);
    } catch (error) {
      console.error("Error scheduling daily reminder with permission:", error);
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
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
    try {
      const service = getNotificationService();
      return await service.scheduleTestNotificationWithPermission();
    } catch (error) {
      console.error(
        "Error scheduling test notification with permission:",
        error,
      );
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  private static handleError(error: unknown): Error {
    if (typeof error === "string") return new Error(error);
    return error instanceof Error ? error : new Error("Unknown error occurred");
  }
}
