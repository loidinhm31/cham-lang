/**
 * Test Session Hook
 * Manages test sessions for Study Mode (no progress tracking)
 */

import { useState, useCallback, useEffect } from "react";
import type { Vocabulary } from "@/types/vocabulary";

export type TestMode = "normal" | "intensive";

export interface TestResult {
  vocabulary_id: string;
  word: string;
  correct: boolean;
  attempts: number; // For intensive mode
}

export interface TestSessionStats {
  totalWords: number;
  correctWords: number;
  incorrectWords: number;
  accuracy: number;
  totalAttempts: number; // Total answers given (for intensive mode)
}

interface TestSessionState {
  mode: TestMode;
  allWords: Vocabulary[];
  queue: Vocabulary[];
  currentWord: Vocabulary | null;
  results: Map<string, TestResult>; // vocabulary_id -> TestResult
  completed: boolean;
  startTime: Date;
}

/**
 * Fisher-Yates shuffle algorithm
 */
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const useTestSession = (
  words: Vocabulary[],
  mode: TestMode,
  contentMode: "definition" | "concept",
) => {
  const [state, setState] = useState<TestSessionState>(() => {
    const shuffled = shuffleArray(words);
    return {
      mode,
      allWords: words,
      queue: shuffled.slice(1), // Exclude first word since it's already set as currentWord
      currentWord: shuffled[0] || null,
      results: new Map(),
      completed: false,
      startTime: new Date(),
    };
  });

  // Reinitialize state when words are loaded (changes from empty to populated)
  useEffect(() => {
    if (words.length > 0 && state.allWords.length === 0) {
      const shuffled = shuffleArray(words);
      setState({
        mode,
        allWords: words,
        queue: shuffled.slice(1), // Exclude first word since it's already set as currentWord
        currentWord: shuffled[0] || null,
        results: new Map(),
        completed: false,
        startTime: new Date(),
      });
    }
  }, [words, mode, state.allWords.length]);

  /**
   * Get the next word from the queue
   */
  const getNextWord = useCallback((): Vocabulary | null => {
    setState((prev) => {
      if (prev.queue.length === 0) {
        return { ...prev, currentWord: null, completed: true };
      }

      const [next, ...remaining] = prev.queue;
      return {
        ...prev,
        queue: remaining,
        currentWord: next,
      };
    });

    return state.queue[0] || null;
  }, [state.queue]);

  /**
   * Handle answer for current word
   */
  const handleAnswer = useCallback(
    (correct: boolean) => {
      setState((prev) => {
        if (!prev.currentWord) return prev;

        const vocabId = prev.currentWord.id || "";
        const existingResult = prev.results.get(vocabId);

        // Update or create result
        const newResult: TestResult = {
          vocabulary_id: vocabId,
          word: prev.currentWord.word,
          correct: existingResult ? existingResult.correct || correct : correct,
          attempts: (existingResult?.attempts || 0) + 1,
        };

        const updatedResults = new Map(prev.results);
        updatedResults.set(vocabId, newResult);

        // Handle mode-specific logic
        if (prev.mode === "intensive" && !correct) {
          // Push word back to queue and shuffle
          const updatedQueue = shuffleArray([...prev.queue, prev.currentWord]);
          return {
            ...prev,
            queue: updatedQueue.slice(1), // Exclude first word since it's set as currentWord
            results: updatedResults,
            currentWord: updatedQueue[0] || null,
          };
        }

        // Normal mode OR intensive mode with correct answer
        // Move to next word
        if (prev.queue.length === 0) {
          return {
            ...prev,
            results: updatedResults,
            currentWord: null,
            completed: true,
          };
        }

        const [next, ...remaining] = prev.queue;
        return {
          ...prev,
          queue: remaining,
          currentWord: next,
          results: updatedResults,
        };
      });
    },
    [state.mode],
  );

  /**
   * Get current word (for display)
   */
  const getCurrentWord = useCallback((): Vocabulary | null => {
    return state.currentWord;
  }, [state.currentWord]);

  /**
   * Get content based on content mode
   */
  const getContent = useCallback(
    (vocab: Vocabulary): string => {
      if (contentMode === "concept") {
        return (
          vocab.concept ||
          vocab.definitions[0]?.meaning ||
          "No content available"
        );
      }
      return vocab.definitions[0]?.meaning || "No definition available";
    },
    [contentMode],
  );

  /**
   * Calculate final statistics
   */
  const getResults = useCallback((): TestSessionStats => {
    const results = Array.from(state.results.values());
    const correctWords = results.filter((r) => r.correct).length;
    const incorrectWords = results.filter((r) => !r.correct).length;
    const totalAttempts = results.reduce((sum, r) => sum + r.attempts, 0);

    return {
      totalWords: state.allWords.length,
      correctWords,
      incorrectWords,
      accuracy:
        state.allWords.length > 0
          ? Math.round((correctWords / state.allWords.length) * 100)
          : 0,
      totalAttempts,
    };
  }, [state.results, state.allWords.length]);

  /**
   * Get progress information
   */
  const getProgress = useCallback(() => {
    const totalWords = state.allWords.length;
    const answeredWords = state.results.size;
    const remainingWords = state.queue.length;

    return {
      totalWords,
      answeredWords,
      remainingWords,
      percentage:
        totalWords > 0 ? Math.round((answeredWords / totalWords) * 100) : 0,
    };
  }, [state.allWords.length, state.results.size, state.queue.length]);

  /**
   * Check if session is complete
   */
  const isComplete = useCallback((): boolean => {
    return state.completed;
  }, [state.completed]);

  /**
   * Get session duration in seconds
   */
  const getDuration = useCallback((): number => {
    return Math.floor((Date.now() - state.startTime.getTime()) / 1000);
  }, [state.startTime]);

  return {
    currentWord: state.currentWord,
    mode: state.mode,
    getNextWord,
    handleAnswer,
    getCurrentWord,
    getContent,
    getResults,
    getProgress,
    isComplete,
    getDuration,
  };
};
