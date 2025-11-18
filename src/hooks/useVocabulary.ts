import { useState } from 'react';
import { VocabularyService } from '../services/vocabulary.service';
import type { Vocabulary, SearchQuery } from '../types/vocabulary';

export const useVocabulary = (language: string = 'en') => {
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVocabularies = async (limit?: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await VocabularyService.getAllVocabularies(language, limit);
      setVocabularies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vocabularies');
      console.error('Failed to load vocabularies:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchVocabularies = async (query: SearchQuery) => {
    try {
      setLoading(true);
      setError(null);
      const data = await VocabularyService.searchVocabularies(query);
      setVocabularies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const getVocabularyById = async (id: string): Promise<Vocabulary | null> => {
    try {
      setLoading(true);
      setError(null);
      const data = await VocabularyService.getVocabulary(id);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vocabulary');
      console.error('Failed to load vocabulary:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getVocabulariesByTopic = async (topic: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await VocabularyService.getVocabulariesByTopic(topic, language);
      setVocabularies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vocabularies by topic');
      console.error('Failed to load vocabularies by topic:', err);
    } finally {
      setLoading(false);
    }
  };

  const getVocabulariesByLevel = async (level: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await VocabularyService.getVocabulariesByLevel(level, language);
      setVocabularies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vocabularies by level');
      console.error('Failed to load vocabularies by level:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    vocabularies,
    loading,
    error,
    loadVocabularies,
    searchVocabularies,
    getVocabularyById,
    getVocabulariesByTopic,
    getVocabulariesByLevel,
  };
};
