import type {
  AuthResponse,
  AuthStatus,
  SyncConfig,
} from "@cham-lang/shared/types";
import type { IAuthService } from "@cham-lang/ui/adapters/factory/interfaces";
import { invoke } from "@tauri-apps/api/core";

export class TauriAuthAdapter implements IAuthService {
  async configureSync(config: SyncConfig): Promise<void> {
    await invoke<void>("auth_configure_sync", {
      serverUrl: config.serverUrl ?? null,
      appId: config.appId ?? null,
      apiKey: config.apiKey ?? null,
    });
  }

  async register(
    username: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    return invoke<AuthResponse>("auth_register", {
      username,
      email,
      password,
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return invoke<AuthResponse>("auth_login", { email, password });
  }

  async logout(): Promise<void> {
    await invoke<void>("auth_logout");
  }

  async refreshToken(): Promise<void> {
    await invoke<void>("auth_refresh_token");
  }

  async getStatus(): Promise<AuthStatus> {
    return invoke<AuthStatus>("auth_get_status");
  }

  async isAuthenticated(): Promise<boolean> {
    return invoke<boolean>("auth_is_authenticated");
  }

  async getAccessToken(): Promise<string | null> {
    try {
      return await invoke<string>("auth_get_access_token");
    } catch {
      return null;
    }
  }

  async getTokens(): Promise<{
    accessToken?: string;
    refreshToken?: string;
    userId?: string;
  }> {
    try {
      const [accessToken, status] = await Promise.all([
        invoke<string>("auth_get_access_token"),
        invoke<AuthStatus>("auth_get_status"),
      ]);
      return {
        accessToken,
        refreshToken: undefined,
        userId: status.userId,
      };
    } catch {
      return {};
    }
  }

  async lookupUserByUsername(
    username: string,
  ): Promise<{ userId: string; username: string } | null> {
    return invoke<{ userId: string; username: string } | null>(
      "auth_lookup_user",
      { username },
    );
  }
}
