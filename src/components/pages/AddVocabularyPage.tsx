import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { TopBar } from '../molecules';
import { VocabularyForm } from '../organisms';
import { VocabularyService } from '../../services/vocabulary.service';
import type { CreateVocabularyRequest } from '../../types/vocabulary';

export const AddVocabularyPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: CreateVocabularyRequest) => {
    if (!user) return;

    try {
      setLoading(true);
      await VocabularyService.createVocabulary(user.user_id, data);
      alert(t('messages.saveSuccess'));
      navigate('/');
    } catch (error) {
      console.error('Failed to create vocabulary:', error);
      alert(t('messages.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <>
      <TopBar title={t('vocabulary.add')} showBack />

      <div className="px-4 pt-6">
        <VocabularyForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </div>
    </>
  );
};
