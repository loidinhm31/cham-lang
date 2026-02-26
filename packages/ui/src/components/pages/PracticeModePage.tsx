import React, { useEffect, useState } from "react";
import { useNav } from "@cham-lang/ui/hooks";
import { useTranslation } from "react-i18next";
import { Brain, CheckSquare, Clock, Library, PenTool } from "lucide-react";
import { TopBar } from "@cham-lang/ui/components/molecules";
import {
  Button,
  Card,
  ErrorBoundary,
  LoadingSpinner,
  Select,
} from "@cham-lang/ui/components/atoms";
import { CollectionService } from "@cham-lang/ui/services";
import { VocabularyService } from "@cham-lang/ui/services";
import { PracticeService } from "@cham-lang/ui/services";
import { LearningSettingsService } from "@cham-lang/ui/services";
import { WordSelectionService } from "@cham-lang/ui/services";
import type { Collection } from "@cham-lang/shared/types";

export const PracticeModePage: React.FC = () => {
  const { t } = useTranslation();
  const { navigate } = useNav();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>(() => {
    // Load from localStorage or default to ''
    return localStorage.getItem("practiceSelectedCollection") || "";
  });
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [step, setStep] = useState<"collection" | "mode">("collection");
  const [contentMode, setContentMode] = useState<"definition" | "concept">(
    () => {
      // Load from localStorage or default to 'definition'
      const saved = localStorage.getItem("practiceContentMode");
      return saved === "concept" || saved === "definition"
        ? saved
        : "definition";
    },
  );
  const [batchSize, setBatchSize] = useState<number>(() => {
    // Load from localStorage or default to 10
    const saved = localStorage.getItem("practiceBatchSize");
    const parsed = saved ? parseInt(saved, 10) : 10;
    return isNaN(parsed) || parsed < 1 ? 10 : parsed;
  });
  const [fillWordDirection, setFillWordDirection] = useState<
    "definition_to_word" | "word_to_definition"
  >(() => {
    // Load from localStorage or default to 'definition_to_word'
    const saved = localStorage.getItem("practiceFillWordDirection");
    return saved === "word_to_definition"
      ? "word_to_definition"
      : "definition_to_word";
  });
  const [dueWordsCount, setDueWordsCount] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  useEffect(() => {
    if (selectedCollection && step === "mode") {
      loadPracticeStats();
    }
  }, [selectedCollection, step]);

  const loadCollections = async () => {
    try {
      const data = await CollectionService.getUserCollections();
      setCollections(data);

      // Validate saved collection still exists
      const savedCollection = localStorage.getItem(
        "practiceSelectedCollection",
      );
      if (savedCollection && !data.some((c) => c.id === savedCollection)) {
        // Clear invalid saved collection
        localStorage.removeItem("practiceSelectedCollection");
        setSelectedCollection("");
      }
    } catch (error) {
      console.error("Failed to load collections:", error);
    } finally {
      setLoadingCollections(false);
    }
  };

  const loadPracticeStats = async () => {
    if (!selectedCollection) return;

    try {
      setLoadingStats(true);

      // Load settings
      const settings =
        await LearningSettingsService.getOrCreateLearningSettings();

      // Load vocabularies
      const vocabData =
        await VocabularyService.getVocabulariesByCollection(selectedCollection);

      if (vocabData.length === 0) {
        setDueWordsCount(0);
        setLoadingStats(false);
        return;
      }

      const language = vocabData[0].language || "en";

      // Load practice progress
      const progressData = await PracticeService.getPracticeProgress(language);
      const wordsProgress = progressData?.wordsProgress || [];

      // Calculate statistics
      const stats = WordSelectionService.getWordStatistics(
        vocabData,
        wordsProgress,
        settings,
      );
      setDueWordsCount(stats.dueForReview);
    } catch (error) {
      console.error("Failed to load practice stats:", error);
      setDueWordsCount(0);
    } finally {
      setLoadingStats(false);
    }
  };

  const modes = [
    {
      id: "flashcard",
      title: t("practice.flashcardMode"),
      description: t("practice.flashcardDescription"),
      icon: Brain,
      color: "bg-purple-500",
      path: "/practice/flashcard",
    },
    {
      id: "fillword",
      title: t("practice.fillWordMode"),
      description: t("practice.fillWordDescription"),
      icon: PenTool,
      color: "bg-blue-500",
      path: "/practice/fill-word",
    },
    {
      id: "multiplechoice",
      title: t("practice.multipleChoiceMode"),
      description: t("practice.multipleChoiceDescription"),
      icon: CheckSquare,
      color: "bg-amber-500",
      path: "/practice/multiple-choice",
    },
  ];

  const collectionOptions = collections.map((collection) => ({
    value: collection.id || "",
    label: `${collection.name} (${collection.wordCount} words)`,
  }));

  const selectedCollectionData = collections.find(
    (c) => c.id === selectedCollection,
  );

  const handleCollectionChange = (collectionId: string) => {
    setSelectedCollection(collectionId);
    localStorage.setItem("practiceSelectedCollection", collectionId);
  };

  const handleContentModeChange = (mode: "definition" | "concept") => {
    setContentMode(mode);
    localStorage.setItem("practiceContentMode", mode);
  };

  const handleBatchSizeChange = (size: number) => {
    const validSize = Math.max(1, Math.min(size, 100)); // Limit between 1 and 100
    setBatchSize(validSize);
    localStorage.setItem("practiceBatchSize", validSize.toString());
  };

  const handleFillWordDirectionChange = (
    direction: "definition_to_word" | "word_to_definition",
  ) => {
    setFillWordDirection(direction);
    localStorage.setItem("practiceFillWordDirection", direction);
  };

  if (loadingCollections) {
    return (
      <ErrorBoundary>
        <TopBar title={t("practice.title")} showBack backTo="/" />
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" label={t("common.loading")} />
        </div>
      </ErrorBoundary>
    );
  }

  if (collections.length === 0) {
    return (
      <ErrorBoundary>
        <TopBar title={t("practice.title")} showBack backTo="/" />
        <div className="px-4 pt-6">
          <Card variant="glass" className="p-12 text-center">
            <Library className="w-16 h-16 text-(--color-text-muted) mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-(--color-text-primary) mb-2">
              {t("practice.noCollections")}
            </h3>
            <p className="text-(--color-text-secondary) mb-6">
              {t("practice.noCollectionsDescription")}
            </p>
            <Button variant="primary" onClick={() => navigate("/collections")}>
              {t("collections.create")}
            </Button>
          </Card>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <TopBar title={t("practice.title")} showBack backTo="/" />

      <div className="px-4 pt-6 space-y-6">
        {step === "collection" ? (
          <>
            {/* Collection Selection */}
            <div className="text-center py-6">
              <div className="text-6xl mb-4">📚</div>
              <h1 className="text-4xl font-black text-(--color-text-primary) mb-2">
                {t("practice.selectCollection")}
              </h1>
              <p className="text-lg text-(--color-text-secondary)">
                {t("practice.selectCollectionDescription")}
              </p>
            </div>

            <Card variant="glass">
              <div className="space-y-4">
                <Select
                  fullWidth
                  label={t("vocabulary.collection")}
                  options={collectionOptions}
                  value={selectedCollection}
                  onValueChange={handleCollectionChange}
                  placeholder={t("practice.selectCollection")}
                />

                {selectedCollectionData && (
                  <div className="p-4 bg-white/40 dark:bg-white/5 rounded-2xl space-y-2 border border-white/50 dark:border-white/10">
                    <div className="flex justify-between text-sm">
                      <span className="text-(--color-text-secondary)">
                        {t("collections.language")}:
                      </span>
                      <span className="font-semibold text-(--color-text-primary)">
                        {selectedCollectionData.language}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-(--color-text-secondary)">
                        {t("collections.words")}:
                      </span>
                      <span className="font-semibold text-(--color-text-primary)">
                        {selectedCollectionData.wordCount}
                      </span>
                    </div>
                    <div className="text-sm text-(--color-text-secondary) mt-2">
                      {selectedCollectionData.description}
                    </div>
                  </div>
                )}

                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => setStep("mode")}
                  disabled={!selectedCollection}
                >
                  {t("practice.continue")}
                </Button>
              </div>
            </Card>
          </>
        ) : (
          <>
            {/* Mode Selection */}
            <div className="text-center py-6">
              <div className="text-6xl mb-4">🎓</div>
              <h1 className="text-4xl font-black text-(--color-text-primary) mb-2">
                {t("practice.selectMode")}
              </h1>
              <p className="text-lg text-(--color-text-secondary)">
                {t("practice.selectModeDescription")}
              </p>
            </div>

            {/* Practice Stats Card */}
            {!loadingStats && dueWordsCount > 0 && (
              <Card variant="glass">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-teal-500 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-(--color-text-secondary)">
                      {t("practice.dueForReview") || "Due for review"}
                    </p>
                    <p className="text-3xl font-black text-teal-600 dark:text-teal-400">
                      {dueWordsCount} {t("practice.words") || "words"}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Content Mode Selection */}
            <Card variant="glass">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-(--color-text-primary)">
                  {t("practice.contentMode") || "Content to Display"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleContentModeChange("definition")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      contentMode === "definition"
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-500"
                        : "border-(--color-border-light) bg-white/40 dark:bg-white/5 hover:border-gray-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="text-2xl mb-2">📖</div>
                    <div
                      className={`font-semibold ${contentMode === "definition" ? "text-purple-700 dark:text-purple-400" : "text-(--color-text-primary)"}`}
                    >
                      {t("practice.useDefinition") || "Definition"}
                    </div>
                    <div className="text-xs text-(--color-text-secondary) mt-1">
                      {t("practice.useDefinitionDescription") ||
                        "Standard meaning"}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleContentModeChange("concept")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      contentMode === "concept"
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-500"
                        : "border-(--color-border-light) bg-white/40 dark:bg-white/5 hover:border-gray-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="text-2xl mb-2">💡</div>
                    <div
                      className={`font-semibold ${contentMode === "concept" ? "text-purple-700 dark:text-purple-400" : "text-(--color-text-primary)"}`}
                    >
                      {t("practice.useConcept") || "Concept"}
                    </div>
                    <div className="text-xs text-(--color-text-secondary) mt-1">
                      {t("practice.useConceptDescription") || "Core idea"}
                    </div>
                  </button>
                </div>
              </div>
            </Card>

            {/* Batch Size Selection */}
            <Card variant="glass">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-(--color-text-primary)">
                  {t("practice.batchSize") || "Words per Session"}
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleBatchSizeChange(batchSize - 5)}
                    className="w-12 h-12 rounded-xl bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 border-2 border-(--color-border-light) flex items-center justify-center font-bold text-(--color-text-primary) transition-all"
                    disabled={batchSize <= 5}
                  >
                    −
                  </button>
                  <div className="flex-1">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={batchSize}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value)) {
                          handleBatchSizeChange(value);
                        }
                      }}
                      className="w-full px-4 py-3 text-center text-2xl font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-600 focus:border-purple-500 focus:outline-none transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBatchSizeChange(batchSize + 5)}
                    className="w-12 h-12 rounded-xl bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 border-2 border-(--color-border-light) flex items-center justify-center font-bold text-(--color-text-primary) transition-all"
                    disabled={batchSize >= 100}
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[5, 10, 15, 20, 25, 30].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => handleBatchSizeChange(size)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        batchSize === size
                          ? "bg-purple-500 text-white"
                          : "bg-white/60 dark:bg-white/10 text-(--color-text-primary) hover:bg-white/80 dark:hover:bg-white/20 border border-(--color-border-light)"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-(--color-text-secondary) text-center">
                  {t("practice.batchSizeDescription") ||
                    "Choose how many words you want to practice in each session"}
                </p>
              </div>
            </Card>

            {/* Fill Word Direction Selection */}
            <Card variant="glass">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-(--color-text-primary)">
                  {t("practice.fillWordDirection")}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleFillWordDirectionChange("definition_to_word")
                    }
                    className={`p-4 rounded-xl border-2 transition-all ${
                      fillWordDirection === "definition_to_word"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500"
                        : "border-(--color-border-light) bg-white/40 dark:bg-white/5 hover:border-gray-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="text-2xl mb-2">📖→✍️</div>
                    <div
                      className={`font-semibold ${fillWordDirection === "definition_to_word" ? "text-blue-700 dark:text-blue-400" : "text-(--color-text-primary)"}`}
                    >
                      {t("practice.definitionToWord")}
                    </div>
                    <div className="text-xs text-(--color-text-secondary) mt-1">
                      {t("practice.definitionToWordDescription")}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleFillWordDirectionChange("word_to_definition")
                    }
                    className={`p-4 rounded-xl border-2 transition-all ${
                      fillWordDirection === "word_to_definition"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500"
                        : "border-(--color-border-light) bg-white/40 dark:bg-white/5 hover:border-gray-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="text-2xl mb-2">✍️→📖</div>
                    <div
                      className={`font-semibold ${fillWordDirection === "word_to_definition" ? "text-blue-700 dark:text-blue-400" : "text-(--color-text-primary)"}`}
                    >
                      {t("practice.wordToDefinition")}
                    </div>
                    <div className="text-xs text-(--color-text-secondary) mt-1">
                      {t("practice.wordToDefinitionDescription")}
                    </div>
                  </button>
                </div>
              </div>
            </Card>

            {/* Mode Selection Label */}
            <div className="text-center">
              <h3 className="text-xl font-bold text-(--color-text-primary)">
                {t("practice.selectPracticeMode")}
              </h3>
            </div>

            <div className="space-y-4">
              {modes.map((mode) => {
                const Icon = mode.icon;
                const params = new URLSearchParams({
                  collection: selectedCollection,
                  contentMode,
                  batchSize: batchSize.toString(),
                });

                // Add direction parameter only for fill-word mode
                if (mode.id === "fillword") {
                  params.set("direction", fillWordDirection);
                }

                return (
                  <Card
                    key={mode.id}
                    variant="default"
                    hover
                    onClick={() =>
                      navigate(`${mode.path}?${params.toString()}`)
                    }
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-6">
                      <div
                        className={`w-20 h-20 rounded-2xl ${mode.color} flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className="w-10 h-10 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-(--color-text-primary) mb-2">
                          {mode.title}
                        </h3>
                        <p className="text-(--color-text-secondary)">
                          {mode.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Button
              variant="secondary"
              fullWidth
              onClick={() => setStep("collection")}
            >
              {t("practice.changeCollection")}
            </Button>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};
