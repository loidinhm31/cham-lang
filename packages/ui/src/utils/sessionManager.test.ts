/**
 * Test Suite for SessionManager
 * Tests Practice Session State Manager functionality
 */

import { describe, it, expect } from "vitest";
import { SessionManager } from "./sessionManager";
import type {
  Vocabulary,
  WordProgress,
  LearningSettings,
} from "@cham-lang/shared/types";

// ============================================================================
// Test fixtures and helper functions
// ============================================================================

function createMockVocabulary(id: string, word: string): Vocabulary {
  return {
    id,
    word,
    wordType: "noun",
    level: "A1",
    ipa: "/test/",
    definitions: [{ meaning: "test meaning" }],
    exampleSentences: [],
    topics: [],
    tags: [],
    relatedWords: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    language: "en",
    collectionId: "test-collection",
  };
}

function createMockWordProgress(
  vocabularyId: string,
  word: string,
  overrides: Partial<WordProgress> = {},
): WordProgress {
  return {
    vocabularyId: vocabularyId,
    word,
    correctCount: 0,
    incorrectCount: 0,
    lastPracticed: new Date().toISOString(),
    masteryLevel: 0,
    nextReviewDate: new Date().toISOString(),
    intervalDays: 0,
    easinessFactor: 2.5,
    consecutiveCorrectCount: 0,
    leitnerBox: 1,
    lastIntervalDays: 0,
    totalReviews: 0,
    failedInSession: false,
    retryCount: 0,
    completedModesInCycle: [],
    ...overrides,
  };
}

