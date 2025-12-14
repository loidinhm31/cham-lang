import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { VocabularyCard } from "@/components/molecules";
import type { Vocabulary } from "@/types/vocabulary";

interface VocabularyListProps {
  vocabularies: Vocabulary[];
  onVocabularyClick?: (vocabulary: Vocabulary) => void;
  loading?: boolean;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export const VocabularyList: React.FC<VocabularyListProps> = ({
  vocabularies,
  onVocabularyClick,
  loading = false,
  selectionMode = false,
  selectedIds = new Set(),
  onToggleSelection,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
}) => {
  const { t } = useTranslation();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const element = loadMoreRef.current;

    if (!element || !hasMore || !onLoadMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !loadingMore) {
            onLoadMore();
          }
        });
      },
      {
        root: null,
        rootMargin: "100px",
        threshold: 0.1,
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadingMore, onLoadMore]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">{t("app.loading")}</div>
      </div>
    );
  }

  if (vocabularies.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <img
            src="/chameleon.svg"
            alt="Chameleon"
            className="w-24 h-24 mx-auto mb-4"
          />
          <p className="text-gray-600">{t("vocabulary.noResults")}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vocabularies.map((vocabulary) => {
          const vocabId = vocabulary.id;
          const isSelected = vocabId ? selectedIds.has(vocabId) : false;

          return (
            <VocabularyCard
              key={vocabId}
              vocabulary={vocabulary}
              selectionMode={selectionMode}
              isSelected={isSelected}
              onToggleSelection={
                selectionMode && onToggleSelection && vocabId
                  ? () => onToggleSelection(vocabId)
                  : undefined
              }
              onClick={() => {
                if (selectionMode && onToggleSelection && vocabId) {
                  onToggleSelection(vocabId);
                } else {
                  onVocabularyClick?.(vocabulary);
                }
              }}
            />
          );
        })}
      </div>

      {/* Intersection Observer Target */}
      <div
        ref={loadMoreRef}
        className="flex items-center justify-center py-8"
        style={{ minHeight: "40px" }}
      >
        {hasMore && loadingMore && (
          <div className="text-gray-600">{t("app.loading")}</div>
        )}
        {hasMore && !loadingMore && (
          <div className="text-gray-400 text-sm">• Scroll for more •</div>
        )}
      </div>
    </>
  );
};
