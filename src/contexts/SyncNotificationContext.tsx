import React, { createContext, useContext, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { refreshToken } from "@choochmeque/tauri-plugin-google-auth-api";

interface SyncNotificationContextType {
  hasSyncNotification: boolean;
  checkSyncStatus: () => Promise<void>;
  dismissNotification: () => void;
}

const SyncNotificationContext = createContext<
  SyncNotificationContextType | undefined
>(undefined);

export const SyncNotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [hasSyncNotification, setHasSyncNotification] = useState(false);

  const checkSyncStatus = async () => {
    try {
      let accessToken = localStorage.getItem("gdrive_access_token");

      if (!accessToken) {
        // No Google Drive configured, no notification needed
        setHasSyncNotification(false);
        return;
      }

      try {
        const isDifferent = await invoke<boolean>("check_version_difference", {
          accessToken: accessToken,
        });

        setHasSyncNotification(isDifferent);
      } catch (error) {
        const errorStr = String(error);

        // Check if error is due to expired token (401)
        if (
          errorStr.includes("401") ||
          errorStr.includes("UNAUTHENTICATED") ||
          errorStr.includes("Invalid Credentials")
        ) {
          console.log("Token expired during check, refreshing...");

          try {
            const response = await refreshToken();

            // Update stored token
            localStorage.setItem("gdrive_access_token", response.accessToken);

            // Retry with new token
            const isDifferent = await invoke<boolean>(
              "check_version_difference",
              {
                accessToken: response.accessToken,
              },
            );

            setHasSyncNotification(isDifferent);
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            // Clear invalid token
            localStorage.removeItem("gdrive_access_token");
            localStorage.removeItem("gdrive_user_email");
            setHasSyncNotification(false);
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("Failed to check sync status:", error);
      // Don't show notification on error
      setHasSyncNotification(false);
    }
  };

  const dismissNotification = () => {
    setHasSyncNotification(false);
  };

  // Check on mount (app startup)
  useEffect(() => {
    // Wait a bit for the app to settle before checking
    const timer = setTimeout(() => {
      checkSyncStatus();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <SyncNotificationContext.Provider
      value={{ hasSyncNotification, checkSyncStatus, dismissNotification }}
    >
      {children}
    </SyncNotificationContext.Provider>
  );
};

export const useSyncNotification = () => {
  const context = useContext(SyncNotificationContext);
  if (context === undefined) {
    throw new Error(
      "useSyncNotification must be used within a SyncNotificationProvider",
    );
  }
  return context;
};