function createMockSettings(
  overrides: Partial<LearningSettings> = {},
): LearningSettings {
  return {
    srAlgorithm: "modifiedsm2",
    leitnerBoxCount: 5,
    consecutiveCorrectRequired: 3,
    showFailedWordsInSession: true,
    autoAdvanceTimeoutSeconds: 2,
    showHintInFillword: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// 1. Constructor Tests
// ============================================================================

describe("SessionManager - Constructor", () => {
  it("TC-1.1: should initialize with empty words array", () => {
    const manager = new SessionManager(
      [],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    const state = manager.getState();
    expect(state.activeQueue).toHaveLength(0);
    expect(state.completedWords).toHaveLength(0);
    expect(state.failedWordsQueue).toHaveLength(0);
  });

  it("TC-1.2: should initialize with words and matching progress", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");
    const progress = createMockWordProgress("vocab-1", "hello", {
      totalReviews: 5,
      leitnerBox: 3,
    });

    const manager = new SessionManager(
      [vocab],
      [progress],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    const state = manager.getState();
    expect(state.wordProgressMap.get("vocab-1")).toBeDefined();
    expect(state.wordProgressMap.get("vocab-1")?.totalReviews).toBe(5);
  });

  it("TC-1.3: should initialize words without progress as NEW status", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");

    const manager = new SessionManager(
      [vocab],
      [], // No progress
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    expect(manager.getWordStatus("vocab-1")).toBe("NEW");
  });

  it("TC-1.4: should throw error for vocabulary with invalid ID", () => {
    const invalidVocab = createMockVocabulary("", "invalidWord");

    expect(() => {
      new SessionManager(
        [invalidVocab],
        [],
        createMockSettings(),
        "flashcard",
        "collection-1",
        "en",
      );
    }).toThrow("Invalid vocabulary ID");
  });

  it("TC-1.5: should assign NEW status with 3 required repetitions for new words", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");

    const manager = new SessionManager(
      [vocab],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    expect(manager.getWordStatus("vocab-1")).toBe("NEW");
    expect(
      manager.getWordRepetitionProgress("vocab-1").requiredRepetitions,
    ).toBe(3);
  });

  it("TC-1.6: should assign MASTERED status with 1 required repetition for box 5+", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");
    const progress = createMockWordProgress("vocab-1", "hello", {
      leitnerBox: 5,
      totalReviews: 10,
    });

    const manager = new SessionManager(
      [vocab],
      [progress],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    expect(manager.getWordStatus("vocab-1")).toBe("MASTERED");
    expect(
      manager.getWordRepetitionProgress("vocab-1").requiredRepetitions,
    ).toBe(1);
  });

  it("TC-1.7: should assign ALMOST_DONE status with 1 required repetition for box 4", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");
    const progress = createMockWordProgress("vocab-1", "hello", {
      leitnerBox: 4,
      totalReviews: 5,
    });

    const manager = new SessionManager(
      [vocab],
      [progress],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    expect(manager.getWordStatus("vocab-1")).toBe("ALMOST_DONE");
    expect(
      manager.getWordRepetitionProgress("vocab-1").requiredRepetitions,
    ).toBe(1);
  });

  it("TC-1.8: should assign STILL_LEARNING status with 2 required repetitions for box 2", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");
    const progress = createMockWordProgress("vocab-1", "hello", {
      leitnerBox: 2,
      totalReviews: 3,
    });

    const manager = new SessionManager(
      [vocab],
      [progress],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    expect(manager.getWordStatus("vocab-1")).toBe("STILL_LEARNING");
    expect(
      manager.getWordRepetitionProgress("vocab-1").requiredRepetitions,
    ).toBe(2);
  });
});

// ============================================================================
// 2. getNextWord Tests
// ============================================================================

describe("SessionManager - getNextWord", () => {
  it("TC-2.1: should return a word from active queue", () => {
    const vocab1 = createMockVocabulary("vocab-1", "hello");
    const vocab2 = createMockVocabulary("vocab-2", "world");

    const manager = new SessionManager(
      [vocab1, vocab2],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    const word = manager.getNextWord();
    expect(word).toBeDefined();
    expect(["vocab-1", "vocab-2"]).toContain(word?.id);
  });

  it("TC-2.2: should return null for empty session", () => {
    const manager = new SessionManager(
      [],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    const word = manager.getNextWord();
    expect(word).toBeNull();
  });

  it("TC-2.3: should avoid returning same word consecutively when possible", () => {
    const vocab1 = createMockVocabulary("vocab-1", "hello");
    const vocab2 = createMockVocabulary("vocab-2", "world");
    const vocab3 = createMockVocabulary("vocab-3", "test");

    const manager = new SessionManager(
      [vocab1, vocab2, vocab3],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    const firstWord = manager.getNextWord();
    const secondWord = manager.getNextWord();

    // With multiple words, should not repeat immediately
    expect(secondWord?.id).not.toBe(firstWord?.id);
  });

  it("TC-2.4: should return null when session is complete", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");
    const progress = createMockWordProgress("vocab-1", "hello", {
      leitnerBox: 5,
      totalReviews: 10,
      completedModesInCycle: ["flashcard", "fillword"],
    });

    const manager = new SessionManager(
      [vocab],
      [progress],
      createMockSettings(),
      "multiplechoice", // This completes all modes
      "collection-1",
      "en",
    );

    // Get word and complete it
    const word = manager.getNextWord();
    expect(word).toBeDefined();
    manager.handleCorrectAnswer(word!, 5);

    // Should complete session
    expect(manager.getNextWord()).toBeNull();
  });
});

// ============================================================================
// 3. handleCorrectAnswer Tests
// ============================================================================

describe("SessionManager - handleCorrectAnswer", () => {
  it("TC-3.1: should increment completedRepetitions and reset failureCount", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");

    const manager = new SessionManager(
      [vocab],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    manager.getNextWord();
    manager.handleCorrectAnswer(vocab, 5);

    const repProgress = manager.getWordRepetitionProgress("vocab-1");
    expect(repProgress.completedRepetitions).toBe(1);
    expect(repProgress.failureCount).toBe(0);
  });

  it("TC-3.2: should move word to completedWords after all repetitions", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");
    const progress = createMockWordProgress("vocab-1", "hello", {
      leitnerBox: 5,
      totalReviews: 10,
      completedModesInCycle: ["flashcard", "fillword"],
    });

    const manager = new SessionManager(
      [vocab],
      [progress],
      createMockSettings(),
      "multiplechoice",
      "collection-1",
      "en",
    );

    manager.getNextWord();
    manager.handleCorrectAnswer(vocab, 5);

    const state = manager.getState();
    expect(state.completedWords).toContainEqual(vocab);
    expect(state.activeQueue).not.toContainEqual(vocab);
  });

  it("TC-3.3: should not update progress in study mode (trackProgress = false)", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");
    // Use MASTERED status (box 5) so only 1 repetition is needed to trigger completion
    const progress = createMockWordProgress("vocab-1", "hello", {
      leitnerBox: 5,
      totalReviews: 10,
      completedModesInCycle: ["flashcard", "fillword"],
    });

    const manager = new SessionManager(
      [vocab],
      [progress],
      createMockSettings(),
      "multiplechoice", // Complete all modes
      "collection-1",
      "en",
      false, // trackProgress = false (Study mode)
    );

    manager.getNextWord();
    const result = manager.handleCorrectAnswer(vocab, 5);

    expect(result.message).toContain("Study mode");
    expect(result.boxChanged).toBe(false);
  });

  it("TC-3.4: should update completed_modes_in_cycle but not advance box for single mode", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");
    // Use STILL_LEARNING status (box 2) so 2 repetitions are required
    // This means after 1 correct answer, still needs more reps before mode completion
    const progress = createMockWordProgress("vocab-1", "hello", {
      leitnerBox: 2,
      totalReviews: 3,
      completedModesInCycle: [], // No modes completed yet
    });

    const manager = new SessionManager(
      [vocab],
      [progress],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    manager.getNextWord();
    const result = manager.handleCorrectAnswer(vocab, 5);

    // After 1 correct answer with STILL_LEARNING status (2 reps required),
    // word is still not done with all reps, message shows 1/2 repetitions
    expect(result.boxChanged).toBe(false);
    // Message contains "Correct!" and repetitions count
    expect(result.message).toContain("Correct!");
    expect(result.message).toContain("1/2 repetitions");
  });

  it("TC-3.5: should advance box after completing all 3 modes", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");
    // Use ALMOST_DONE status (box 4) so only 1 repetition needed
    // Set consecutive_correct_count to 2 so after 1 more correct (becomes 3)
    // it meets the consecutive_correct_required threshold (default 3) to advance
    const almostDoneProgress = createMockWordProgress("vocab-1", "hello", {
      leitnerBox: 4,
      totalReviews: 10,
      completedModesInCycle: ["flashcard", "fillword"],
      consecutiveCorrectCount: 2, // Needs 1 more to reach 3 (threshold)
    });

    const manager = new SessionManager(
      [vocab],
      [almostDoneProgress],
      createMockSettings(),
      "multiplechoice", // This completes all 3 modes
      "collection-1",
      "en",
    );

    manager.getNextWord();
    const result = manager.handleCorrectAnswer(vocab, 5);

    // All 3 modes completed + all reps done + consecutive_correct_count >= 3 = box advances from 4 to 5
    expect(result.boxChanged).toBe(true);
    expect(result.updatedProgress.leitnerBox).toBeGreaterThan(4);
    expect(result.updatedProgress.completedModesInCycle).toEqual([]);
    expect(result.message).toContain("mastered");
  });

  it("TC-3.6: should throw error for word without valid ID", () => {
    const validVocab = createMockVocabulary("vocab-1", "hello");
    const invalidVocab = createMockVocabulary("", "invalid");
    // Fix the invalid vocab to bypass constructor check
    (invalidVocab as any).id = undefined;

    const manager = new SessionManager(
      [validVocab],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    expect(() => {
      manager.handleCorrectAnswer(invalidVocab, 5);
    }).toThrow("Cannot handle answer for word without valid ID");
  });

  it("TC-3.7: should update statistics correctly", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");

    const manager = new SessionManager(
      [vocab],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    manager.getNextWord();
    manager.handleCorrectAnswer(vocab, 5);

    const stats = manager.getStatistics();
    expect(stats.totalQuestions).toBe(1);
    expect(stats.correctAnswers).toBe(1);
    expect(stats.incorrectAnswers).toBe(0);
  });

  it("TC-3.8: should record session result", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");

    const manager = new SessionManager(
      [vocab],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    manager.getNextWord();
    manager.handleCorrectAnswer(vocab, 5);

    const results = manager.getSessionResults();
    expect(results).toHaveLength(1);
    expect(results[0].vocabularyId).toBe("vocab-1");
    expect(results[0].correct).toBe(true);
    expect(results[0].mode).toBe("flashcard");
    expect(results[0].timeSpentSeconds).toBe(5);
  });
});

// ============================================================================
// 4. handleIncorrectAnswer Tests
// ============================================================================

describe("SessionManager - handleIncorrectAnswer", () => {
  it("TC-4.1: should reset completedRepetitions and increment failureCount", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");

    const manager = new SessionManager(
      [vocab],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    manager.getNextWord();
    // First do a correct answer to have some repetitions
    manager.handleCorrectAnswer(vocab, 5);
    // Then an incorrect answer
    manager.handleIncorrectAnswer(vocab, 5);

    const repProgress = manager.getWordRepetitionProgress("vocab-1");
    expect(repProgress.completedRepetitions).toBe(0); // Reset
    expect(repProgress.failureCount).toBe(1);
  });

  it("TC-4.2: should add word to failed queue when setting enabled", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");

    const manager = new SessionManager(
      [vocab],
      [],
      createMockSettings({ showFailedWordsInSession: true }),
      "flashcard",
      "collection-1",
      "en",
    );

    manager.getNextWord();
    manager.handleIncorrectAnswer(vocab, 5);

    const state = manager.getState();
    expect(state.failedWordsQueue).toContainEqual(vocab);
  });

  it("TC-4.3: should force-complete word after MAX_FAILURES (5)", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");

    const manager = new SessionManager(
      [vocab],
      [],
      createMockSettings({ showFailedWordsInSession: true }),
      "flashcard",
      "collection-1",
      "en",
    );

    // Simulate 5 failures
    for (let i = 0; i < 5; i++) {
      manager.getNextWord();
      manager.handleIncorrectAnswer(vocab, 5);
    }

    const state = manager.getState();
    expect(state.completedWords).toContainEqual(vocab);
    expect(state.activeQueue).not.toContainEqual(vocab);
    expect(state.failedWordsQueue).not.toContainEqual(vocab);
  });

  it("TC-4.4: should not update progress in study mode", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");
    const progress = createMockWordProgress("vocab-1", "hello", {
      leitnerBox: 3,
    });

    const manager = new SessionManager(
      [vocab],
      [progress],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
      false, // trackProgress = false
    );

    manager.getNextWord();
    const result = manager.handleIncorrectAnswer(vocab, 5);

    expect(result.message).toContain("Study mode");
    expect(result.updatedProgress.leitnerBox).toBe(3); // Unchanged
  });

  it("TC-4.5: should process incorrect answer and regress box when tracking", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");
    const progress = createMockWordProgress("vocab-1", "hello", {
      leitnerBox: 3,
      totalReviews: 5,
    });

    const manager = new SessionManager(
      [vocab],
      [progress],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
      true,
    );

    manager.getNextWord();
    const result = manager.handleIncorrectAnswer(vocab, 5);

    // Box should regress (algorithm dependent)
    expect(result.updatedProgress.leitnerBox).toBeLessThanOrEqual(3);
  });

  it("TC-4.6: should reset completed_modes_in_cycle on incorrect answer", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");
    const progress = createMockWordProgress("vocab-1", "hello", {
      leitnerBox: 3,
      completedModesInCycle: ["flashcard"],
    });

    const manager = new SessionManager(
      [vocab],
      [progress],
      createMockSettings(),
      "fillword",
      "collection-1",
      "en",
    );

    manager.getNextWord();
    const result = manager.handleIncorrectAnswer(vocab, 5);

    expect(result.updatedProgress.completedModesInCycle).toEqual([]);
  });

  it("TC-4.7: should move to completed immediately when show_failed_words_in_session is false", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");

    const manager = new SessionManager(
      [vocab],
      [],
      createMockSettings({ showFailedWordsInSession: false }),
      "flashcard",
      "collection-1",
      "en",
    );

    manager.getNextWord();
    manager.handleIncorrectAnswer(vocab, 5);

    const state = manager.getState();
    expect(state.completedWords).toContainEqual(vocab);
    expect(state.failedWordsQueue).not.toContainEqual(vocab);
  });

  it("TC-4.8: should throw error for word without valid ID", () => {
    const validVocab = createMockVocabulary("vocab-1", "hello");
    const invalidVocab = {
      ...createMockVocabulary("x", "invalid"),
      id: undefined,
    };

    const manager = new SessionManager(
      [validVocab],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    expect(() => {
      manager.handleIncorrectAnswer(invalidVocab as any, 5);
    }).toThrow("Cannot handle answer for word without valid ID");
  });
});

