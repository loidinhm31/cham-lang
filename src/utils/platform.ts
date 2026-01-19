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
 * Check if running on a mobile device (Android/iOS) based on user agent
 */
export const isMobile = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("android") || ua.includes("iphone") || ua.includes("ipad");
};

/**
 * Check if running on desktop platform (not Android/iOS)
 * This is used to show desktop-only features like "Open in Browser"
 */
export const isDesktop = (): boolean => {
  return isTauri() && !isMobile();
};

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
    window.open(url, "_blank", "");
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
  return `http://localhost:${WEB_APP_PORT}`;
};

// Session storage key for desktop mode
const DESKTOP_MODE_KEY = "browser_sync_desktop_mode";
const SESSION_TOKEN_KEY = "browser_sync_session_token";

/**
 * Check if the browser was opened from the desktop app
 * This is detected by checking the URL origin and session token,
 * and the result is stored in sessionStorage to persist across navigation
 */
export const isOpenedFromDesktop = (): boolean => {
  // Must be in web mode (not Tauri)
  if (isTauri()) return false;

  // Check if we've already determined this in a previous check
  const storedMode = sessionStorage.getItem(DESKTOP_MODE_KEY);
  if (storedMode === "true") return true;
  if (storedMode === "false") return false;

  // Check if running on the expected origin
  // In dev mode, browser opens to Vite (1420)
  // In production, browser opens to embedded server (25091)
  const origin = window.location.origin;
  const validOrigins = [
    `http://localhost:${WEB_APP_PORT}`, // Production (25091)
    "http://localhost:1420", // Dev mode (Vite)
  ];

  if (!validOrigins.includes(origin)) {
    sessionStorage.setItem(DESKTOP_MODE_KEY, "false");
    return false;
  }

  // Check if session token is present in URL
  const params = new URLSearchParams(window.location.search);
  const sessionToken = params.get("session");

  if (sessionToken) {
    // Store the mode and token for future checks (persists across navigation)
    sessionStorage.setItem(DESKTOP_MODE_KEY, "true");
    sessionStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
    return true;
  }

  // No token in URL, check if we have one stored from earlier
  const storedToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (storedToken) {
    sessionStorage.setItem(DESKTOP_MODE_KEY, "true");
    return true;
  }

  sessionStorage.setItem(DESKTOP_MODE_KEY, "false");
  return false;
};

/**
 * Get the session token from URL or sessionStorage (for browser-from-desktop mode)
 */
export const getSessionToken = (): string | null => {
  // First check URL
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("session");
  if (urlToken) {
    // Store it for future use
    sessionStorage.setItem(SESSION_TOKEN_KEY, urlToken);
    return urlToken;
  }

  // Fall back to stored token
  return sessionStorage.getItem(SESSION_TOKEN_KEY);
};

/**
 * Clear the desktop mode session (call when closing browser sync)
 */
export const clearDesktopModeSession = (): void => {
  sessionStorage.removeItem(DESKTOP_MODE_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
};
