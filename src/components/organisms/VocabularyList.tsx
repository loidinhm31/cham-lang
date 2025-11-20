import React from 'react';
import { useTranslation } from 'react-i18next';
import { VocabularyCard } from '../molecules';
import type { Vocabulary } from '../../types/vocabulary';

interface VocabularyListProps {
  vocabularies: Vocabulary[];
  onVocabularyClick?: (vocabulary: Vocabulary) => void;
  loading?: boolean;
}

export const VocabularyList: React.FC<VocabularyListProps> = ({
  vocabularies,
  onVocabularyClick,
  loading = false,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">{t('app.loading')}</div>
      </div>
    );
  }

  if (vocabularies.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <img src="/chameleon.svg" alt="Chameleon" className="w-24 h-24 mx-auto mb-4" />
          <p className="text-gray-600">{t('vocabulary.noResults')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {vocabularies.map((vocabulary) => (
        <VocabularyCard
          key={vocabulary.id}
          vocabulary={vocabulary}
          onClick={() => onVocabularyClick?.(vocabulary)}
        />
      ))}
    </div>
  );
};
