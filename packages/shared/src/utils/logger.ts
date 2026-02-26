/**
 * Log levels for controlling output verbosity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Logger utility with singleton pattern, log levels, and sensitive data redaction
 */
export class Logger {
  private static instance: Logger;
  private level: LogLevel = LogLevel.DEBUG;

  // Sensitive data patterns to redact
  private static readonly SENSITIVE_PATTERNS: RegExp[] = [
    /email["\s]*[:=]\s*["']?[\w.-]+@[\w.-]+/gi,
    /password["\s]*[:=]\s*["'][^"']+["']/gi,
    /token["\s]*[:=]\s*["'][^"']+["']/gi,
    /accessToken["\s]*[:=]\s*["'][^"']+["']/gi,
    /refreshToken["\s]*[:=]\s*["'][^"']+["']/gi,
    /authorization["\s]*[:=]\s*["']?Bearer\s+[^"'\s]+/gi,
  ];

  private constructor() {
    // Set default level based on environment
    this.level = this.isProduction() ? LogLevel.WARN : LogLevel.DEBUG;
  }

  private isProduction(): boolean {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const env = (import.meta as any).env;
      return env?.PROD === true || env?.MODE === "production";
    } catch {
      return false;
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Redact sensitive data from a value
   */
  private redactSensitiveData(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === "string") {
      let result = data;
      for (const pattern of Logger.SENSITIVE_PATTERNS) {
        result = result.replace(pattern, (match) => {
          const colonIndex = match.indexOf(":");
          const equalsIndex = match.indexOf("=");
          const separatorIndex =
            colonIndex >= 0 && equalsIndex >= 0
              ? Math.min(colonIndex, equalsIndex)
              : Math.max(colonIndex, equalsIndex);
          if (separatorIndex >= 0) {
            return match.substring(0, separatorIndex + 1) + " [REDACTED]";
          }
          return "[REDACTED]";
        });
      }
      return result;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.redactSensitiveData(item));
    }

    if (typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const result: Record<string, unknown> = {};

      for (const key of Object.keys(obj)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes("password") ||
          lowerKey.includes("token") ||
          lowerKey.includes("secret") ||
          lowerKey.includes("apikey") ||
          lowerKey.includes("api_key") ||
          lowerKey === "authorization"
        ) {
          result[key] = "[REDACTED]";
        } else if (lowerKey === "email") {
          const email = obj[key];
          if (typeof email === "string" && email.includes("@")) {
            const [local, domain] = email.split("@");
            result[key] =
              local.substring(0, 2) + "***@" + domain.substring(0, 2) + "***";
          } else {
            result[key] = "[REDACTED]";
          }
        } else {
          result[key] = this.redactSensitiveData(obj[key]);
        }
      }

      return result;
    }

    return data;
  }

  /**
   * Format log arguments for console output
   */
  private formatArgs(args: unknown[]): unknown[] {
    return args.map((arg) => this.redactSensitiveData(arg));
  }

  /**
   * Log a debug message
   */
  debug(prefix: string, message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[${prefix}]`, message, ...this.formatArgs(args));
    }
  }

  /**
   * Log an info message
   */
  info(prefix: string, message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`[${prefix}]`, message, ...this.formatArgs(args));
    }
  }

  /**
   * Log a warning message
   */
  warn(prefix: string, message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[${prefix}]`, message, ...this.formatArgs(args));
    }
  }

  /**
   * Log an error message
   */
  error(prefix: string, message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[${prefix}]`, message, ...this.formatArgs(args));
    }
  }
}

/**
 * Default logger instance
 */
export const logger = Logger.getInstance();
