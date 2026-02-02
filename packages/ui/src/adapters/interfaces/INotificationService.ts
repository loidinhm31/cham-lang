/**
 * Notification Service Interface
 * Contract that both Tauri and Web adapters must implement
 */

export interface DailyReminderRequest {
  time: string; // HH:MM format
  title: string;
  body: string;
}

export interface ScheduleNotificationRequest {
  title: string;
  body: string;
  delay_seconds: number;
}

export interface INotificationService {
  // Permission management
  isPermissionGranted(): Promise<boolean>;
  requestPermission(): Promise<"granted" | "denied" | "default">;
  ensurePermission(): Promise<boolean>;

  // Notifications
  sendTestNotification(): Promise<string>;
  scheduleNotification(request: ScheduleNotificationRequest): Promise<string>;
  scheduleTestNotificationOneMinute(): Promise<string>;

  // Daily reminders
  scheduleDailyReminder(request: DailyReminderRequest): Promise<string>;
  cancelDailyReminder(): Promise<string>;

  // Helper methods with permission checks
  scheduleDailyReminderWithPermission(
    request: DailyReminderRequest,
  ): Promise<{ success: boolean; message: string }>;
  scheduleTestNotificationWithPermission(): Promise<{
    success: boolean;
    message: string;
  }>;
}
