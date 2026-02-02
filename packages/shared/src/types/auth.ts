// Authentication types for qm-sync integration

/**
 * Response from register/login endpoints
 */
export interface AuthResponse {
  userId: string;
  accessToken: string;
  refreshToken: string;
  apps?: string[];
  isAdmin?: boolean;
}

/**
 * Current authentication status
 */
export interface AuthStatus {
  isAuthenticated: boolean;
  userId?: string;
  username?: string;
  email?: string;
  apps?: string[];
  isAdmin?: boolean;
  serverUrl?: string;
}

/**
 * Configuration for sync server
 * All fields are optional - will use values from .env if not provided
 */
export interface SyncConfig {
  serverUrl?: string;
  appId?: string;
  apiKey?: string;
}
