/**
 * Spaced Repetition System
 * Main export file for all SR functionality
 */

// Types
export type { SpacedRepetitionAlgorithm, ReviewResult } from "./types";

export {
  addDays,
  isDueForReview,
  getDaysUntilReview,
  BOX_INTERVAL_PRESETS,
} from "./types";

// Algorithm Factory
export {
  getAlgorithm,
  getAlgorithmByType,
  getAllAlgorithms,
  resetAlgorithmInstances,
} from "./algorithmFactory";

// Individual Algorithms
export { SM2Algorithm } from "./algorithms/sm2";
export { ModifiedSM2Algorithm } from "./algorithms/modifiedSm2";
export { SimpleAlgorithm } from "./algorithms/simple";

// Leitner Box Utilities
export type { BoxInfo, BoxDistribution, LearningStats } from "./leitnerBoxes";

export {
  getBoxInfo,
  getBoxDistribution,
  shouldAdvanceBox,
  isWordMastered,
  getWordsInBox,
  getWordsDueToday,
  getDueWordsByBox,
  calculateMasteryPercentage,
  getLearningStats,
} from "./leitnerBoxes";
