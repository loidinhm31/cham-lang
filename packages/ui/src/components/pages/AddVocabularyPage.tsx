import React, { useState } from "react";
import { useNav } from "@cham-lang/ui/hooks";
import { useTranslation } from "react-i18next";

import { VocabularyService } from "@cham-lang/ui/services";
import type { CreateVocabularyRequest } from "@cham-lang/shared/types";
import { TopBar } from "@cham-lang/ui/components/molecules";
import { VocabularyForm } from "@cham-lang/ui/components/organisms";
import { useDialog } from "@cham-lang/ui/contexts";

export const AddVocabularyPage: React.FC = () => {
  const { t } = useTranslation();
  const { navigate } = useNav();
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

      <div className="px-4 pt-6 pb-24">
        <VocabularyForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </div>
    </>
  );
};
