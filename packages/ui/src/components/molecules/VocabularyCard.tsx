import React from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Card, type CardVariant } from "@cham-lang/ui/components/atoms";
import type { WordType, Vocabulary } from "@cham-lang/shared/types";

interface VocabularyCardProps {
  vocabulary: Vocabulary;
  onClick?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (e: React.MouseEvent) => void;
}

const wordTypeColors: Record<WordType, string> = {
  "n/a": "bg-gray-200 text-[var(--color-text-primary)] border-gray-300",
  noun: "bg-[#98FF98] text-[var(--color-text-primary)] border-[#7EE57E]",
  verb: "bg-[#ADD8E6] text-[var(--color-text-primary)] border-[#8FC4DE]",
  adjective: "bg-[#E6E6FA] text-[var(--color-text-primary)] border-[#D0D0F0]",
  adverb: "bg-[#FFF9C4] text-[var(--color-text-primary)] border-[#FFF59D]",
  pronoun: "bg-[#FDBCB4] text-[var(--color-text-primary)] border-[#FCA89D]",
  preposition: "bg-[#FFD1DC] text-[var(--color-text-primary)] border-[#FFB3C1]",
  conjunction: "bg-[#FFE4B5] text-[var(--color-text-primary)] border-[#FFD89B]",
  interjection:
    "bg-[#DDA0DD] text-[var(--color-text-primary)] border-[#C77DC7]",
  phrase: "bg-[#F0E68C] text-[var(--color-text-primary)] border-[#E6D66C]",
};

export const VocabularyCard: React.FC<VocabularyCardProps> = ({
  vocabulary,
  onClick,
  selectionMode = false,
  isSelected = false,
  onToggleSelection,
}) => {
  const { t } = useTranslation();

  // Determine card color based on word type
  const cardVariants: Record<WordType, CardVariant> = {
    "n/a": "clay-gray",
    noun: "clay-mint",
    verb: "clay-blue",
    adjective: "clay-lilac",
    adverb: "clay-yellow",
    pronoun: "clay-peach",
    preposition: "clay-pink",
    conjunction: "clay-yellow",
    interjection: "clay-lilac",
    phrase: "clay-mint",
  };

  return (
    <Card
      variant={cardVariants[vocabulary.wordType]}
      hover
      onClick={onClick}
      className={
        selectionMode && isSelected
          ? "ring-4 ring-orange-400 ring-offset-2"
          : ""
      }
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          {selectionMode && onToggleSelection && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelection(e);
              }}
              className="w-6 h-6 rounded-lg border-[3px] border-gray-400 text-orange-500 focus:ring-2 focus:ring-orange-500 cursor-pointer mt-1 shrink-0 shadow-sm"
            />
          )}
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1 whitespace-pre-line">
              {vocabulary.word}
            </h3>
            {vocabulary.concept && (
              <p className="font-medium text-[var(--color-text-secondary)] -mt-1 mb-1 italic">
                {vocabulary.concept}
              </p>
            )}
            <p className="text-sm font-semibold text-[var(--color-primary-600)]">
              {vocabulary.ipa}
            </p>
          </div>
        </div>
        <span
          className={`${wordTypeColors[vocabulary.wordType]} text-sm font-bold px-3 py-1.5 rounded-xl border-2 shadow-[0_3px_0_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.05)] shrink-0 ml-2`}
        >
          {vocabulary.wordType}
        </span>
      </div>

      {vocabulary.definitions.length > 0 && (
        <p className="text-xl text-[var(--color-text-primary)] font-semibold mb-4 line-clamp-2">
          {vocabulary.definitions[0].meaning}
        </p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {vocabulary.topics.slice(0, 2).map((topic, idx) => (
            <Badge key={idx} variant="lilac" className="text-xs">
              {topic}
            </Badge>
          ))}
          {vocabulary.topics.length > 2 && (
            <Badge variant="peach" className="text-xs">
              +{vocabulary.topics.length - 2}
            </Badge>
          )}
        </div>
        <button className="text-[var(--color-primary-600)] font-bold text-sm flex items-center hover:text-[var(--color-primary-700)] transition-colors">
          {t("buttons.viewDetails")} <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </Card>
  );
};
