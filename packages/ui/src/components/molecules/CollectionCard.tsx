import React from "react";
import { BookOpen, ChevronRight, Globe, Users, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge, Card, type CardVariant } from "@cham-lang/ui/components/atoms";
import type { Collection } from "@cham-lang/shared/types";

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

  const isOwner = !collection.sharedBy;
  const isShared = collection.sharedWith.length > 0;

  return (
    <Card variant={cardColor} hover onClick={onClick}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-start gap-2 mb-2">
            <h3 className="text-2xl font-bold text-gray-900 flex-1">
              {collection.name}
            </h3>
            {/* Sharing status badges */}
            <div className="flex flex-col gap-1 items-end">
              {!isOwner && (
                <Badge
                  variant="glass"
                  className="flex items-center gap-1 text-xs"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>{t("collections.sharedWithYou")}</span>
                </Badge>
              )}
              {isOwner && isShared && (
                <Badge
                  variant="info"
                  className="flex items-center gap-1 text-xs"
                >
                  <Users className="w-3 h-3" />
                  <span>{collection.sharedWith.length}</span>
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600">
            <Globe className="w-4 h-4" />
            <span className="capitalize">{collection.language}</span>
          </div>
        </div>
        <Badge
          variant="primary"
          className="flex items-center gap-1.5 px-3 py-1.5 shrink-0 ml-2"
        >
          <BookOpen className="w-4 h-4" />
          <span className="font-bold">{collection.wordCount}</span>
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
