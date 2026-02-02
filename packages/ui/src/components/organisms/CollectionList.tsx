import React from "react";
import { useTranslation } from "react-i18next";
import { CollectionCard } from "@cham-lang/ui/components/molecules";
import type { Collection } from "@cham-lang/shared/types";
import chameleonIcon from "../../assets/chameleon.svg";

interface CollectionListProps {
  collections: Collection[];
  onCollectionClick?: (collection: Collection) => void;
  loading?: boolean;
}

export const CollectionList: React.FC<CollectionListProps> = ({
  collections,
  onCollectionClick,
  loading = false,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">{t("app.loading")}</div>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <img
            src={chameleonIcon}
            alt="Chameleon"
            className="w-24 h-24 mx-auto mb-4"
          />
          <p className="text-gray-600">{t("collections.noCollections")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {collections.map((collection) => (
        <CollectionCard
          key={collection.id}
          collection={collection}
          onClick={() => onCollectionClick?.(collection)}
        />
      ))}
    </div>
  );
};
