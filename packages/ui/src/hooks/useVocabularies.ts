import { useCallback, useEffect, useState } from "react";
import type {
  Vocabulary,
  CreateVocabularyRequest,
  UpdateVocabularyRequest,
  SearchQuery,
} from "@cham-lang/shared/types";
import { VocabularyService } from "@cham-lang/ui/services";

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
        vocabList = await VocabularyService.getVocabulariesByCollection(
          collectionId,
          limit,
        );
      } else {
        vocabList = await VocabularyService.getAllVocabularies(language, limit);
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
    const vocabularyId = await VocabularyService.createVocabulary(request);
    await loadVocabularies();
    setSelectedVocabularyId(vocabularyId);
    return vocabularyId;
  };

  const updateVocabulary = async (
    request: UpdateVocabularyRequest,
  ): Promise<void> => {
    setVocabularies((prev) =>
      prev.map((v) => (v.id === request.id ? { ...v, ...request } : v)),
    );
    try {
      await VocabularyService.updateVocabulary(request);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update vocabulary");
      await loadVocabularies();
      throw err;
    }
  };

  const deleteVocabulary = async (vocabularyId: string): Promise<void> => {
    const snapshot = vocabularies;
    setVocabularies((prev) => prev.filter((v) => v.id !== vocabularyId));
    if (selectedVocabularyId === vocabularyId) {
      setSelectedVocabularyId(
        snapshot.length > 1
          ? snapshot.find((v) => v.id !== vocabularyId)?.id || null
          : null,
      );
    }
    try {
      await VocabularyService.deleteVocabulary(vocabularyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete vocabulary");
      await loadVocabularies();
      throw err;
    }
  };

  const searchVocabularies = async (query: SearchQuery): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await VocabularyService.searchVocabularies(query);
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
    await VocabularyService.bulkMoveVocabularies(
      vocabularyIds,
      targetCollectionId,
    );
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
