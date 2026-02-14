/**
 * Auth Service
 * Uses platform adapter for cross-platform compatibility
 * Lazy service access + error handling pattern
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
    try {
      const service = getAuthService();
      await service.configureSync(config);
    } catch (error) {
      console.error("Error configuring sync:", error);
      throw AuthService.handleError(error);
    }
  }

  /**
   * Register a new user
   */
  static async register(
    username: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    try {
      const service = getAuthService();
      return await service.register(username, email, password);
    } catch (error) {
      console.error("Error registering user:", error);
      throw AuthService.handleError(error);
    }
  }

  /**
   * Login with email and password
   */
  static async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const service = getAuthService();
      return await service.login(email, password);
    } catch (error) {
      console.error("Error logging in:", error);
      throw AuthService.handleError(error);
    }
  }

  /**
   * Logout current user
   */
  static async logout(): Promise<void> {
    try {
      const service = getAuthService();
      await service.logout();
    } catch (error) {
      console.error("Error logging out:", error);
      throw AuthService.handleError(error);
    }
  }

  /**
   * Refresh the access token
   */
  static async refreshToken(): Promise<void> {
    try {
      const service = getAuthService();
      await service.refreshToken();
    } catch (error) {
      console.error("Error refreshing token:", error);
      throw AuthService.handleError(error);
    }
  }

  /**
   * Get current authentication status
   */
  static async getStatus(): Promise<AuthStatus> {
    try {
      const service = getAuthService();
      return await service.getStatus();
    } catch (error) {
      console.error("Error getting auth status:", error);
      return { isAuthenticated: false };
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const service = getAuthService();
      return await service.isAuthenticated();
    } catch (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
  }

  /**
   * Get stored authentication tokens
   */
  static async getTokens(): Promise<{
    accessToken?: string;
    refreshToken?: string;
    userId?: string;
  }> {
    try {
      const service = getAuthService();
      return await service.getTokens();
    } catch (error) {
      console.error("Error getting tokens:", error);
      return {};
    }
  }

  /**
   * Lookup user by username
   */
  static async lookupUserByUsername(
    username: string,
  ): Promise<{ userId: string; username: string } | null> {
    try {
      const service = getAuthService();
      return await service.lookupUserByUsername(username);
    } catch (error) {
      console.error("Error looking up user:", error);
      throw AuthService.handleError(error);
    }
  }

  private static handleError(error: unknown): Error {
    if (typeof error === "string") return new Error(error);
    return error instanceof Error ? error : new Error("Unknown error occurred");
  }
}
