import type {
  AuthResponse,
  AuthStatus,
  SyncConfig,
} from "@cham-lang/shared/types";
import type {
  IAuthService,
  RequiredSyncConfig,
} from "@cham-lang/ui/adapters/factory/interfaces";
import { AUTH_STORAGE_KEYS } from "@cham-lang/shared/constants";
import { env } from "@cham-lang/shared/utils";
import { isTauri } from "@cham-lang/ui/utils";

export interface QmServerAuthConfig {
  baseUrl?: string;
  appId?: string;
  apiKey?: string;
}

const STORAGE_KEYS = AUTH_STORAGE_KEYS;

export class QmServerAuthAdapter implements IAuthService {
  private baseUrl: string;
  private appId: string;
  private apiKey: string;
  private statusCache: AuthStatus | null = null;
  private statusCacheTimestamp: number = 0;
  private static STATUS_CACHE_TTL = 10000;

  constructor(config?: QmServerAuthConfig) {
    // In web mode, skip localStorage and use env directly
    // In Tauri mode, allow localStorage to override env for user configuration
    if (isTauri()) {
      this.baseUrl =
        config?.baseUrl ||
        this.getStoredValue(STORAGE_KEYS.SERVER_URL) ||
        env.serverUrl;
      this.appId =
        config?.appId || this.getStoredValue(STORAGE_KEYS.APP_ID) || env.appId;
      this.apiKey =
        config?.apiKey ||
        this.getStoredValue(STORAGE_KEYS.API_KEY) ||
        env.apiKey;
    } else {
      // Web/embed mode: use env directly, config can override
      this.baseUrl = config?.baseUrl || env.serverUrl;
      this.appId = config?.appId || env.appId;
      this.apiKey = config?.apiKey || env.apiKey;
    }
  }

  private getStoredValue(key: string): string | null {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  }

