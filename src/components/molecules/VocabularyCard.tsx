import React from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Card, type CardVariant } from "@/components/atoms";
import type { LanguageLevel, Vocabulary } from "@/types/vocabulary";

interface VocabularyCardProps {
  vocabulary: Vocabulary;
  onClick?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (e: React.MouseEvent) => void;
}

const levelColors: Record<LanguageLevel, string> = {
  A1: "bg-[#98FF98] text-gray-800 border-[#7EE57E]",
  A2: "bg-[#ADD8E6] text-gray-800 border-[#8FC4DE]",
  B1: "bg-[#E6E6FA] text-gray-800 border-[#D0D0F0]",
  B2: "bg-[#FFF9C4] text-gray-800 border-[#FFF59D]",
  C1: "bg-[#FDBCB4] text-gray-800 border-[#FCA89D]",
  C2: "bg-[#FFD1DC] text-gray-800 border-[#FFB3C1]",
};

export const VocabularyCard: React.FC<VocabularyCardProps> = ({
  vocabulary,
  onClick,
  selectionMode = false,
  isSelected = false,
  onToggleSelection,
}) => {
  const { t } = useTranslation();

  // Determine card color based on vocabulary level
  const cardVariants: Record<LanguageLevel, CardVariant> = {
    A1: "clay-mint",
    A2: "clay-blue",
    B1: "clay-lilac",
    B2: "clay-yellow",
    C1: "clay-peach",
    C2: "clay-pink",
  };

  return (
    <Card
      variant={cardVariants[vocabulary.level]}
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
            <h3 className="text-2xl font-bold text-gray-900 mb-1">
              {vocabulary.word}
            </h3>
            <p className="text-sm font-semibold text-indigo-600">
              {vocabulary.ipa}
            </p>
          </div>
        </div>
        <span
          className={`${levelColors[vocabulary.level]} text-sm font-bold px-3 py-1.5 rounded-xl border-2 shadow-[0_3px_0_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.05)] shrink-0 ml-2`}
        >
          {vocabulary.level}
        </span>
      </div>

      {vocabulary.definitions.length > 0 && (
        <p className="text-gray-800 font-medium mb-4 line-clamp-2">
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
        <button className="text-indigo-600 font-bold text-sm flex items-center hover:text-indigo-700 transition-colors">
          {t("buttons.viewDetails")} <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </Card>
  );
};
