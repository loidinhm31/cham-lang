import { useCallback, useEffect, useState } from "react";
import type {
  Vocabulary,
  CreateVocabularyRequest,
  UpdateVocabularyRequest,
  SearchQuery,
} from "@cham-lang/shared/types";
import { chamLangAPI } from "@cham-lang/ui/services";

interface UseVocabulariesOptions {
  language?: string;
  collectionId?: string;
  autoLoad?: boolean;
  limit?: number;
}

export const useVocabularies = (options: UseVocabulariesOptions = {}) => {
  const { language, collectionId, autoLoad = true, limit } = options;

  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [selectedVocabularyId, setSelectedVocabularyId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVocabularies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let vocabList: Vocabulary[];
      if (collectionId) {
        vocabList = await chamLangAPI.getVocabulariesByCollection(
          collectionId,
          limit,
        );
      } else {
        vocabList = await chamLangAPI.getAllVocabularies(language, limit);
      }
      setVocabularies(vocabList);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load vocabularies",
      );
    } finally {
      setIsLoading(false);
    }
  }, [language, collectionId, limit]);

  const createVocabulary = async (
    request: CreateVocabularyRequest,
  ): Promise<string> => {
    const vocabularyId = await chamLangAPI.createVocabulary(request);
    await loadVocabularies();
    setSelectedVocabularyId(vocabularyId);
    return vocabularyId;
  };

  const updateVocabulary = async (
    request: UpdateVocabularyRequest,
  ): Promise<void> => {
    await chamLangAPI.updateVocabulary(request);
    await loadVocabularies();
  };

  const deleteVocabulary = async (vocabularyId: string): Promise<void> => {
    await chamLangAPI.deleteVocabulary(vocabularyId);
    await loadVocabularies();
    if (selectedVocabularyId === vocabularyId) {
      setSelectedVocabularyId(
        vocabularies.length > 1
          ? vocabularies.find((v) => v.id !== vocabularyId)?.id || null
          : null,
      );
    }
  };

  const searchVocabularies = async (query: SearchQuery): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await chamLangAPI.searchVocabularies(query);
      setVocabularies(results);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to search vocabularies",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const bulkMoveVocabularies = async (
    vocabularyIds: string[],
    targetCollectionId: string,
  ): Promise<void> => {
    await chamLangAPI.bulkMoveVocabularies(vocabularyIds, targetCollectionId);
    await loadVocabularies();
  };

  useEffect(() => {
    if (autoLoad) {
      loadVocabularies();
    }
  }, [autoLoad, loadVocabularies]);

  const selectedVocabulary = vocabularies.find(
    (v) => v.id === selectedVocabularyId,
  );

  return {
    vocabularies,
    selectedVocabularyId,
    selectedVocabulary,
    setSelectedVocabularyId,
    isLoading,
    error,
    setError,
    loadVocabularies,
    createVocabulary,
    updateVocabulary,
    deleteVocabulary,
    searchVocabularies,
    bulkMoveVocabularies,
  };
};
