/**
 * Leitner Box System Manager
 * Utilities for working with Leitner boxes
 */

import type { WordProgress } from "@cham-lang/shared/types";
import type { LearningSettings } from "@cham-lang/shared/types";
import { BOX_INTERVAL_PRESETS } from "@cham-lang/shared/types";

/**
 * Box metadata for UI display
 */
export interface BoxInfo {
  boxNumber: number;
  name: string;
  description: string;
  intervalDays: number;
  color: string; // Tailwind color class
  icon: string; // Emoji icon
}

/**
 * Get metadata for all boxes based on settings
 */
export function getBoxInfo(settings: LearningSettings): BoxInfo[] {
  const intervals = BOX_INTERVAL_PRESETS[settings.leitnerBoxCount];

  // 3-box system
  if (settings.leitnerBoxCount === 3) {
    return [
      {
        boxNumber: 1,
        name: "Learning",
        description: "New and difficult words",
        intervalDays: intervals[0],
        color: "bg-red-500",
        icon: "📚",
      },
      {
        boxNumber: 2,
        name: "Review",
        description: "Words in progress",
        intervalDays: intervals[1],
        color: "bg-yellow-500",
        icon: "📖",
      },
      {
        boxNumber: 3,
        name: "Mastered",
        description: "Well-known words",
        intervalDays: intervals[2],
        color: "bg-green-500",
        icon: "✅",
      },
    ];
  }

  // 5-box system
  if (settings.leitnerBoxCount === 5) {
    return [
      {
        boxNumber: 1,
        name: "New",
        description: "Brand new words",
        intervalDays: intervals[0],
        color: "bg-red-500",
        icon: "🆕",
      },
      {
        boxNumber: 2,
        name: "Learning",
        description: "Getting familiar",
        intervalDays: intervals[1],
        color: "bg-orange-500",
        icon: "📚",
      },
      {
        boxNumber: 3,
        name: "Review",
        description: "Regular practice",
        intervalDays: intervals[2],
        color: "bg-yellow-500",
        icon: "📖",
      },
      {
        boxNumber: 4,
        name: "Familiar",
        description: "Almost mastered",
        intervalDays: intervals[3],
        color: "bg-blue-500",
        icon: "👍",
      },
      {
        boxNumber: 5,
        name: "Mastered",
        description: "Well-known words",
        intervalDays: intervals[4],
        color: "bg-green-500",
        icon: "✅",
      },
    ];
  }

  // 7-box system
  return [
    {
      boxNumber: 1,
      name: "New",
      description: "Brand new words",
      intervalDays: intervals[0],
      color: "bg-red-600",
      icon: "🆕",
    },
    {
      boxNumber: 2,
      name: "Beginning",
      description: "First attempts",
      intervalDays: intervals[1],
      color: "bg-red-400",
      icon: "🌱",
    },
    {
      boxNumber: 3,
      name: "Learning",
      description: "Getting familiar",
      intervalDays: intervals[2],
      color: "bg-orange-500",
      icon: "📚",
    },
    {
      boxNumber: 4,
      name: "Review",
      description: "Regular practice",
      intervalDays: intervals[3],
      color: "bg-yellow-500",
      icon: "📖",
    },
    {
      boxNumber: 5,
      name: "Familiar",
      description: "Comfortable",
      intervalDays: intervals[4],
      color: "bg-blue-500",
      icon: "👍",
    },
    {
      boxNumber: 6,
      name: "Strong",
      description: "Almost mastered",
      intervalDays: intervals[5],
      color: "bg-green-500",
      icon: "💪",
    },
    {
      boxNumber: 7,
      name: "Mastered",
      description: "Fully mastered",
      intervalDays: intervals[6],
      color: "bg-green-700",
      icon: "✅",
    },
  ];
}

/**
 * Get distribution of words across boxes
 */
export interface BoxDistribution {
  boxNumber: number;
  wordCount: number;
  percentage: number;
}

