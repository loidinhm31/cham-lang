import React, { createContext, useContext, useEffect, useState } from "react";
import { isTauri } from "@/utils/platform";
import { WebGDriveAdapter } from "@/adapters/web/WebGDriveAdapter";

interface SyncNotificationContextType {
  hasSyncNotification: boolean;
  checkSyncStatus: () => Promise<void>;
  dismissNotification: () => void;
}

const SyncNotificationContext = createContext<
  SyncNotificationContextType | undefined
>(undefined);

// Web adapter instance for web platform
const webGDriveAdapter = new WebGDriveAdapter();

export const SyncNotificationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [hasSyncNotification, setHasSyncNotification] = useState(false);

  const checkSyncStatus = async () => {
    try {
      const accessToken = localStorage.getItem("gdrive_access_token");

      if (!accessToken) {
        // No Google Drive configured, no notification needed
        setHasSyncNotification(false);
        return;
      }

      try {
        let isDifferent: boolean;

        if (isTauri()) {
          // Use Tauri invoke for native platform
          const { invoke } = await import("@tauri-apps/api/core");
          isDifferent = await invoke<boolean>("check_version_difference", {
            accessToken: accessToken,
          });
        } else {
          // Use WebGDriveAdapter for web platform
          isDifferent =
            await webGDriveAdapter.checkVersionDifference(accessToken);
        }

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
            let newAccessToken: string;

            if (isTauri()) {
              // Use Tauri plugin for token refresh
              const { refreshToken } = await import(
                "@choochmeque/tauri-plugin-google-auth-api"
              );
              const response = await refreshToken();
              newAccessToken = response.accessToken;
            } else {
              // Use WebGDriveAdapter for token refresh
              const response = await webGDriveAdapter.refreshToken();
              newAccessToken = response.accessToken;
            }

            // Update stored token
            localStorage.setItem("gdrive_access_token", newAccessToken);

            // Retry with new token
            let isDifferent: boolean;
            if (isTauri()) {
              const { invoke } = await import("@tauri-apps/api/core");
              isDifferent = await invoke<boolean>("check_version_difference", {
                accessToken: newAccessToken,
              });
            } else {
              isDifferent =
                await webGDriveAdapter.checkVersionDifference(newAccessToken);
            }

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
