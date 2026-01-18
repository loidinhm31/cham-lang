import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { CollectionService } from "@/services/collection.service";
import {
  Button,
  Card,
  Input,
  Select,
  TextArea,
  AudioPlayer,
} from "@/components/atoms";
import type {
  CreateVocabularyRequest,
  Definition,
  LanguageLevel,
  WordType,
} from "@/types/vocabulary";
import type { Collection } from "@/types/collection";
import { getCollectionId } from "@/types/collection";

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
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [availableLevels, setAvailableLevels] = useState<string[]>([]);
  const [_loadingLevels, setLoadingLevels] = useState(false);

  const [formData, setFormData] = useState<CreateVocabularyRequest>({
    word: initialData?.word || "",
    word_type: initialData?.word_type || "n/a",
    level: initialData?.level || "N/A",
    ipa: initialData?.ipa || "",
    audio_url: initialData?.audio_url || "",
    concept: initialData?.concept || "",
    definitions: initialData?.definitions || [
      { meaning: "", translation: "", example: "" },
    ],
    example_sentences: initialData?.example_sentences || [""],
    topics: initialData?.topics || [""],
    tags: initialData?.tags || [""],
    related_words: initialData?.related_words || [],
    language: initialData?.language || "en",
    collection_id: initialData?.collection_id || "",
  });

  useEffect(() => {
    loadCollections();
  }, []);

  // Load levels when collection changes
  useEffect(() => {
    if (formData.collection_id) {
      const selectedCollection = collections.find(
        (c) => getCollectionId(c) === formData.collection_id,
      );
      if (selectedCollection) {
        loadLevels(selectedCollection.language);
      }
    }
  }, [formData.collection_id, collections]);

  const loadCollections = async () => {
    try {
      const data = await CollectionService.getUserCollections();
      setCollections(data);

      // Auto-select first collection if no initial data
      if (!initialData?.collection_id && data.length > 0) {
        const firstCollection = data[0];
        const collectionId = getCollectionId(firstCollection);
        setFormData((prev) => ({
          ...prev,
          collection_id: collectionId || "",
          language: firstCollection.language,
        }));
      }
    } catch (error) {
      console.error("Failed to load collections:", error);
    } finally {
      setLoadingCollections(false);
    }
  };

  const loadLevels = async (language: string) => {
    try {
      setLoadingLevels(true);
      const levels = await CollectionService.getLevelConfiguration(language);
      setAvailableLevels(levels);

      // If current level is not in new levels, reset to first available level
      if (levels.length > 0 && !levels.includes(formData.level)) {
        setFormData((prev) => ({ ...prev, level: levels[0] }));
      }
    } catch (error) {
      // Fallback to CEFR levels
      setAvailableLevels(["A1", "A2", "B1", "B2", "C1", "C2"]);
    } finally {
      setLoadingLevels(false);
    }
  };

  const wordTypeOptions = [
    "n/a",
    "noun",
    "verb",
    "adjective",
    "adverb",
    "pronoun",
    "preposition",
    "conjunction",
    "interjection",
    "phrase",
  ].map((type) => ({
    value: type,
    label: t(`wordTypes.${type}`),
  }));

  const levelOptions = availableLevels.map((level) => ({
    value: level,
    label: t(`levels.${level}`, { defaultValue: level }),
  }));

  const collectionOptions = collections.map((collection) => {
    const collectionId = getCollectionId(collection);
    return {
      value: collectionId || "",
      label: collection.name,
    };
  });

  // Validate audio URL format
  const validateAudioUrl = (url: string): boolean => {
    if (!url || url.trim() === "") return true; // Empty is valid (optional field)
    const validExtensions = [".mp3", ".wav", ".ogg", ".m4a", ".aac"];
    const lowerUrl = url.toLowerCase();
    return validExtensions.some((ext) => lowerUrl.includes(ext));
  };

  const handleCollectionChange = (collectionId: string) => {
    const selectedCollection = collections.find(
      (c) => getCollectionId(c) === collectionId,
    );
    if (selectedCollection) {
      setFormData({
        ...formData,
        collection_id: collectionId,
        language: selectedCollection.language,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty values
    const cleanedData = {
      ...formData,
      audio_url: formData.audio_url?.trim() || undefined,
      concept: formData.concept?.trim() || "",
      definitions: formData.definitions.filter((d) => d.meaning.trim() !== ""),
      example_sentences: formData.example_sentences.filter(
        (s) => s.trim() !== "",
      ),
      topics: formData.topics.filter((t) => t.trim() !== ""),
      tags: formData.tags.filter((t) => t.trim() !== ""),
    };
    onSubmit(cleanedData);
  };

  const addDefinition = () => {
    setFormData({
      ...formData,
      definitions: [
        ...formData.definitions,
        { meaning: "", translation: "", example: "" },
      ],
    });
  };

  const removeDefinition = (index: number) => {
    setFormData({
      ...formData,
      definitions: formData.definitions.filter((_, i) => i !== index),
    });
  };

  const updateDefinition = (
    index: number,
    field: keyof Definition,
    value: string,
  ) => {
    const newDefinitions = [...formData.definitions];
    newDefinitions[index] = { ...newDefinitions[index], [field]: value };
    setFormData({ ...formData, definitions: newDefinitions });
  };

  const addExampleSentence = () => {
    setFormData({
      ...formData,
      example_sentences: [...formData.example_sentences, ""],
    });
  };

  const removeExampleSentence = (index: number) => {
    setFormData({
      ...formData,
      example_sentences: formData.example_sentences.filter(
        (_, i) => i !== index,
      ),
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
      topics: [...formData.topics, ""],
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

  const addTag = () => {
    setFormData({
      ...formData,
      tags: [...formData.tags, ""],
    });
  };

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index),
    });
  };

  const updateTag = (index: number, value: string) => {
    const newTags = [...formData.tags];
    newTags[index] = value;
    setFormData({ ...formData, tags: newTags });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card variant="glass">
        <div className="space-y-4">
          {/* Collection & Word - 2 column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingCollections ? (
              <div className="text-center py-4 text-gray-600">
                {t("common.loading")}
              </div>
            ) : collections.length === 0 ? (
              <div className="bg-amber-100 border border-amber-400 text-amber-700 px-4 py-3 rounded-2xl">
                {t("vocabulary.noCollectionsWarning")}
              </div>
            ) : (
              <Select
                label={t("vocabulary.collection")}
                options={collectionOptions}
                value={formData.collection_id}
                onValueChange={handleCollectionChange}
              />
            )}

            <Input
              label={t("vocabulary.word")}
              value={formData.word}
              onChange={(e) =>
                setFormData({ ...formData, word: e.target.value })
              }
              required
            />
          </div>

          {/* Word Type & Level - 2 column grid */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t("vocabulary.wordType")}
              options={wordTypeOptions}
              value={formData.word_type}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  word_type: value as WordType,
                })
              }
            />

            <Select
              label={t("vocabulary.level")}
              options={levelOptions}
              value={formData.level}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  level: value as LanguageLevel,
                })
              }
            />
          </div>

          {/* Pronunciation & Audio URL - 2 column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t("vocabulary.pronunciation")}
              value={formData.ipa}
              onChange={(e) =>
                setFormData({ ...formData, ipa: e.target.value })
              }
              placeholder="/həˈloʊ/"
            />

            <div className="space-y-2">
              <Input
                label={t("vocabulary.audioUrl") || "Audio URL"}
                value={formData.audio_url || ""}
                onChange={(e) =>
                  setFormData({ ...formData, audio_url: e.target.value })
                }
                placeholder="https://example.com/audio.mp3"
              />
              {formData.audio_url &&
                formData.audio_url.trim() !== "" &&
                !validateAudioUrl(formData.audio_url) && (
                  <p className="text-sm text-red-600">
                    {t("vocabulary.invalidAudioUrl") ||
                      "Invalid audio URL format"}
                  </p>
                )}
              {formData.audio_url &&
                formData.audio_url.trim() !== "" &&
                validateAudioUrl(formData.audio_url) && (
                  <div className="flex items-center gap-2">
                    <AudioPlayer audioUrl={formData.audio_url} size="sm" />
                    <span className="text-sm text-gray-600">
                      {t("vocabulary.previewAudio") || "Preview"}
                    </span>
                  </div>
                )}
            </div>
          </div>

          {/* Concept - full width text area */}
          <TextArea
            label={t("vocabulary.concept") || "Concept (Optional)"}
            value={formData.concept || ""}
            onChange={(e) =>
              setFormData({ ...formData, concept: e.target.value })
            }
            placeholder={
              t("vocabulary.conceptPlaceholder") ||
              "Core idea or concept behind the word..."
            }
            rows={2}
          />
        </div>
      </Card>

      {/* Definitions */}
      <Card variant="glass">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">
              {t("vocabulary.definitions")}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={addDefinition}
            >
              {t("buttons.add")}
            </Button>
          </div>

          {formData.definitions.map((definition, index) => (
            <div key={index} className="space-y-3 p-4 bg-white/40 rounded-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">
                  {t("vocabulary.definition")} {index + 1}
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
                placeholder={t("vocabulary.meaning")}
                value={definition.meaning}
                onChange={(e) =>
                  updateDefinition(index, "meaning", e.target.value)
                }
                required
              />

              <Input
                placeholder={t("vocabulary.translation")}
                value={definition.translation || ""}
                onChange={(e) =>
                  updateDefinition(index, "translation", e.target.value)
                }
              />

              <TextArea
                placeholder={t("vocabulary.example")}
                value={definition.example || ""}
                onChange={(e) =>
                  updateDefinition(index, "example", e.target.value)
                }
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
            <h3 className="text-lg font-bold text-gray-800">
              {t("vocabulary.exampleSentences")}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={addExampleSentence}
            >
              {t("buttons.add")}
            </Button>
          </div>

          {formData.example_sentences.map((sentence, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={t("vocabulary.exampleSentence")}
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
            <h3 className="text-lg font-bold text-gray-800">
              {t("vocabulary.topics")}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={addTopic}
            >
              {t("buttons.add")}
            </Button>
          </div>

          {formData.topics.map((topic, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={t("topics.title")}
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

      {/* Tags */}
      <Card variant="glass">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">
              {t("vocabulary.tags")}
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={addTag}
            >
              {t("buttons.add")}
            </Button>
          </div>

          {formData.tags.map((tag, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={t("vocabulary.tag")}
                value={tag}
                onChange={(e) => updateTag(index, e.target.value)}
                className="flex-1"
              />
              {formData.tags.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTag(index)}
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
          {t("buttons.cancel")}
        </Button>
        <Button type="submit" variant="primary" fullWidth disabled={loading}>
          {loading ? t("app.loading") : t("buttons.save")}
        </Button>
      </div>
    </form>
  );
};
