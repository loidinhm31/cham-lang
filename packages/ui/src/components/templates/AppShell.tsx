import React, { lazy, Suspense, useState } from "react";
import { Navigate, Route, Routes, useOutletContext } from "react-router-dom";
import { useNav } from "@cham-lang/ui/hooks";
import { BottomNavigation } from "@cham-lang/ui/components/molecules";
import {
  BrowserSyncInitializer,
  Sidebar,
} from "@cham-lang/ui/components/organisms";
import { useAuth } from "@cham-lang/ui/hooks";
import "@cham-lang/ui/i18n/config";
import { ErrorBoundary, LoadingSpinner } from "@cham-lang/ui/components/atoms";
import { SyncNotificationProvider } from "@cham-lang/ui/contexts";

// Lazy-loaded page components for code-splitting
const HomePage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.HomePage,
  })),
);
const AddVocabularyPage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.AddVocabularyPage,
  })),
);
const EditVocabularyPage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.EditVocabularyPage,
  })),
);
const VocabularyDetailPage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.VocabularyDetailPage,
  })),
);
const ProgressPage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.ProgressPage,
  })),
);
const SettingsPage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.SettingsPage,
  })),
);
const CollectionsPage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.CollectionsPage,
  })),
);
const CreateCollectionPage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.CreateCollectionPage,
  })),
);
const EditCollectionPage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.EditCollectionPage,
  })),
);
const CollectionDetailPage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.CollectionDetailPage,
  })),
);
const CSVExportPage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.CSVExportPage,
  })),
);
const CSVImportPage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.CSVImportPage,
  })),
);
const PracticeModePage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.PracticeModePage,
  })),
);
const FlashcardPracticePage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.FlashcardPracticePage,
  })),
);
const FillWordPracticePage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.FillWordPracticePage,
  })),
);
const MultipleChoicePracticePage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.MultipleChoicePracticePage,
  })),
);
const StudyModePage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.StudyModePage,
  })),
);
const LearningSettingsPage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.LearningSettingsPage,
  })),
);
const ThemePreviewPage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.ThemePreviewPage,
  })),
);
const OAuthCallbackPage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.OAuthCallbackPage,
  })),
);
const LoginPage = lazy(() =>
  import("@cham-lang/ui/components/pages").then((m) => ({
    default: m.LoginPage,
  })),
);

/**
 * Props for AppShell component (matching fin-catch pattern)
 */
export interface AppShellProps {
  /**
   * Skip auth check - use when tokens are provided externally (e.g., embedded mode)
   */
  skipAuth?: boolean;

  /**
   * Embedded mode - hides outer navigation for embedding in parent apps
   */
  embedded?: boolean;

  /**
   * Callback when user requests logout - allows parent app to handle logout
   */
  onLogoutRequest?: () => void;
}

/**
 * Context passed to child routes via Outlet
 */
export interface AppShellContext {
  onLogoutRequest?: () => void;
  embedded: boolean;
}

/**
 * Hook to access AppShell context from child routes
 */
export function useAppShellContext(): AppShellContext {
  return useOutletContext<AppShellContext>();
}

export const AppShell: React.FC<AppShellProps> = ({
  skipAuth: skipAuthProp = false,
  embedded = false,
  onLogoutRequest,
}) => {
  const { navigate } = useNav();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [localSkipAuth, setLocalSkipAuth] = useState(false);

  // Skip initial auth check if tokens are provided externally (embedded mode)
  // This prevents unnecessary /api/v1/auth/me calls when already authenticated
  const { isLoading: isAuthLoading, checkAuthStatus } = useAuth({
    skipInitialCheck: skipAuthProp,
  });

  // Use either the prop or local state for skip auth
  const skipAuth = skipAuthProp || localSkipAuth;

  // Always show navigation - embedded prop is only for theme isolation now
  const showNavigation = true;

  // Handle logout - notify parent app if embedded, then check auth status
  const handleLogout = () => {
    if (onLogoutRequest) {
      onLogoutRequest();
    }
    setLocalSkipAuth(false);
    checkAuthStatus();
  };

  // Show loading spinner while checking auth status
  // Skip loading state if we're in skipAuth mode (embedded with external tokens)
  if (isAuthLoading && !skipAuth) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg-gradient)" }}
      >
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <BrowserSyncInitializer>
      <SyncNotificationProvider>
        <div
          className="min-h-screen relative overflow-hidden"
          style={{ background: "var(--bg-gradient)" }}
        >
          {showNavigation && (
            <Sidebar
              isCollapsed={isCollapsed}
              onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
            />
          )}

          <div
            className={`relative z-10 pb-32 md:pb-0 transition-all duration-300 ${
              isCollapsed ? "md:ml-16" : "md:ml-64"
            }`}
          >
            <ErrorBoundary>
              <Suspense fallback={<LoadingSpinner size="lg" />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route
                    path="/vocabulary/add"
                    element={<AddVocabularyPage />}
                  />
                  <Route
                    path="/vocabulary/edit/:id"
                    element={<EditVocabularyPage />}
                  />
                  <Route
                    path="/vocabulary/:id"
                    element={<VocabularyDetailPage />}
                  />
                  <Route path="/progress" element={<ProgressPage />} />
                  <Route
                    path="/settings"
                    element={<SettingsPage onLogout={handleLogout} />}
                  />
                  <Route
                    path="/login"
                    element={
                      <LoginPage
                        onLoginSuccess={() => {
                          checkAuthStatus();
                          navigate("/");
                        }}
                      />
                    }
                  />
                  <Route path="/collections" element={<CollectionsPage />} />
                  <Route
                    path="/collections/new"
                    element={<CreateCollectionPage />}
                  />
                  <Route
                    path="/collections/:id/edit"
                    element={<EditCollectionPage />}
                  />
                  <Route
                    path="/collections/:id"
                    element={<CollectionDetailPage />}
                  />
                  <Route path="/csv/export" element={<CSVExportPage />} />
                  <Route path="/csv/import" element={<CSVImportPage />} />
                  <Route path="/practice" element={<PracticeModePage />} />
                  <Route
                    path="/practice/flashcard"
                    element={<FlashcardPracticePage />}
                  />
                  <Route
                    path="/practice/fill-word"
                    element={<FillWordPracticePage />}
                  />
                  <Route
                    path="/practice/multiple-choice"
                    element={<MultipleChoicePracticePage />}
                  />
                  {/* Study Mode Routes */}
                  <Route path="/practice/study" element={<StudyModePage />} />
                  <Route
                    path="/practice/study/flashcard"
                    element={<FlashcardPracticePage />}
                  />
                  <Route
                    path="/practice/study/fill-word"
                    element={<FillWordPracticePage />}
                  />
                  <Route
                    path="/practice/study/multiple-choice"
                    element={<MultipleChoicePracticePage />}
                  />
                  <Route
                    path="/settings/learning"
                    element={<LearningSettingsPage />}
                  />
                  <Route
                    path="/settings/theme-preview"
                    element={<ThemePreviewPage />}
                  />
                  {/* OAuth Callback - Outside AppShell (popup window) */}
                  <Route
                    path="/oauth/callback"
                    element={<OAuthCallbackPage />}
                  />
                  {/* Fallback route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </div>

          {showNavigation && <BottomNavigation />}
        </div>
      </SyncNotificationProvider>
    </BrowserSyncInitializer>
  );
};
