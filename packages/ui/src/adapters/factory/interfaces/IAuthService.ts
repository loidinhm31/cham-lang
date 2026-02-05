import type {
  AuthResponse,
  AuthStatus,
  SyncConfig,
} from "../../../../../shared/src/types/auth";

/**
 * Auth service interface for user authentication
 * Implemented by platform-specific adapters
 */
export interface IAuthService {
  configureSync(config: SyncConfig): Promise<void>;
  register(
    username: string,
    email: string,
    password: string,
  ): Promise<AuthResponse>;
  login(email: string, password: string): Promise<AuthResponse>;
  logout(): Promise<void>;
  refreshToken(): Promise<void>;
  getStatus(): Promise<AuthStatus>;
  isAuthenticated(): Promise<boolean>;
  getAccessToken(): Promise<string | null>;
  getTokens(): Promise<{
    accessToken?: string;
    refreshToken?: string;
    userId?: string;
  }>;
  saveTokensExternal?(
    accessToken: string,
    refreshToken: string,
    userId: string,
  ): Promise<void>;
}
