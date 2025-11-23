import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Edit, Trash2 } from "lucide-react";
import { TopBar } from "@/components/molecules";
import { Badge, Button, Card } from "@/components/atoms";
import { VocabularyService } from "@/services/vocabulary.service.ts";
import type { LanguageLevel, Vocabulary } from "@/types/vocabulary.ts";
import { useDialog } from "@/contexts";

const levelColors: Record<LanguageLevel, string> = {
  A1: "bg-emerald-500",
  A2: "bg-teal-500",
  B1: "bg-cyan-500",
  B2: "bg-blue-500",
  C1: "bg-amber-500",
  C2: "bg-orange-500",
};

export const VocabularyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showAlert, showConfirm } = useDialog();
  const [vocabulary, setVocabulary] = useState<Vocabulary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadVocabulary(id);
    }
  }, [id]);

  const loadVocabulary = async (vocabId: string) => {
    try {
      setLoading(true);
      const data = await VocabularyService.getVocabulary(vocabId);
      setVocabulary(data);
    } catch (error) {
      console.error("Failed to load vocabulary:", error);
      showAlert(t("messages.error"), { variant: "error" });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!vocabulary?.id) {
      return;
    }

    const confirmed = await showConfirm(t("messages.confirmDelete"), {
      variant: "error",
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
    });

    if (!confirmed) {
      return;
    }

    try {
      await VocabularyService.deleteVocabulary(vocabulary.id);
      showAlert(t("messages.deleteSuccess"), { variant: "success" });
      navigate("/");
    } catch (error) {
      console.error("Failed to delete vocabulary:", error);
      showAlert(t("messages.error"), { variant: "error" });
    }
  };

  if (loading) {
    return (
      <>
        <TopBar title={t("vocabulary.title")} showBack />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">{t("app.loading")}</div>
        </div>
      </>
    );
  }

  if (!vocabulary) {
    return null;
  }

  return (
    <>
      <TopBar title={vocabulary.word} showBack />

      <div className="px-4 pt-6 space-y-6">
        {/* Word Header */}
        <Card variant="gradient">
          <div className="text-center">
            <h1 className="text-5xl font-black mb-3">{vocabulary.word}</h1>
            <p className="text-2xl text-white/90 mb-4">{vocabulary.ipa}</p>
            <div className="flex items-center justify-center gap-3">
              <Badge variant="glass" className="bg-white/20 text-white">
                {t(`wordTypes.${vocabulary.word_type}`)}
              </Badge>
              <span
                className={`${levelColors[vocabulary.level]} text-white text-sm font-bold px-4 py-2 rounded-full`}
              >
                {t(`levels.${vocabulary.level}`)}
              </span>
            </div>
          </div>
        </Card>

        {/* Concept */}
        {vocabulary.concept && (
          <Card variant="glass">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {t("vocabulary.concept") || "Concept"}
            </h2>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200">
              <p className="text-lg text-gray-800 leading-relaxed">
                💡 {vocabulary.concept}
              </p>
            </div>
          </Card>
        )}

        {/* Definitions */}
        <Card variant="glass">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {t("vocabulary.definitions")}
          </h2>
          <div className="space-y-4">
            {vocabulary.definitions.map((def, idx) => (
              <div key={idx} className="p-4 bg-white/40 rounded-2xl">
                <p className="text-lg font-semibold text-gray-800 mb-2">
                  {def.meaning}
                </p>
                {def.translation && (
                  <p className="text-base text-teal-700 mb-2">
                    📝 {def.translation}
                  </p>
                )}
                {def.example && (
                  <p className="text-sm text-gray-600 italic">
                    "{def.example}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Example Sentences */}
        {vocabulary.example_sentences.length > 0 && (
          <Card variant="glass">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {t("vocabulary.exampleSentences")}
            </h2>
            <div className="space-y-3">
              {vocabulary.example_sentences.map((sentence, idx) => (
                <div key={idx} className="p-3 bg-white/40 rounded-xl">
                  <p className="text-gray-700">💬 {sentence}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Topics */}
        {vocabulary.topics.length > 0 && (
          <Card variant="glass">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {t("vocabulary.topics")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {vocabulary.topics.map((topic, idx) => (
                <Badge key={idx} variant="info">
                  {topic}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Related Words */}
        {vocabulary.related_words.length > 0 && (
          <Card variant="glass">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {t("vocabulary.relatedWords")}
            </h2>
            <div className="space-y-3">
              {vocabulary.related_words.map((related, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white/40 rounded-xl"
                >
                  <span className="font-semibold text-gray-800">
                    {related.word}
                  </span>
                  <Badge variant="glass" className="text-xs">
                    {t(`relationships.${related.relationship}`)}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pb-4">
          <Button
            variant="outline"
            size="lg"
            icon={Edit}
            fullWidth
            onClick={() => navigate(`/vocabulary/edit/${vocabulary.id}`)}
          >
            {t("buttons.edit")}
          </Button>
          <Button
            variant="danger"
            size="lg"
            icon={Trash2}
            fullWidth
            onClick={handleDelete}
          >
            {t("buttons.delete")}
          </Button>
        </div>
      </div>
    </>
  );
};