export function getBoxDistribution(
  wordsProgress: WordProgress[],
  settings: LearningSettings,
): BoxDistribution[] {
  const total = wordsProgress.length;
  const distribution: BoxDistribution[] = [];

  for (let boxNumber = 1; boxNumber <= settings.leitnerBoxCount; boxNumber++) {
    const wordCount = wordsProgress.filter(
      (wp) => wp.leitnerBox === boxNumber,
    ).length;
    distribution.push({
      boxNumber,
      wordCount,
      percentage: total > 0 ? Math.round((wordCount / total) * 100) : 0,
    });
  }

  return distribution;
}

/**
 * Check if word should advance to next box
 */
export function shouldAdvanceBox(
  wordProgress: WordProgress,
  settings: LearningSettings,
): boolean {
  return (
    wordProgress.consecutiveCorrectCount >=
      settings.consecutiveCorrectRequired &&
    wordProgress.leitnerBox < settings.leitnerBoxCount
  );
}

/**
 * Check if word is in final box (mastered)
 */
export function isWordMastered(
  wordProgress: WordProgress,
  settings: LearningSettings,
): boolean {
  return wordProgress.leitnerBox === settings.leitnerBoxCount;
}

/**
 * Get words in a specific box
 */
export function getWordsInBox(
  wordsProgress: WordProgress[],
  boxNumber: number,
): WordProgress[] {
  return wordsProgress.filter((wp) => wp.leitnerBox === boxNumber);
}

/**
 * Get words that are due for review today
 * Excludes words that have completed all three modes in the current cycle
 */
export function getWordsDueToday(
  wordsProgress: WordProgress[],
  currentDate: Date = new Date(),
): WordProgress[] {
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);

  return wordsProgress.filter((wp) => {
    const reviewDate = new Date(wp.nextReviewDate);
    reviewDate.setHours(0, 0, 0, 0);
    return reviewDate <= today;
  });
}

/**
 * Get words due for review grouped by box
 */
export function getDueWordsByBox(
  wordsProgress: WordProgress[],
  settings: LearningSettings,
  currentDate: Date = new Date(),
): Map<number, WordProgress[]> {
  const dueWords = getWordsDueToday(wordsProgress, currentDate);
  const byBox = new Map<number, WordProgress[]>();

  for (let boxNumber = 1; boxNumber <= settings.leitnerBoxCount; boxNumber++) {
    const wordsInBox = dueWords.filter((wp) => wp.leitnerBox === boxNumber);
    byBox.set(boxNumber, wordsInBox);
  }

  return byBox;
}

/**
 * Calculate overall mastery percentage
 */
export function calculateMasteryPercentage(
  wordsProgress: WordProgress[],
  settings: LearningSettings,
): number {
  if (wordsProgress.length === 0) return 0;

  const totalBoxes = settings.leitnerBoxCount;
  const sumOfBoxLevels = wordsProgress.reduce(
    (sum, wp) => sum + wp.leitnerBox,
    0,
  );
  const maxPossible = wordsProgress.length * totalBoxes;

  return Math.round((sumOfBoxLevels / maxPossible) * 100);
}

/**
 * Get summary statistics for display
 */
export interface LearningStats {
  totalWords: number;
  wordsDueToday: number;
  masteredWords: number;
  learningWords: number;
  newWords: number;
  averageBox: number;
  masteryPercentage: number;
}

export function getLearningStats(
  wordsProgress: WordProgress[],
  settings: LearningSettings,
  currentDate: Date = new Date(),
): LearningStats {
  const totalWords = wordsProgress.length;
  const wordsDueToday = getWordsDueToday(wordsProgress, currentDate).length;
  const masteredWords = wordsProgress.filter((wp) =>
    isWordMastered(wp, settings),
  ).length;
  const newWords = wordsProgress.filter((wp) => wp.leitnerBox === 1).length;
  const learningWords = totalWords - masteredWords - newWords;

  const sumOfBoxes = wordsProgress.reduce((sum, wp) => sum + wp.leitnerBox, 0);
  const averageBox = totalWords > 0 ? sumOfBoxes / totalWords : 0;

  const masteryPercentage = calculateMasteryPercentage(wordsProgress, settings);

  return {
    totalWords,
    wordsDueToday,
    masteredWords,
    learningWords,
    newWords,
    averageBox: Math.round(averageBox * 10) / 10,
    masteryPercentage,
  };
}
