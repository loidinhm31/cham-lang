import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Edit,
  Globe,
  Lock,
  Plus,
  Trash2,
  Upload,
  Download,
} from "lucide-react";
import { CollectionService } from "@/services/collection.service.ts";
import { TopBar } from "@/components/molecules";
import { Button, Card } from "@/components/atoms";
import type { Collection } from "@/types/collection.ts";
import { getCollectionId } from "@/types/collection.ts";
import { useDialog } from "@/contexts";

export const CollectionsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useDialog();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const data = await CollectionService.getUserCollections();
      setCollections(data);
    } catch (error) {
      console.error("Failed to load collections:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm(t("collections.confirmDelete"), {
      variant: "error",
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
    });

    if (!confirmed) return;

    try {
      await CollectionService.deleteCollection(id);
      setCollections(collections.filter((c) => getCollectionId(c) !== id));
    } catch (error) {
      console.error("Failed to delete collection:", error);
      showAlert(t("collections.deleteFailed"), { variant: "error" });
    }
  };

  return (
    <>
      <TopBar title={t("collections.title")} showBack={false} />
      <div className="min-h-screen p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
            {t("collections.myCollections")}
          </h2>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/csv/import")}
              className="flex items-center flex-1 sm:flex-none justify-center"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">{t("csv.import")}</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate("/csv/export")}
              className="flex items-center flex-1 sm:flex-none justify-center"
            >
              <Download className="w-4 h-4" />
              <span className="hidden xs:inline sm:inline">{t("csv.export")}</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/collections/new")}
              className="flex items-center flex-1 sm:flex-none justify-center"
            >
              <Plus className="w-4 h-4" />
              <span className="sm:inline">{t("collections.create")}</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">{t("common.loading")}</div>
          </div>
        ) : collections.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {t("collections.noCollections")}
            </h3>
            <p className="text-gray-600 mb-6">
              {t("collections.noCollectionsDescription")}
            </p>
            <Button
              variant="primary"
              onClick={() => navigate("/collections/new")}
            >
              {t("collections.createFirst")}
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {collections.map((collection) => (
              <Card
                key={getCollectionId(collection)}
                className="p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">
                      {collection.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {collection.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {collection.word_count} {t("collections.words")}
                      </span>
                      <span className="flex items-center gap-1">
                        {collection.is_public ? (
                          <>
                            <Globe className="w-4 h-4" />
                            {t("collections.public")}
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            {t("collections.private")}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      navigate(
                        `/collections/${getCollectionId(collection)}/edit`,
                      )
                    }
                    className="flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    {t("common.edit")}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(getCollectionId(collection)!)}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t("common.delete")}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
