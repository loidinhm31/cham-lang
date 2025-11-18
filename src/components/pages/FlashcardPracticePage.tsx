import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, X, RotateCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { TopBar } from '../molecules';
import { FlashCard, Button, Card } from '../atoms';
import { VocabularyService } from '../../services/vocabulary.service';
import { PracticeService } from '../../services/practice.service';
import type { Vocabulary } from '../../types/vocabulary';
import type { PracticeResult } from '../../types/practice';

export const FlashcardPracticePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [startTime] = useState(Date.now());
  const [cardStartTime, setCardStartTime] = useState(Date.now());
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    loadVocabularies();
  }, []);

  const loadVocabularies = async () => {
    try {
      setLoading(true);
      const data = await VocabularyService.getAllVocabularies('en', 10);
      // Shuffle vocabularies
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setVocabularies(shuffled);
    } catch (error) {
      console.error('Failed to load vocabularies:', error);
      alert(t('messages.error'));
    } finally {
      setLoading(false);
    }
  };

  const currentVocab = vocabularies[currentIndex];

  const handleAnswer = async (correct: boolean) => {
    if (!currentVocab) return;

    const timeSpent = Math.floor((Date.now() - cardStartTime) / 1000);

    const result: PracticeResult = {
      vocabulary_id: currentVocab.id || '',
      word: currentVocab.word,
      correct,
      mode: 'flashcard',
      time_spent_seconds: timeSpent,
    };

    setResults([...results, result]);

    // Update progress
    if (user) {
      try {
        await PracticeService.updatePracticeProgress({
          user_id: user.user_id,
          language: 'en',
          vocabulary_id: currentVocab.id || '',
          word: currentVocab.word,
          correct,
        });
      } catch (error) {
        console.error('Failed to update progress:', error);
      }
    }

    // Move to next or complete
    if (currentIndex < vocabularies.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      setCardStartTime(Date.now());
    } else {
      completeSession();
    }
  };

  const completeSession = async () => {
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

    if (user && currentVocab) {
      try {
        await PracticeService.createPracticeSession({
          user_id: user.user_id,
          collection_id: currentVocab.collection_id || '', // TODO: Select collection before practice
          mode: 'flashcard',
          language: 'en',
          results: [...results],
          duration_seconds: durationSeconds,
        });
      } catch (error) {
        console.error('Failed to save session:', error);
      }
    }

    setCompleted(true);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setResults([]);
    setIsFlipped(false);
    setCompleted(false);
    setCardStartTime(Date.now());
    loadVocabularies();
  };

  if (loading) {
    return (
      <>
        <TopBar title={t('practice.flashcardMode')} showBack />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">{t('app.loading')}</div>
        </div>
      </>
    );
  }

  if (completed) {
    const correctCount = results.filter(r => r.correct).length;
    const accuracy = Math.round((correctCount / results.length) * 100);

    return (
      <>
        <TopBar title={t('practice.completed')} showBack />
        <div className="px-4 pt-6 space-y-6">
          <Card variant="gradient" className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-black mb-4">{t('practice.wellDone')}</h2>
            <div className="space-y-2">
              <p className="text-2xl text-white/90">
                {correctCount} / {results.length} {t('practice.correct')}
              </p>
              <p className="text-xl text-white/80">{accuracy}% {t('practice.accuracy')}</p>
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

  if (!currentVocab) {
    return (
      <>
        <TopBar title={t('practice.flashcardMode')} showBack />
        <div className="px-4 pt-6">
          <Card variant="glass" className="text-center p-8">
            <p className="text-gray-600">{t('vocabulary.noResults')}</p>
            <Button
              variant="primary"
              size="lg"
              className="mt-4"
              onClick={() => navigate('/')}
            >
              {t('nav.home')}
            </Button>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title={t('practice.flashcardMode')} showBack />

      <div className="px-4 pt-6 space-y-6">
        {/* Progress */}
        <Card variant="glass">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              {t('practice.progress')}
            </span>
            <span className="text-sm font-bold text-teal-600">
              {currentIndex + 1} / {vocabularies.length}
            </span>
          </div>
          <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / vocabularies.length) * 100}%` }}
            ></div>
          </div>
        </Card>

        {/* Flashcard */}
        <FlashCard
          front={currentVocab.word}
          subtitle={currentVocab.ipa}
          back={currentVocab.definitions[0]?.meaning || 'No definition available'}
          onFlip={setIsFlipped}
        />

        {/* Action Buttons */}
        {isFlipped && (
          <div className="flex gap-3">
            <Button
              variant="danger"
              size="lg"
              fullWidth
              icon={X}
              onClick={() => handleAnswer(false)}
            >
              {t('practice.incorrect')}
            </Button>
            <Button
              variant="success"
              size="lg"
              fullWidth
              icon={Check}
              onClick={() => handleAnswer(true)}
            >
              {t('practice.correct')}
            </Button>
          </div>
        )}
      </div>
    </>
  );
};
