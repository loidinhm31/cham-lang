import React, { useEffect } from "react";
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
  ProfilePage,
  ProgressPage,
  VocabularyDetailPage,
  CSVExportPage,
  CSVImportPage,
  StudyModePage,
} from "@/components/pages";
import { SyncNotificationProvider, DialogProvider } from "@/contexts";
import { FontSizeService } from "@/services";
import "@/i18n/config";
import { MainLayout } from "@/components/templates/MainLayout";

const App: React.FC = () => {
  // Initialize font size on app start
  useEffect(() => {
    FontSizeService.initialize();
  }, []);

  return (
    <BrowserRouter>
      <DialogProvider>
        <SyncNotificationProvider>
          <Routes>
            <Route element={<MainLayout />}>
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
              <Route path="/profile" element={<ProfilePage />} />
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
          </Routes>
        </SyncNotificationProvider>
      </DialogProvider>
    </BrowserRouter>
  );
};

export default App;
