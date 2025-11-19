import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CollectionService } from '../../services/collection.service';
import { TopBar } from '../molecules';
import { CollectionForm } from '../organisms';
import type { CreateCollectionRequest } from '../../types/collection';

export const CreateCollectionPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: CreateCollectionRequest) => {
    try {
      setLoading(true);
      await CollectionService.createCollection(data);
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
        <CollectionForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </div>
    </>
  );
};
