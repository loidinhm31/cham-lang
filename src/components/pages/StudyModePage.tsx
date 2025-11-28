import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Brain, CheckSquare, PenTool, BookOpen } from "lucide-react";
import { TopBar } from "@/components/molecules";
import { Button, Card } from "@/components/atoms";
import { CollectionService } from "@/services/collection.service.ts";
import type { Collection } from "@/types/collection.ts";

export const StudyModePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const collectionId = searchParams.get("collection") || "";

  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [wordLimit, setWordLimit] = useState<string>("all");
  const [contentMode, setContentMode] = useState<"definition" | "concept">(
    "definition",
  );
  const [step, setStep] = useState<"config" | "mode">("config");

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

  const wordLimitOptions = [
    { value: "all", label: t("study.allWords") || "All Words" },
    { value: "20", label: "20 " + (t("practice.words") || "words") },
    { value: "50", label: "50 " + (t("practice.words") || "words") },
    { value: "100", label: "100 " + (t("practice.words") || "words") },
    { value: "200", label: "200 " + (t("practice.words") || "words") },
  ];

  if (loading) {
    return (
      <>
        <TopBar title={t("study.title") || "Study Mode"} showBack />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-gray-600">{t("common.loading")}</div>
        </div>
      </>
    );
  }

  if (!collection) {
    return (
      <>
        <TopBar title={t("study.title") || "Study Mode"} showBack />
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
      <TopBar title={t("study.title") || "Study Mode"} showBack />

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

            {/* Word Limit Selection */}
            <Card variant="glass">
              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">
                  {t("study.wordLimit") || "How many words?"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {wordLimitOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setWordLimit(option.value)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        wordLimit === option.value
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white/40 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`font-semibold ${wordLimit === option.value ? "text-blue-700" : "text-gray-700"}`}
                      >
                        {option.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

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

            {/* Study Mode Reminder */}
            <Card
              variant="glass"
              className="bg-blue-50 border-2 border-blue-200"
            >
              <div className="text-center">
                <p className="font-semibold text-blue-900">
                  📚 {t("study.studying") || "Studying"}{" "}
                  {wordLimit === "all"
                    ? t("study.allWords") || "All Words"
                    : wordLimit + " " + (t("practice.words") || "words")}
                </p>
                <p className="text-sm text-blue-700">
                  {t("study.progressNotTracked") ||
                    "Progress will not be tracked"}
                </p>
              </div>
            </Card>

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
                        `${mode.path}?collection=${collectionId}&contentMode=${contentMode}&wordLimit=${wordLimit}`,
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