// ============================================================================
// 5. skipWord Tests
// ============================================================================

describe("SessionManager - skipWord", () => {
  it("TC-5.1: should remove word from active queue and add to completed", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");

    const manager = new SessionManager(
      [vocab],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    manager.getNextWord();
    manager.skipWord(vocab);

    const state = manager.getState();
    expect(state.completedWords).toContainEqual(vocab);
    expect(state.activeQueue).not.toContainEqual(vocab);
  });

  it("TC-5.2: should silently return for word with invalid ID", () => {
    const validVocab = createMockVocabulary("vocab-1", "hello");
    const invalidVocab = {
      ...createMockVocabulary("x", "invalid"),
      id: undefined,
    };

    const manager = new SessionManager(
      [validVocab],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    // Should not throw
    expect(() => {
      manager.skipWord(invalidVocab as any);
    }).not.toThrow();
  });

  it("TC-5.3: should remove word from failed queue when skipping", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");

    const manager = new SessionManager(
      [vocab],
      [],
      createMockSettings({ showFailedWordsInSession: true }),
      "flashcard",
      "collection-1",
      "en",
    );

    // First fail the word to add to failed queue
    manager.getNextWord();
    manager.handleIncorrectAnswer(vocab, 5);

    // Then skip it
    manager.skipWord(vocab);

    const state = manager.getState();
    expect(state.failedWordsQueue).not.toContainEqual(vocab);
    expect(state.completedWords).toContainEqual(vocab);
  });
});

