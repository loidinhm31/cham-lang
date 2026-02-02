import React, { useEffect, useState } from "react";
import { useNav } from "@cham-lang/ui/hooks";
import { useTranslation } from "react-i18next";
import {
  Upload,
  FileUp,
  CheckCircle,
  AlertCircle,
  Folder,
  Download,
  FileText,
} from "lucide-react";
import { CollectionService } from "@cham-lang/ui/services";
import { CsvService } from "@cham-lang/ui/services";
import { isTauri } from "@cham-lang/ui/utils";
import { TopBar } from "@cham-lang/ui/components/molecules";
import { Button, Card } from "@cham-lang/ui/components/atoms";
import type { Collection } from "@cham-lang/shared/types";
import type { CsvImportResult } from "@cham-lang/shared/types";
import { getCollectionId } from "@cham-lang/shared/types";
import { useDialog } from "@cham-lang/ui/contexts";

export const CSVImportPage: React.FC = () => {
  const { t } = useTranslation();
  const { navigate } = useNav();
  const { showAlert } = useDialog();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string>("");
  const [simpleCsvText, setSimpleCsvText] = useState<string>("");
  const [importMode, setImportMode] = useState<"file" | "text" | "simple">(
    isTauri() ? "file" : "text",
  );
  const [defaultLanguage, setDefaultLanguage] = useState<string>("ko");
  const [targetCollectionId, setTargetCollectionId] = useState<string>("");
  const [autoCreateCollections, setAutoCreateCollections] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(
    null,
  );

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

  const handleChooseFile = async () => {
    try {
      if (isTauri()) {
        const filePath = await CsvService.chooseImportFile();
        if (filePath) {
          setSelectedFile(filePath);
          setFileContent(null);
          setImportResult(null);
        }
      } else {
        const result = await CsvService.chooseImportFileWeb();
        if (result) {
          setSelectedFile(result.name);
          setFileContent(result.content);
          setImportResult(null);
        }
      }
    } catch (error) {
      console.error("Failed to choose file:", error);
      showAlert(t("csv.chooseFileFailed"), { variant: "error" });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      await CsvService.generateTemplate();
      showAlert(t("csv.templateDownloaded"), { variant: "success" });
    } catch (error) {
      console.error("Template download failed:", error);
      if (String(error) !== "No file path selected") {
        showAlert(t("csv.templateDownloadFailed", { error: String(error) }), {
          variant: "error",
        });
      }
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleImport = async () => {
    // Validate input based on mode
    if (importMode === "file" && !selectedFile) {
      showAlert(t("csv.noFileSelected"), { variant: "warning" });
      return;
    }
    if (importMode === "text" && !csvText.trim()) {
      showAlert(t("csv.noCsvText"), { variant: "warning" });
      return;
    }
    if (importMode === "simple" && !simpleCsvText.trim()) {
      showAlert(t("csv.noSimpleCsvText"), { variant: "warning" });
      return;
    }

    try {
      setIsImporting(true);

      let result;
      if (importMode === "simple") {
        result = await CsvService.importSimpleVocabularies({
          csv_text: simpleCsvText,
          default_language: defaultLanguage,
          target_collection_id:
            targetCollectionId && targetCollectionId !== ""
              ? targetCollectionId
              : undefined,
          create_missing_collections: autoCreateCollections,
        });
      } else {
        result = await CsvService.importVocabularies({
          file_path:
            importMode === "file" && !fileContent ? selectedFile! : undefined,
          csv_text:
            importMode === "text"
              ? csvText
              : importMode === "file" && fileContent
                ? fileContent
                : undefined,
          target_collection_id:
            targetCollectionId && targetCollectionId !== ""
              ? targetCollectionId
              : undefined,
          create_missing_collections: autoCreateCollections,
        });
      }

      setImportResult(result);

      if (result.success) {
        // Reload collections to show new ones
        await loadCollections();
      }
    } catch (error) {
      console.error("Import failed:", error);
      showAlert(t("csv.importFailed", { error: String(error) }), {
        variant: "error",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const getFileName = (path: string) => {
    return path.split("/").pop() || path.split("\\").pop() || path;
  };

  return (
    <>
      <TopBar title={t("csv.importTitle")} showBack backTo="/settings" />
      <div className="min-h-screen p-6 space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileUp className="w-8 h-8 text-chameleon-600 dark:text-chameleon-400" />
              <div>
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {t("csv.importVocabularies")}
                </h2>
                <p className="text-[var(--color-text-secondary)]">
                  {t("csv.importDescription")}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate || isImporting}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isDownloadingTemplate
                ? t("csv.downloading")
                : t("csv.downloadTemplate")}
            </Button>
          </div>

          {/* Import Mode Toggle */}
          <div className="mb-6">
            <div className="flex gap-2 p-1 bg-[var(--color-secondary-100)] dark:bg-slate-800/50 rounded-lg w-fit">
              <button
                onClick={() => setImportMode("file")}
                disabled={isImporting}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  importMode === "file"
                    ? "bg-[var(--color-bg-white)] text-chameleon-600 dark:text-chameleon-400 shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Folder className="w-4 h-4 inline mr-2" />
                {t("csv.uploadFile")}
              </button>
              <button
                onClick={() => setImportMode("text")}
                disabled={isImporting}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  importMode === "text"
                    ? "bg-[var(--color-bg-white)] text-chameleon-600 dark:text-chameleon-400 shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                {t("csv.pasteText")}
              </button>
              <button
                onClick={() => setImportMode("simple")}
                disabled={isImporting}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  importMode === "simple"
                    ? "bg-[var(--color-bg-white)] text-chameleon-600 dark:text-chameleon-400 shadow-sm"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                {t("csv.simpleImport")}
              </button>
            </div>
          </div>

          {/* File Upload Mode */}
          {importMode === "file" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                {t("csv.selectFile")}
              </label>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={handleChooseFile}
                  disabled={isImporting}
                  className="flex items-center gap-2"
                >
                  <Folder className="w-5 h-5" />
                  {t("csv.chooseFile")}
                </Button>
                {selectedFile && (
                  <div className="flex-1 flex items-center px-4 py-2 bg-[var(--color-bg-white)] rounded-lg border border-[var(--color-border-light)]">
                    <span className="text-sm text-[var(--color-text-secondary)] truncate">
                      {getFileName(selectedFile)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Text Paste Mode */}
          {importMode === "text" && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                {t("csv.pasteCSVContent")}
              </label>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                disabled={isImporting}
                rows={10}
                placeholder={t("csv.csvPlaceholder")}
                className="w-full px-4 py-3 border border-[var(--color-border-light)] rounded-lg focus:ring-2 focus:ring-chameleon-500 focus:border-chameleon-500 font-mono text-sm bg-[var(--color-bg-white)] text-[var(--color-text-primary)]"
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {t("csv.pasteHelp")}
              </p>
            </div>
          )}

          {/* Simple Import Mode */}
          {importMode === "simple" && (
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("csv.defaultLanguage")}
                </label>
                <select
                  value={defaultLanguage}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  disabled={isImporting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-chameleon-500 focus:border-chameleon-500"
                >
                  <option value="ko">Korean (한국어)</option>
                  <option value="en">English</option>
                  <option value="vi">Vietnamese (Tiếng Việt)</option>
                  <option value="es">Spanish (Español)</option>
                  <option value="fr">French (Français)</option>
                  <option value="de">German (Deutsch)</option>
                  <option value="ja">Japanese (日本語)</option>
                  <option value="zh">Chinese (中文)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t("csv.defaultLanguageHelp")}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("csv.pasteSimpleContent")}
                </label>
                <textarea
                  value={simpleCsvText}
                  onChange={(e) => setSimpleCsvText(e.target.value)}
                  disabled={isImporting}
                  rows={12}
                  placeholder={t("csv.simplePlaceholder")}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-chameleon-500 focus:border-chameleon-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("csv.simpleHelp")}
                </p>
              </div>
            </div>
          )}

          {/* Target Collection Selection */}
          {!isLoading && collections.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                {t("csv.targetCollection")}{" "}
                <span className="text-[var(--color-text-muted)] font-normal">
                  ({t("csv.optional")})
                </span>
              </label>
              <select
                value={targetCollectionId}
                onChange={(e) => setTargetCollectionId(e.target.value)}
                disabled={isImporting}
                className="w-full px-4 py-2 border border-[var(--color-border-light)] rounded-lg focus:ring-2 focus:ring-chameleon-500 focus:border-chameleon-500 bg-[var(--color-bg-white)] text-[var(--color-text-primary)]"
              >
                <option value="">{t("csv.useCollectionFromCsv")}</option>
                {collections.map((collection) => (
                  <option
                    key={getCollectionId(collection)}
                    value={getCollectionId(collection)}
                  >
                    {collection.name} ({collection.language.toUpperCase()})
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                {t("csv.targetCollectionHelp")}
              </p>
            </div>
          )}

          {/* Auto-create Collections Option */}
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCreateCollections}
                onChange={(e) => setAutoCreateCollections(e.target.checked)}
                disabled={isImporting || targetCollectionId !== ""}
                className="w-4 h-4 text-chameleon-600 border-gray-300 rounded focus:ring-chameleon-500"
              />
              <span className="text-sm text-gray-700">
                {t("csv.autoCreateCollections")}
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-6">
              {t("csv.autoCreateCollectionsHelp")}
            </p>
          </div>

          {/* Import Button */}
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={
                (importMode === "file" && !selectedFile) ||
                (importMode === "text" && !csvText.trim()) ||
                (importMode === "simple" && !simpleCsvText.trim()) ||
                isImporting
              }
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              {isImporting ? t("csv.importing") : t("csv.importButton")}
            </Button>

            <Button
              variant="secondary"
              onClick={() => navigate("/collections")}
              disabled={isImporting}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </Card>

        {/* Import Results */}
        {importResult && (
          <Card className="p-6">
            <div className="flex items-start gap-3 mb-4">
              {importResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                  {importResult.success
                    ? t("csv.importSuccessTitle")
                    : t("csv.importPartialSuccessTitle")}
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">
                      {t("csv.rowsImported")}:
                    </span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {importResult.rows_imported}
                    </span>
                  </div>

                  {importResult.rows_failed > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">
                        {t("csv.rowsFailed")}:
                      </span>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {importResult.rows_failed}
                      </span>
                    </div>
                  )}

                  {importResult.collections_created.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-secondary)]">
                        {t("csv.collectionsCreated")}:
                      </span>
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        {importResult.collections_created.length}
                      </span>
                    </div>
                  )}
                </div>

                {/* Error Details */}
                {importResult.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="text-sm font-semibold text-red-800 mb-2">
                      {t("csv.errors")}:
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {importResult.errors.slice(0, 10).map((error, idx) => (
                        <div key={idx} className="text-xs">
                          <span className="font-medium text-red-700">
                            Row {error.row_number}:
                          </span>{" "}
                          <span className="text-red-600">
                            {error.error_message}
                          </span>
                          {error.row_data && (
                            <div className="text-red-500 ml-4 truncate">
                              {error.row_data}
                            </div>
                          )}
                        </div>
                      ))}
                      {importResult.errors.length > 10 && (
                        <div className="text-xs text-red-600 italic">
                          {t("csv.andMoreErrors", {
                            count: importResult.errors.length - 10,
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex gap-3">
                  <Button
                    variant="primary"
                    onClick={() => navigate("/collections")}
                    className="flex-1"
                  >
                    {t("csv.viewCollections")}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedFile(null);
                      setFileContent(null);
                      setCsvText("");
                      setSimpleCsvText("");
                      setImportResult(null);
                    }}
                  >
                    {t("csv.importAnother")}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
};
