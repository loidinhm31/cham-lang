import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Brain, PenTool, CheckSquare, Library } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CollectionService } from '../../services/collection.service';
import { TopBar } from '../molecules';
import { Card, Select, Button } from '../atoms';
import type { Collection } from '../../types/collection';

export const PracticeModePage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [step, setStep] = useState<'collection' | 'mode'>('collection');

  useEffect(() => {
    loadCollections();
  }, [user]);

  const loadCollections = async () => {
    if (!user) return;

    try {
      const data = await CollectionService.getUserCollections(user.user_id);
      setCollections(data);

      // Auto-select first collection
      if (data.length > 0) {
        setSelectedCollection(data[0].id || '');
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    } finally {
      setLoadingCollections(false);
    }
  };

  const modes = [
    {
      id: 'flashcard',
      title: t('practice.flashcardMode'),
      description: t('practice.flashcardDescription'),
      icon: Brain,
      color: 'from-purple-500 to-pink-600',
      path: '/practice/flashcard',
    },
    {
      id: 'fillword',
      title: t('practice.fillWordMode'),
      description: t('practice.fillWordDescription'),
      icon: PenTool,
      color: 'from-blue-500 to-cyan-600',
      path: '/practice/fill-word',
    },
    {
      id: 'multiplechoice',
      title: t('practice.multipleChoiceMode'),
      description: t('practice.multipleChoiceDescription'),
      icon: CheckSquare,
      color: 'from-amber-500 to-orange-600',
      path: '/practice/multiple-choice',
    },
  ];

  const collectionOptions = collections.map(collection => ({
    value: collection.id || '',
    label: `${collection.name} (${collection.word_count} words)`,
  }));

  const selectedCollectionData = collections.find(c => c.id === selectedCollection);

  if (loadingCollections) {
    return (
      <>
        <TopBar title={t('practice.title')} showBack />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-gray-600">{t('common.loading')}</div>
        </div>
      </>
    );
  }

  if (collections.length === 0) {
    return (
      <>
        <TopBar title={t('practice.title')} showBack />
        <div className="px-4 pt-6">
          <Card variant="glass" className="p-12 text-center">
            <Library className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {t('practice.noCollections')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('practice.noCollectionsDescription')}
            </p>
            <Button variant="primary" onClick={() => navigate('/collections')}>
              {t('collections.create')}
            </Button>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title={t('practice.title')} showBack />

      <div className="px-4 pt-6 space-y-6">
        {step === 'collection' ? (
          <>
            {/* Collection Selection */}
            <div className="text-center py-6">
              <div className="text-6xl mb-4">📚</div>
              <h1 className="text-4xl font-black text-gray-800 mb-2">
                {t('practice.selectCollection')}
              </h1>
              <p className="text-lg text-gray-700">{t('practice.selectCollectionDescription')}</p>
            </div>

            <Card variant="glass">
              <div className="space-y-4">
                <Select
                  label={t('vocabulary.collection')}
                  options={collectionOptions}
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                />

                {selectedCollectionData && (
                  <div className="p-4 bg-white/40 rounded-2xl space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('collections.language')}:</span>
                      <span className="font-semibold text-gray-800">{selectedCollectionData.language}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{t('collections.words')}:</span>
                      <span className="font-semibold text-gray-800">{selectedCollectionData.word_count}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-2">
                      {selectedCollectionData.description}
                    </div>
                  </div>
                )}

                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => setStep('mode')}
                  disabled={!selectedCollection}
                >
                  {t('practice.continue')}
                </Button>
              </div>
            </Card>
          </>
        ) : (
          <>
            {/* Mode Selection */}
            <div className="text-center py-6">
              <div className="text-6xl mb-4">🎓</div>
              <h1 className="text-4xl font-black text-gray-800 mb-2">
                {t('practice.selectMode')}
              </h1>
              <p className="text-lg text-gray-700">{t('practice.selectModeDescription')}</p>
            </div>

            <div className="space-y-4">
              {modes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <Card
                    key={mode.id}
                    variant="default"
                    hover
                    onClick={() => navigate(`${mode.path}?collection=${selectedCollection}`)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-6">
                      <div
                        className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className="w-10 h-10 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">{mode.title}</h3>
                        <p className="text-gray-600">{mode.description}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Button
              variant="secondary"
              fullWidth
              onClick={() => setStep('collection')}
            >
              {t('practice.changeCollection')}
            </Button>
          </>
        )}
      </div>
    </>
  );
};
