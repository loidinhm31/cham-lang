/**
 * Environment configuration interface
 */
export interface AppEnvironment {
  VITE_QM_SYNC_SERVER_URL: string;
  VITE_CHAM_LANG_APP_ID: string;
  VITE_CHAM_LANG_API_KEY: string;
  DEV: boolean;
  PROD: boolean;
  MODE: string;
}

/**
 * Default values for environment variables
 */
const ENV_DEFAULTS: Partial<AppEnvironment> = {
  VITE_QM_SYNC_SERVER_URL: "http://localhost:3000",
  VITE_CHAM_LANG_APP_ID: "cham-lang",
  VITE_CHAM_LANG_API_KEY: "",
  DEV: false,
  PROD: true,
  MODE: "production",
};

/**
 * Environment manager for safe access to Vite environment variables
 */
class EnvironmentManager {
  private cachedEnv: Record<string, unknown> | null = null;

  private getViteEnv(): Record<string, unknown> | null {
    if (this.cachedEnv !== null) {
      return this.cachedEnv;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const env = (import.meta as any).env;
      if (env && typeof env === "object") {
        this.cachedEnv = env;
        return env;
      }
    } catch {
      // Not in a Vite environment
    }

    return null;
  }

  get<K extends keyof AppEnvironment>(key: K): AppEnvironment[K] {
    const env = this.getViteEnv();

    if (env && key in env) {
      return env[key] as AppEnvironment[K];
    }

    return ENV_DEFAULTS[key] as AppEnvironment[K];
  }

  get isDev(): boolean {
    const env = this.getViteEnv();
    if (env) {
      return env.DEV === true || env.MODE === "development";
    }
    return false;
  }

  get isProd(): boolean {
    const env = this.getViteEnv();
    if (env) {
      return env.PROD === true || env.MODE === "production";
    }
    return true;
  }

  get serverUrl(): string {
    return this.get("VITE_QM_SYNC_SERVER_URL");
  }

  get appId(): string {
    return this.get("VITE_CHAM_LANG_APP_ID");
  }

  get apiKey(): string {
    return this.get("VITE_CHAM_LANG_API_KEY");
  }
}

export const env = new EnvironmentManager();
