/**
 * CSV Service
 * Direct passthrough to the platform adapter via ServiceFactory
 * Maintains backward compatibility with existing component usage
 */

import { getCSVService } from "@cham-lang/ui/adapters";
import { isTauri } from "@cham-lang/ui/utils";
import { invoke } from "@tauri-apps/api/core";
import type {
  CsvImportRequest,
  CsvImportResult,
  SimpleImportRequest as TypesSimpleImportRequest,
  ExportResult,
} from "@cham-lang/shared/types";

// Re-export types from types/csv for backward compatibility
export type {
  CsvImportRequest,
  CsvImportResult,
  CsvImportError,
  ExportResult,
  // SimpleImportRequest removed to avoid conflict with adapters export
} from "@cham-lang/shared/types";

/**
 * CSV Service
 * Named CsvService for backward compatibility with existing components
 */
export class CsvService {
  /**
   * Get the export directory path
   */
  static async getExportDirectory(): Promise<string> {
    return getCSVService().getExportDirectory();
  }

  /**
   * Export collections to CSV format
   */
  static async exportCollections(
    collectionIds: string[],
    exportPath?: string,
  ): Promise<ExportResult> {
    if (isTauri()) {
      // Use Tauri invoke for full export result
      return invoke("export_collections_csv", {
        collectionIds,
        exportPath,
      });
    }
    // Web mode returns a simplified result
    const service = getCSVService();
    const message = await service.exportCollectionsCSV(
      collectionIds,
      exportPath,
    );
    return {
      message,
      filePath: "Downloads",
      fileName: `chamlang_export_${new Date().toISOString().split("T")[0]}.csv`,
    };
  }

  /**
   * Open file dialog to choose CSV file for import
   */
  static async chooseImportFile(): Promise<string | null> {
    if (isTauri()) {
      // Use Tauri file dialog
      const { open } = await import("@tauri-apps/plugin-dialog");
      const result = await open({
        multiple: false,
        filters: [{ name: "CSV Files", extensions: ["csv"] }],
      });
      return result as string | null;
    }
    // Web mode doesn't use file paths - returns null to trigger text input mode
    return null;
  }

