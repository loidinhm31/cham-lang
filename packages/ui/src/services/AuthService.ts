/**
 * Auth Service
 * Direct passthrough to the platform adapter via ServiceFactory
 */

import { getAuthService } from "@cham-lang/ui/adapters";
import type {
  AuthResponse,
  AuthStatus,
  SyncConfig,
} from "@cham-lang/shared/types";

export class AuthService {
  /**
   * Configure sync with server URL and API keys
   */
  static async configureSync(config: SyncConfig): Promise<void> {
    return getAuthService().configureSync(config);
  }

  /**
   * Register a new user
   */
  static async register(
    username: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    return getAuthService().register(username, email, password);
  }

  /**
   * Login with email and password
   */
  static async login(email: string, password: string): Promise<AuthResponse> {
    return getAuthService().login(email, password);
  }

  /**
   * Logout current user
   */
  static async logout(): Promise<void> {
    return getAuthService().logout();
  }

  /**
   * Refresh the access token
   */
  static async refreshToken(): Promise<void> {
    return getAuthService().refreshToken();
  }

  /**
   * Get current authentication status
   */
  static async getStatus(): Promise<AuthStatus> {
    return getAuthService().getStatus();
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    return getAuthService().isAuthenticated();
  }

  /**
   * Get stored authentication tokens
   */
  static async getTokens(): Promise<{
    accessToken?: string;
    refreshToken?: string;
    userId?: string;
  }> {
    return getAuthService().getTokens();
  }

  /**
   * Lookup user by username
   */
  static async lookupUserByUsername(
    username: string,
  ): Promise<{ userId: string; username: string } | null> {
    return getAuthService().lookupUserByUsername(username);
  }
}
