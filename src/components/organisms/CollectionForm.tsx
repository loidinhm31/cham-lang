import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Input, TextArea, Select, Button } from '../atoms';
import type { CreateCollectionRequest } from '../../types/collection';

interface CollectionFormProps {
  initialData?: Partial<CreateCollectionRequest & { id: string }>;
  onSubmit: (data: CreateCollectionRequest & { id?: string }) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const CollectionForm: React.FC<CollectionFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    id: initialData?.id || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    language: initialData?.language || 'en',
    is_public: initialData?.is_public ?? false,
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card variant="glass">
        <div className="space-y-4">
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
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel} disabled={loading}>
          {t('buttons.cancel')}
        </Button>
        <Button type="submit" variant="primary" fullWidth disabled={loading}>
          {loading ? t('messages.connecting') : t('buttons.save')}
        </Button>
      </div>
    </form>
  );
};
