import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { CollectionService } from "@cham-lang/ui/services";
import {
  Button,
  Card,
  Input,
  Select,
  TextArea,
  AudioPlayer,
} from "@cham-lang/ui/components/atoms";
import type {
  CreateVocabularyRequest,
  Definition,
  LanguageLevel,
  WordType,
} from "@cham-lang/shared/types";
import type { Collection } from "@cham-lang/shared/types";
import { getCollectionId } from "@cham-lang/shared/types";

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
    wordType: initialData?.wordType || "n/a",
    level: initialData?.level || "N/A",
    ipa: initialData?.ipa || "",
    audioUrl: initialData?.audioUrl || "",
    concept: initialData?.concept || "",
    definitions: initialData?.definitions || [
      { meaning: "", translation: "", example: "" },
    ],
    exampleSentences: initialData?.exampleSentences || [""],
    topics: initialData?.topics || [""],
    tags: initialData?.tags || [""],
    relatedWords: initialData?.relatedWords || [],
    language: initialData?.language || "en",
    collectionId: initialData?.collectionId || "",
  });

  useEffect(() => {
    loadCollections();
  }, []);

  // Load levels when collection changes
  useEffect(() => {
    if (formData.collectionId) {
      const selectedCollection = collections.find(
        (c) => getCollectionId(c) === formData.collectionId,
      );
      if (selectedCollection) {
        loadLevels(selectedCollection.language);
      }
    }
  }, [formData.collectionId, collections]);

  const loadCollections = async () => {
    try {
      const data = await CollectionService.getUserCollections();
      setCollections(data);

      // Auto-select first collection if no initial data
      if (!initialData?.collectionId && data.length > 0) {
        const firstCollection = data[0];
        const collectionId = getCollectionId(firstCollection);
        setFormData((prev) => ({
          ...prev,
          collectionId: collectionId || "",
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

  const handleCollectionChange = useCallback(
    (collectionId: string) => {
      const selectedCollection = collections.find(
        (c) => getCollectionId(c) === collectionId,
      );
      if (selectedCollection) {
        setFormData((prev) => ({
          ...prev,
          collectionId: collectionId,
          language: selectedCollection.language,
        }));
      }
    },
    [collections],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const cleanedData = {
        ...formData,
        audioUrl: formData.audioUrl?.trim() || undefined,
        concept: formData.concept?.trim() || "",
        definitions: formData.definitions.filter(
          (d) => d.meaning.trim() !== "",
        ),
        exampleSentences: formData.exampleSentences.filter(
          (s) => s.trim() !== "",
        ),
        topics: formData.topics.filter((t) => t.trim() !== ""),
        tags: formData.tags.filter((t) => t.trim() !== ""),
      };
      onSubmit(cleanedData);
    },
    [formData, onSubmit],
  );

  const addDefinition = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      definitions: [
        ...prev.definitions,
        { meaning: "", translation: "", example: "" },
      ],
    }));
  }, []);

  const removeDefinition = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      definitions: prev.definitions.filter((_, i) => i !== index),
    }));
  }, []);

  const updateDefinition = useCallback(
    (index: number, field: keyof Definition, value: string) => {
      setFormData((prev) => {
        const newDefinitions = [...prev.definitions];
        newDefinitions[index] = { ...newDefinitions[index], [field]: value };
        return { ...prev, definitions: newDefinitions };
      });
    },
    [],
  );

  const addExampleSentence = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      exampleSentences: [...prev.exampleSentences, ""],
    }));
  }, []);

  const removeExampleSentence = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      exampleSentences: prev.exampleSentences.filter((_, i) => i !== index),
    }));
  }, []);

  const updateExampleSentence = useCallback((index: number, value: string) => {
    setFormData((prev) => {
      const newSentences = [...prev.exampleSentences];
      newSentences[index] = value;
      return { ...prev, exampleSentences: newSentences };
    });
  }, []);

  const addTopic = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      topics: [...prev.topics, ""],
    }));
  }, []);

  const removeTopic = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.filter((_, i) => i !== index),
    }));
  }, []);

  const updateTopic = useCallback((index: number, value: string) => {
    setFormData((prev) => {
      const newTopics = [...prev.topics];
      newTopics[index] = value;
      return { ...prev, topics: newTopics };
    });
  }, []);

  const addTag = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      tags: [...prev.tags, ""],
    }));
  }, []);

  const removeTag = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  }, []);

  const updateTag = useCallback((index: number, value: string) => {
    setFormData((prev) => {
      const newTags = [...prev.tags];
      newTags[index] = value;
      return { ...prev, tags: newTags };
    });
  }, []);

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
                fullWidth
                label={t("vocabulary.collection")}
                options={collectionOptions}
                value={formData.collectionId}
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
              fullWidth
              label={t("vocabulary.wordType")}
              options={wordTypeOptions}
              value={formData.wordType}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  wordType: value as WordType,
                })
              }
            />

            <Select
              fullWidth
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
                value={formData.audioUrl || ""}
                onChange={(e) =>
                  setFormData({ ...formData, audioUrl: e.target.value })
                }
                placeholder="https://example.com/audio.mp3"
              />
              {formData.audioUrl &&
                formData.audioUrl.trim() !== "" &&
                !validateAudioUrl(formData.audioUrl) && (
                  <p className="text-sm text-red-600">
                    {t("vocabulary.invalidAudioUrl") ||
                      "Invalid audio URL format"}
                  </p>
                )}
              {formData.audioUrl &&
                formData.audioUrl.trim() !== "" &&
                validateAudioUrl(formData.audioUrl) && (
                  <div className="flex items-center gap-2">
                    <AudioPlayer audioUrl={formData.audioUrl} size="sm" />
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

          {formData.exampleSentences.map((sentence, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={t("vocabulary.exampleSentence")}
                value={sentence}
                onChange={(e) => updateExampleSentence(index, e.target.value)}
                className="flex-1"
              />
              {formData.exampleSentences.length > 1 && (
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
