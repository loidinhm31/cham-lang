/**
 * Web Notification Adapter
 * Implements notifications using in-app toast notifications for web browsers
 */

import type {
  INotificationService,
  DailyReminderRequest,
  ScheduleNotificationRequest,
} from "@/adapters";

// Store scheduled notifications in memory (for demo purposes)
// In production, you might use service workers for background notifications
const scheduledNotifications: Map<string, NodeJS.Timeout> = new Map();

export class WebNotificationAdapter implements INotificationService {
  private showToast(
    title: string,
    body: string,
    variant: "success" | "info" | "warning" = "info",
  ): void {
    // Create a simple toast notification
    // In a real implementation, you'd integrate with your app's toast system
    const toast = document.createElement("div");
    toast.className = `web-notification-toast web-notification-${variant}`;
    toast.innerHTML = `
      <div class="web-notification-title">${title}</div>
      <div class="web-notification-body">${body}</div>
    `;

    // Apply styles
    Object.assign(toast.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      padding: "16px 24px",
      backgroundColor: variant === "success" ? "#10b981" : "#3b82f6",
      color: "white",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: "9999",
      maxWidth: "350px",
      animation: "slideIn 0.3s ease-out",
    });

    document.body.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s ease-in";
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  async isPermissionGranted(): Promise<boolean> {
    // Web notifications via Notification API
    if (!("Notification" in window)) {
      return false;
    }
    return Notification.permission === "granted";
  }

  async requestPermission(): Promise<"granted" | "denied" | "default"> {
    if (!("Notification" in window)) {
      return "denied";
    }
    return Notification.requestPermission();
  }

  async ensurePermission(): Promise<boolean> {
    // For in-app toasts, we don't need browser permission
    // But we can still request Notification API permission for fallback
    if ("Notification" in window && Notification.permission === "default") {
      await this.requestPermission();
    }
    return true; // In-app toasts always work
  }

  async sendTestNotification(): Promise<string> {
    this.showToast(
      "Test Notification",
      "This is a test notification from Cham Lang!",
      "success",
    );
    return "Notification sent (in-app)";
  }

  async scheduleNotification(
    request: ScheduleNotificationRequest,
  ): Promise<string> {
    const notificationId = `notification_${Date.now()}`;

    const timeout = setTimeout(() => {
      this.showToast(request.title, request.body, "info");
      scheduledNotifications.delete(notificationId);
    }, request.delay_seconds * 1000);

    scheduledNotifications.set(notificationId, timeout);

    return `Notification scheduled for ${request.delay_seconds} seconds`;
  }

  async scheduleTestNotificationOneMinute(): Promise<string> {
    return this.scheduleNotification({
      title: "Test Reminder",
      body: "This is a test notification scheduled 1 minute ago!",
      delay_seconds: 60,
    });
  }

  async scheduleDailyReminder(request: DailyReminderRequest): Promise<string> {
    // For web, we can't do true daily reminders without a service worker
    // Store the preference and show a message
    localStorage.setItem("daily_reminder_time", request.time);
    localStorage.setItem("daily_reminder_title", request.title);
    localStorage.setItem("daily_reminder_body", request.body);

    this.showToast(
      "Daily Reminder Set",
      `Reminder set for ${request.time}. Note: Web reminders only work while the app is open.`,
      "info",
    );

    return `Daily reminder set for ${request.time} (web mode - requires app to be open)`;
  }

  async cancelDailyReminder(): Promise<string> {
    localStorage.removeItem("daily_reminder_time");
    localStorage.removeItem("daily_reminder_title");
    localStorage.removeItem("daily_reminder_body");

    // Cancel any scheduled notifications
    scheduledNotifications.forEach((timeout) => clearTimeout(timeout));
    scheduledNotifications.clear();

    return "Daily reminder cancelled";
  }

  async scheduleDailyReminderWithPermission(
    request: DailyReminderRequest,
  ): Promise<{ success: boolean; message: string }> {
    await this.ensurePermission();

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
    await this.ensurePermission();

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
