/**
 * Centralized auth storage keys for glean-oak ecosystem.
 *
 * These keys are shared across all apps (glean-oak-app, cham-lang, etc.)
 * to enable single sign-on via localStorage.
 */
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: "glean-oak-access-token",
  REFRESH_TOKEN: "glean-oak-refresh-token",
  USER_ID: "glean-oak-user-id",
  APPS: "glean-oak-apps",
  IS_ADMIN: "glean-oak-is-admin",
  SERVER_URL: "glean-oak-server-url",
  APP_ID: "glean-oak-app-id",
  API_KEY: "glean-oak-api-key",
  OTP_TYPE: "glean-oak-otp-type",
} as const;

export type AuthStorageKey =
  (typeof AUTH_STORAGE_KEYS)[keyof typeof AUTH_STORAGE_KEYS];