  /**
   * Open browser file picker and read CSV file content (web mode)
   * Returns file name and text content, or null if cancelled
   */
  static async chooseImportFileWeb(): Promise<{
    name: string;
    content: string;
  } | null> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv";
      input.style.display = "none";
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          input.remove();
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          resolve({ name: file.name, content: reader.result as string });
          input.remove();
        };
        reader.onerror = () => {
          resolve(null);
          input.remove();
        };
        reader.readAsText(file);
      });
      input.addEventListener("cancel", () => {
        resolve(null);
        input.remove();
      });
      document.body.appendChild(input);
      input.click();
    });
  }

  /**
   * Open file dialog to choose CSV save location
   */
  static async chooseCSVSaveLocation(
    defaultName: string,
  ): Promise<string | null> {
    return getCSVService().chooseCSVSaveLocation(defaultName);
  }

  /**
   * Open the export directory in file explorer
   */
  static async openExportDirectory(): Promise<void> {
    return getCSVService().openExportDirectory();
  }

  /**
   * Import vocabularies from a CSV file or text
   */
  static async importVocabularies(
    request: CsvImportRequest,
  ): Promise<CsvImportResult> {
    if (isTauri()) {
      return invoke("import_vocabularies_csv", { request });
    }
    // Web mode: use adapter for text-based import
    const service = getCSVService();
    const result = await service.importVocabulariesCSV({
      csvText: request.csvText,
      collectionId: request.targetCollectionId,
      createMissingCollections: request.createMissingCollections,
    });

    return {
      success: result.errors.length === 0 && result.imported > 0,
      rowsImported: result.imported,
      rowsFailed: result.skipped,
      errors: result.errors.map((e, i) => ({
        rowNumber: i + 1,
        errorMessage: e,
        rowData: "",
      })),
      collectionsCreated: result.collectionsCreated || [],
    };
  }

  /**
   * Import simple vocabulary list (word + definition)
   */
  static async importSimpleVocabularies(
    request: TypesSimpleImportRequest,
  ): Promise<CsvImportResult> {
    if (isTauri()) {
      return invoke("import_simple_vocabularies", { request });
    }
    // Web mode: parse and import
    const parsed = this.parseSimpleVocabularyText(request.csvText);
    if (parsed.length === 0) {
      return {
        success: false,
        rowsImported: 0,
        rowsFailed: 0,
        errors: [
          {
            rowNumber: 0,
            errorMessage: "No valid vocabulary entries found",
            rowData: "",
          },
        ],
        collectionsCreated: [],
      };
    }

    // Check if any entries have collection names and no target collection is set
    const hasCollectionNames = parsed.some((w) => w.collection_name);
    if (hasCollectionNames && !request.targetCollectionId) {
      // Convert to full CSV format and use importVocabulariesCSV for collection auto-creation
      const csvLines = ["collection_name,word,definitions,language"];
      for (const w of parsed) {
        const escape = (v: string) => {
          if (v.includes(",") || v.includes('"') || v.includes("\n")) {
            return `"${v.replace(/"/g, '""')}"`;
          }
          return v;
        };
        csvLines.push(
          [
            escape(w.collection_name || ""),
            escape(w.word),
            escape(w.definition),
            escape(request.defaultLanguage || "en"),
          ].join(","),
        );
      }

      const service = getCSVService();
      const result = await service.importVocabulariesCSV({
        csvText: csvLines.join("\n"),
        createMissingCollections: request.createMissingCollections,
      });

      return {
        success: result.errors.length === 0 && result.imported > 0,
        rowsImported: result.imported,
        rowsFailed: result.skipped,
        errors: result.errors.map((e, i) => ({
          rowNumber: i + 1,
          errorMessage: e,
          rowData: "",
        })),
        collectionsCreated: result.collectionsCreated || [],
      };
    }

    // Use the adapter for actual import
    const service = getCSVService();
    const result = await service.importSimpleVocabularies({
      collectionId: request.targetCollectionId || "",
      language: request.defaultLanguage,
      words: parsed.map((w) => ({
        word: w.word,
        definition: w.definition,
      })),
    });

    return {
      success: result.errors.length === 0 && result.imported > 0,
      rowsImported: result.imported,
      rowsFailed: result.skipped,
      errors: result.errors.map((e, i) => ({
        rowNumber: i + 1,
        errorMessage: e,
        rowData: "",
      })),
      collectionsCreated: result.collectionsCreated || [],
    };
  }

  /**
   * Generate and download a CSV template file
   */
  static async generateTemplate(): Promise<string> {
    if (isTauri()) {
      // Use Tauri file save dialog
      const { save } = await import("@tauri-apps/plugin-dialog");
      const filePath = await save({
        defaultPath: "chamlang_template.csv",
        filters: [{ name: "CSV Files", extensions: ["csv"] }],
      });
      if (!filePath) {
        throw new Error("No file path selected");
      }
      return invoke("generate_csv_template", { filePath });
    }
    // Web mode: trigger browser download
    const service = getCSVService();
    return service.generateCSVTemplate("chamlang_template.csv");
  }

  /**
   * Parse a text content as simple vocabulary list
   * Format: each line contains "word - definition" or "word: definition" or "word\tdefinition"
   */
  static parseSimpleVocabularyText(
    text: string,
  ): Array<{ word: string; definition: string; collection_name?: string }> {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const result: Array<{
      word: string;
      definition: string;
      collection_name?: string;
    }> = [];

    for (const line of lines) {
      // Try different separators
      let parts: string[] = [];

      if (line.includes("\t")) {
        parts = line.split("\t");
      } else if (line.includes(" - ")) {
        parts = line.split(" - ");
      } else if (line.includes(": ")) {
        parts = line.split(": ");
      }

      if (parts.length >= 3) {
        // 3-column format: collection_name, word, definition
        const collection_name = parts[0].trim();
        const word = parts[1].trim();
        const definition = parts.slice(2).join(" - ").trim();

        if (word && definition) {
          result.push({
            word,
            definition,
            collection_name: collection_name || undefined,
          });
        }
      } else if (parts.length === 2) {
        const word = parts[0].trim();
        const definition = parts[1].trim();

        if (word && definition) {
          result.push({ word, definition });
        }
      }
    }

    return result;
  }

  /**
   * Download a template CSV file (for web mode, triggers browser download)
   */
  static async downloadTemplate(): Promise<string> {
    return this.generateTemplate();
  }
}

// Also export as CSVService for consistency with naming convention
export { CsvService as CSVService };
