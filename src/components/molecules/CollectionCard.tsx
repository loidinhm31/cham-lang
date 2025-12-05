import React from "react";
import { BookOpen, ChevronRight, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Card, type CardVariant } from "@/components/atoms";
import type { Collection } from "@/types/collection";

interface CollectionCardProps {
  collection: Collection;
  onClick?: () => void;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  onClick,
}) => {
  const { t } = useTranslation();

  // Rotate through vibrant colors for collections
  const collectionColors: CardVariant[] = [
    "clay-blue",
    "clay-mint",
    "clay-lilac",
    "clay-peach",
    "clay-yellow",
    "clay-pink",
  ];
  const colorIndex = collection.name.length % collectionColors.length;
  const cardColor = collectionColors[colorIndex];

  return (
    <Card variant={cardColor} hover onClick={onClick}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {collection.name}
          </h3>
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600">
            <Globe className="w-4 h-4" />
            <span className="capitalize">{collection.language}</span>
          </div>
        </div>
        <Badge
          variant="primary"
          className="flex items-center gap-1.5 px-3 py-1.5 flex-shrink-0 ml-2"
        >
          <BookOpen className="w-4 h-4" />
          <span className="font-bold">{collection.word_count}</span>
        </Badge>
      </div>

      {collection.description && (
        <p className="text-gray-800 font-medium mb-4 line-clamp-2">
          {collection.description}
        </p>
      )}

      <div className="flex items-center justify-end">
        <button className="text-indigo-600 font-bold text-sm flex items-center hover:text-indigo-700 transition-colors">
          {t("buttons.viewDetails")} <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </Card>
  );
};
