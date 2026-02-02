/**
 * Centralized auth storage keys for qm-center ecosystem.
 *
 * These keys are shared across all apps (qm-center-app, cham-lang, etc.)
 * to enable single sign-on via localStorage.
 */
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: "qm-center-access-token",
  REFRESH_TOKEN: "qm-center-refresh-token",
  USER_ID: "qm-center-user-id",
  APPS: "qm-center-apps",
  IS_ADMIN: "qm-center-is-admin",
  SERVER_URL: "qm-center-server-url",
  APP_ID: "qm-center-app-id",
  API_KEY: "qm-center-api-key",
  OTP_TYPE: "qm-center-otp-type",
} as const;

export type AuthStorageKey =
  (typeof AUTH_STORAGE_KEYS)[keyof typeof AUTH_STORAGE_KEYS];
