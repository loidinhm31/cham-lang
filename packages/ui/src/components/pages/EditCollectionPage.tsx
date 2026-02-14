import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useNav } from "@cham-lang/ui/hooks";
import { useTranslation } from "react-i18next";
import { CollectionService } from "@cham-lang/ui/services";
import { TopBar } from "@cham-lang/ui/components/molecules";
import { CollectionForm } from "@cham-lang/ui/components/organisms";
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from "@cham-lang/shared/types";
import { useDialog } from "@cham-lang/ui/contexts";
import { useCollectionPermission } from "@cham-lang/ui/hooks";

export const EditCollectionPage: React.FC = () => {
  const { t } = useTranslation();
  const { navigate } = useNav();
  const { showAlert } = useDialog();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [initialData, setInitialData] = useState<
    Partial<CreateCollectionRequest & { id: string }> | undefined
  >();
  const [fullCollection, setFullCollection] = useState<Collection | null>(null);
  const { canEdit, loading: permLoading } =
    useCollectionPermission(fullCollection);

  useEffect(() => {
    loadCollection();
  }, [id]);

  useEffect(() => {
    if (!permLoading && fullCollection && !canEdit) {
      showAlert(t("messages.error"), { variant: "error" });
      navigate(`/collections/${id}`);
    }
  }, [permLoading, canEdit, fullCollection]);

  const loadCollection = async () => {
    if (!id) return;

    try {
      const collection: Collection = await CollectionService.getCollection(id);
      setFullCollection(collection);
      setInitialData({
        id: id,
        name: collection.name,
        description: collection.description || "",
        language: collection.language,
        isPublic: collection.isPublic,
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
        <TopBar
          title={t("collections.edit")}
          showBack
          backTo={id ? `/collections/${id}` : "/collections"}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--color-text-secondary)]">
            {t("app.loading")}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title={t("collections.edit")}
        showBack
        backTo={id ? `/collections/${id}` : "/collections"}
      />

      <div className="px-4 pt-6 pb-24">
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
