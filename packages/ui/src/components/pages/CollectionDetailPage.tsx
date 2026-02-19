import React, { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useNav, useCollectionPermission } from "@cham-lang/ui/hooks";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Edit,
  Globe,
  Plus,
  Trash2,
  CheckSquare,
  GraduationCap,
  Share2,
} from "lucide-react";
import { TopBar, BulkActionToolbar } from "@cham-lang/ui/components/molecules";
import {
  VocabularyList,
  CollectionSelectorDialog,
  ShareCollectionDialog,
} from "@cham-lang/ui/components/organisms";
import { Badge, Button, Card } from "@cham-lang/ui/components/atoms";
import { CollectionService } from "@cham-lang/ui/services";
import { VocabularyService } from "@cham-lang/ui/services";
import type { Collection } from "@cham-lang/shared/types";
import type { Vocabulary } from "@cham-lang/shared/types";
import { useDialog } from "@cham-lang/ui/contexts";

const PAGE_SIZE = 20;

export const CollectionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { navigate } = useNav();
  const location = useLocation();
  const { t } = useTranslation();
  const { showAlert, showConfirm } = useDialog();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { canEdit } = useCollectionPermission(collection);

  // Determine back route based on where user came from
  const state = location.state as { fromPage?: string } | null;
  const backRoute = state?.fromPage === "home" ? "/" : "/collections";

  const loadCollectionData = async (collectionId: string) => {
    try {
      setLoading(true);
      setPage(0);
      setHasMore(true);
      const [collectionData, vocabResponse] = await Promise.all([
        CollectionService.getCollection(collectionId),
        VocabularyService.getVocabulariesByCollectionPaginated(
          collectionId,
          PAGE_SIZE,
          0,
        ),
      ]);
      setCollection(collectionData);
      setVocabularies(vocabResponse.items);
      setTotalCount(vocabResponse.total);
      setHasMore(vocabResponse.hasMore);
    } catch (error) {
      console.error("Failed to load collection:", error);
      showAlert(t("messages.error"), { variant: "error" });
      navigate(backRoute);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreVocabularies = useCallback(async () => {
    if (!id || loadingMore || !hasMore) {
      return;
    }

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const vocabResponse =
        await VocabularyService.getVocabulariesByCollectionPaginated(
          id,
          PAGE_SIZE,
          nextPage * PAGE_SIZE,
        );

      if (vocabResponse.items.length > 0) {
        setVocabularies((prev) => [...prev, ...vocabResponse.items]);
        setPage(nextPage);
        setHasMore(vocabResponse.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more vocabularies:", error);
      showAlert(t("messages.error"), { variant: "error" });
    } finally {
      setLoadingMore(false);
    }
  }, [id, page, loadingMore, hasMore, showAlert, t]);

  useEffect(() => {
    if (id) {
      loadCollectionData(id);
    }
  }, [id]);

  const handleDelete = async () => {
    if (!collection?.id) {
      return;
    }

    const confirmed = await showConfirm(t("messages.confirmDelete"), {
      variant: "warning",
      confirmText: t("buttons.delete"),
      cancelText: t("buttons.cancel"),
    });

    if (!confirmed) {
      return;
    }

    try {
      await CollectionService.deleteCollection(collection.id);
      showAlert(t("messages.deleteSuccess"), { variant: "success" });
      navigate(backRoute);
    } catch (error) {
      console.error("Failed to delete collection:", error);
      showAlert(t("messages.error"), { variant: "error" });
    }
  };

  const handleVocabularyClick = (vocabulary: Vocabulary) => {
    const index = vocabularies.findIndex((v) => v.id === vocabulary.id);
    navigate(`/vocabulary/${vocabulary.id}`, {
      state: {
        collectionId: id,
        vocabularyIds: vocabularies.map((v) => v.id),
        currentIndex: index,
        totalWords: collection?.wordCount,
        canEdit,
      },
    });
  };

  const handleToggleSelection = (vocabId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(vocabId)) {
        newSet.delete(vocabId);
      } else {
        newSet.add(vocabId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === vocabularies.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = vocabularies
        .map((v) => v.id)
        .filter((id): id is string => id !== undefined);
      setSelectedIds(new Set(allIds));
    }
  };

  const handleEnterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedIds(new Set());
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleMoveClick = () => {
    if (selectedIds.size === 0) return;
    setShowMoveDialog(true);
  };

  const handleBulkMove = async (targetCollectionId: string) => {
    if (!id) return;

    try {
      const result = await VocabularyService.bulkMoveVocabularies(
        Array.from(selectedIds),
        targetCollectionId,
      );

      showAlert(t("collection.moveSuccess", { count: result.movedCount }), {
        variant: "success",
      });

      // Reset selection and reload data
      setSelectionMode(false);
      setSelectedIds(new Set());
      setShowMoveDialog(false);
      await loadCollectionData(id);
    } catch (error) {
      console.error("Failed to move vocabularies:", error);
      showAlert(t("messages.error"), { variant: "error" });
    }
  };

  if (loading) {
    return (
      <>
        <TopBar title={t("collection.title")} showBack backTo={backRoute} />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">{t("app.loading")}</div>
        </div>
      </>
    );
  }

  if (!collection) {
    return null;
  }

  return (
    <div className="min-h-screen bg-(--color-bg-light) transition-colors duration-200 pb-10">
      <TopBar title={collection.name} showBack backTo={backRoute} />

      {/* Bulk Action Toolbar */}
      {selectionMode && (
        <BulkActionToolbar
          selectedCount={selectedIds.size}
          totalCount={vocabularies.length}
          onSelectAll={handleSelectAll}
          onMove={handleMoveClick}
          onCancel={handleCancelSelection}
        />
      )}

      <div className="px-4 pt-6 space-y-6">
        {/* Collection Header */}
        <Card variant="gradient">
          <div className="text-center">
            <h1 className="text-4xl font-black mb-3">{collection.name}</h1>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-2 text-white/90">
                <Globe className="w-5 h-5" />
                <span className="capitalize text-lg">
                  {collection.language}
                </span>
              </div>
              <Badge
                variant="glass"
                className="bg-white/20 text-white flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span className="font-bold">
                  {collection.wordCount} {t("collections.words")}
                </span>
              </Badge>
            </div>
            {collection.description && (
              <p className="text-lg text-white/90">{collection.description}</p>
            )}
          </div>
        </Card>

        {/* Study Mode Button */}
        {!selectionMode && vocabularies.length > 0 && (
          <Card
            variant="glass"
            className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl btn-blue flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-1">
                  {t("study.studyMode") || "Study Mode"}
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {t("study.practiceWithoutTracking") ||
                    "Practice all words without tracking progress"}
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                onClick={() =>
                  navigate(`/practice/study?collection=${collection.id}`)
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                {t("study.start") || "Start"}
              </Button>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        {!selectionMode ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {canEdit && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => navigate("/vocabulary/add")}
                className="col-span-2 md:col-span-1"
              >
                {t("vocabulary.add")}
              </Button>
            )}
            {canEdit && vocabularies.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={CheckSquare}
                onClick={handleEnterSelectionMode}
              >
                {t("collection.select")}
              </Button>
            )}
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                icon={Edit}
                onClick={() => navigate(`/collections/${collection.id}/edit`)}
              >
                {t("buttons.edit")}
              </Button>
            )}
            {!collection.sharedBy && (
              <Button
                variant="secondary"
                size="sm"
                icon={Share2}
                onClick={() => setShowShareDialog(true)}
              >
                {t("buttons.share")}
              </Button>
            )}
            {canEdit && (
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={handleDelete}
              >
                {t("buttons.delete")}
              </Button>
            )}
          </div>
        ) : null}

        {/* Vocabulary List */}
        <div>
          <h2 className="text-2xl font-bold text-(--color-text-primary) mb-4">
            {t("vocabulary.title")}{" "}
            {totalCount > 0 && (
              <span className="text-(--color-text-muted) text-lg font-normal">
                ({vocabularies.length}/{totalCount})
              </span>
            )}
          </h2>
          <VocabularyList
            vocabularies={vocabularies}
            onVocabularyClick={handleVocabularyClick}
            loading={false}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelection={handleToggleSelection}
            loadingMore={loadingMore}
            hasMore={hasMore}
            onLoadMore={loadMoreVocabularies}
          />
        </div>
      </div>

      {/* Collection Selector Dialog */}
      <CollectionSelectorDialog
        isOpen={showMoveDialog}
        onClose={() => setShowMoveDialog(false)}
        onConfirm={handleBulkMove}
        currentCollectionId={collection.id || ""}
      />

      {/* Share Collection Dialog */}
      <ShareCollectionDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        collection={collection}
        onShareSuccess={() => {
          setShowShareDialog(false);
          if (id) {
            loadCollectionData(id);
          }
        }}
      />
    </div>
  );
};
