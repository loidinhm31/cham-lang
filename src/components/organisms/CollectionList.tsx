import React from 'react';
import { useTranslation } from 'react-i18next';
import { CollectionCard } from '../molecules';
import type { Collection } from '../../types/collection';

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
                <div className="text-gray-600">{t('app.loading')}</div>
            </div>
        );
    }

    if (collections.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="text-6xl mb-4">🦎</div>
                    <p className="text-gray-600">{t('collection.noResults')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
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
