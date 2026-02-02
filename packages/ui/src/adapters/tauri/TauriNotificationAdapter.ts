/**
 * Tauri Notification Adapter
 * Wraps Tauri IPC calls and notification plugin for native notifications
 */

import { invoke } from "@tauri-apps/api/core";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import type {
  INotificationService,
  DailyReminderRequest,
  ScheduleNotificationRequest,
} from "@cham-lang/shared/services";

export class TauriNotificationAdapter implements INotificationService {
  async isPermissionGranted(): Promise<boolean> {
    return isPermissionGranted();
  }

  async requestPermission(): Promise<"granted" | "denied" | "default"> {
    return requestPermission();
  }

  async ensurePermission(): Promise<boolean> {
    let permissionGranted = await this.isPermissionGranted();

    if (!permissionGranted) {
      const permission = await this.requestPermission();
      permissionGranted = permission === "granted";
    }

    return permissionGranted;
  }

  async sendTestNotification(): Promise<string> {
    return invoke("send_test_notification");
  }

  async scheduleNotification(
    request: ScheduleNotificationRequest,
  ): Promise<string> {
    return invoke("schedule_notification", { request });
  }

  async scheduleTestNotificationOneMinute(): Promise<string> {
    return invoke("schedule_test_notification_one_minute");
  }

  async scheduleDailyReminder(request: DailyReminderRequest): Promise<string> {
    return invoke("schedule_daily_reminder", { request });
  }

  async cancelDailyReminder(): Promise<string> {
    return invoke("cancel_daily_reminder");
  }

  async scheduleDailyReminderWithPermission(
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

  async scheduleTestNotificationWithPermission(): Promise<{
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
