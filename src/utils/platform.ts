/**
 * Platform detection utilities for cross-platform support
 * Detects whether the app is running in Tauri (desktop/mobile) or web browser
 */

/**
 * Check if the app is running inside a Tauri webview
 */
export const isTauri = (): boolean => {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
};

/**
 * Check if the app is running in a regular web browser
 */
export const isWeb = (): boolean => !isTauri();

/**
 * Get the current platform name for display/logging
 */
export const getPlatformName = (): "tauri" | "web" => {
  return isTauri() ? "tauri" : "web";
};

/**
 * Check if native file system access is available
 * (Tauri has full access, web has limited File System Access API)
 */
export const hasNativeFileSystem = (): boolean => isTauri();

/**
 * Check if native notifications are available
 */
export const hasNativeNotifications = (): boolean => isTauri();

/**
 * Open a URL in the default web browser
 * Only works in Tauri environment
 */
export const openInBrowser = async (url: string): Promise<void> => {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else {
    // In web, just open in new tab
    window.open(url, "_blank");
  }
};

/**
 * Web app port for "Open in Browser" feature
 */
export const WEB_APP_PORT = 25091;

/**
 * Get the web app URL for "Open in Browser" feature
 */
export const getWebAppUrl = (): string => {
  return `http://127.0.0.1:${WEB_APP_PORT}`;
};
