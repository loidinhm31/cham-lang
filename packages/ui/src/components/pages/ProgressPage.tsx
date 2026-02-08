import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StatsCard, TopBar } from "@cham-lang/ui/components/molecules";
import { Card } from "@cham-lang/ui/components/atoms";
import { VocabularyService } from "@cham-lang/ui/services";
import { PracticeService } from "@cham-lang/ui/services";
import { LearningSettingsService } from "@cham-lang/ui/services";
import type { Vocabulary } from "@cham-lang/shared/types";
import type { LearningSettings } from "@cham-lang/shared/types";
import type { WordProgress } from "@cham-lang/shared/types";
import {
  getLearningStats,
  getBoxDistribution,
  getBoxInfo,
  type LearningStats,
  type BoxDistribution,
  type BoxInfo,
} from "@cham-lang/ui/utils";

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
  const [currentLanguage, setCurrentLanguage] = useState<string>("");
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [levelProgress, setLevelProgress] = useState<LevelProgress[]>([]);
  const [loading, setLoading] = useState(true);

  // Spaced Repetition State
  const [learningStats, setLearningStats] = useState<LearningStats | null>(
    null,
  );
  const [boxDistribution, setBoxDistribution] = useState<BoxDistribution[]>([]);
  const [boxInfo, setBoxInfo] = useState<BoxInfo[]>([]);

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

      // Try to restore last selected language from localStorage
      const savedLanguage = localStorage.getItem("progress_selected_language");

      if (languages.length > 0) {
        // Use saved language if it's still available, otherwise use first language
        if (savedLanguage && languages.includes(savedLanguage)) {
          setCurrentLanguage(savedLanguage);
        } else {
          setCurrentLanguage(languages[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load languages:", error);
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

      // Load learning settings
      const settings =
        await LearningSettingsService.getOrCreateLearningSettings();

      // Load practice progress
      const progress = await PracticeService.getPracticeProgress(language);
      if (progress) {
        setPracticeStreak(progress.current_streak);
        setWordsPracticed(progress.total_words_practiced);

        // Calculate level progress
        const levelStats = calculateLevelProgress(
          vocabularies,
          progress.words_progress,
        );
        setLevelProgress(levelStats);

        // Calculate spaced repetition statistics
        calculateSpacedRepetitionStats(progress.words_progress, settings);
      } else {
        setPracticeStreak(0);
        setWordsPracticed(0);

        const levelStats = calculateLevelProgress(vocabularies, []);
        setLevelProgress(levelStats);

        // Calculate empty stats
        calculateSpacedRepetitionStats([], settings);
      }
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateLevelProgress = (
    vocabularies: Vocabulary[],
    wordsProgress: Array<{ vocabulary_id: string; mastery_level: number }>,
  ): LevelProgress[] => {
    // Get all unique levels from vocabularies
    const levelMap = new Map<string, { total: number; practiced: number }>();

    vocabularies.forEach((vocab) => {
      const level = vocab.level || "Unknown";
      const current = levelMap.get(level) || { total: 0, practiced: 0 };
      current.total += 1;

      // Check if this word has been practiced
      const wordProg = wordsProgress.find(
        (wp) => wp.vocabulary_id === vocab.id,
      );
      if (wordProg && wordProg.mastery_level > 0) {
        current.practiced += 1;
      }

      levelMap.set(level, current);
    });

    // Convert to array and calculate percentages
    const levels: LevelProgress[] = Array.from(levelMap.entries()).map(
      ([level, stats]) => ({
        level,
        total: stats.total,
        practiced: stats.practiced,
        percentage:
          stats.total > 0
            ? Math.round((stats.practiced / stats.total) * 100)
            : 0,
      }),
    );

    // Sort by common CEFR order if applicable
    const levelOrder = [
      "N/A",
      "A1",
      "A2",
      "B1",
      "B2",
      "C1",
      "C2",
      "Basic",
      "Intermediate",
      "Advanced",
      "Beginner",
    ];
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

  const calculateSpacedRepetitionStats = (
    wordsProgress: WordProgress[],
    settings: LearningSettings,
  ) => {
    // Calculate learning stats
    const stats = getLearningStats(wordsProgress, settings);
    setLearningStats(stats);

    // Calculate box distribution
    const distribution = getBoxDistribution(wordsProgress, settings);
    setBoxDistribution(distribution);

    // Get box info
    const info = getBoxInfo(settings);
    setBoxInfo(info);
  };

  const stats = [
    {
      value: totalWords,
      label: t("stats.totalWords"),
      color: "text-teal-600 dark:text-teal-400",
    },
    {
      value: practiceStreak,
      label: t("stats.streak"),
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      value: wordsPracticed,
      label: t("stats.wordsLearned"),
      color: "text-orange-600 dark:text-orange-400",
    },
  ];

  if (loading) {
    return (
      <>
        <TopBar title={t("nav.progress")} showBack={false} />
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--color-text-secondary)]">
            {t("app.loading")}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title={t("nav.progress")} showBack={false} />

      <div className="px-3 pt-4 space-y-3">
        {loading && (
          <div className="text-center py-8 text-[var(--color-text-secondary)]">
            {t("common.loading")}
          </div>
        )}
        {/* Language Selector - Always show if there's at least one language */}
        {availableLanguages.length > 0 && currentLanguage && (
          <Card variant="glass">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                {t("vocabulary.language") || "Language"}
              </label>
              {availableLanguages.length > 1 ? (
                <select
                  value={currentLanguage}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setCurrentLanguage(newLang);
                    // Persist selection to localStorage
                    localStorage.setItem("progress_selected_language", newLang);
                  }}
                  className="w-full px-3 py-1.5 text-sm border border-[var(--color-border-light)] rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-[var(--color-bg-white)] text-[var(--color-text-primary)]"
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang.toUpperCase()}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-1.5 text-sm font-semibold text-[var(--color-text-primary)] bg-[var(--color-bg-white)] rounded-lg border border-[var(--color-border-light)]">
                  {currentLanguage.toUpperCase()}
                </div>
              )}
            </div>
          </Card>
        )}

        {!loading && (
          <>
            {/* Stats Overview */}
            <StatsCard stats={stats} title={t("nav.progress")} />

            {/* Progress Chart and Achievement */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Progress Chart - Real Data */}
              {levelProgress.length > 0 ? (
                <Card variant="glass">
                  <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-2">
                    {t("vocabulary.level")} {t("nav.progress")}
                  </h3>
                  <div className="space-y-2">
                    {levelProgress.map((level) => (
                      <div key={level.level}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                              {level.level}
                            </span>
                            <span className="text-xs text-[var(--color-text-muted)]">
                              ({level.practiced}/{level.total})
                            </span>
                          </div>
                          <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                            {level.percentage}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-white/60 dark:bg-white/10 rounded-full overflow-hidden">
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
                  <div className="text-center py-6">
                    <p className="text-sm text-[var(--color-text-muted)]">
                      No vocabulary data yet. Start adding words to see progress
                      by level!
                    </p>
                  </div>
                </Card>
              )}

              {/* Achievement Card */}
              {practiceStreak > 0 && (
                <Card variant="gradient">
                  <div className="text-center py-1">
                    <div className="text-4xl mb-2">🏆</div>
                    <h3 className="text-lg font-bold mb-1">
                      {practiceStreak} Day {t("stats.streak")}!
                    </h3>
                    <p className="text-sm text-white/90">
                      Keep learning every day 🔥
                    </p>
                  </div>
                </Card>
              )}
            </div>

            {/* Spaced Repetition Section - Only show if there are words practiced */}
            {learningStats && learningStats.totalWords > 0 && (
              <>
                {/* Mastery Overview Card */}
                <Card variant="glass">
                  <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-3">
                    {t("learningProgress.overview")}
                  </h3>
                  <div className="space-y-3">
                    {/* Mastery Percentage - Large Display */}
                    <div className="text-center py-2">
                      <div className="text-5xl font-bold text-teal-600 dark:text-teal-400 mb-1">
                        {learningStats.masteryPercentage}%
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)]">
                        {t("learningProgress.overallMastery")}
                      </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-white/60 dark:bg-slate-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {learningStats.masteredWords}
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {t("learningProgress.mastered")}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-white/60 dark:bg-slate-700/50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {learningStats.learningWords}
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {t("learningProgress.learning")}
                        </p>
                      </div>
                      <div className="text-center p-2 bg-white/60 dark:bg-white/10 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {learningStats.newWords}
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          {t("learningProgress.new")}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Review Queue Card */}
                <Card variant="glass">
                  <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-3">
                    {t("learningProgress.reviewQueue")}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📅</span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                            {t("learningProgress.dueToday")}
                          </p>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {t("learningProgress.readyForReview")}
                          </p>
                        </div>
                      </div>
                      <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {learningStats.wordsDueToday}
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white/60 dark:bg-white/10 rounded-lg">
                      <p className="text-sm text-[var(--color-text-primary)]">
                        {t("learningProgress.averageBoxLevel")}
                      </p>
                      <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                        {learningStats.averageBox.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Leitner Box Distribution Card */}
                <Card variant="glass">
                  <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-3">
                    {t("learningProgress.progressByStage")}
                  </h3>
                  <div className="space-y-2.5">
                    {boxDistribution.map((box) => {
                      const info = boxInfo.find(
                        (b) => b.boxNumber === box.boxNumber,
                      );
                      if (!info) return null;

                      return (
                        <div key={box.boxNumber}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{info.icon}</span>
                              <div>
                                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                                  {info.name}
                                </span>
                                <p className="text-xs text-[var(--color-text-secondary)]">
                                  {box.wordCount} {t("learningProgress.words")}
                                </p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-teal-600 dark:text-teal-400">
                              {box.percentage}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-white/60 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${info.color} rounded-full transition-all duration-500`}
                              style={{ width: `${box.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
};
