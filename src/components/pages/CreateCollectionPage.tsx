import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CollectionService } from "@/services/collection.service.ts";
import { TopBar } from "@/components/molecules";
import { CollectionForm } from "@/components/organisms";
import type { CreateCollectionRequest } from "@/types/collection.ts";
import { useDialog } from "@/contexts";

export const CreateCollectionPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
      <TopBar title={t("collections.create")} showBack />

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
