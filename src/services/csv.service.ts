/**
 * CSV Service
 * Uses platform adapter for cross-platform compatibility
 * Maintains backward compatibility with existing component usage
 */

import { getCSVService } from "@/adapters/ServiceFactory";
import { isTauri } from "@/utils/platform";
import { invoke } from "@tauri-apps/api/core";
import type {
  CsvImportRequest,
  CsvImportResult,
  SimpleImportRequest as TypesSimpleImportRequest,
  ExportResult,
} from "@/types/csv";

// Re-export types from types/csv for backward compatibility
export type {
  CsvImportRequest,
  CsvImportResult,
  CsvImportError,
  ExportResult,
  SimpleImportRequest,
} from "@/types/csv";

// Get the platform-specific service
const service = getCSVService();

/**
 * CSV Service
 * Named CsvService for backward compatibility with existing components
 */
export class CsvService {
  /**
   * Get the export directory path
   */
  static async getExportDirectory(): Promise<string> {
    return service.getExportDirectory();
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
    const message = await service.exportCollectionsCSV(
      collectionIds,
      exportPath,
    );
    return {
      message,
      file_path: "Downloads",
      file_name: `chamlang_export_${new Date().toISOString().split("T")[0]}.csv`,
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
   * Open file dialog to choose CSV save location
   */
  static async chooseCSVSaveLocation(
    defaultName: string,
  ): Promise<string | null> {
    return service.chooseCSVSaveLocation(defaultName);
  }

  /**
   * Open the export directory in file explorer
   */
  static async openExportDirectory(): Promise<void> {
    return service.openExportDirectory();
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
    // Web mode: simplified import
    return {
      success: false,
      rows_imported: 0,
      rows_failed: 0,
      errors: [
        {
          row_number: 0,
          error_message: "Web import requires using the text paste mode",
          row_data: "",
        },
      ],
      collections_created: [],
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
    const words = this.parseSimpleVocabularyText(request.csv_text);
    if (words.length === 0) {
      return {
        success: false,
        rows_imported: 0,
        rows_failed: 0,
        errors: [
          {
            row_number: 0,
            error_message: "No valid vocabulary entries found",
            row_data: "",
          },
        ],
        collections_created: [],
      };
    }

    // Use the adapter for actual import
    const result = await service.importSimpleVocabularies({
      collectionId: request.target_collection_id || "",
      words: words.map((w) => ({
        word: w.word,
        definition: w.definition,
      })),
    });

    return {
      success: result.errors.length === 0,
      rows_imported: result.imported,
      rows_failed: result.skipped,
      errors: result.errors.map((e, i) => ({
        row_number: i + 1,
        error_message: e,
        row_data: "",
      })),
      collections_created: [],
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
    return service.generateCSVTemplate("chamlang_template.csv");
  }

  /**
   * Parse a text content as simple vocabulary list
   * Format: each line contains "word - definition" or "word: definition" or "word\tdefinition"
   */
  static parseSimpleVocabularyText(
    text: string,
  ): Array<{ word: string; definition: string }> {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const result: Array<{ word: string; definition: string }> = [];

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

      if (parts.length >= 2) {
        const word = parts[0].trim();
        const definition = parts.slice(1).join(" - ").trim();

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
