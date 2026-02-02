/**
 * BrowserSyncInitializer
 *
 * Monitors the SSE connection to detect when the desktop server shuts down.
 * With HTTP adapters, no initial data loading is needed - all data is fetched
 * on demand from the desktop SQLite backend.
 */

import React from "react";
import { useServerConnection } from "@cham-lang/ui/hooks";
import { ServerDisconnectedOverlay } from "@cham-lang/ui/components/organisms";

interface BrowserSyncInitializerProps {
  children: React.ReactNode;
}

export const BrowserSyncInitializer: React.FC<BrowserSyncInitializerProps> = ({
  children,
}) => {
  // SSE connection to detect server shutdown
  const { isDisconnected, acknowledgeDisconnect } = useServerConnection();

  // Show overlay when disconnected
  if (isDisconnected) {
    return <ServerDisconnectedOverlay onDismiss={acknowledgeDisconnect} />;
  }

  // Just render children - HTTP adapters will fetch data on demand
  return <>{children}</>;
};
