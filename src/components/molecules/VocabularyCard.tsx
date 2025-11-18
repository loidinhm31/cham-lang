import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, Badge } from '../atoms';
import type { Vocabulary, LanguageLevel } from '../../types/vocabulary';

interface VocabularyCardProps {
  vocabulary: Vocabulary;
  onClick?: () => void;
}

const levelColors: Record<LanguageLevel, string> = {
  A1: 'bg-emerald-500',
  A2: 'bg-teal-500',
  B1: 'bg-cyan-500',
  B2: 'bg-blue-500',
  C1: 'bg-amber-500',
  C2: 'bg-orange-500',
};

export const VocabularyCard: React.FC<VocabularyCardProps> = ({
  vocabulary,
  onClick,
}) => {
  const { t } = useTranslation();

  return (
    <Card variant="glass" hover onClick={onClick}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-1">{vocabulary.word}</h3>
          <p className="text-sm text-teal-700">{vocabulary.ipa}</p>
        </div>
        <span className={`${levelColors[vocabulary.level]} text-white text-sm font-bold px-3 py-1 rounded-full`}>
          {vocabulary.level}
        </span>
      </div>

      {vocabulary.definitions.length > 0 && (
        <p className="text-gray-700 mb-3 line-clamp-2">
          {vocabulary.definitions[0].meaning}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {vocabulary.topics.slice(0, 2).map((topic, idx) => (
            <Badge key={idx} variant="glass" className="text-xs py-1 px-2">
              {topic}
            </Badge>
          ))}
          {vocabulary.topics.length > 2 && (
            <Badge variant="glass" className="text-xs py-1 px-2">
              +{vocabulary.topics.length - 2}
            </Badge>
          )}
        </div>
        <button className="text-teal-600 font-semibold text-sm flex items-center">
          {t('buttons.viewDetails')} <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </Card>
  );
};
