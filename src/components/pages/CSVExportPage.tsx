import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, CheckSquare, Square, FileDown } from "lucide-react";
import { CollectionService } from "@/services/collection.service";
import { CsvService } from "@/services/csv.service";
import { TopBar } from "@/components/molecules";
import { Button, Card } from "@/components/atoms";
import type { Collection } from "@/types/collection";
import { getCollectionId } from "@/types/collection";
import { useDialog } from "@/contexts";

export const CSVExportPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showAlert } = useDialog();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const data = await CollectionService.getUserCollections();
      setCollections(data);
    } catch (error) {
      console.error("Failed to load collections:", error);
      showAlert(t("csv.loadCollectionsFailed"), { variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === collections.length) {
      setSelectedIds(new Set());
    } else {
      const ids = collections
        .map((c) => getCollectionId(c))
        .filter((id): id is string => id !== undefined);
      setSelectedIds(new Set(ids));
    }
  };

  const handleExport = async () => {
    if (selectedIds.size === 0) {
      showAlert(t("csv.noCollectionsSelected"), { variant: "warning" });
      return;
    }

    try {
      setIsExporting(true);

      // Open save dialog
      const filePath = await CsvService.chooseSaveLocation();
      if (!filePath) {
        setIsExporting(false);
        return; // User cancelled
      }

      // Export to CSV
      const result = await CsvService.exportCollections(
        Array.from(selectedIds),
        filePath,
      );

      showAlert(t("csv.exportSuccess", { message: result }), {
        variant: "success",
      });
      navigate("/collections");
    } catch (error) {
      console.error("Export failed:", error);
      showAlert(t("csv.exportFailed", { error: String(error) }), {
        variant: "error",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const totalVocabularies = collections
    .filter((c) => {
      const id = getCollectionId(c);
      return id !== undefined && selectedIds.has(id);
    })
    .reduce((sum, c) => sum + c.word_count, 0);

  return (
    <>
      <TopBar title={t("csv.exportTitle")} showBack />
      <div className="min-h-screen p-6 space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileDown className="w-8 h-8 text-chameleon-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {t("csv.exportCollections")}
              </h2>
              <p className="text-gray-600">{t("csv.exportDescription")}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-gray-600">{t("common.loading")}</div>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">{t("csv.noCollectionsToExport")}</p>
              <Button
                variant="secondary"
                onClick={() => navigate("/collections/new")}
                className="mt-4"
              >
                {t("collections.create")}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-chameleon-600 hover:text-chameleon-700 font-medium"
                >
                  {selectedIds.size === collections.length ? (
                    <CheckSquare className="w-5 h-5" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                  {selectedIds.size === collections.length
                    ? t("csv.deselectAll")
                    : t("csv.selectAll")}
                </button>

                <div className="text-sm text-gray-600">
                  {t("csv.selectedCount", {
                    selected: selectedIds.size,
                    total: collections.length,
                    vocabularies: totalVocabularies,
                  })}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {collections
                  .filter((c) => getCollectionId(c) !== undefined)
                  .map((collection) => {
                    const id = getCollectionId(collection)!; // Safe to use ! here due to filter
                    const isSelected = selectedIds.has(id);

                    return (
                      <button
                        key={id}
                        onClick={() => toggleSelection(id)}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? "border-chameleon-600 bg-chameleon-50"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-chameleon-600 flex-shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">
                              {collection.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {collection.language.toUpperCase()} •{" "}
                              {collection.word_count} {t("collections.words")}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={handleExport}
                  disabled={selectedIds.size === 0 || isExporting}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  {isExporting
                    ? t("csv.exporting")
                    : t("csv.exportButton", { count: selectedIds.size })}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => navigate("/collections")}
                  disabled={isExporting}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </>
  );
};
