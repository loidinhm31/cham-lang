import React, { useState } from "react";
import { useNav } from "@cham-lang/ui/hooks";
import { useTranslation } from "react-i18next";
import { CollectionService } from "@cham-lang/ui/services";
import { TopBar } from "@cham-lang/ui/components/molecules";
import { CollectionForm } from "@cham-lang/ui/components/organisms";
import type { CreateCollectionRequest } from "@cham-lang/shared/types";
import { useDialog } from "@cham-lang/ui/contexts";

export const CreateCollectionPage: React.FC = () => {
  const { t } = useTranslation();
  const { navigate } = useNav();
  const { showAlert } = useDialog();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: CreateCollectionRequest) => {
    try {
      setLoading(true);
      await CollectionService.createCollection(data);
      showAlert(t("collections.createSuccess"), { variant: "success" });
      navigate("/collections");
    } catch (error) {
      console.error("Failed to create collection:", error);
      showAlert(t("messages.error"), { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/collections");
  };

  return (
    <>
      <TopBar title={t("collections.create")} showBack backTo="/collections" />

      <div className="px-4 pt-6 pb-24">
        <CollectionForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </div>
    </>
  );
};
