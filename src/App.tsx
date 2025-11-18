import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/templates/MainLayout';
import {
  HomePage,
  AddVocabularyPage,
  VocabularyDetailPage,
  ExplorePage,
  ProgressPage,
  ProfilePage,
  PracticeModePage,
  FlashcardPracticePage,
  FillWordPracticePage,
  MultipleChoicePracticePage,
} from './components/pages';
import './i18n/config';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/vocabulary/add" element={<AddVocabularyPage />} />
          <Route path="/vocabulary/:id" element={<VocabularyDetailPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/practice" element={<PracticeModePage />} />
          <Route path="/practice/flashcard" element={<FlashcardPracticePage />} />
          <Route path="/practice/fill-word" element={<FillWordPracticePage />} />
          <Route path="/practice/multiple-choice" element={<MultipleChoicePracticePage />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
};

export default App;
