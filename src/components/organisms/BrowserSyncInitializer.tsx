/**
 * BrowserSyncInitializer
 *
 * Wrapper component that automatically loads data from desktop SQLite
 * when the app is opened in browser mode from the desktop.
 */

import React, { useEffect, useState } from "react";
import { isOpenedFromDesktop } from "@/utils/platform";
import { browserSyncService } from "@/services/BrowserSyncService";

interface BrowserSyncInitializerProps {
  children: React.ReactNode;
}

export const BrowserSyncInitializer: React.FC<BrowserSyncInitializerProps> = ({
  children,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeFromDesktop = async () => {
      console.log("🔍 BrowserSyncInitializer: checking mode...");
      console.log("   - isOpenedFromDesktop:", isOpenedFromDesktop());
      console.log("   - window.location.origin:", window.location.origin);
      console.log(
        "   - session token:",
        new URLSearchParams(window.location.search).get("session"),
      );

      // Only run if opened from desktop and not already initialized
      if (!isOpenedFromDesktop() || initialized) {
        console.log(
          "🔍 Skipping sync - not opened from desktop or already initialized",
        );
        setInitialized(true);
        return;
      }

      // Check if already loaded in this session
      const lastLoad = browserSyncService.getLastLoadTime();
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (lastLoad && lastLoad > fiveMinutesAgo) {
        console.log("📦 Data was recently loaded, skipping auto-load");
        setInitialized(true);
        return;
      }

      setLoading(true);
      console.log("🔄 Browser opened from desktop, loading initial data...");

      try {
        const result = await browserSyncService.loadFromDesktop();

        if (result.success) {
          console.log("✅ Initial data loaded:", result.message);
        } else {
          console.error("❌ Failed to load initial data:", result.message);
          setError(result.message);
        }
      } catch (err) {
        console.error("❌ Error during initial load:", err);
        setError(`Failed to load data: ${err}`);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeFromDesktop();
  }, [initialized]);

  // Show loading screen while initializing from desktop
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 z-50">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <h2 className="text-xl font-semibold text-gray-800">
            Loading from Desktop...
          </h2>
          <p className="text-sm text-gray-600">Syncing your vocabulary data</p>
        </div>
      </div>
    );
  }

  // Show error if failed to load (but still allow using the app)
  if (error && initialized) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-2 text-sm text-center z-50">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
        <div className="pt-10">{children}</div>
      </>
    );
  }

  return <>{children}</>;
};
