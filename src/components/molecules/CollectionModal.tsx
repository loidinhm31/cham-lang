import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Input, TextArea, Select, Button, Card } from '../atoms';
import type { Collection, CreateCollectionRequest } from '../../types/collection';

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCollectionRequest) => Promise<void>;
  initialData?: Collection;
  title: string;
}

export const CollectionModal: React.FC<CollectionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCollectionRequest>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    language: initialData?.language || 'en',
    is_public: initialData?.is_public || false,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description,
        language: initialData.language,
        is_public: initialData.is_public,
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to submit collection:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'vi', label: 'Tiếng Việt' },
    { value: 'ko', label: '한국어 (Korean)' },
    { value: 'ja', label: '日本語 (Japanese)' },
    { value: 'zh', label: '中文 (Chinese)' },
    { value: 'es', label: 'Español (Spanish)' },
    { value: 'fr', label: 'Français (French)' },
    { value: 'de', label: 'Deutsch (German)' },
  ];

  const visibilityOptions = [
    { value: 'false', label: t('collections.private') },
    { value: 'true', label: t('collections.public') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('collections.name')}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('collections.name')}
            required
          />

          <TextArea
            label={t('collections.description')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={t('collections.description')}
            rows={3}
          />

          <Select
            label={t('collections.language')}
            options={languageOptions}
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
          />

          <Select
            label={t('collections.visibility')}
            options={visibilityOptions}
            value={formData.is_public.toString()}
            onChange={(e) => setFormData({ ...formData, is_public: e.target.value === 'true' })}
          />

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" fullWidth onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
