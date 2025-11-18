import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { CollectionService } from '../../services/collection.service';
import { TopBar } from '../molecules';
import { Card, Input, TextArea, Select, Button } from '../atoms';
import type { CreateCollectionRequest } from '../../types/collection';

export const CreateCollectionPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateCollectionRequest>({
    name: '',
    description: '',
    language: 'en',
    is_public: false,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      await CollectionService.createCollection(user.user_id, formData);
      alert(t('collections.createSuccess'));
      navigate('/collections');
    } catch (error) {
      console.error('Failed to create collection:', error);
      alert(t('messages.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/collections');
  };

  return (
    <>
      <TopBar title={t('collections.create')} showBack />

      <div className="px-4 pt-6">
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
            <Button type="button" variant="secondary" fullWidth onClick={handleCancel}>
              {t('buttons.cancel')}
            </Button>
            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading ? t('messages.connecting') : t('buttons.save')}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};
