import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Brain, CheckSquare, Clock, Library, PenTool } from "lucide-react";
import { TopBar } from "@/components/molecules";
import { Button, Card, Select } from "@/components/atoms";
import { CollectionService } from "@/services/collection.service";
import { VocabularyService } from "@/services/vocabulary.service";
import { PracticeService } from "@/services/practice.service";
import { LearningSettingsService } from "@/services/learningSettings.service";
import { WordSelectionService } from "@/services/wordSelection.service";
import type { Collection } from "@/types/collection";

export const PracticeModePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      const wordsProgress = progressData?.words_progress || [];

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
      color: "from-purple-500 to-pink-600",
      path: "/practice/flashcard",
    },
    {
      id: "fillword",
      title: t("practice.fillWordMode"),
      description: t("practice.fillWordDescription"),
      icon: PenTool,
      color: "from-blue-500 to-cyan-600",
      path: "/practice/fill-word",
    },
    {
      id: "multiplechoice",
      title: t("practice.multipleChoiceMode"),
      description: t("practice.multipleChoiceDescription"),
      icon: CheckSquare,
      color: "from-amber-500 to-orange-600",
      path: "/practice/multiple-choice",
    },
  ];

  const collectionOptions = collections.map((collection) => ({
    value: collection.id || "",
    label: `${collection.name} (${collection.word_count} words)`,
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

  if (loadingCollections) {
    return (
      <>
        <TopBar title={t("practice.title")} showBack />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-gray-600">{t("common.loading")}</div>
        </div>
      </>
    );
  }

  if (collections.length === 0) {
    return (
      <>
        <TopBar title={t("practice.title")} showBack />
        <div className="px-4 pt-6">
          <Card variant="glass" className="p-12 text-center">
            <Library className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {t("practice.noCollections")}
            </h3>
            <p className="text-gray-600 mb-6">
              {t("practice.noCollectionsDescription")}
            </p>
            <Button variant="primary" onClick={() => navigate("/collections")}>
              {t("collections.create")}
            </Button>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title={t("practice.title")} showBack />

      <div className="px-4 pt-6 space-y-6">
        {step === "collection" ? (
          <>
            {/* Collection Selection */}
            <div className="text-center py-6">
              <div className="text-6xl mb-4">📚</div>
              <h1 className="text-4xl font-black text-gray-800 mb-2">
                {t("practice.selectCollection")}
              </h1>
              <p className="text-lg text-gray-700">
                {t("practice.selectCollectionDescription")}
              </p>
            </div>

            <Card variant="glass">
              <div className="space-y-4">
                <Select
                  label={t("vocabulary.collection")}
                  options={collectionOptions}
                  value={selectedCollection}
                  onChange={(e) => handleCollectionChange(e.target.value)}
                  placeholder={t("practice.selectCollection")}
                />

                {selectedCollectionData && (
                  <div className="p-4 bg-white/40 rounded-2xl space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {t("collections.language")}:
                      </span>
                      <span className="font-semibold text-gray-800">
                        {selectedCollectionData.language}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {t("collections.words")}:
                      </span>
                      <span className="font-semibold text-gray-800">
                        {selectedCollectionData.word_count}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
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
              <h1 className="text-4xl font-black text-gray-800 mb-2">
                {t("practice.selectMode")}
              </h1>
              <p className="text-lg text-gray-700">
                {t("practice.selectModeDescription")}
              </p>
            </div>

            {/* Practice Stats Card */}
            {!loadingStats && dueWordsCount > 0 && (
              <Card variant="glass">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">
                      {t("practice.dueForReview") || "Due for review"}
                    </p>
                    <p className="text-3xl font-black text-teal-600">
                      {dueWordsCount} {t("practice.words") || "words"}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Content Mode Selection */}
            <Card variant="glass">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">
                  {t("practice.contentMode") || "Content to Display"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleContentModeChange("definition")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      contentMode === "definition"
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 bg-white/40 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">📖</div>
                    <div
                      className={`font-semibold ${contentMode === "definition" ? "text-purple-700" : "text-gray-700"}`}
                    >
                      {t("practice.useDefinition") || "Definition"}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {t("practice.useDefinitionDescription") ||
                        "Standard meaning"}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleContentModeChange("concept")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      contentMode === "concept"
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-200 bg-white/40 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">💡</div>
                    <div
                      className={`font-semibold ${contentMode === "concept" ? "text-purple-700" : "text-gray-700"}`}
                    >
                      {t("practice.useConcept") || "Concept"}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {t("practice.useConceptDescription") || "Core idea"}
                    </div>
                  </button>
                </div>
              </div>
            </Card>

            {/* Mode Selection Label */}
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-800">
                {t("practice.selectPracticeMode") || "Select Practice Mode"}
              </h3>
            </div>

            <div className="space-y-4">
              {modes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <Card
                    key={mode.id}
                    variant="default"
                    hover
                    onClick={() =>
                      navigate(
                        `${mode.path}?collection=${selectedCollection}&contentMode=${contentMode}`,
                      )
                    }
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-6">
                      <div
                        className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className="w-10 h-10 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">
                          {mode.title}
                        </h3>
                        <p className="text-gray-600">{mode.description}</p>
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
    </>
  );
};
