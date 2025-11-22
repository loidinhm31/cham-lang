import React from "react";
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
} from "./components/pages";
import { SyncNotificationProvider } from "./contexts";
import "./i18n/config";
import { MainLayout } from "@/components/templates/MainLayout.tsx";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <SyncNotificationProvider>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/vocabulary/add" element={<AddVocabularyPage />} />
            <Route
              path="/vocabulary/edit/:id"
              element={<EditVocabularyPage />}
            />
            <Route path="/vocabulary/:id" element={<VocabularyDetailPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/collections/new" element={<CreateCollectionPage />} />
            <Route
              path="/collections/:id/edit"
              element={<EditCollectionPage />}
            />
            <Route path="/collections/:id" element={<CollectionDetailPage />} />
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
            <Route
              path="/settings/learning"
              element={<LearningSettingsPage />}
            />
          </Route>
        </Routes>
      </SyncNotificationProvider>
    </BrowserRouter>
  );
};

export default App;
