import React, { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useNav } from "@cham-lang/ui/hooks";
import { useTranslation } from "react-i18next";
import { Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { TopBar } from "@cham-lang/ui/components/molecules";
import {
  Badge,
  Button,
  Card,
  AudioPlayer,
} from "@cham-lang/ui/components/atoms";
import { VocabularyService } from "@cham-lang/ui/services";
import type { LanguageLevel, Vocabulary } from "@cham-lang/shared/types";
import { useDialog } from "@cham-lang/ui/contexts";

const levelColors: Record<LanguageLevel, string> = {
  A1: "bg-emerald-500",
  A2: "bg-teal-500",
  B1: "bg-cyan-500",
  B2: "bg-blue-500",
  C1: "bg-amber-500",
  C2: "bg-orange-500",
};

interface LocationState {
  collectionId?: string;
  vocabularyIds?: string[];
  currentIndex?: number;
  totalWords?: number; // Total word count from collection
}

export const VocabularyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { navigate } = useNav();
  const location = useLocation();
  const { t } = useTranslation();
  const { showAlert, showConfirm } = useDialog();
  const [vocabulary, setVocabulary] = useState<Vocabulary | null>(null);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const state = location.state as LocationState;
  const { collectionId, vocabularyIds, currentIndex, totalWords } = state || {};

  useEffect(() => {
    if (id) {
      loadVocabulary(id);
    }
  }, [id]);

  const loadVocabulary = async (vocabId: string) => {
    try {
      setLoading(true);
      const data = await VocabularyService.getVocabulary(vocabId);
      setVocabulary(data);
    } catch (error) {
      console.error("Failed to load vocabulary:", error);
      showAlert(t("messages.error"), { variant: "error" });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!vocabulary?.id) {
      return;
    }

    const confirmed = await showConfirm(t("messages.confirmDelete"), {
      variant: "error",
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
    });

    if (!confirmed) {
      return;
    }

    try {
      await VocabularyService.deleteVocabulary(vocabulary.id);
      showAlert(t("messages.deleteSuccess"), { variant: "success" });

      // If in collection context, go to collection page; otherwise go home
      if (collectionId) {
        navigate(`/collections/${collectionId}`);
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Failed to delete vocabulary:", error);
      showAlert(t("messages.error"), { variant: "error" });
    }
  };

  const goToNext = useCallback(() => {
    if (
      vocabularyIds &&
      currentIndex !== undefined &&
      currentIndex < vocabularyIds.length - 1
    ) {
      setIsAnimating(true);
      const nextId = vocabularyIds[currentIndex + 1];
      navigate(`/vocabulary/${nextId}`, {
        state: {
          collectionId,
          vocabularyIds,
          currentIndex: currentIndex + 1,
          totalWords,
        },
      });
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [vocabularyIds, currentIndex, collectionId, totalWords, navigate]);

  const goToPrevious = useCallback(() => {
    if (vocabularyIds && currentIndex !== undefined && currentIndex > 0) {
      setIsAnimating(true);
      const prevId = vocabularyIds[currentIndex - 1];
      navigate(`/vocabulary/${prevId}`, {
        state: {
          collectionId,
          vocabularyIds,
          currentIndex: currentIndex - 1,
          totalWords,
        },
      });
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [vocabularyIds, currentIndex, collectionId, totalWords, navigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!vocabularyIds) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        goToNext();
      } else if (e.key === "ArrowLeft") {
        goToPrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [vocabularyIds, goToNext, goToPrevious]);

  // Swipe gesture detection
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setSwipeOffset(0);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);

    // Calculate offset with some resistance for better feel
    const rawOffset = currentTouch - touchStart;
    const resistance = 0.5; // Add resistance to make swipe feel more controlled
    setSwipeOffset(rawOffset * resistance);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setSwipeOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setIsAnimating(true);
      setTimeout(() => {
        goToNext();
        setSwipeOffset(0);
        setIsAnimating(false);
      }, 200);
    } else if (isRightSwipe) {
      setIsAnimating(true);
      setTimeout(() => {
        goToPrevious();
        setSwipeOffset(0);
        setIsAnimating(false);
      }, 200);
    } else {
      // Reset if swipe wasn't strong enough
      setSwipeOffset(0);
    }
  };

  if (loading) {
    return (
      <>
        <TopBar
          title={t("vocabulary.title")}
          showBack
          backTo={collectionId ? `/collections/${collectionId}` : "/"}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--color-text-secondary)]">
            {t("app.loading")}
          </div>
        </div>
      </>
    );
  }

  if (!vocabulary) {
    return null;
  }

  return (
    <>
      <TopBar
        title={vocabulary.word}
        showBack
        backTo={collectionId ? `/collections/${collectionId}` : "/"}
      />

      <div
        className="px-4 pt-6 pb-6 space-y-6 relative"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          opacity: 1 - Math.abs(swipeOffset) / 400,
          transition:
            isAnimating || swipeOffset === 0
              ? "transform 0.2s ease-out, opacity 0.2s ease-out"
              : "none",
        }}
      >
        {/* Swipe Direction Indicators */}
        {vocabularyIds &&
          currentIndex !== undefined &&
          Math.abs(swipeOffset) > 10 && (
            <>
              {/* Left swipe indicator (next) */}
              {swipeOffset < 0 && currentIndex < vocabularyIds.length - 1 && (
                <div
                  className="fixed right-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
                  style={{
                    opacity: Math.min(Math.abs(swipeOffset) / 100, 0.8),
                    transition: "opacity 0.1s",
                  }}
                >
                  <div className="bg-blue-500 text-white p-4 rounded-full shadow-2xl">
                    <ChevronRight className="w-12 h-12" />
                  </div>
                </div>
              )}

              {/* Right swipe indicator (previous) */}
              {swipeOffset > 0 && currentIndex > 0 && (
                <div
                  className="fixed left-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
                  style={{
                    opacity: Math.min(Math.abs(swipeOffset) / 100, 0.8),
                    transition: "opacity 0.1s",
                  }}
                >
                  <div className="bg-blue-500 text-white p-4 rounded-full shadow-2xl">
                    <ChevronLeft className="w-12 h-12" />
                  </div>
                </div>
              )}
            </>
          )}

        {/* Navigation Arrows - Only show if in collection context */}
        {vocabularyIds && currentIndex !== undefined && (
          <>
            {/* Progress Indicator */}
            <div className="text-center text-sm text-[var(--color-text-muted)] mb-4">
              {currentIndex + 1} / {totalWords || vocabularyIds.length}
            </div>

            {/* Navigation Buttons */}
            <div className="fixed top-1/2 left-0 right-0 -translate-y-1/2 flex justify-between px-2 pointer-events-none z-10">
              {currentIndex > 0 && (
                <button
                  onClick={goToPrevious}
                  className="pointer-events-auto p-3 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 rounded-full shadow-lg transition-all hover:scale-110"
                >
                  <ChevronLeft className="w-8 h-8 text-[var(--color-text-primary)]" />
                </button>
              )}
              <div className="flex-1" />
              {currentIndex < vocabularyIds.length - 1 && (
                <button
                  onClick={goToNext}
                  className="pointer-events-auto p-3 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 rounded-full shadow-lg transition-all hover:scale-110"
                >
                  <ChevronRight className="w-8 h-8 text-[var(--color-text-primary)]" />
                </button>
              )}
            </div>
          </>
        )}
        {/* Word Header */}
        <Card variant="gradient">
          <div className="text-center">
            <h1 className="text-5xl font-black mb-3 whitespace-pre-line">
              {vocabulary.word}
            </h1>
            <div className="flex items-center justify-center gap-3 mb-4">
              <p className="text-2xl text-white/90">{vocabulary.ipa}</p>
              {vocabulary.audio_url && (
                <AudioPlayer audioUrl={vocabulary.audio_url} size="lg" />
              )}
            </div>
            <div className="flex items-center justify-center gap-3">
              <Badge variant="glass" className="bg-white/20 text-white">
                {t(`wordTypes.${vocabulary.word_type}`)}
              </Badge>
              <span
                className={`${levelColors[vocabulary.level]} text-white text-sm font-bold px-4 py-2 rounded-full`}
              >
                {vocabulary.level &&
                  vocabulary.level !== "N/A" &&
                  t(`levels.${vocabulary.level}`)}
              </span>
            </div>
          </div>
        </Card>

        {/* Concept */}
        {vocabulary.concept && (
          <Card variant="glass">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
              {t("vocabulary.concept") || "Concept"}
            </h2>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border-2 border-purple-200 dark:border-purple-800">
              <p className="text-lg text-[var(--color-text-primary)] leading-relaxed">
                💡 {vocabulary.concept}
              </p>
            </div>
          </Card>
        )}

        {/* Definitions */}
        <Card variant="glass">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
            {t("vocabulary.definitions")}
          </h2>
          <div className="space-y-4">
            {vocabulary.definitions.map((def, idx) => (
              <div
                key={idx}
                className="p-4 bg-white/40 dark:bg-white/5 rounded-2xl"
              >
                <p className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                  {def.meaning}
                </p>
                {def.translation && (
                  <p className="text-base text-teal-700 dark:text-teal-400 mb-2">
                    📝 {def.translation}
                  </p>
                )}
                {def.example && (
                  <p className="text-sm text-[var(--color-text-secondary)] italic">
                    "{def.example}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Example Sentences */}
        {vocabulary.example_sentences.length > 0 && (
          <Card variant="glass">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
              {t("vocabulary.exampleSentences")}
            </h2>
            <div className="space-y-3">
              {vocabulary.example_sentences.map((sentence, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white/40 dark:bg-white/5 rounded-xl"
                >
                  <p className="text-[var(--color-text-secondary)]">
                    💬 {sentence}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Topics */}
        {vocabulary.topics.length > 0 && (
          <Card variant="glass">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
              {t("vocabulary.topics")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {vocabulary.topics.map((topic, idx) => (
                <Badge key={idx} variant="info">
                  {topic}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Related Words */}
        {vocabulary.related_words.length > 0 && (
          <Card variant="glass">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
              {t("vocabulary.relatedWords")}
            </h2>
            <div className="space-y-3">
              {vocabulary.related_words.map((related, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white/40 dark:bg-white/5 rounded-xl"
                >
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {related.word}
                  </span>
                  <Badge variant="glass" className="text-xs">
                    {t(`relationships.${related.relationship}`)}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            size="md"
            icon={Edit}
            onClick={() =>
              navigate(`/vocabulary/edit/${vocabulary.id}`, {
                state: {
                  collectionId,
                  vocabularyIds,
                  currentIndex,
                  totalWords,
                },
              })
            }
          >
            {t("buttons.edit")}
          </Button>
          <Button
            variant="danger"
            size="md"
            icon={Trash2}
            onClick={handleDelete}
          >
            {t("buttons.delete")}
          </Button>
        </div>
      </div>
    </>
  );
};
