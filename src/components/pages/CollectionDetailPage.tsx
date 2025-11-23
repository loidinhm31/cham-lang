import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, Edit, Globe, Plus, Trash2, CheckSquare } from "lucide-react";
import { TopBar, BulkActionToolbar } from "@/components/molecules";
import { VocabularyList, CollectionSelectorDialog } from "@/components/organisms";
import { Badge, Button, Card } from "@/components/atoms";
import { CollectionService } from "@/services/collection.service.ts";
import { VocabularyService } from "@/services/vocabulary.service.ts";
import type { Collection } from "@/types/collection.ts";
import type { Vocabulary } from "@/types/vocabulary.ts";
import { getVocabularyId } from "@/types/vocabulary.ts";
import { useDialog } from "@/contexts";

export const CollectionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showAlert, showConfirm } = useDialog();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  useEffect(() => {
    if (id) {
      loadCollectionData(id);
    }
  }, [id]);

  const loadCollectionData = async (collectionId: string) => {
    try {
      setLoading(true);
      const [collectionData, vocabData] = await Promise.all([
        CollectionService.getCollection(collectionId),
        VocabularyService.getVocabulariesByCollection(collectionId),
      ]);
      setCollection(collectionData);
      setVocabularies(vocabData);
    } catch (error) {
      console.error("Failed to load collection:", error);
      showAlert(t("messages.error"), { variant: "error" });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

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
      navigate("/");
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
        .map((v) => getVocabularyId(v))
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
        targetCollectionId
      );

      showAlert(
        t("collection.moveSuccess", { count: result.moved_count }),
        { variant: "success" }
      );

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
        <TopBar title={t("collection.title")} showBack />
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
    <>
      <TopBar title={collection.name} showBack />

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
                  {collection.word_count} {t("collections.words")}
                </span>
              </Badge>
            </div>
            {collection.description && (
              <p className="text-lg text-white/90">{collection.description}</p>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        {!selectionMode ? (
          <div className="flex gap-3">
            <Button
              variant="primary"
              size="lg"
              icon={Plus}
              fullWidth
              onClick={() => navigate("/vocabulary/add")}
            >
              {t("vocabulary.add")}
            </Button>
            {vocabularies.length > 0 && (
              <Button
                variant="secondary"
                size="lg"
                icon={CheckSquare}
                onClick={handleEnterSelectionMode}
              >
                {t("collection.select")}
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              icon={Edit}
              onClick={() => navigate(`/collections/${collection.id}/edit`)}
            >
              {t("buttons.edit")}
            </Button>
            <Button
              variant="danger"
              size="lg"
              icon={Trash2}
              onClick={handleDelete}
            >
              {t("buttons.delete")}
            </Button>
          </div>
        ) : null}

        {/* Vocabulary List */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {t("vocabulary.title")}
          </h2>
          <VocabularyList
            vocabularies={vocabularies}
            onVocabularyClick={handleVocabularyClick}
            loading={false}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelection={handleToggleSelection}
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
    </>
  );
};
