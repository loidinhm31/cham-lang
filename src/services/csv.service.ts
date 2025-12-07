import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import type {
  CsvExportRequest,
  ExportResult,
  CsvImportRequest,
  CsvImportResult,
  SimpleImportRequest,
} from "../types/csv";

/**
 * Service for CSV import/export operations
 */
export class CsvService {
  /**
   * Get the app's export directory (Android-safe)
   */
  static async getExportDirectory(): Promise<string> {
    return invoke("get_export_directory");
  }

  /**
   * Export collections to CSV file
   */
  static async exportCollections(
    collectionIds: string[],
    filePath: string,
  ): Promise<ExportResult> {
    const request: CsvExportRequest = {
      collection_ids: collectionIds,
    };

    return invoke("export_collections_csv", {
      request,
      filePath,
    });
  }

  /**
   * Import vocabularies from CSV file
   */
  static async importVocabularies(
    request: CsvImportRequest,
  ): Promise<CsvImportResult> {
    return invoke("import_vocabularies_csv", { request });
  }

  /**
   * Import vocabularies from simple 3-column format (collection_name, word, definition)
   */
  static async importSimpleVocabularies(
    request: SimpleImportRequest,
  ): Promise<CsvImportResult> {
    return invoke("import_simple_vocabularies", { request });
  }

  /**
   * Open file save dialog for CSV export
   * Returns the selected file path or null if cancelled
   */
  static async chooseSaveLocation(): Promise<string | null> {
    const filePath = await save({
      filters: [
        {
          name: "CSV",
          extensions: ["csv"],
        },
      ],
      defaultPath: `chamlang_export_${new Date().toISOString().split("T")[0]}.csv`,
    });

    return filePath;
  }

  /**
   * Open file picker dialog for CSV import
   * Returns the selected file path or null if cancelled
   */
  static async chooseImportFile(): Promise<string | null> {
    const filePath = await open({
      multiple: false,
      filters: [
        {
          name: "CSV",
          extensions: ["csv"],
        },
      ],
    });

    // open() returns string | string[] | null
    // Since multiple: false, it will be string | null
    if (typeof filePath === "string") {
      return filePath;
    }

    return null;
  }

  /**
   * Generate and download a CSV template with example data
   */
  static async generateTemplate(): Promise<string> {
    // Open save dialog
    const filePath = await save({
      filters: [
        {
          name: "CSV",
          extensions: ["csv"],
        },
      ],
      defaultPath: "chamlang_import_template.csv",
    });

    if (!filePath) {
      throw new Error("No file path selected");
    }

    // Generate template file
    return invoke("generate_csv_template", { filePath });
  }
}
