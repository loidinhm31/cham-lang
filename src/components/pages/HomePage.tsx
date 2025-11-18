import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Brain } from 'lucide-react';
import { TopBar, SearchBar } from '../molecules';
import { VocabularyList } from '../organisms';
import { Button } from '../atoms';
import { VocabularyService } from '../../services/vocabulary.service';
import type { Vocabulary } from '../../types/vocabulary';

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadVocabularies();
  }, []);

  const loadVocabularies = async () => {
    try {
      setLoading(true);
      const data = await VocabularyService.getAllVocabularies('en', 50);
      setVocabularies(data);
    } catch (error) {
      console.error('Failed to load vocabularies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadVocabularies();
      return;
    }

    try {
      setLoading(true);
      const data = await VocabularyService.searchVocabularies({
        query: searchQuery,
        language: 'en',
      });
      setVocabularies(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVocabularyClick = (vocabulary: Vocabulary) => {
    navigate(`/vocabulary/${vocabulary.id}`);
  };

  return (
    <>
      <TopBar title={t('app.name')} showBack={false} />

      <div className="px-4 pt-6 space-y-6">
        {/* Hero Section */}
        <div className="text-center py-6">
          <div className="text-6xl mb-4">🦎</div>
          <h1 className="text-4xl font-black text-gray-800 mb-2">{t('app.name').toUpperCase()}</h1>
          <p className="text-lg text-gray-700">{t('app.tagline')}</p>
        </div>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          placeholder={t('vocabulary.search')}
        />

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            icon={Brain}
            fullWidth
            onClick={() => navigate('/practice')}
          >
            {t('practice.title')}
          </Button>
          <Button
            variant="primary"
            size="lg"
            icon={Plus}
            fullWidth
            onClick={() => navigate('/vocabulary/add')}
          >
            {t('vocabulary.add')}
          </Button>
        </div>

        {/* Vocabulary List */}
        <VocabularyList
          vocabularies={vocabularies}
          onVocabularyClick={handleVocabularyClick}
          loading={loading}
        />
      </div>
    </>
  );
};
