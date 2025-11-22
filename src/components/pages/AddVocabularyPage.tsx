import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { VocabularyService } from "@/services/vocabulary.service.ts";
import type { CreateVocabularyRequest } from "@/types/vocabulary.ts";
import { TopBar } from "@/components/molecules";
import { VocabularyForm } from "@/components/organisms";

export const AddVocabularyPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: CreateVocabularyRequest) => {
    try {
      setLoading(true);
      await VocabularyService.createVocabulary(data);
      alert(t("messages.saveSuccess"));
      navigate("/");
    } catch (error) {
      console.error("Failed to create vocabulary:", error);
      alert(t("messages.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  return (
    <>
      <TopBar title={t("vocabulary.add")} showBack />

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
