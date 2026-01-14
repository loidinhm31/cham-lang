import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen } from "lucide-react";
import { FillWordCard, TopBar } from "@/components/molecules";
import { Button, Card, StatusBadge } from "@/components/atoms";
import { Vocabulary } from "@/types/vocabulary";
import { VocabularyService } from "@/services/vocabulary.service";
import { PracticeService } from "@/services/practice.service";
import { LearningSettingsService } from "@/services/learningSettings.service";
import { WordSelectionService } from "@/services/wordSelection.service";
import { SessionManager } from "@/utils/sessionManager";
import { useTestSession } from "@/hooks/useTestSession";
import { useDialog } from "@/contexts";

export const FillWordPracticePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showAlert } = useDialog();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const collectionId = searchParams.get("collection");
  const contentMode = searchParams.get("contentMode") as
    | "concept"
    | "definition"
    | null;
  const batchSize = parseInt(searchParams.get("batchSize") || "10", 10);
  const direction = searchParams.get("direction") || "definition_to_word";

  // Check if this is study mode (URL path includes /practice/study/)
  const isStudyMode = location.pathname.includes("/practice/study/");

  // Check if this is test mode
  const studyType = searchParams.get("studyType") as "study" | "test" | null;
  const testMode = searchParams.get("testMode") as
    | "normal"
    | "intensive"
    | null;
  const isTestMode = studyType === "test";

  const [sessionManager, setSessionManager] = useState<SessionManager | null>(
    null,
  );
  const [testWords, setTestWords] = useState<Vocabulary[]>([]);
  const [currentVocab, setCurrentVocab] = useState<Vocabulary | null>(null);
  const [cardStartTime, setCardStartTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [hasMoreWords, setHasMoreWords] = useState(false);
  const [questionCounter, setQuestionCounter] = useState(0);
  const [autoAdvanceTimeout, setAutoAdvanceTimeout] = useState(2000); // in milliseconds
  const [showHint, setShowHint] = useState(true);
  const [isReversedDirection, setIsReversedDirection] = useState(false); // true = show word, fill definition; false = show definition, fill word
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const [studiedVocabIds, setStudiedVocabIds] = useState<Set<string>>(
    new Set(),
  ); // Track studied vocabulary IDs in study mode

  // Initialize test session (only used in test mode)
  const testSession = useTestSession(
    testWords,
    testMode || "normal",
    contentMode || "definition",
  );

  // Ref to always have the latest testSession (avoids stale closure in timer callbacks)
  const testSessionRef = useRef(testSession);
  testSessionRef.current = testSession;

  useEffect(() => {
    if (collectionId) {
      loadVocabularies();
    }
  }, [collectionId]);

  // Sync currentVocab with testSession.currentWord in test mode
  // Only sync on initial load (when currentVocab is null) to avoid jumping
  // before showing answer feedback
  useEffect(() => {
    if (isTestMode && testSession.currentWord && !currentVocab) {
      setCurrentVocab(testSession.currentWord);
    }
  }, [isTestMode, testSession.currentWord, currentVocab]);

  const loadVocabularies = async () => {
    if (!collectionId) {
      console.error("No collection ID provided");
      return;
    }

    try {
      setLoading(true);

      // Load learning settings
      const userSettings =
        await LearningSettingsService.getOrCreateLearningSettings();

      // Set UI preferences from settings
      setAutoAdvanceTimeout(userSettings.auto_advance_timeout_seconds * 1000);
      setShowHint(userSettings.show_hint_in_fillword);

      // Set direction from URL parameter
      setIsReversedDirection(direction === "word_to_definition");

      // Load vocabularies
      let vocabData =
        await VocabularyService.getVocabulariesByCollection(collectionId);

      if (vocabData.length === 0) {
        setLoading(false);
        return;
      }

      // In study mode, filter out already studied vocabularies from this session
      if (isStudyMode && studiedVocabIds.size > 0) {
        vocabData = vocabData.filter((v) => !studiedVocabIds.has(v.id || ""));
        if (vocabData.length === 0) {
          // No more words to study
          setLoading(false);
          setCompleted(true);
          setHasMoreWords(false);
          return;
        }
      }

      const language = vocabData[0].language || "en";

      // Test mode: Load all words without using SessionManager
      if (isTestMode) {
        // Set all words for test session - useEffect will handle setting currentVocab
        // when testSession.currentWord updates after the state change propagates
        setTestWords(vocabData);
        setQuestionCounter(0);
        setLoading(false);
        return;
      }

      // Load practice progress
      const progressData = await PracticeService.getPracticeProgress(language);
      const wordsProgress = progressData?.words_progress || [];

      // Select words using the same logic for both study and practice mode
      // Study mode will use batch size just like practice mode
      const selectedWords = WordSelectionService.selectWordsForPractice(
        vocabData,
        wordsProgress,
        userSettings,
        {
          includeDueWords: true,
          includeNewWords: true,
          maxWords: batchSize,
          shuffle: true,
          currentMode: isStudyMode ? undefined : "fillword", // Study mode doesn't filter by completed modes
        },
      );

      // Initialize session manager
      const manager = new SessionManager(
        selectedWords,
        wordsProgress,
        userSettings,
        "fillword",
        collectionId,
        language,
        !isStudyMode, // trackProgress: true for normal mode, false for study mode
      );
      setSessionManager(manager);

      // Get first word
      const firstWord = manager.getNextWord();
      setCurrentVocab(firstWord);
      setQuestionCounter(0); // Reset counter for new session
    } catch (error) {
      console.error("Failed to load vocabularies:", error);
      showAlert(t("messages.error"), { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Get content based on mode (concept or definition), with fallback
  const getContent = (vocab: Vocabulary): string => {
    if (contentMode === "concept") {
      // If concept mode is selected, use concept if available, otherwise fallback to definition
      return (
        vocab.concept || vocab.definitions[0]?.meaning || "No content available"
      );
    }
    // Default to definition
    return vocab.definitions[0]?.meaning || "No definition available";
  };

  // Get the prompt text to display based on direction
  const getPromptText = (vocab: Vocabulary, reversed: boolean): string => {
    if (reversed) {
      // Show word, expect definition/concept
      return vocab.word;
    } else {
      // Show definition/concept, expect word
      return getContent(vocab);
    }
  };

  // Get the correct answer based on direction
  const getCorrectAnswer = (vocab: Vocabulary, reversed: boolean): string => {
    if (reversed) {
      // Expect definition/concept
      return getContent(vocab);
    } else {
      // Expect word
      return vocab.word;
    }
  };

  const handleAnswer = (correct: boolean) => {
    if (!currentVocab) return;

    const timeSpent = Math.floor((Date.now() - cardStartTime) / 1000);

    // Test mode: Use test session
    if (isTestMode) {
      testSession.handleAnswer(correct);
      setShowNext(true);

      // Auto-advance
      autoAdvanceTimerRef.current = window.setTimeout(() => {
        handleNext();
      }, autoAdvanceTimeout);
      return;
    }

    // Study/Practice mode: Use session manager
    if (!sessionManager) return;

    try {
      // Process answer using session manager
      if (correct) {
        sessionManager.handleCorrectAnswer(currentVocab, timeSpent);
      } else {
        sessionManager.handleIncorrectAnswer(currentVocab, timeSpent);
      }

      setShowNext(true);

      // In self-assessment mode (word -> definition):
      // - If answer is correct, auto-advance as normal
      // - If answer is incorrect, don't auto-advance (user needs to manually click Next)
      if (!isReversedDirection || correct) {
        // Auto-advance in normal mode OR when answer is correct in self-assessment mode
        autoAdvanceTimerRef.current = window.setTimeout(() => {
          handleNext();
        }, autoAdvanceTimeout);
      }
      // If isReversedDirection && !correct, no auto-advance (user clicked "I was incorrect")
    } catch (error) {
      console.error("Error in handleAnswer:", error);
      setShowNext(true); // Show next anyway to not block the user
      // Auto-advance even on error (but not for incorrect answers in self-assessment mode)
      if (!isReversedDirection) {
        autoAdvanceTimerRef.current = window.setTimeout(() => {
          handleNext();
        }, autoAdvanceTimeout);
      }
    }
  };

  const handleNext = () => {
    // Clear any pending auto-advance timer to prevent double execution
    if (autoAdvanceTimerRef.current !== null) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    // Test mode: Use test session (read from ref to get latest values)
    if (isTestMode) {
      const currentTestSession = testSessionRef.current;
      if (currentTestSession.isComplete()) {
        completeSession();
      } else {
        // Get the next word from the ref (avoids stale closure)
        const nextWord = currentTestSession.currentWord;
        setCurrentVocab(nextWord);
        setShowNext(false);
        setCardStartTime(Date.now());
        setQuestionCounter((prev) => prev + 1);
      }
      return;
    }

    // Study/Practice mode: Use session manager
    if (!sessionManager) {
      return;
    }

    // Check if session is complete
    if (sessionManager.isSessionComplete()) {
      completeSession();
    } else {
      // Get next word
      const nextWord = sessionManager.getNextWord();
      setCurrentVocab(nextWord);
      setShowNext(false);
      setCardStartTime(Date.now());
      setQuestionCounter((prev) => prev + 1); // Increment counter to force re-render even for same word
    }
  };

  const completeSession = async () => {
    // Test mode: Just mark as completed, no progress saving
    if (isTestMode) {
      setCompleted(true);
      setHasMoreWords(false);
      return;
    }

    if (!sessionManager || !collectionId || !currentVocab) {
      setCompleted(true);
      setHasMoreWords(false);
      return;
    }

    const language = currentVocab.language || "en";

    // In study mode, track studied vocabulary IDs for this session
    if (isStudyMode && sessionManager) {
      const sessionResults = sessionManager.getSessionResults();
      const newStudiedIds = new Set(studiedVocabIds);
      sessionResults.forEach((result) => {
        newStudiedIds.add(result.vocabulary_id);
      });
      setStudiedVocabIds(newStudiedIds);
    }

    // In study mode, skip saving progress
    if (!isStudyMode) {
      try {
        const stats = sessionManager.getStatistics();
        const results = sessionManager.getSessionResults();

        // Save practice session
        await PracticeService.createPracticeSession({
          collection_id: collectionId,
          mode: "fillword",
          language,
          results,
          duration_seconds: stats.durationSeconds,
        });

        // Save updated progress for all words
        const updatedProgress = sessionManager.getUpdatedWordProgress();
        for (const progress of updatedProgress) {
          await PracticeService.updatePracticeProgress({
            language,
            vocabulary_id: progress.vocabulary_id,
            word: progress.word,
            correct: progress.correct_count > 0,
            completed_modes_in_cycle: progress.completed_modes_in_cycle || [],
            next_review_date: progress.next_review_date,
            interval_days: progress.interval_days,
            easiness_factor: progress.easiness_factor,
            consecutive_correct_count: progress.consecutive_correct_count,
            leitner_box: progress.leitner_box,
            last_interval_days: progress.last_interval_days,
            total_reviews: progress.total_reviews,
            correct_count: progress.correct_count,
            incorrect_count: progress.incorrect_count,
          });
        }
      } catch (error) {
        console.error("Failed to save session:", error);
      }
    }

    // Check if there are more words to practice (for both study and normal mode)
    try {
      const userSettings =
        await LearningSettingsService.getOrCreateLearningSettings();
      let vocabData =
        await VocabularyService.getVocabulariesByCollection(collectionId);

      // In study mode, exclude already studied vocabularies
      if (isStudyMode) {
        const sessionResults = sessionManager?.getSessionResults() || [];
        const currentStudiedIds = new Set(studiedVocabIds);
        sessionResults.forEach((result) => {
          currentStudiedIds.add(result.vocabulary_id);
        });
        vocabData = vocabData.filter((v) => !currentStudiedIds.has(v.id || ""));
      }

      const progressData = await PracticeService.getPracticeProgress(language);
      const wordsProgress = progressData?.words_progress || [];

      const nextBatch = WordSelectionService.selectWordsForPractice(
        vocabData,
        wordsProgress,
        userSettings,
        {
          includeDueWords: true,
          includeNewWords: true,
          maxWords: batchSize,
          shuffle: true,
          currentMode: isStudyMode ? undefined : "fillword", // Use same logic as initial selection
        },
      );

      setHasMoreWords(nextBatch.length > 0);
    } catch (error) {
      console.error("Failed to check for more words:", error);
      setHasMoreWords(false);
    }

    setCompleted(true);
  };

  const handleRestart = () => {
    setSessionManager(null);
    setCurrentVocab(null);
    setShowNext(false);
    setCompleted(false);
    setCardStartTime(Date.now());
    setQuestionCounter(0);
    loadVocabularies();
  };

  if (loading) {
    return (
      <>
        <TopBar
          title={
            isStudyMode
              ? t("study.title") || "Study Mode"
              : t("practice.fillWordMode")
          }
          showBack
          backTo={isStudyMode ? "/" : "/practice"}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">{t("app.loading")}</div>
        </div>
      </>
    );
  }

  if (completed) {
    // Get stats from test session or session manager
    const testStats = isTestMode ? testSession.getResults() : null;
    const sessionStats = !isTestMode
      ? sessionManager?.getStatistics() || {
        totalQuestions: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        accuracy: 0,
        wordsCompleted: 0,
        wordsRemaining: 0,
        durationSeconds: 0,
      }
      : null;

    return (
      <>
        <TopBar
          title={
            isTestMode
              ? t("study.testComplete") || "Test Complete"
              : isStudyMode
                ? t("study.completed") || "Study Complete"
                : t("practice.completed")
          }
          showBack
          backTo={isStudyMode || isTestMode ? "/" : "/practice"}
        />
        <div className="px-4 pt-6 space-y-6">
          {isTestMode && (
            <Card
              variant="glass"
              className="bg-green-50 border-2 border-green-200"
            >
              <div className="text-center">
                <p className="font-semibold text-green-900">
                  📝{" "}
                  {testMode === "normal"
                    ? t("study.testNormal") || "Normal Test"
                    : t("study.testIntensive") || "Intensive Test"}
                </p>
                <p className="text-sm text-green-700">
                  {t("study.testComplete") || "Test completed!"}
                </p>
              </div>
            </Card>
          )}
          {isStudyMode && !isTestMode && (
            <Card
              variant="glass"
              className="bg-blue-50 border-2 border-blue-200"
            >
              <div className="text-center">
                <p className="font-semibold text-blue-900">
                  {t("study.progressNotTracked") ||
                    "Progress was not tracked for this session"}
                </p>
                <p className="text-sm text-blue-700">
                  {t("study.studyCompleteDescription") ||
                    "This was a study session"}
                </p>
              </div>
            </Card>
          )}

          <Card variant="gradient" className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-black mb-4">
              {isTestMode
                ? t("study.testComplete") || "Test Complete!"
                : isStudyMode
                  ? t("study.wellDone") || "Great Job!"
                  : t("practice.wellDone")}
            </h2>
            <div className="space-y-2">
              <p className="text-2xl text-white/90">
                {isTestMode && testStats
                  ? `${testStats.correctWords} / ${testStats.totalWords}`
                  : sessionStats
                    ? `${sessionStats.correctAnswers} / ${sessionStats.totalQuestions}`
                    : "0 / 0"}{" "}
                {t("practice.correct")}
              </p>
              <p className="text-xl text-white/80">
                {isTestMode && testStats
                  ? testStats.accuracy
                  : sessionStats?.accuracy || 0}% {t("practice.accuracy")}
              </p>
              {isTestMode && testMode === "intensive" && testStats && (
                <p className="text-lg text-white/70">
                  {testStats.totalAttempts} {t("practice.totalAttempts") || "total attempts"}
                </p>
              )}
            </div>
          </Card>

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => {
              if (isTestMode) {
                navigate("/collections");
              } else if (hasMoreWords) {
                handleRestart();
              } else {
                navigate(isStudyMode ? "/collections" : "/practice");
              }
            }}
          >
            {isTestMode
              ? t("buttons.close")
              : hasMoreWords
                ? t("practice.continue") || "Continue"
                : t("buttons.close")}
          </Button>
        </div>
      </>
    );
  }

  if (!currentVocab) {
    return (
      <>
        <TopBar
          title={
            isStudyMode
              ? t("study.title") || "Study Mode"
              : t("practice.fillWordMode")
          }
          showBack
          backTo={isStudyMode ? "/" : "/practice"}
        />
        <div className="px-4 pt-6">
          <Card variant="glass" className="text-center p-8">
            <p className="text-gray-600">{t("vocabulary.noResults")}</p>
            <Button
              variant="primary"
              size="md"
              className="mt-4"
              onClick={() => navigate("/")}
            >
              {t("nav.home")}
            </Button>
          </Card>
        </div>
      </>
    );
  }

  const hint = showHint
    ? getCorrectAnswer(currentVocab, isReversedDirection).charAt(0) + "..."
    : undefined;

  return (
    <>
      <TopBar
        title={
          isTestMode
            ? testMode === "normal"
              ? t("study.testNormal") || "Normal Test"
              : t("study.testIntensive") || "Intensive Test"
            : isStudyMode
              ? t("study.title") || "Study Mode"
              : t("practice.fillWordMode")
        }
        showBack
        backTo={isStudyMode || isTestMode ? "/" : "/practice"}
      />

      <div className="px-4 pt-6 space-y-6">
        {/* Test Mode Banner */}
        {isTestMode && (
          <Card variant="glass" className="bg-green-50 border-2 border-green-200">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-green-600" />
              <div className="flex-1">
                <p className="font-semibold text-green-900 text-sm">
                  📝{" "}
                  {testMode === "normal"
                    ? t("study.testNormalDescription") || "Each word shown once"
                    : t("study.testIntensiveDescription") ||
                    "Wrong words repeat"}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Study Mode Banner */}
        {isStudyMode && !isTestMode && (
          <Card variant="glass" className="bg-blue-50 border-2 border-blue-200">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-blue-600" />
              <div className="flex-1">
                <p className="font-semibold text-blue-900 text-sm">
                  {t("study.banner") || "Study Mode - Progress Not Tracked"}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Progress */}
        <Card variant="glass">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              {t("practice.progress")}
            </span>
            <span
              className={`text-sm font-bold ${isTestMode ? "text-green-600" : isStudyMode ? "text-blue-600" : "text-teal-600"}`}
            >
              {isTestMode
                ? !showNext &&
                `${testSession.getProgress().answeredWords} / ${testSession.getProgress().totalWords}`
                : sessionManager
                  ? !showNext &&
                  `${sessionManager.getStatistics().wordsCompleted} / ${sessionManager.getTotalWordsCount()}`
                  : "0 / 0"}
            </span>
          </div>
          <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${isTestMode ? "bg-gradient-to-r from-green-500 to-emerald-600" : isStudyMode ? "bg-gradient-to-r from-blue-500 to-cyan-600" : "bg-gradient-to-r from-teal-500 to-cyan-600"}`}
              style={{
                width: `${isTestMode ? testSession.getProgress().percentage : sessionManager ? sessionManager.getProgressPercentage() : 0}%`,
              }}
            ></div>
          </div>
        </Card>

        {/* Status and Repetition Indicator - Hidden in test mode */}
        {!isTestMode && currentVocab && sessionManager && (
          <Card variant="glass">
            <div className="flex items-center justify-between">
              <StatusBadge
                status={sessionManager.getWordStatus(currentVocab.id || "")}
                currentRep={
                  sessionManager.getWordRepetitionProgress(
                    currentVocab.id || "",
                  ).completedRepetitions
                }
                totalReps={
                  sessionManager.getWordRepetitionProgress(
                    currentVocab.id || "",
                  ).requiredRepetitions
                }
              />
              <div className="text-sm text-gray-600">
                Question {sessionManager.getSessionStats().totalQuestions + 1}
              </div>
            </div>
          </Card>
        )}

        {/* Fill Word Card */}
        <FillWordCard
          key={`${currentVocab.id || currentVocab.word}-${questionCounter}`}
          definition={getPromptText(currentVocab, isReversedDirection)}
          correctAnswer={getCorrectAnswer(currentVocab, isReversedDirection)}
          hint={hint}
          audioUrl={currentVocab.audio_url}
          onAnswer={handleAnswer}
          selfAssessmentMode={isReversedDirection}
        />

        {/* Next Button - shows while waiting for auto-advance */}
        {showNext && (
          <Button variant="primary" size="md" fullWidth onClick={handleNext}>
            {sessionManager && !sessionManager.isSessionComplete()
              ? // Show "(auto)" only when we're actually auto-advancing
              autoAdvanceTimerRef.current !== null
                ? `${t("practice.next")} (auto)`
                : t("practice.next")
              : t("practice.finish")}
          </Button>
        )}
      </div>
    </>
  );
};
