import type {
  INotificationService,
  DailyReminderRequest,
  ScheduleNotificationRequest,
} from "@cham-lang/shared/services";
import chameleonIcon from "../../assets/chameleon.svg";

export class BrowserNotificationAdapter implements INotificationService {
  async isPermissionGranted(): Promise<boolean> {
    if (!("Notification" in window)) return false;
    return Notification.permission === "granted";
  }

  async requestPermission(): Promise<"granted" | "denied" | "default"> {
    if (!("Notification" in window)) return "denied";
    return Notification.requestPermission() as Promise<
      "granted" | "denied" | "default"
    >;
  }

  async ensurePermission(): Promise<boolean> {
    if (await this.isPermissionGranted()) return true;
    const result = await this.requestPermission();
    return result === "granted";
  }

  async sendTestNotification(): Promise<string> {
    if (!(await this.ensurePermission())) {
      return "Notification permission denied";
    }
    new Notification("ChamLang", {
      body: "Test notification from ChamLang!",
      icon: chameleonIcon,
    });
    return "Test notification sent";
  }

  async scheduleNotification(
    request: ScheduleNotificationRequest,
  ): Promise<string> {
    if (!(await this.ensurePermission())) {
      return "Notification permission denied";
    }
    setTimeout(() => {
      new Notification(request.title, {
        body: request.body,
        icon: chameleonIcon,
      });
    }, request.delay_seconds * 1000);
    return "Notification scheduled";
  }

  async scheduleTestNotificationOneMinute(): Promise<string> {
    return this.scheduleNotification({
      title: "ChamLang Reminder",
      body: "Time to practice your vocabulary!",
      delay_seconds: 60,
    });
  }

  async scheduleDailyReminder(_request: DailyReminderRequest): Promise<string> {
    // Browser notifications can't schedule daily reminders natively
    // Store the preference and show notification when app is open
    return "Daily reminders are limited in web mode. Notifications will show when the app is open.";
  }

  async cancelDailyReminder(): Promise<string> {
    return "Daily reminder cancelled";
  }

  async scheduleDailyReminderWithPermission(
    request: DailyReminderRequest,
  ): Promise<{ success: boolean; message: string }> {
    const hasPermission = await this.ensurePermission();
    if (!hasPermission) {
      return { success: false, message: "Notification permission denied" };
    }
    const message = await this.scheduleDailyReminder(request);
    return { success: true, message };
  }

  async scheduleTestNotificationWithPermission(): Promise<{
    success: boolean;
    message: string;
  }> {
    const hasPermission = await this.ensurePermission();
    if (!hasPermission) {
      return { success: false, message: "Notification permission denied" };
    }
    const message = await this.sendTestNotification();
    return { success: true, message };
  }
}
