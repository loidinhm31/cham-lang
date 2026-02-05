import { getSessionToken, WEB_APP_PORT } from "@cham-lang/ui/utils";

/**
 * Base class for HTTP-based adapters that communicate with the desktop SQLite backend.
 * Used by web platform when opened from the desktop app via "Open in Browser".
 */
export class HttpAdapter {
  protected baseUrl = `http://localhost:${WEB_APP_PORT}/api`;

  /**
   * Get the session token from URL or sessionStorage
   */
  protected getToken(): string | null {
    return getSessionToken();
  }

  /**
   * Get authorization headers with session token
   * Uses Authorization header instead of query params for security
   */
  protected getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    if (!token) {
      throw new Error(
        "No session token. Please open from desktop app using 'Open in Browser'.",
      );
    }
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Perform a GET request
   */
  protected async get<T>(
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<T> {
    const headers = this.getAuthHeaders();

    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP ${response.status}: ${errorText || response.statusText}`,
      );
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Request failed");
    }

    return result.data;
  }

  /**
   * Perform a POST request
   */
  protected async post<T>(endpoint: string, body: any): Promise<T> {
    const authHeaders = this.getAuthHeaders();

    const url = new URL(`${this.baseUrl}${endpoint}`);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP ${response.status}: ${errorText || response.statusText}`,
      );
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Request failed");
    }

    return result.data;
  }

  /**
   * Perform a PUT request
   */
  protected async put<T>(endpoint: string, body: any): Promise<T> {
    const authHeaders = this.getAuthHeaders();

    const url = new URL(`${this.baseUrl}${endpoint}`);

    const response = await fetch(url.toString(), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP ${response.status}: ${errorText || response.statusText}`,
      );
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Request failed");
    }

    return result.data;
  }

  /**
   * Perform a DELETE request
   */
  protected async delete<T>(endpoint: string): Promise<T> {
    const authHeaders = this.getAuthHeaders();

    const url = new URL(`${this.baseUrl}${endpoint}`);

    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers: authHeaders,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP ${response.status}: ${errorText || response.statusText}`,
      );
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Request failed");
    }

    return result.data;
  }
}
