import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StatsCard, TopBar } from "@/components/molecules";
import { Card } from "@/components/atoms";
import { VocabularyService } from "@/services/vocabulary.service.ts";
import { PracticeService } from "@/services/practice.service.ts";
import type { Vocabulary } from "@/types/vocabulary.ts";

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

      // Load practice progress
      const progress = await PracticeService.getPracticeProgress(language);
      console.log("pr", progress);
      if (progress) {
        setPracticeStreak(progress.current_streak);
        setWordsPracticed(progress.total_words_practiced);

        // Calculate level progress
        const levelStats = calculateLevelProgress(
          vocabularies,
          progress.words_progress,
        );
        setLevelProgress(levelStats);
      } else {
        setPracticeStreak(0);
        setWordsPracticed(0);

        const levelStats = calculateLevelProgress(vocabularies, []);
        setLevelProgress(levelStats);
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
    const levelOrder = ["N/A", "A1", "A2", "B1", "B2", "C1", "C2", "Basic", "Intermediate", "Advanced", "Beginner"];
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
    { value: totalWords, label: t("stats.totalWords"), color: "text-teal-600" },
    {
      value: practiceStreak,
      label: t("stats.streak"),
      color: "text-amber-600",
    },
    {
      value: wordsPracticed,
      label: t("stats.wordsLearned"),
      color: "text-orange-600",
    },
  ];

  if (loading) {
    return (
      <>
        <TopBar title={t("nav.progress")} showBack={false} />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">{t("app.loading")}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title={t("nav.progress")} showBack={false} />

      <div className="px-3 pt-4 space-y-3">
        {loading && (
          <div className="text-center py-8 text-gray-600">
            {t("common.loading")}
          </div>
        )}
        {/* Language Selector - Always show if there's at least one language */}
        {availableLanguages.length > 0 && currentLanguage && (
          <Card variant="glass">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">
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
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang.toUpperCase()}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-white rounded-lg border border-gray-200">
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
                  <h3 className="text-base font-bold text-gray-800 mb-2">
                    {t("vocabulary.level")} {t("nav.progress")}
                  </h3>
                  <div className="space-y-2">
                    {levelProgress.map((level) => (
                      <div key={level.level}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-gray-700">
                              {level.level}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({level.practiced}/{level.total})
                            </span>
                          </div>
                          <span className="text-xs font-bold text-teal-600">
                            {level.percentage}%
                          </span>
                        </div>
                        <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
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
                    <p className="text-sm text-gray-600">
                      No vocabulary data yet. Start adding words to see progress by
                      level!
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
                    <p className="text-sm text-white/90">Keep learning every day 🔥</p>
                  </div>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};
