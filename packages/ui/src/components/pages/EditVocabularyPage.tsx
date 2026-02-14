import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useNav } from "@cham-lang/ui/hooks";
import { useTranslation } from "react-i18next";
import { TopBar } from "@cham-lang/ui/components/molecules";
import { VocabularyForm } from "@cham-lang/ui/components/organisms";
import { VocabularyService, CollectionService } from "@cham-lang/ui/services";
import type {
  Collection,
  CreateVocabularyRequest,
  Vocabulary,
} from "@cham-lang/shared/types";
import { useDialog } from "@cham-lang/ui/contexts";
import { useCollectionPermission } from "@cham-lang/ui/hooks";

interface LocationState {
  collectionId?: string;
  vocabularyIds?: string[];
  currentIndex?: number;
  totalWords?: number;
  canEdit?: boolean;
}

export const EditVocabularyPage: React.FC = () => {
  const { t } = useTranslation();
  const { navigate } = useNav();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { showAlert } = useDialog();
  const state = location.state as LocationState;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [initialData, setInitialData] = useState<
    Partial<CreateVocabularyRequest> | undefined
  >();
  const [parentCollection, setParentCollection] = useState<Collection | null>(
    null,
  );
  const { canEdit, loading: permLoading } =
    useCollectionPermission(parentCollection);

  useEffect(() => {
    if (id) {
      loadVocabulary(id);
    }
  }, [id]);

  useEffect(() => {
    if (!permLoading && parentCollection && !canEdit) {
      showAlert(t("messages.error"), { variant: "error" });
      navigate(`/vocabulary/${id}`);
    }
  }, [permLoading, canEdit, parentCollection]);

  const loadVocabulary = async (vocabId: string) => {
    try {
      setLoadingData(true);
      const vocabulary: Vocabulary =
        await VocabularyService.getVocabulary(vocabId);

      // Load parent collection for permission check
      if (vocabulary.collectionId) {
        try {
          const collection = await CollectionService.getCollection(
            vocabulary.collectionId,
          );
          setParentCollection(collection);
        } catch {
          // If collection not found, allow editing (orphan vocab)
        }
      }

      // Convert Vocabulary to CreateVocabularyRequest format
      setInitialData({
        word: vocabulary.word,
        wordType: vocabulary.wordType,
        level: vocabulary.level,
        ipa: vocabulary.ipa,
        concept: vocabulary.concept,
        definitions: vocabulary.definitions,
        exampleSentences: vocabulary.exampleSentences,
        audioUrl: vocabulary.audioUrl,
        topics: vocabulary.topics,
        relatedWords: vocabulary.relatedWords,
        language: vocabulary.language,
        collectionId: vocabulary.collectionId,
      });
    } catch (error) {
      console.error("Failed to load vocabulary:", error);
      showAlert(t("messages.error"), { variant: "error" });
      navigate("/");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (data: CreateVocabularyRequest) => {
    if (!id) return;

    try {
      setLoading(true);
      await VocabularyService.updateVocabulary({
        id,
        ...data,
      });
      showAlert(t("messages.saveSuccess"), { variant: "success" });
      navigate(`/vocabulary/${id}`, {
        state: {
          collectionId: state?.collectionId,
          vocabularyIds: state?.vocabularyIds,
          currentIndex: state?.currentIndex,
          totalWords: state?.totalWords,
        },
      });
    } catch (error) {
      console.error("Failed to update vocabulary:", error);
      showAlert(t("messages.error"), { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (id) {
      navigate(`/vocabulary/${id}`, {
        state: {
          collectionId: state?.collectionId,
          vocabularyIds: state?.vocabularyIds,
          currentIndex: state?.currentIndex,
          totalWords: state?.totalWords,
        },
      });
    } else {
      navigate("/");
    }
  };

  if (loadingData) {
    return (
      <>
        <TopBar
          title={t("vocabulary.edit")}
          showBack
          backTo={id ? `/vocabulary/${id}` : "/"}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--color-text-secondary)]">
            {t("app.loading")}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title={t("vocabulary.edit")}
        showBack
        backTo={id ? `/vocabulary/${id}` : "/"}
      />

      <div className="px-4 pt-6 pb-24">
        <VocabularyForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </div>
    </>
  );
};
