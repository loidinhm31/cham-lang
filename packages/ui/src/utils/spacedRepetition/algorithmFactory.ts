/**
 * Algorithm Factory
 * Creates and returns the appropriate spaced repetition algorithm
 * based on user settings
 */

import type { SpacedRepetitionAlgorithm } from "./types";
import type {
  LearningSettings,
  SpacedRepetitionAlgorithm as AlgorithmType,
} from "@cham-lang/shared/types";
import { SM2Algorithm } from "./algorithms/sm2";
import { ModifiedSM2Algorithm } from "./algorithms/modifiedSm2";
import { SimpleAlgorithm } from "./algorithms/simple";

// Singleton instances for each algorithm
let sm2Instance: SM2Algorithm | null = null;
let modifiedSm2Instance: ModifiedSM2Algorithm | null = null;
let simpleInstance: SimpleAlgorithm | null = null;

/**
 * Get the algorithm instance based on settings
 * Uses singleton pattern to avoid creating multiple instances
 */
export function getAlgorithm(
  settings: LearningSettings,
): SpacedRepetitionAlgorithm {
  switch (settings.srAlgorithm) {
    case "sm2":
      if (!sm2Instance) {
        sm2Instance = new SM2Algorithm();
      }
      return sm2Instance;

    case "modifiedsm2":
      if (!modifiedSm2Instance) {
        modifiedSm2Instance = new ModifiedSM2Algorithm();
      }
      return modifiedSm2Instance;

    case "simple":
      if (!simpleInstance) {
        simpleInstance = new SimpleAlgorithm();
      }
      return simpleInstance;

    default:
      // Default to Modified SM-2 if unknown algorithm
      console.warn(
        `Unknown algorithm: ${settings.srAlgorithm}, defaulting to modifiedsm2`,
      );
      if (!modifiedSm2Instance) {
        modifiedSm2Instance = new ModifiedSM2Algorithm();
      }
      return modifiedSm2Instance;
  }
}

/**
 * Get algorithm instance by type (without needing full settings)
 */
export function getAlgorithmByType(
  algorithmType: AlgorithmType,
): SpacedRepetitionAlgorithm {
  switch (algorithmType) {
    case "sm2":
      if (!sm2Instance) {
        sm2Instance = new SM2Algorithm();
      }
      return sm2Instance;

    case "modifiedsm2":
      if (!modifiedSm2Instance) {
        modifiedSm2Instance = new ModifiedSM2Algorithm();
      }
      return modifiedSm2Instance;

    case "simple":
      if (!simpleInstance) {
        simpleInstance = new SimpleAlgorithm();
      }
      return simpleInstance;

    default:
      if (!modifiedSm2Instance) {
        modifiedSm2Instance = new ModifiedSM2Algorithm();
      }
      return modifiedSm2Instance;
  }
}

/**
 * Get all available algorithms for UI display
 */
export function getAllAlgorithms(): SpacedRepetitionAlgorithm[] {
  return [
    new SM2Algorithm(),
    new ModifiedSM2Algorithm(),
    new SimpleAlgorithm(),
  ];
}

/**
 * Reset algorithm instances (useful for testing)
 */
export function resetAlgorithmInstances(): void {
  sm2Instance = null;
  modifiedSm2Instance = null;
  simpleInstance = null;
}