  private setStoredValue(key: string, value: string): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  }

  private removeStoredValue(key: string): void {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  }

  private async post<TReq, TRes>(
    endpoint: string,
    body: TReq,
    headers?: Record<string, string>,
  ): Promise<TRes> {
    const defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "X-App-Id": this.appId,
      "X-Api-Key": this.apiKey,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: { ...defaultHeaders, ...headers },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    return await response.json();
  }

  async configureSync(config: SyncConfig): Promise<void> {
    if (config.serverUrl) {
      this.baseUrl = config.serverUrl;
      // Only store to localStorage in Tauri mode
      if (isTauri()) {
        this.setStoredValue(STORAGE_KEYS.SERVER_URL, config.serverUrl);
      }
    }
    if (config.appId) {
      this.appId = config.appId;
      if (isTauri()) {
        this.setStoredValue(STORAGE_KEYS.APP_ID, config.appId);
      }
    }
    if (config.apiKey) {
      this.apiKey = config.apiKey;
      if (isTauri()) {
        this.setStoredValue(STORAGE_KEYS.API_KEY, config.apiKey);
      }
    }
    // Invalidate cache so next getStatus() returns updated serverUrl
    this.statusCache = null;
    this.statusCacheTimestamp = 0;
  }

  async register(
    username: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    const result = await this.post<
      { username: string; email: string; password: string },
      AuthResponse
    >("/api/v1/auth/register", { username, email, password });

    this.storeAuthData(result);
    return result;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const result = await this.post<
      { email: string; password: string },
      AuthResponse
    >("/api/v1/auth/login", { email, password });

    this.storeAuthData(result);
    return result;
  }

  async logout(): Promise<void> {
    this.removeStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
    this.removeStoredValue(STORAGE_KEYS.REFRESH_TOKEN);
    this.removeStoredValue(STORAGE_KEYS.USER_ID);
    this.removeStoredValue(STORAGE_KEYS.APPS);
    this.removeStoredValue(STORAGE_KEYS.IS_ADMIN);
    this.statusCache = null;
  }

  async refreshToken(): Promise<void> {
    const refreshToken = this.getStoredValue(STORAGE_KEYS.REFRESH_TOKEN);
    const accessToken = this.getStoredValue(STORAGE_KEYS.ACCESS_TOKEN);

    if (!refreshToken) throw new Error("No refresh token");

    const result = await this.post<
      { refreshToken: string },
      { accessToken: string; refreshToken: string }
    >(
      "/api/v1/auth/refresh",
      { refreshToken },
      {
        Authorization: `Bearer ${accessToken}`,
      },
    );

    this.setStoredValue(STORAGE_KEYS.ACCESS_TOKEN, result.accessToken);
    this.setStoredValue(STORAGE_KEYS.REFRESH_TOKEN, result.refreshToken);
    this.statusCache = null;
  }

  async getStatus(): Promise<AuthStatus> {
    const now = Date.now();
    if (
      this.statusCache &&
      now - this.statusCacheTimestamp < QmServerAuthAdapter.STATUS_CACHE_TTL
    ) {
      return this.statusCache;
    }

    const accessToken = this.getStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
    if (!accessToken) {
      const status: AuthStatus = {
        isAuthenticated: false,
        serverUrl: this.baseUrl,
      };
      this.statusCache = status;
      this.statusCacheTimestamp = now;
      return status;
    }

    // Check if token is expired (simple JWT decode)
    try {
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        try {
          await this.refreshToken();
        } catch {
          const status: AuthStatus = {
            isAuthenticated: false,
            serverUrl: this.baseUrl,
          };
          this.statusCache = status;
          this.statusCacheTimestamp = now;
          return status;
        }
      }
    } catch {
      // Token parsing failed
    }

    const userId = this.getStoredValue(STORAGE_KEYS.USER_ID);
    const appsStr = this.getStoredValue(STORAGE_KEYS.APPS);
    const isAdminStr = this.getStoredValue(STORAGE_KEYS.IS_ADMIN);

    const status: AuthStatus = {
      isAuthenticated: true,
      userId: userId || undefined,
      apps: appsStr ? JSON.parse(appsStr) : undefined,
      isAdmin: isAdminStr ? isAdminStr === "true" : undefined,
      serverUrl: this.baseUrl,
    };

    this.statusCache = status;
    this.statusCacheTimestamp = now;
    return status;
  }

  async isAuthenticated(): Promise<boolean> {
    const status = await this.getStatus();
    return status.isAuthenticated;
  }

  async getAccessToken(): Promise<string | null> {
    const token = this.getStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) return null;

    if (this.isTokenExpired(token)) {
      try {
        await this.refreshToken();
        return this.getStoredValue(STORAGE_KEYS.ACCESS_TOKEN);
      } catch {
        return null;
      }
    }

    return token;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return true;
      const payload = JSON.parse(atob(parts[1]));
      const exp = payload.exp;
      if (!exp) return false;
      return exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  async getTokens(): Promise<{
    accessToken?: string;
    refreshToken?: string;
    userId?: string;
  }> {
    return {
      accessToken: this.getStoredValue(STORAGE_KEYS.ACCESS_TOKEN) || undefined,
      refreshToken:
        this.getStoredValue(STORAGE_KEYS.REFRESH_TOKEN) || undefined,
      userId: this.getStoredValue(STORAGE_KEYS.USER_ID) || undefined,
    };
  }

  async lookupUserByUsername(
    username: string,
  ): Promise<{ userId: string; username: string } | null> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) throw new Error("Not authenticated");

    const url = new URL(`${this.baseUrl}/api/v1/auth/lookup`);
    url.searchParams.set("username", username);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-App-Id": this.appId,
        "X-Api-Key": this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Lookup failed: ${response.status}`);
    }

    const result = await response.json();
    return result.user;
  }

  async saveTokensExternal(
    accessToken: string,
    refreshToken: string,
    userId: string,
  ): Promise<void> {
    this.setStoredValue(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    this.setStoredValue(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    this.setStoredValue(STORAGE_KEYS.USER_ID, userId);
    this.statusCache = null;
  }

  getSyncConfig(): RequiredSyncConfig {
    return {
      serverUrl: this.baseUrl,
      appId: this.appId,
      apiKey: this.apiKey,
    };
  }

  private storeAuthData(auth: AuthResponse): void {
    this.setStoredValue(STORAGE_KEYS.ACCESS_TOKEN, auth.accessToken);
    this.setStoredValue(STORAGE_KEYS.REFRESH_TOKEN, auth.refreshToken);
    this.setStoredValue(STORAGE_KEYS.USER_ID, auth.userId);
    if (auth.apps) {
      this.setStoredValue(STORAGE_KEYS.APPS, JSON.stringify(auth.apps));
    }
    if (auth.isAdmin !== undefined) {
      this.setStoredValue(STORAGE_KEYS.IS_ADMIN, String(auth.isAdmin));
    }
    this.setStoredValue(STORAGE_KEYS.SERVER_URL, this.baseUrl);
    this.setStoredValue(STORAGE_KEYS.APP_ID, this.appId);
    this.setStoredValue(STORAGE_KEYS.API_KEY, this.apiKey);
    this.statusCache = null;
  }
}