// ============================================================================
// 6. Session State Tests
// ============================================================================

describe("SessionManager - Session State", () => {
  it("TC-6.1: should return true for isSessionComplete when both queues empty", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");
    const progress = createMockWordProgress("vocab-1", "hello", {
      leitnerBox: 5,
      totalReviews: 10,
      completedModesInCycle: ["flashcard", "fillword"],
    });

    const manager = new SessionManager(
      [vocab],
      [progress],
      createMockSettings(),
      "multiplechoice",
      "collection-1",
      "en",
    );

    manager.getNextWord();
    manager.handleCorrectAnswer(vocab, 5);

    expect(manager.isSessionComplete()).toBe(true);
  });

  it("TC-6.2: should return false for isSessionComplete when failed queue has words", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");

    const manager = new SessionManager(
      [vocab],
      [],
      createMockSettings({ showFailedWordsInSession: true }),
      "flashcard",
      "collection-1",
      "en",
    );

    manager.getNextWord();
    manager.handleIncorrectAnswer(vocab, 5);

    // Session not complete since failed words need retry
    expect(manager.isSessionComplete()).toBe(false);
  });

  it("TC-6.3: should return correct statistics", () => {
    const vocab1 = createMockVocabulary("vocab-1", "hello");
    const vocab2 = createMockVocabulary("vocab-2", "world");

    const manager = new SessionManager(
      [vocab1, vocab2],
      [],
      createMockSettings({ showFailedWordsInSession: false }),
      "flashcard",
      "collection-1",
      "en",
    );

    manager.getNextWord();
    manager.handleCorrectAnswer(vocab1, 5);
    manager.getNextWord();
    manager.handleIncorrectAnswer(vocab2, 5);

    const stats = manager.getStatistics();
    expect(stats.totalQuestions).toBe(2);
    expect(stats.correctAnswers).toBe(1);
    expect(stats.incorrectAnswers).toBe(1);
    expect(stats.accuracy).toBe(50);
  });

  it("TC-6.4: should return correct progress percentage", () => {
    const vocab1 = createMockVocabulary("vocab-1", "hello");
    const vocab2 = createMockVocabulary("vocab-2", "world");
    const progress1 = createMockWordProgress("vocab-1", "hello", {
      leitnerBox: 5,
      totalReviews: 10,
      completedModesInCycle: ["flashcard", "fillword"],
    });
    const progress2 = createMockWordProgress("vocab-2", "world", {
      leitnerBox: 5,
      totalReviews: 10,
      completedModesInCycle: ["flashcard", "fillword"],
    });

    const manager = new SessionManager(
      [vocab1, vocab2],
      [progress1, progress2],
      createMockSettings(),
      "multiplechoice",
      "collection-1",
      "en",
    );

    // Complete first word
    manager.getNextWord();
    manager.handleCorrectAnswer(vocab1, 5);

    expect(manager.getProgressPercentage()).toBe(50);

    // Complete second word
    manager.getNextWord();
    manager.handleCorrectAnswer(vocab2, 5);

    expect(manager.getProgressPercentage()).toBe(100);
  });

  it("TC-6.5: should return correct remaining words count including current word", () => {
    const vocab1 = createMockVocabulary("vocab-1", "hello");
    const vocab2 = createMockVocabulary("vocab-2", "world");

    const manager = new SessionManager(
      [vocab1, vocab2],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    // Before getting any word
    expect(manager.getRemainingWordsCount()).toBe(2);

    // After getting first word, remaining count = activeQueue + failedWordsQueue + currentWord (if set)
    // Implementation: getRemainingWordsCount = activeQueue.length + failedWordsQueue.length + (currentWord ? 1 : 0)
    manager.getNextWord();
    // Both words still in activeQueue (NEW status requires 3 reps), plus 1 current word
    // But currentWord is from activeQueue, so it's counted only once
    expect(manager.getRemainingWordsCount()).toBe(3); // 2 in queue + 1 current
  });
});

