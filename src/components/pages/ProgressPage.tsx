import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TopBar, StatsCard } from '../molecules';
import { Card } from '../atoms';
import { VocabularyService } from '../../services/vocabulary.service';
import { PracticeService } from '../../services/practice.service';
import type { Vocabulary } from '../../types/vocabulary';

interface LevelProgress {
  level: string;
  total: number;
  practiced: number;
  percentage: number;
}

export const ProgressPage: React.FC = () => {
  const { t } = useTranslation();
  const [totalWords, setTotalWords] = useState(0);
  const [practiceStreak, setPracticeStreak] = useState(0);
  const [wordsPracticed, setWordsPracticed] = useState(0);
  const [currentLanguage, setCurrentLanguage] = useState<string>('');
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [levelProgress, setLevelProgress] = useState<LevelProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailableLanguages();
  }, []);

  useEffect(() => {
    if (currentLanguage) {
      loadStats(currentLanguage);
    }
  }, [currentLanguage]);

  const loadAvailableLanguages = async () => {
    try {
      setLoading(true);
      // Get all languages from user's collections
      const languages = await VocabularyService.getAllLanguages();
      setAvailableLanguages(languages);

      // Set the first language as default if available
      if (languages.length > 0) {
        setCurrentLanguage(languages[0]);
      }
    } catch (error) {
      console.error('Failed to load languages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (language: string) => {
    try {
      setLoading(true);

      // Load all vocabularies for the selected language
      const vocabularies = await VocabularyService.getAllVocabularies(language);
      setTotalWords(vocabularies.length);

      // Load practice progress
      const progress = await PracticeService.getPracticeProgress(language);
      console.log('pr', progress)
      if (progress) {
        setPracticeStreak(progress.current_streak);
        setWordsPracticed(progress.total_words_practiced);

        // Calculate level progress
        const levelStats = calculateLevelProgress(vocabularies, progress.words_progress);
        setLevelProgress(levelStats);
      } else {
        setPracticeStreak(0);
        setWordsPracticed(0);

        const levelStats = calculateLevelProgress(vocabularies, []);
        setLevelProgress(levelStats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateLevelProgress = (
    vocabularies: Vocabulary[],
    wordsProgress: Array<{ vocabulary_id: string; mastery_level: number }>
  ): LevelProgress[] => {
    // Get all unique levels from vocabularies
    const levelMap = new Map<string, { total: number; practiced: number }>();

    vocabularies.forEach(vocab => {
      const level = vocab.level || 'Unknown';
      const current = levelMap.get(level) || { total: 0, practiced: 0 };
      current.total += 1;

      // Check if this word has been practiced
      const wordProg = wordsProgress.find(wp => wp.vocabulary_id === vocab.id);
      if (wordProg && wordProg.mastery_level > 0) {
        current.practiced += 1;
      }

      levelMap.set(level, current);
    });

    // Convert to array and calculate percentages
    const levels: LevelProgress[] = Array.from(levelMap.entries()).map(([level, stats]) => ({
      level,
      total: stats.total,
      practiced: stats.practiced,
      percentage: stats.total > 0 ? Math.round((stats.practiced / stats.total) * 100) : 0,
    }));

    // Sort by common CEFR order if applicable
    const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    levels.sort((a, b) => {
      const aIndex = levelOrder.indexOf(a.level);
      const bIndex = levelOrder.indexOf(b.level);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.level.localeCompare(b.level);
    });

    return levels;
  };

  const stats = [
    { value: totalWords, label: t('stats.totalWords'), color: 'text-teal-600' },
    { value: practiceStreak, label: t('stats.streak'), color: 'text-amber-600' },
    { value: wordsPracticed, label: t('stats.wordsLearned'), color: 'text-orange-600' },
  ];

  if (loading) {
    return (
      <>
        <TopBar title={t('nav.progress')} showBack={false} />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">{t('app.loading')}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title={t('nav.progress')} showBack={false} />

      <div className="px-4 pt-6 space-y-6">
        {/* Language Selector */}
        {availableLanguages.length > 1 && (
          <Card variant="glass">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">{t('vocabulary.selectLanguage') || 'Select Language'}</label>
              <select
                value={currentLanguage}
                onChange={(e) => setCurrentLanguage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {availableLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </Card>
        )}

        {/* Current Language Display (for single language) */}
        {availableLanguages.length === 1 && currentLanguage && (
          <div className="text-center">
            <p className="text-sm text-gray-600">Learning: <span className="font-semibold">{currentLanguage.toUpperCase()}</span></p>
          </div>
        )}

        {/* Stats Overview */}
        <StatsCard stats={stats} title={t('nav.progress')} />

        {/* Progress Chart - Real Data */}
        {levelProgress.length > 0 ? (
          <Card variant="glass">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{t('vocabulary.level')} {t('nav.progress')}</h3>
            <div className="space-y-3">
              {levelProgress.map((level) => (
                <div key={level.level}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700">{level.level}</span>
                      <span className="text-xs text-gray-500">({level.practiced}/{level.total})</span>
                    </div>
                    <span className="text-sm font-bold text-teal-600">{level.percentage}%</span>
                  </div>
                  <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full transition-all duration-500"
                      style={{ width: `${level.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card variant="glass">
            <div className="text-center p-8">
              <p className="text-gray-600">No vocabulary data yet. Start adding words to see progress by level!</p>
            </div>
          </Card>
        )}

        {/* Achievement Card */}
        {practiceStreak > 0 && (
          <Card variant="gradient">
            <div className="text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-2xl font-bold mb-2">{practiceStreak} Day {t('stats.streak')}!</h3>
              <p className="text-white/90 mb-4">Keep learning every day 🔥</p>
            </div>
          </Card>
        )}
      </div>
    </>
  );
};
