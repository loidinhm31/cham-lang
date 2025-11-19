import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TopBar } from '../molecules';
import { MultipleChoiceCard } from '../molecules';
import { Button, Card } from '../atoms';
import { VocabularyService } from '../../services/vocabulary.service';
import { PracticeService } from '../../services/practice.service';
import type { Vocabulary } from '../../types/vocabulary';
import type { PracticeResult } from '../../types/practice';
import {RotateCcw} from "lucide-react";

export const MultipleChoicePracticePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const collectionId = searchParams.get('collection');

  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<PracticeResult[]>([]);
  const [startTime] = useState(Date.now());
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
    if (vocabularies.length > 0 && currentIndex < vocabularies.length) {
      generateOptions();
    }
  }, [currentIndex, vocabularies]);

  const loadVocabularies = async () => {
    if (!collectionId) {
      console.error('No collection ID provided');
      return;
    }

    try {
      setLoading(true);
      const data = await VocabularyService.getVocabulariesByCollection(collectionId);
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setVocabularies(shuffled);
    } catch (error) {
      console.error('Failed to load vocabularies:', error);
      alert(t('messages.error'));
    } finally {
      setLoading(false);
    }
  };

  const generateOptions = () => {
    const currentVocab = vocabularies[currentIndex];
    if (!currentVocab) return;

    // Get 3 random wrong answers from other vocabularies
    const otherVocabs = vocabularies.filter((_, idx) => idx !== currentIndex);
    const wrongAnswers = otherVocabs
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((v) => v.definitions[0]?.meaning || 'Definition unavailable');

    // Combine with correct answer and shuffle
    const allOptions = [
      currentVocab.definitions[0]?.meaning || 'Definition unavailable',
      ...wrongAnswers,
    ].sort(() => Math.random() - 0.5);

    setOptions(allOptions);
  };

  const currentVocab = vocabularies[currentIndex];

  const handleAnswer = async (correct: boolean) => {
    if (!currentVocab) return;

    const timeSpent = Math.floor((Date.now() - cardStartTime) / 1000);

    const result: PracticeResult = {
      vocabulary_id: currentVocab.id || '',
      word: currentVocab.word,
      correct,
      mode: 'multiplechoice',
      time_spent_seconds: timeSpent,
    };

    setResults([...results, result]);

    // Update progress
    try {
      await PracticeService.updatePracticeProgress({
        language: currentVocab.language || 'en',
        vocabulary_id: currentVocab.id || '',
        word: currentVocab.word,
        correct,
      });
    } catch (error) {
      console.error('Failed to update progress:', error);
    }


    setShowNext(true);
  };

  const handleNext = () => {
    if (currentIndex < vocabularies.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowNext(false);
      setCardStartTime(Date.now());
    } else {
      completeSession();
    }
  };

  const completeSession = async () => {
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

    if (collectionId && vocabularies[0]) {
      try {
        await PracticeService.createPracticeSession({
          collection_id: collectionId,
          mode: 'multiplechoice',
          language: vocabularies[0].language || 'en',
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
    const correctCount = results.filter((r) => r.correct).length;
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
              <p className="text-xl text-white/80">
                {accuracy}% {t('practice.accuracy')}
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

        {/* Multiple Choice Card */}
        <MultipleChoiceCard
          key={currentVocab.id || currentIndex}
          question={currentVocab.word}
          subtitle={currentVocab.ipa}
          options={options}
          correctAnswer={currentVocab.definitions[0]?.meaning || ''}
          onAnswer={handleAnswer}
        />

        {/* Next Button */}
        {showNext && (
          <Button variant="primary" size="lg" fullWidth onClick={handleNext}>
            {currentIndex < vocabularies.length - 1 ? t('practice.next') : t('practice.finish')}
          </Button>
        )}
      </div>
    </>
  );
};
