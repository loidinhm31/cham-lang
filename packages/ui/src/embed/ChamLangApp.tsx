import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import {
  AddVocabularyPage,
  CollectionDetailPage,
  CollectionsPage,
  CreateCollectionPage,
  EditCollectionPage,
  EditVocabularyPage,
  FillWordPracticePage,
  FlashcardPracticePage,
  HomePage,
  LearningSettingsPage,
  MultipleChoicePracticePage,
  PracticeModePage,
  SettingsPage,
  ProgressPage,
  VocabularyDetailPage,
  CSVExportPage,
  CSVImportPage,
  StudyModePage,
  OAuthCallbackPage,
} from "@cham-lang/ui/components/pages";
import {
  SyncNotificationProvider,
  DialogProvider,
} from "@cham-lang/ui/contexts";
import { FontSizeService } from "@cham-lang/ui/services";
import "@cham-lang/ui/i18n/config";
import { AppShell } from "@cham-lang/ui/components/templates";
import { BrowserSyncInitializer } from "@cham-lang/ui/components/organisms";
import { BasePathContext, PortalContainerContext } from "@cham-lang/ui/hooks";

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

const AppContent: React.FC = () => {
  useEffect(() => {
    FontSizeService.initialize();
  }, []);

  return (
    <DialogProvider>
      <BrowserSyncInitializer>
        <SyncNotificationProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/vocabulary/add" element={<AddVocabularyPage />} />
              <Route
                path="/vocabulary/edit/:id"
                element={<EditVocabularyPage />}
              />
              <Route
                path="/vocabulary/:id"
                element={<VocabularyDetailPage />}
              />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/settings" element={<SettingsPage />} />
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
            </Route>
            {/* OAuth Callback - Outside AppShell (popup window) */}
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          </Routes>
        </SyncNotificationProvider>
      </BrowserSyncInitializer>
    </DialogProvider>
  );
};

export const ChamLangApp: React.FC<ChamLangAppProps> = ({
  useRouter = true,
  authTokens,
  embedded = false,
  onLogoutRequest,
  basePath,
}) => {
  // Inject auth tokens when embedded
  useEffect(() => {
    if (authTokens && embedded) {
      import("@cham-lang/shared/constants").then(({ AUTH_STORAGE_KEYS }) => {
        localStorage.setItem(
          AUTH_STORAGE_KEYS.ACCESS_TOKEN,
          authTokens.accessToken,
        );
        localStorage.setItem(
          AUTH_STORAGE_KEYS.REFRESH_TOKEN,
          authTokens.refreshToken,
        );
        localStorage.setItem(AUTH_STORAGE_KEYS.USER_ID, authTokens.userId);
      });
      // Handle logout request
      if (onLogoutRequest) {
        // This is a placeholder for handling logout request from the parent app
        // In a real app, we might want to listen to an event or expose a method
      }
    }
  }, [authTokens, embedded, onLogoutRequest]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    setPortalContainer(containerRef.current);
  }, []);

  const content = (
    <BasePathContext.Provider value={basePath || ""}>
      <PortalContainerContext.Provider value={portalContainer}>
        <AppContent />
      </PortalContainerContext.Provider>
    </BasePathContext.Provider>
  );

  return (
    <div ref={containerRef}>
      {useRouter ? <BrowserRouter>{content}</BrowserRouter> : content}
    </div>
  );
};
