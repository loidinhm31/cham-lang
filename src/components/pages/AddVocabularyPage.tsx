import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { VocabularyService } from "@/services/vocabulary.service";
import type { CreateVocabularyRequest } from "@/types/vocabulary";
import { TopBar } from "@/components/molecules";
import { VocabularyForm } from "@/components/organisms";
import { useDialog } from "@/contexts";

export const AddVocabularyPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showAlert } = useDialog();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: CreateVocabularyRequest) => {
    try {
      setLoading(true);
      await VocabularyService.createVocabulary(data);
      showAlert(t("messages.saveSuccess"), { variant: "success" });
      navigate("/");
    } catch (error) {
      console.error("Failed to create vocabulary:", error);
      showAlert(t("messages.error"), { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  return (
    <>
      <TopBar title={t("vocabulary.add")} showBack backTo="/" />

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
