import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CollectionService } from "@/services/collection.service";
import { TopBar } from "@/components/molecules";
import { CollectionForm } from "@/components/organisms";
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from "@/types/collection";
import { useDialog } from "@/contexts";

export const EditCollectionPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showAlert } = useDialog();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [initialData, setInitialData] = useState<
    Partial<CreateCollectionRequest & { id: string }> | undefined
  >();

  useEffect(() => {
    loadCollection();
  }, [id]);

  const loadCollection = async () => {
    if (!id) return;

    try {
      const collection: Collection = await CollectionService.getCollection(id);
      setInitialData({
        id: id,
        name: collection.name,
        description: collection.description || "",
        language: collection.language,
        is_public: collection.is_public,
      });
    } catch (error) {
      console.error("Failed to load collection:", error);
      showAlert(t("messages.error"), { variant: "error" });
      navigate("/collections");
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (
    data: CreateCollectionRequest & { id?: string },
  ) => {
    if (!id) return;

    try {
      setLoading(true);
      await CollectionService.updateCollection({
        id,
        ...data,
      } as UpdateCollectionRequest);
      showAlert(t("collections.updateSuccess"), { variant: "success" });
      navigate("/collections");
    } catch (error) {
      console.error("Failed to update collection:", error);
      showAlert(t("messages.error"), { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/collections");
  };

  if (loadingData) {
    return (
      <>
        <TopBar title={t("collections.edit")} showBack backTo={id ? `/collections/${id}` : "/collections"} />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">{t("app.loading")}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title={t("collections.edit")} showBack backTo={id ? `/collections/${id}` : "/collections"} />

      <div className="px-4 pt-6">
        <CollectionForm
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </div>
    </>
  );
};
