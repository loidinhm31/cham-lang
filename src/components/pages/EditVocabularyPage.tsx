import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TopBar } from "@/components/molecules";
import { VocabularyForm } from "@/components/organisms";
import { VocabularyService } from "@/services/vocabulary.service";
import type { CreateVocabularyRequest, Vocabulary } from "@/types/vocabulary";
import { useDialog } from "@/contexts";

interface LocationState {
  collectionId?: string;
  vocabularyIds?: string[];
  currentIndex?: number;
  totalWords?: number;
}

export const EditVocabularyPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { showAlert } = useDialog();
  const state = location.state as LocationState;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [initialData, setInitialData] = useState<
    Partial<CreateVocabularyRequest> | undefined
  >();

  useEffect(() => {
    if (id) {
      loadVocabulary(id);
    }
  }, [id]);

  const loadVocabulary = async (vocabId: string) => {
    try {
      setLoadingData(true);
      const vocabulary: Vocabulary =
        await VocabularyService.getVocabulary(vocabId);

      // Convert Vocabulary to CreateVocabularyRequest format
      setInitialData({
        word: vocabulary.word,
        word_type: vocabulary.word_type,
        level: vocabulary.level,
        ipa: vocabulary.ipa,
        concept: vocabulary.concept,
        definitions: vocabulary.definitions,
        example_sentences: vocabulary.example_sentences,
        audio_url: vocabulary.audio_url,
        topics: vocabulary.topics,
        related_words: vocabulary.related_words,
        language: vocabulary.language,
        collection_id: vocabulary.collection_id,
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
          <div className="text-gray-600">{t("app.loading")}</div>
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

      <div className="px-4 pt-6">
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
