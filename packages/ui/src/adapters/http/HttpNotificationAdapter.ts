/**
 * HTTP Notification Adapter (Stub)
 * Notifications are desktop-only features, not supported in web browser mode
 */

import type { INotificationService } from "@cham-lang/shared/services";
import type {
  DailyReminderRequest,
  ScheduleNotificationRequest,
} from "@cham-lang/shared/services";

export class HttpNotificationAdapter implements INotificationService {
  async isPermissionGranted(): Promise<boolean> {
    return false;
  }

  async requestPermission(): Promise<"granted" | "denied" | "default"> {
    return "denied";
  }

  async ensurePermission(): Promise<boolean> {
    return false;
  }

  async sendTestNotification(): Promise<string> {
    throw new Error("Notifications are not supported in browser mode");
  }

  async scheduleNotification(
    _request: ScheduleNotificationRequest,
  ): Promise<string> {
    throw new Error("Notifications are not supported in browser mode");
  }

  async scheduleTestNotificationOneMinute(): Promise<string> {
    throw new Error("Notifications are not supported in browser mode");
  }

  async scheduleDailyReminder(_request: DailyReminderRequest): Promise<string> {
    throw new Error("Notifications are not supported in browser mode");
  }

  async cancelDailyReminder(): Promise<string> {
    throw new Error("Notifications are not supported in browser mode");
  }

  async scheduleDailyReminderWithPermission(
    _request: DailyReminderRequest,
  ): Promise<{ success: boolean; message: string }> {
    return {
      success: false,
      message: "Notifications are not supported in browser mode",
    };
  }

  async scheduleTestNotificationWithPermission(): Promise<{
    success: boolean;
    message: string;
  }> {
    return {
      success: false,
      message: "Notifications are not supported in browser mode",
    };
  }
}
