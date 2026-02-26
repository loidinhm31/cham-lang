/**
 * useServerConnection Hook
 *
 * Maintains an SSE connection to the desktop server when running in browser mode.
 * Listens for shutdown events and updates connection state accordingly.
 * When the server shuts down, sets the disconnected state which triggers a UI overlay.
 * Reconnects with exponential backoff (max 5 attempts).
 */

import { useState, useEffect, useCallback } from "react";
import {
  isOpenedFromDesktop,
  getSessionToken,
  WEB_APP_PORT,
} from "@cham-lang/ui/utils";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;

export interface ServerConnectionState {
  isConnected: boolean;
  isDisconnected: boolean;
  error: string | null;
  reconnectAttempts: number;
}

export function useServerConnection() {
  const [state, setState] = useState<ServerConnectionState>({
    isConnected: false,
    isDisconnected: false,
    error: null,
    reconnectAttempts: 0,
  });

  // Provide a way to manually acknowledge disconnection
  const acknowledgeDisconnect = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isDisconnected: false,
    }));
  }, []);

  useEffect(() => {
    if (!isOpenedFromDesktop()) return;

    const token = getSessionToken();
    if (!token) {
      console.log("🔌 No session token, skipping SSE connection");
      return;
    }

    let attempts = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    let currentEs: EventSource | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;

      console.log(
        `🔌 Connecting to server SSE... (attempt ${attempts + 1}/${MAX_RETRIES + 1})`,
      );

      const es = new EventSource(
        `http://localhost:${WEB_APP_PORT}/api/events?token=${encodeURIComponent(token)}`,
      );
      currentEs = es;

      es.onopen = () => {
        console.log("🔌 SSE connection opened");
        attempts = 0;
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isDisconnected: false,
          error: null,
          reconnectAttempts: 0,
        }));
      };

      es.addEventListener("connected", (event) => {
        console.log("🔌 SSE received: connected -", event.data);
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isDisconnected: false,
        }));
      });

      es.addEventListener("shutdown", (event) => {
        console.log("🔌 SSE received: shutdown -", event.data);
        stopped = true;
        es.close();
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isDisconnected: true,
          error: null,
        }));
      });

      es.addEventListener("ping", (event) => {
        console.log("🔌 SSE received: ping -", event.data);
      });

      es.onerror = () => {
        es.close();

        if (stopped) return;

        if (attempts < MAX_RETRIES) {
          const jitter = Math.random() * 1000;
          const delay = Math.min(
            BASE_DELAY_MS * 2 ** attempts + jitter,
            MAX_DELAY_MS,
          );
          attempts++;
          console.log(
            `🔌 SSE error — retrying in ${delay}ms (attempt ${attempts}/${MAX_RETRIES})`,
          );
          setState((prev) => ({
            ...prev,
            isConnected: false,
            reconnectAttempts: attempts,
            error: "Failed to connect to server",
          }));
          timeoutId = setTimeout(connect, delay);
        } else {
          console.error("🔌 SSE max retries reached — giving up");
          setState((prev) => ({
            ...prev,
            isConnected: false,
            isDisconnected: true,
            reconnectAttempts: attempts,
            error: "Server connection lost",
          }));
        }
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(timeoutId);
      if (currentEs) {
        console.log("🔌 Closing SSE connection");
        currentEs.close();
      }
    };
  }, []);

  return {
    ...state,
    acknowledgeDisconnect,
  };
}
