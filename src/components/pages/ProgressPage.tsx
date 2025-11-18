import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar, StatsCard } from '../molecules';
import { Card } from '../atoms';
import { VocabularyService } from '../../services/vocabulary.service';
import { PracticeService } from '../../services/practice.service';

export const ProgressPage: React.FC = () => {
  const { t } = useTranslation();
  const [totalWords, setTotalWords] = useState(0);
  const [practiceStreak, setPracticeStreak] = useState(0);
  const [wordsPracticed, setWordsPracticed] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const vocabularies = await VocabularyService.getAllVocabularies('en');
      setTotalWords(vocabularies.length);

      // Load practice progress
      const progress = await PracticeService.getPracticeProgress('en');
      if (progress) {
        setPracticeStreak(progress.current_streak);
        setWordsPracticed(progress.total_words_practiced);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const stats = [
    { value: totalWords, label: t('stats.totalWords'), color: 'text-teal-600' },
    { value: practiceStreak, label: t('stats.streak'), color: 'text-amber-600' },
    { value: wordsPracticed, label: t('stats.wordsLearned'), color: 'text-orange-600' },
  ];

  return (
    <>
      <TopBar title={t('nav.progress')} showBack={false} />

      <div className="px-4 pt-6 space-y-6">
        {/* Stats Overview */}
        <StatsCard stats={stats} title={t('nav.progress')} />

        {/* Progress Chart Placeholder */}
        <Card variant="glass">
          <h3 className="text-xl font-bold text-gray-800 mb-4">{t('vocabulary.level')} {t('nav.progress')}</h3>
          <div className="space-y-3">
            {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level, idx) => {
              const progress = Math.max(0, 100 - idx * 15);
              return (
                <div key={level}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">{level}</span>
                    <span className="text-sm font-bold text-teal-600">{progress}%</span>
                  </div>
                  <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Achievement Card */}
        <Card variant="gradient">
          <div className="text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold mb-2">{t('nav.progress')} {t('stats.streak')}!</h3>
            <p className="text-white/90 mb-4">Keep learning every day 🔥</p>
          </div>
        </Card>

        {/* Weekly Activity */}
        <Card variant="glass">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Weekly Activity</h3>
          <div className="flex justify-between items-end h-32">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
              const height = Math.random() * 80 + 20;
              return (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div
                    className="w-8 bg-gradient-to-t from-teal-500 to-cyan-600 rounded-t-lg"
                    style={{ height: `${height}px` }}
                  ></div>
                  <span className="text-xs font-semibold text-gray-600">{day}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
};
