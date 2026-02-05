import { useEffect, useMemo, useRef, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { DialogProvider, ThemeProvider } from "@cham-lang/ui/contexts";
import "@cham-lang/ui/i18n/config";
import { AppShell } from "@cham-lang/ui/components/templates";
import { BasePathContext, PortalContainerContext } from "@cham-lang/ui/hooks";
import { getAllServices } from "@cham-lang/ui/adapters/factory";
import {
  type IPlatformServices,
  PlatformProvider,
} from "@cham-lang/ui/platform";

export interface ChamLangAppProps {
  className?: string;
  useRouter?: boolean;
  /** Auth tokens when embedded in qm-center */
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
 * ChamLangApp - Main embeddable component (matching fin-catch pattern)
 *
 * When embedded in another app (like qm-center-app), this component:
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
  // Create services - memoized to prevent recreation on every render
  const services = useMemo<IPlatformServices>(() => getAllServices(), []);

  // Inject auth tokens when embedded (using auth adapter, matching fin-catch pattern)
  useEffect(() => {
    if (authTokens?.accessToken && authTokens?.refreshToken) {
      services.auth
        .saveTokensExternal?.(
          authTokens.accessToken,
          authTokens.refreshToken,
          authTokens.userId || "",
        )
        .catch(console.error);
    }
  }, [authTokens, services.auth]);

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
      <PlatformProvider services={services}>
        <ThemeProvider embedded={embedded}>
          <DialogProvider>
            <BasePathContext.Provider value={basePath || ""}>
              <PortalContainerContext.Provider value={portalContainer}>
                {useRouter ? <BrowserRouter>{content}</BrowserRouter> : content}
              </PortalContainerContext.Provider>
            </BasePathContext.Provider>
          </DialogProvider>
        </ThemeProvider>
      </PlatformProvider>
    </div>
  );
};
