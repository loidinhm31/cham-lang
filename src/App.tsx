import React from 'react';
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import {MainLayout} from './components/templates/MainLayout';
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
  MultipleChoicePracticePage,
  PracticeModePage,
  ProfilePage,
  ProgressPage,
  VocabularyDetailPage,
} from './components/pages';
import './i18n/config';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/vocabulary/add" element={<AddVocabularyPage />} />
          <Route path="/vocabulary/edit/:id" element={<EditVocabularyPage />} />
          <Route path="/vocabulary/:id" element={<VocabularyDetailPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/collections/new" element={<CreateCollectionPage />} />
          <Route path="/collections/:id/edit" element={<EditCollectionPage />} />
          <Route path="/collections/:id" element={<CollectionDetailPage />} />
          <Route path="/practice" element={<PracticeModePage />} />
          <Route path="/practice/flashcard" element={<FlashcardPracticePage />} />
          <Route path="/practice/fill-word" element={<FillWordPracticePage />} />
          <Route path="/practice/multiple-choice" element={<MultipleChoicePracticePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
