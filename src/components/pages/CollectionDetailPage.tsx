import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Edit, Trash2, Globe, BookOpen, Plus } from 'lucide-react';
import { TopBar } from '../molecules';
import { VocabularyList } from '../organisms';
import { Card, Badge, Button } from '../atoms';
import { CollectionService } from '../../services/collection.service';
import { VocabularyService } from '../../services/vocabulary.service';
import type { Collection } from '../../types/collection';
import type { Vocabulary } from '../../types/vocabulary';

export const CollectionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCollectionData(id);
    }
  }, [id]);

  const loadCollectionData = async (collectionId: string) => {
    try {
      setLoading(true);
      const [collectionData, vocabData] = await Promise.all([
        CollectionService.getCollection(collectionId),
        VocabularyService.getVocabulariesByCollection(collectionId),
      ]);
      setCollection(collectionData);
      setVocabularies(vocabData);
    } catch (error) {
      console.error('Failed to load collection:', error);
      alert(t('messages.error'));
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!collection?.id || !confirm(t('messages.confirmDelete'))) {
      return;
    }

    try {
      await CollectionService.deleteCollection(collection.id);
      alert(t('messages.deleteSuccess'));
      navigate('/');
    } catch (error) {
      console.error('Failed to delete collection:', error);
      alert(t('messages.error'));
    }
  };

  const handleVocabularyClick = (vocabulary: Vocabulary) => {
    navigate(`/vocabulary/${vocabulary.id}`);
  };

  if (loading) {
    return (
      <>
        <TopBar title={t('collection.title')} showBack />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">{t('app.loading')}</div>
        </div>
      </>
    );
  }

  if (!collection) {
    return null;
  }

  return (
    <>
      <TopBar title={collection.name} showBack />

      <div className="px-4 pt-6 space-y-6">
        {/* Collection Header */}
        <Card variant="gradient">
          <div className="text-center">
            <h1 className="text-4xl font-black mb-3">{collection.name}</h1>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-2 text-white/90">
                <Globe className="w-5 h-5" />
                <span className="capitalize text-lg">{collection.language}</span>
              </div>
              <Badge variant="glass" className="bg-white/20 text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="font-bold">{collection.word_count} {t('collections.words')}</span>
              </Badge>
            </div>
            {collection.description && (
              <p className="text-lg text-white/90">{collection.description}</p>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="primary"
            size="lg"
            icon={Plus}
            fullWidth
            onClick={() => navigate('/vocabulary/add')}
          >
            {t('vocabulary.add')}
          </Button>
          <Button
            variant="outline"
            size="lg"
            icon={Edit}
            onClick={() => navigate(`/collections/${collection.id}/edit`)}
          >
            {t('buttons.edit')}
          </Button>
          <Button
            variant="danger"
            size="lg"
            icon={Trash2}
            onClick={handleDelete}
          >
            {t('buttons.delete')}
          </Button>
        </div>

        {/* Vocabulary List */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {t('vocabulary.title')}
          </h2>
          <VocabularyList
            vocabularies={vocabularies}
            onVocabularyClick={handleVocabularyClick}
            loading={false}
          />
        </div>
      </div>
    </>
  );
};
