import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../molecules';
import { MultipleChoiceCard } from '../molecules';
import { Button, Card } from '../atoms';
import { VocabularyService } from '../../services/vocabulary.service';
import { PracticeService } from '../../services/practice.service';
import { LearningSettingsService } from '../../services/learningSettings.service';
import { WordSelectionService } from '../../services/wordSelection.service';
import { SessionManager } from '../../utils/sessionManager';
import type { Vocabulary } from '../../types/vocabulary';
import { RotateCcw } from "lucide-react";

export const MultipleChoicePracticePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const collectionId = searchParams.get('collection');
  const contentMode = searchParams.get('contentMode') as 'concept' | 'definition' | null;

  const [sessionManager, setSessionManager] = useState<SessionManager | null>(null);
  const [currentVocab, setCurrentVocab] = useState<Vocabulary | null>(null);
  const [allVocabularies, setAllVocabularies] = useState<Vocabulary[]>([]);
  const [cardStartTime, setCardStartTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    if (collectionId) {
      loadVocabularies();
    }
  }, [collectionId]);

  useEffect(() => {
    if (currentVocab && allVocabularies.length > 0) {
      generateOptions();
    }
  }, [currentVocab, allVocabularies]);

  const loadVocabularies = async () => {
    if (!collectionId) {
      console.error('No collection ID provided');
      return;
    }

    try {
      setLoading(true);

      // Load learning settings
      const userSettings = await LearningSettingsService.getOrCreateLearningSettings();

      // Load vocabularies
      const vocabData = await VocabularyService.getVocabulariesByCollection(collectionId);
      setAllVocabularies(vocabData); // Store all vocabularies for generating options

      if (vocabData.length === 0) {
        setLoading(false);
        return;
      }

      const language = vocabData[0].language || 'en';

      // Load practice progress
      const progressData = await PracticeService.getPracticeProgress(language);
      const wordsProgress = progressData?.words_progress || [];

      // Select words using smart selection
      const selectedWords = WordSelectionService.selectWordsForPractice(
        vocabData,
        wordsProgress,
        userSettings,
        {
          includeDueWords: true,
          includeNewWords: true,
          maxWords: 50,
          shuffle: true,
        }
      );

      // Initialize session manager
      const manager = new SessionManager(
        selectedWords,
        wordsProgress,
        userSettings,
        'multiplechoice',
        collectionId,
        language
      );
      setSessionManager(manager);

      // Get first word
      const firstWord = manager.getNextWord();
      setCurrentVocab(firstWord);
    } catch (error) {
      console.error('Failed to load vocabularies:', error);
      alert(t('messages.error'));
    } finally {
      setLoading(false);
    }
  };

  // Get content based on mode (concept or definition), with fallback
  const getContent = (vocab: Vocabulary): string => {
    if (contentMode === 'concept') {
      // If concept mode is selected, use concept if available, otherwise fallback to definition
      return vocab.concept || vocab.definitions[0]?.meaning || 'No content available';
    }
    // Default to definition
    return vocab.definitions[0]?.meaning || 'No definition available';
  };

  const generateOptions = () => {
    if (!currentVocab || allVocabularies.length === 0) return;

    // Get 3 random wrong answers from other vocabularies
    const otherVocabs = allVocabularies.filter((v) => (v.id || v.word) !== (currentVocab.id || currentVocab.word));
    const wrongAnswers = otherVocabs
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((v) => getContent(v));

    // Combine with correct answer and shuffle
    const allOptions = [
      getContent(currentVocab),
      ...wrongAnswers,
    ].sort(() => Math.random() - 0.5);

    setOptions(allOptions);
  };

  const handleAnswer = (correct: boolean) => {
    if (!sessionManager || !currentVocab) {
      return;
    }

    try {
      const timeSpent = Math.floor((Date.now() - cardStartTime) / 1000);

      // Process answer using session manager
      if (correct) {
        sessionManager.handleCorrectAnswer(currentVocab, timeSpent);
      } else {
        sessionManager.handleIncorrectAnswer(currentVocab, timeSpent);
      }

      setShowNext(true);

      // Auto-advance after 1.5 seconds to show feedback
      setTimeout(() => {
        handleNext();
      }, 2000);
    } catch (error) {
      console.error('Error in handleAnswer:', error);
      setShowNext(true); // Show next anyway to not block the user
      // Auto-advance even on error
      setTimeout(() => {
        handleNext();
      }, 2000);
    }
  };

  const handleNext = () => {
    if (!sessionManager) {
      return;
    }

    // Check if session is complete
    if (sessionManager.isSessionComplete()) {
      completeSession();
    } else {
      // Get next word
      const nextWord = sessionManager.getNextWord();
      setCurrentVocab(nextWord);
      setShowNext(false);
      setCardStartTime(Date.now());
    }
  };

  const completeSession = async () => {
    if (!sessionManager || !collectionId || !currentVocab) {
      setCompleted(true);
      return;
    }

    try {
      const stats = sessionManager.getStatistics();
      const results = sessionManager.getSessionResults();
      const language = currentVocab.language || 'en';

      // Save practice session
      await PracticeService.createPracticeSession({
        collection_id: collectionId,
        mode: 'multiplechoice',
        language,
        results,
        duration_seconds: stats.durationSeconds,
      });

      // Save updated progress for all words
      const updatedProgress = sessionManager.getUpdatedWordProgress();
      for (const progress of updatedProgress) {
        await PracticeService.updatePracticeProgress({
          language,
          vocabulary_id: progress.vocabulary_id,
          word: progress.word,
          correct: progress.correct_count > 0,
        });
      }
    } catch (error) {
      console.error('Failed to save session:', error);
    }

    setCompleted(true);
  };

  const handleRestart = () => {
    setSessionManager(null);
    setCurrentVocab(null);
    setShowNext(false);
    setCompleted(false);
    setCardStartTime(Date.now());
    loadVocabularies();
  };

  if (loading) {
    return (
      <>
        <TopBar title={t('practice.multipleChoiceMode')} showBack />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">{t('app.loading')}</div>
        </div>
      </>
    );
  }

  if (completed) {
    const stats = sessionManager?.getStatistics() || {
      totalQuestions: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      accuracy: 0,
    };

    return (
      <>
        <TopBar title={t('practice.completed')} showBack />
        <div className="px-4 pt-6 space-y-6">
          <Card variant="gradient" className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-black mb-4">{t('practice.wellDone')}</h2>
            <div className="space-y-2">
              <p className="text-2xl text-white/90">
                {stats.correctAnswers} / {stats.totalQuestions} {t('practice.correct')}
              </p>
              <p className="text-xl text-white/80">
                {stats.accuracy}% {t('practice.accuracy')}
              </p>
            </div>
          </Card>

          <div className="flex gap-3">
            <Button variant="glass" size="lg" fullWidth icon={RotateCcw} onClick={handleRestart}>
              {t('practice.tryAgain')}
            </Button>
            <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/practice')}>
              {t('buttons.close')}
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (!currentVocab || options.length === 0) {
    return (
      <>
        <TopBar title={t('practice.multipleChoiceMode')} showBack />
        <div className="px-4 pt-6">
          <Card variant="glass" className="text-center p-8">
            <p className="text-gray-600">{t('vocabulary.noResults')}</p>
            <Button variant="primary" size="lg" className="mt-4" onClick={() => navigate('/')}>
              {t('nav.home')}
            </Button>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title={t('practice.multipleChoiceMode')} showBack />

      <div className="px-4 pt-6 space-y-6">
        {/* Progress */}
        <Card variant="glass">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">{t('practice.progress')}</span>
            <span className="text-sm font-bold text-teal-600">
              {sessionManager ? !showNext && `${sessionManager.getStatistics().wordsCompleted} / ${sessionManager.getTotalWordsCount()}` : '0 / 0'}
            </span>
          </div>
          <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full transition-all duration-300"
              style={{ width: `${sessionManager ? sessionManager.getProgressPercentage() : 0}%` }}
            ></div>
          </div>
        </Card>

        {/* Multiple Choice Card */}
        <MultipleChoiceCard
          key={currentVocab.id || currentVocab.word}
          question={currentVocab.word}
          subtitle={currentVocab.ipa}
          options={options}
          correctAnswer={getContent(currentVocab)}
          onAnswer={handleAnswer}
        />

        {/* Next Button - shows while waiting for auto-advance */}
        {showNext && (
          <Button variant="primary" size="lg" fullWidth onClick={handleNext}>
            {sessionManager && !sessionManager.isSessionComplete()
              ? `${t('practice.next')} (auto)`
              : t('practice.finish')}
          </Button>
        )}
      </div>
    </>
  );
};
