/**
 * Tauri CSV Adapter
 * Wraps Tauri IPC calls for CSV import/export operations
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  ICSVService,
  ImportCSVRequest,
  SimpleImportRequest,
  ImportResult,
} from "@cham-lang/ui/adapters/factory/interfaces";

export class TauriCSVAdapter implements ICSVService {
  async getExportDirectory(): Promise<string> {
    return invoke("get_export_directory");
  }

  async exportCollectionsCSV(
    collectionIds: string[],
    exportPath?: string,
  ): Promise<string> {
    return invoke("export_collections_csv", {
      collectionIds,
      exportPath,
    });
  }

  async chooseCSVSaveLocation(defaultName: string): Promise<string | null> {
    return invoke("choose_csv_save_location", { defaultName });
  }

  async openExportDirectory(): Promise<void> {
    return invoke("open_export_directory");
  }

  async importVocabulariesCSV(
    request: ImportCSVRequest,
  ): Promise<ImportResult> {
    return invoke("import_vocabularies_csv", { request });
  }

  async importSimpleVocabularies(
    request: SimpleImportRequest,
  ): Promise<ImportResult> {
    return invoke("import_simple_vocabularies", { request });
  }

  async generateCSVTemplate(filePath: string): Promise<string> {
    return invoke("generate_csv_template", { filePath });
  }
}