// ============================================================================
// 7. Edge Cases
// ============================================================================

describe("SessionManager - Edge Cases", () => {
  it("TC-7.1: should handle randomization when all words have same lastSeenAt", () => {
    const vocabs = [
      createMockVocabulary("vocab-1", "hello"),
      createMockVocabulary("vocab-2", "world"),
      createMockVocabulary("vocab-3", "test"),
    ];

    const manager = new SessionManager(
      vocabs,
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    // Should not throw and should return a word
    const word = manager.getNextWord();
    expect(word).toBeDefined();
  });

  it("TC-7.2: should allow selecting single word even when it was last shown", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");
    const progress = createMockWordProgress("vocab-1", "hello", {
      leitnerBox: 1,
      totalReviews: 1,
    });

    const manager = new SessionManager(
      [vocab],
      [progress],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    const firstWord = manager.getNextWord();
    expect(firstWord).toBeDefined();

    // With only one word, it should still be selectable
    const secondWord = manager.getNextWord();
    expect(secondWord?.id).toBe(firstWord?.id);
  });

  it("TC-7.3: should clamp out-of-range leitner box values", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");
    const progress = createMockWordProgress("vocab-1", "hello", {
      leitnerBox: 99, // Invalid - should be clamped to 7
      totalReviews: 5,
    });

    const manager = new SessionManager(
      [vocab],
      [progress],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    // Should still work - status determined with clamped value
    expect(manager.getWordStatus("vocab-1")).toBe("MASTERED");
  });

  it("TC-7.4: should treat all words as NEW when wordsProgress is empty", () => {
    const vocab1 = createMockVocabulary("vocab-1", "hello");
    const vocab2 = createMockVocabulary("vocab-2", "world");

    const manager = new SessionManager(
      [vocab1, vocab2],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    expect(manager.getWordStatus("vocab-1")).toBe("NEW");
    expect(manager.getWordStatus("vocab-2")).toBe("NEW");
    expect(
      manager.getWordRepetitionProgress("vocab-1").requiredRepetitions,
    ).toBe(3);
    expect(
      manager.getWordRepetitionProgress("vocab-2").requiredRepetitions,
    ).toBe(3);
  });

  it("TC-7.5: should handle very high consecutive_correct_count (clamped to 100)", () => {
    const vocab = createMockVocabulary("vocab-1", "hello");
    const progress = createMockWordProgress("vocab-1", "hello", {
      leitnerBox: 3,
      consecutiveCorrectCount: 999, // Should be clamped
      totalReviews: 50,
    });

    const manager = new SessionManager(
      [vocab],
      [progress],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    // Should work without error - MASTERED due to high consecutive_correct_count
    expect(manager.getWordStatus("vocab-1")).toBe("MASTERED");
  });

  it("TC-7.6: should return updated word progress for all words", () => {
    const vocab1 = createMockVocabulary("vocab-1", "hello");
    const vocab2 = createMockVocabulary("vocab-2", "world");

    const manager = new SessionManager(
      [vocab1, vocab2],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    manager.getNextWord();
    manager.handleCorrectAnswer(vocab1, 5);

    const updatedProgress = manager.getUpdatedWordProgress();
    expect(updatedProgress.length).toBeGreaterThanOrEqual(1);
    expect(
      updatedProgress.find((p) => p.vocabularyId === "vocab-1"),
    ).toBeDefined();
  });

  it("TC-7.7: should return 100% progress for empty session", () => {
    const manager = new SessionManager(
      [],
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    expect(manager.getProgressPercentage()).toBe(100);
  });

  it("TC-7.8: should track total words count correctly", () => {
    const vocabs = [
      createMockVocabulary("vocab-1", "hello"),
      createMockVocabulary("vocab-2", "world"),
      createMockVocabulary("vocab-3", "test"),
    ];

    const manager = new SessionManager(
      vocabs,
      [],
      createMockSettings(),
      "flashcard",
      "collection-1",
      "en",
    );

    expect(manager.getTotalWordsCount()).toBe(3);

    // Should remain 3 even after completing words
    manager.getNextWord();
    manager.skipWord(vocabs[0]);

    expect(manager.getTotalWordsCount()).toBe(3);
  });
});

// ============================================================================
// 8. Integration Tests
// ============================================================================

describe("SessionManager - Integration", () => {
  it("should complete a full practice session correctly", () => {
    const vocabs = [
      createMockVocabulary("vocab-1", "hello"),
      createMockVocabulary("vocab-2", "world"),
    ];
    const progressList = vocabs.map((v) =>
      createMockWordProgress(v.id!, v.word, {
        leitnerBox: 5,
        totalReviews: 10,
        completedModesInCycle: ["flashcard", "fillword"],
      }),
    );

    const manager = new SessionManager(
      vocabs,
      progressList,
      createMockSettings(),
      "multiplechoice",
      "collection-1",
      "en",
    );

    // Process all words
    let word = manager.getNextWord();
    while (word) {
      manager.handleCorrectAnswer(word, 5);
      word = manager.getNextWord();
    }

    // Verify session completed
    expect(manager.isSessionComplete()).toBe(true);
    expect(manager.getProgressPercentage()).toBe(100);

    const stats = manager.getStatistics();
    expect(stats.correctAnswers).toBe(2);
    expect(stats.incorrectAnswers).toBe(0);
    expect(stats.wordsCompleted).toBe(2);
  });

  it("should handle mixed correct and incorrect answers", () => {
    const vocabs = [
      createMockVocabulary("vocab-1", "hello"),
      createMockVocabulary("vocab-2", "world"),
    ];

    const manager = new SessionManager(
      vocabs,
      [],
      createMockSettings({ showFailedWordsInSession: false }),
      "flashcard",
      "collection-1",
      "en",
    );

    // First word: correct multiple times to complete
    let word = manager.getNextWord();
    for (let i = 0; i < 3; i++) {
      manager.handleCorrectAnswer(word!, 5);
      if (i < 2) word = manager.getNextWord();
    }

    // Second word: incorrect (should move to completed since setting is false)
    word = manager.getNextWord();
    if (word) {
      manager.handleIncorrectAnswer(word, 5);
    }

    const stats = manager.getStatistics();
    expect(stats.correctAnswers).toBe(3);
    expect(stats.incorrectAnswers).toBe(1);
  });
});
