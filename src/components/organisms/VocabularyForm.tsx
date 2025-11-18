import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { Input, TextArea, Select, Button, Card } from '../atoms';
import type {
  CreateVocabularyRequest,
  WordType,
  LanguageLevel,
  Definition,
} from '../../types/vocabulary';

interface VocabularyFormProps {
  initialData?: Partial<CreateVocabularyRequest>;
  onSubmit: (data: CreateVocabularyRequest) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const VocabularyForm: React.FC<VocabularyFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState<CreateVocabularyRequest>({
    word: initialData?.word || '',
    word_type: initialData?.word_type || 'noun',
    level: initialData?.level || 'A1',
    ipa: initialData?.ipa || '',
    definitions: initialData?.definitions || [{ meaning: '', translation: '', example: '' }],
    example_sentences: initialData?.example_sentences || [''],
    topics: initialData?.topics || [''],
    related_words: initialData?.related_words || [],
    language: initialData?.language || 'en',
  });

  const wordTypeOptions = [
    'noun', 'verb', 'adjective', 'adverb', 'pronoun',
    'preposition', 'conjunction', 'interjection', 'phrase'
  ].map(type => ({
    value: type,
    label: t(`wordTypes.${type}`)
  }));

  const levelOptions = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => ({
    value: level,
    label: t(`levels.${level}`)
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty values
    const cleanedData = {
      ...formData,
      definitions: formData.definitions.filter(d => d.meaning.trim() !== ''),
      example_sentences: formData.example_sentences.filter(s => s.trim() !== ''),
      topics: formData.topics.filter(t => t.trim() !== ''),
    };
    onSubmit(cleanedData);
  };

  const addDefinition = () => {
    setFormData({
      ...formData,
      definitions: [...formData.definitions, { meaning: '', translation: '', example: '' }],
    });
  };

  const removeDefinition = (index: number) => {
    setFormData({
      ...formData,
      definitions: formData.definitions.filter((_, i) => i !== index),
    });
  };

  const updateDefinition = (index: number, field: keyof Definition, value: string) => {
    const newDefinitions = [...formData.definitions];
    newDefinitions[index] = { ...newDefinitions[index], [field]: value };
    setFormData({ ...formData, definitions: newDefinitions });
  };

  const addExampleSentence = () => {
    setFormData({
      ...formData,
      example_sentences: [...formData.example_sentences, ''],
    });
  };

  const removeExampleSentence = (index: number) => {
    setFormData({
      ...formData,
      example_sentences: formData.example_sentences.filter((_, i) => i !== index),
    });
  };

  const updateExampleSentence = (index: number, value: string) => {
    const newSentences = [...formData.example_sentences];
    newSentences[index] = value;
    setFormData({ ...formData, example_sentences: newSentences });
  };

  const addTopic = () => {
    setFormData({
      ...formData,
      topics: [...formData.topics, ''],
    });
  };

  const removeTopic = (index: number) => {
    setFormData({
      ...formData,
      topics: formData.topics.filter((_, i) => i !== index),
    });
  };

  const updateTopic = (index: number, value: string) => {
    const newTopics = [...formData.topics];
    newTopics[index] = value;
    setFormData({ ...formData, topics: newTopics });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card variant="glass">
        <div className="space-y-4">
          <Input
            label={t('vocabulary.word')}
            value={formData.word}
            onChange={(e) => setFormData({ ...formData, word: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t('vocabulary.wordType')}
              options={wordTypeOptions}
              value={formData.word_type}
              onChange={(e) => setFormData({ ...formData, word_type: e.target.value as WordType })}
            />

            <Select
              label={t('vocabulary.level')}
              options={levelOptions}
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value as LanguageLevel })}
            />
          </div>

          <Input
            label={t('vocabulary.pronunciation')}
            value={formData.ipa}
            onChange={(e) => setFormData({ ...formData, ipa: e.target.value })}
            placeholder="/həˈloʊ/"
          />
        </div>
      </Card>

      {/* Definitions */}
      <Card variant="glass">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">{t('vocabulary.definitions')}</h3>
            <Button type="button" variant="outline" size="sm" icon={Plus} onClick={addDefinition}>
              {t('buttons.add')}
            </Button>
          </div>

          {formData.definitions.map((definition, index) => (
            <div key={index} className="space-y-3 p-4 bg-white/40 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">
                  {t('vocabulary.definition')} {index + 1}
                </span>
                {formData.definitions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDefinition(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <Input
                placeholder={t('vocabulary.meaning')}
                value={definition.meaning}
                onChange={(e) => updateDefinition(index, 'meaning', e.target.value)}
                required
              />

              <Input
                placeholder={t('vocabulary.translation')}
                value={definition.translation || ''}
                onChange={(e) => updateDefinition(index, 'translation', e.target.value)}
              />

              <TextArea
                placeholder={t('vocabulary.example')}
                value={definition.example || ''}
                onChange={(e) => updateDefinition(index, 'example', e.target.value)}
                rows={2}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Example Sentences */}
      <Card variant="glass">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">{t('vocabulary.exampleSentences')}</h3>
            <Button type="button" variant="outline" size="sm" icon={Plus} onClick={addExampleSentence}>
              {t('buttons.add')}
            </Button>
          </div>

          {formData.example_sentences.map((sentence, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={t('vocabulary.exampleSentence')}
                value={sentence}
                onChange={(e) => updateExampleSentence(index, e.target.value)}
                className="flex-1"
              />
              {formData.example_sentences.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeExampleSentence(index)}
                  className="p-3 text-red-500 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Topics */}
      <Card variant="glass">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">{t('vocabulary.topics')}</h3>
            <Button type="button" variant="outline" size="sm" icon={Plus} onClick={addTopic}>
              {t('buttons.add')}
            </Button>
          </div>

          {formData.topics.map((topic, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={t('topics.title')}
                value={topic}
                onChange={(e) => updateTopic(index, e.target.value)}
                className="flex-1"
              />
              {formData.topics.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTopic(index)}
                  className="p-3 text-red-500 hover:text-red-700"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 sticky bottom-20 pb-safe">
        <Button
          type="button"
          variant="glass"
          fullWidth
          onClick={onCancel}
          disabled={loading}
        >
          {t('buttons.cancel')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={loading}
        >
          {loading ? t('app.loading') : t('buttons.save')}
        </Button>
      </div>
    </form>
  );
};
