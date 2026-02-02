import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useNav } from "@cham-lang/ui/hooks";
import { useTranslation } from "react-i18next";
import { Brain, CheckSquare, PenTool, BookOpen } from "lucide-react";
import { TopBar } from "@cham-lang/ui/components/molecules";
import { Button, Card } from "@cham-lang/ui/components/atoms";
import { CollectionService } from "@cham-lang/ui/services";
import type { Collection } from "@cham-lang/shared/types";

export const StudyModePage: React.FC = () => {
  const { t } = useTranslation();
  const { navigate } = useNav();
  const [searchParams] = useSearchParams();
  const collectionId = searchParams.get("collection") || "";

  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [batchSize, setBatchSize] = useState<number>(() => {
    // Load from localStorage or default to 10
    const saved = localStorage.getItem("practiceBatchSize");
    const parsed = saved ? parseInt(saved, 10) : 10;
    return isNaN(parsed) || parsed < 1 ? 10 : parsed;
  });
  const [contentMode, setContentMode] = useState<"definition" | "concept">(
    "definition",
  );
  const [step, setStep] = useState<"config" | "mode">("config");
  const [fillWordDirection, setFillWordDirection] = useState<
    "definition_to_word" | "word_to_definition"
  >(() => {
    // Load from localStorage or default to 'definition_to_word'
    const saved = localStorage.getItem("practiceFillWordDirection");
    return saved === "word_to_definition"
      ? "word_to_definition"
      : "definition_to_word";
  });
  const [studyType, setStudyType] = useState<"study" | "test">(() => {
    // Load from localStorage or default to 'study'
    const saved = localStorage.getItem("studyType");
    return saved === "test" ? "test" : "study";
  });
  const [testMode, setTestMode] = useState<"normal" | "intensive">(() => {
    // Load from localStorage or default to 'normal'
    const saved = localStorage.getItem("testMode");
    return saved === "intensive" ? "intensive" : "normal";
  });

  useEffect(() => {
    if (collectionId) {
      loadCollection();
    }
  }, [collectionId]);

  const loadCollection = async () => {
    try {
      const collections = await CollectionService.getUserCollections();
      const found = collections.find((c) => c.id === collectionId);
      setCollection(found || null);
    } catch (error) {
      console.error("Failed to load collection:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFillWordDirectionChange = (
    direction: "definition_to_word" | "word_to_definition",
  ) => {
    setFillWordDirection(direction);
    localStorage.setItem("practiceFillWordDirection", direction);
  };

  const handleBatchSizeChange = (size: number) => {
    const validSize = Math.max(1, Math.min(size, 100)); // Limit between 1 and 100
    setBatchSize(validSize);
    localStorage.setItem("practiceBatchSize", validSize.toString());
  };

  const handleStudyTypeChange = (type: "study" | "test") => {
    setStudyType(type);
    localStorage.setItem("studyType", type);
  };

  const handleTestModeChange = (mode: "normal" | "intensive") => {
    setTestMode(mode);
    localStorage.setItem("testMode", mode);
  };

  const modes = [
    {
      id: "flashcard",
      title: t("practice.flashcardMode"),
      description: t("practice.flashcardDescription"),
      icon: Brain,
      color: "from-blue-500 to-cyan-600",
      path: "/practice/study/flashcard",
    },
    {
      id: "fillword",
      title: t("practice.fillWordMode"),
      description: t("practice.fillWordDescription"),
      icon: PenTool,
      color: "from-blue-500 to-cyan-600",
      path: "/practice/study/fill-word",
    },
    {
      id: "multiplechoice",
      title: t("practice.multipleChoiceMode"),
      description: t("practice.multipleChoiceDescription"),
      icon: CheckSquare,
      color: "from-blue-500 to-cyan-600",
      path: "/practice/study/multiple-choice",
    },
  ];

  if (loading) {
    return (
      <>
        <TopBar title={t("study.title") || "Study Mode"} showBack backTo="/" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-gray-600">{t("common.loading")}</div>
        </div>
      </>
    );
  }

  if (!collection) {
    return (
      <>
        <TopBar title={t("study.title") || "Study Mode"} showBack backTo="/" />
        <div className="px-4 pt-6">
          <Card variant="glass" className="p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {t("study.collectionNotFound") || "Collection not found"}
            </h3>
            <Button variant="primary" onClick={() => navigate("/collections")}>
              {t("common.back")}
            </Button>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title={t("study.title") || "Study Mode"} showBack backTo="/" />

      <div className="px-4 pt-6 space-y-6">
        {step === "config" ? (
          <>
            {/* Study Mode Header */}
            <div className="text-center py-6">
              <div className="text-6xl mb-4">📚</div>
              <h1 className="text-4xl font-black text-gray-800 mb-2">
                {t("study.title") || "Study Mode"}
              </h1>
              <p className="text-lg text-gray-700">
                {t("study.description") || "Practice without tracking progress"}
              </p>
            </div>

            {/* Study Mode Banner */}
            <Card
              variant="glass"
              className="bg-blue-50 border-2 border-blue-200"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">
                    {t("study.banner") || "Study Mode - Progress Not Tracked"}
                  </p>
                  <p className="text-sm text-blue-700">
                    {t("study.bannerDescription") ||
                      "Practice freely without affecting your learning statistics"}
                  </p>
                </div>
              </div>
            </Card>

            {/* Collection Info */}
            <Card variant="glass">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {t("vocabulary.collection")}:
                  </span>
                  <span className="font-semibold text-gray-800">
                    {collection.name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {t("collections.language")}:
                  </span>
                  <span className="font-semibold text-gray-800">
                    {collection.language}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {t("collections.words")}:
                  </span>
                  <span className="font-semibold text-gray-800">
                    {collection.word_count}
                  </span>
                </div>
              </div>
            </Card>

            {/* Study Type Selection */}
            <Card variant="glass">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">
                  {t("study.studyType") || "Study Type"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleStudyTypeChange("study")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      studyType === "study"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white/40 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">📚</div>
                    <div
                      className={`font-semibold ${studyType === "study" ? "text-blue-700" : "text-gray-700"}`}
                    >
                      {t("study.studyTypeStudy") || "Study"}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {t("study.studyDescription") ||
                        "Practice with repetition"}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStudyTypeChange("test")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      studyType === "test"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white/40 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">📝</div>
                    <div
                      className={`font-semibold ${studyType === "test" ? "text-blue-700" : "text-gray-700"}`}
                    >
                      {t("study.studyTypeTest") || "Test"}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {t("study.testAllWords") || "Test all words"}
                    </div>
                  </button>
                </div>
              </div>
            </Card>

            {/* Test Mode Selection - Only shown when Test is selected */}
            {studyType === "test" && (
              <Card variant="glass">
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    {t("study.testMode") || "Test Mode"}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleTestModeChange("normal")}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        testMode === "normal"
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 bg-white/40 hover:border-gray-300"
                      }`}
                    >
                      <div className="text-2xl mb-2">✅</div>
                      <div
                        className={`font-semibold ${testMode === "normal" ? "text-green-700" : "text-gray-700"}`}
                      >
                        {t("study.testNormal") || "Normal"}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {t("study.testNormalDescription") || "Each word once"}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestModeChange("intensive")}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        testMode === "intensive"
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 bg-white/40 hover:border-gray-300"
                      }`}
                    >
                      <div className="text-2xl mb-2">🔄</div>
                      <div
                        className={`font-semibold ${testMode === "intensive" ? "text-green-700" : "text-gray-700"}`}
                      >
                        {t("study.testIntensive") || "Intensive"}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {t("study.testIntensiveDescription") ||
                          "Repeat until correct"}
                      </div>
                    </button>
                  </div>
                </div>
              </Card>
            )}

            {/* Batch Size Selection - Only shown when Study is selected */}
            {studyType === "study" && (
              <Card variant="glass">
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    {t("practice.batchSize") || "Words per Session"}
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleBatchSizeChange(batchSize - 5)}
                      className="w-12 h-12 rounded-xl bg-white/60 hover:bg-white/80 border-2 border-gray-200 flex items-center justify-center font-bold text-gray-700 transition-all"
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
                        className="w-full px-4 py-3 text-center text-2xl font-bold text-blue-700 bg-blue-50 rounded-xl border-2 border-blue-200 focus:border-blue-500 focus:outline-none transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBatchSizeChange(batchSize + 5)}
                      className="w-12 h-12 rounded-xl bg-white/60 hover:bg-white/80 border-2 border-gray-200 flex items-center justify-center font-bold text-gray-700 transition-all"
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
                            ? "bg-blue-500 text-white"
                            : "bg-white/60 text-gray-700 hover:bg-white/80 border border-gray-200"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 text-center">
                    {t("practice.batchSizeDescription") ||
                      "Choose how many words you want to practice in each session"}
                  </p>
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
                    onClick={() => setContentMode("definition")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      contentMode === "definition"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white/40 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">📖</div>
                    <div
                      className={`font-semibold ${contentMode === "definition" ? "text-blue-700" : "text-gray-700"}`}
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
                    onClick={() => setContentMode("concept")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      contentMode === "concept"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white/40 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">💡</div>
                    <div
                      className={`font-semibold ${contentMode === "concept" ? "text-blue-700" : "text-gray-700"}`}
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

            <Button variant="primary" fullWidth onClick={() => setStep("mode")}>
              {t("practice.continue")}
            </Button>
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
                {t("study.selectModeDescription") ||
                  "Choose how you want to study"}
              </p>
            </div>

            {/* Study/Test Mode Reminder */}
            <Card
              variant="glass"
              className={
                studyType === "test"
                  ? "bg-green-50 border-2 border-green-200"
                  : "bg-blue-50 border-2 border-blue-200"
              }
            >
              <div className="text-center">
                {studyType === "test" ? (
                  <>
                    <p className="font-semibold text-green-900">
                      📝{" "}
                      {testMode === "normal"
                        ? t("study.testNormal") || "Normal Test"
                        : t("study.testIntensive") || "Intensive Test"}
                      {" - "}
                      {collection.word_count} {t("practice.words") || "words"}
                    </p>
                    <p className="text-sm text-green-700">
                      {testMode === "normal"
                        ? t("study.testNormalDescription") ||
                          "Each word shown once"
                        : t("study.testIntensiveDescription") ||
                          "Wrong words repeat until correct"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-blue-900">
                      📚 {t("study.studying") || "Studying"} {batchSize}{" "}
                      {t("practice.words") || "words"}{" "}
                      {t("study.perSession") || "per session"}
                    </p>
                    <p className="text-sm text-blue-700">
                      {t("study.progressNotTracked") ||
                        "Progress will not be tracked"}
                    </p>
                  </>
                )}
              </div>
            </Card>

            {/* Fill Word Direction Selection */}
            <Card variant="glass">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">
                  {t("practice.fillWordDirection") || "Fill Word Direction"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleFillWordDirectionChange("definition_to_word")
                    }
                    className={`p-4 rounded-xl border-2 transition-all ${
                      fillWordDirection === "definition_to_word"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white/40 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">📖→✍️</div>
                    <div
                      className={`font-semibold ${fillWordDirection === "definition_to_word" ? "text-blue-700" : "text-gray-700"}`}
                    >
                      {t("practice.definitionToWord")}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
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
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white/40 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl mb-2">✍️→📖</div>
                    <div
                      className={`font-semibold ${fillWordDirection === "word_to_definition" ? "text-blue-700" : "text-gray-700"}`}
                    >
                      {t("practice.wordToDefinition")}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {t("practice.wordToDefinitionDescription")}
                    </div>
                  </button>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              {modes.map((mode) => {
                const Icon = mode.icon;
                const params = new URLSearchParams({
                  collection: collectionId,
                  contentMode,
                  batchSize: batchSize.toString(),
                  studyType,
                });

                // Add test mode parameter if in test mode
                if (studyType === "test") {
                  params.set("testMode", testMode);
                }

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
              onClick={() => setStep("config")}
            >
              {t("common.back")}
            </Button>
          </>
        )}
      </div>
    </>
  );
};
