/**
 * Centralized auth storage keys for qm-hub ecosystem.
 *
 * These keys are shared across all apps (qm-hub-app, cham-lang, etc.)
 * to enable single sign-on via localStorage.
 */
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: "qm-hub-access-token",
  REFRESH_TOKEN: "qm-hub-refresh-token",
  USER_ID: "qm-hub-user-id",
  APPS: "qm-hub-apps",
  IS_ADMIN: "qm-hub-is-admin",
  SERVER_URL: "qm-hub-server-url",
  APP_ID: "qm-hub-app-id",
  API_KEY: "qm-hub-api-key",
  OTP_TYPE: "qm-hub-otp-type",
} as const;

export type AuthStorageKey =
  (typeof AUTH_STORAGE_KEYS)[keyof typeof AUTH_STORAGE_KEYS];
