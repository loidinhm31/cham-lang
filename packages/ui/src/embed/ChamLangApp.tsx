import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { DialogProvider, ThemeProvider } from "@cham-lang/ui/contexts";
import "@cham-lang/ui/i18n/config";
import { AppShell } from "@cham-lang/ui/components/templates";
import { BasePathContext, PortalContainerContext } from "@cham-lang/ui/hooks";
import {
  getAllServices,
  setAuthService,
  setCollectionService,
  setCSVService,
  setGDriveService,
  setLearningSettingsService,
  setNotificationService,
  setPracticeService,
  setSyncService,
  setVocabularyService,
} from "@cham-lang/ui/adapters/factory";
import {
  type IPlatformServices,
  PlatformProvider,
} from "@cham-lang/ui/platform";
import { isTauri } from "@cham-lang/ui/utils";

// IndexedDB Adapters - used for ALL data storage across all platforms
import {
  BrowserNotificationAdapter,
  IndexedDBCollectionAdapter,
  IndexedDBCSVAdapter,
  IndexedDBLearningSettingsAdapter,
  IndexedDBPracticeAdapter,
  IndexedDBSyncAdapter,
  IndexedDBVocabularyAdapter,
  WebGDriveAdapter,
} from "@cham-lang/ui/adapters/web";

// Tauri Adapters - only for platform-specific functionality
import {
  TauriGDriveAdapter,
  TauriNotificationAdapter,
} from "@cham-lang/ui/adapters/tauri";

// Shared Adapters
import { QmServerAuthAdapter } from "@cham-lang/ui/adapters/shared";
import { getAuthService } from "@cham-lang/ui/adapters/factory";

export interface ChamLangAppProps {
  className?: string;
  useRouter?: boolean;
  /** Auth tokens when embedded in qm-hub */
  authTokens?: {
    accessToken: string;
    refreshToken: string;
    userId: string;
  };
  /** Whether running in embedded mode */
  embedded?: boolean;
  /** Callback when the app needs to logout (for embedded mode) */
  onLogoutRequest?: () => void;
  /** Base path for navigation when embedded (e.g., '/cham-lang') */
  basePath?: string;
}

/**
 * ChamLangApp - Main embeddable component
 *
 * When embedded in another app (like qm-hub-app), this component:
 * 1. Uses shared localStorage tokens for SSO
 * 2. Hides outer navigation (sidebar, bottom nav) in embedded mode
 * 3. Notifies parent app on logout request
 */
export const ChamLangApp: React.FC<ChamLangAppProps> = ({
  useRouter = true,
  authTokens,
  embedded = false,
  onLogoutRequest,
  basePath,
  className,
}) => {
  // Initialize services synchronously before first render
  const platform = useMemo<IPlatformServices>(() => {
    // Data platform - all platforms use IndexedDB
    setCollectionService(new IndexedDBCollectionAdapter());
    setVocabularyService(new IndexedDBVocabularyAdapter());
    setPracticeService(new IndexedDBPracticeAdapter());
    setLearningSettingsService(new IndexedDBLearningSettingsAdapter());
    setCSVService(new IndexedDBCSVAdapter());

    // Platform-specific platform
    if (isTauri()) {
      setNotificationService(new TauriNotificationAdapter());
      setGDriveService(new TauriGDriveAdapter());
    } else {
      setNotificationService(new BrowserNotificationAdapter());
      setGDriveService(new WebGDriveAdapter());
    }

    // Auth service - single source of truth for tokens
    const auth = new QmServerAuthAdapter();
    setAuthService(auth);

    const syncAdapter = new IndexedDBSyncAdapter({
      getConfig: () => auth.getSyncConfig(),
      getTokens: () => auth.getTokens(),
      saveTokens: (accessToken, refreshToken, userId) =>
        auth.saveTokensExternal(accessToken, refreshToken, userId),
    });
    setSyncService(syncAdapter);

    return getAllServices();
  }, []);

  // Inject auth tokens when embedded (using auth adapter)
  useEffect(() => {
    if (authTokens?.accessToken && authTokens?.refreshToken) {
      const auth = getAuthService() as QmServerAuthAdapter;
      auth
        .saveTokensExternal?.(
          authTokens.accessToken,
          authTokens.refreshToken,
          authTokens.userId || "",
        )
        .catch(console.error);
    }
  }, [authTokens, platform.auth]);

  // Determine if we should skip auth (tokens provided externally)
  const skipAuth = !!(authTokens?.accessToken && authTokens?.refreshToken);

  const containerRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    setPortalContainer(containerRef.current);
  }, []);

  const content = (
    <AppShell
      skipAuth={skipAuth}
      embedded={embedded}
      onLogoutRequest={onLogoutRequest}
    />
  );

  return (
    <div ref={containerRef} className={className}>
      <PlatformProvider services={platform}>
        <ThemeProvider embedded={embedded}>
          <BasePathContext.Provider value={basePath || ""}>
            <PortalContainerContext.Provider value={portalContainer}>
              <DialogProvider>
                {useRouter ? <BrowserRouter>{content}</BrowserRouter> : content}
              </DialogProvider>
            </PortalContainerContext.Provider>
          </BasePathContext.Provider>
        </ThemeProvider>
      </PlatformProvider>
    </div>
  );
};
