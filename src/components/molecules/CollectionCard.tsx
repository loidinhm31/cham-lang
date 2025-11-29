import React from "react";
import { BookOpen, ChevronRight, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Card } from "@/components/atoms";
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

  return (
    <Card variant="glass" hover onClick={onClick}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-1">
            {collection.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Globe className="w-4 h-4" />
            <span className="capitalize">{collection.language}</span>
          </div>
        </div>
        <Badge variant="glass" className="flex items-center gap-1 px-3 py-1">
          <BookOpen className="w-3 h-3" />
          <span className="font-bold">{collection.word_count}</span>
        </Badge>
      </div>

      {collection.description && (
        <p className="text-gray-700 mb-4 line-clamp-2">
          {collection.description}
        </p>
      )}

      <div className="flex items-center justify-end">
        <button className="text-teal-600 font-semibold text-sm flex items-center">
          {t("buttons.viewDetails")} <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </Card>
  );
};
