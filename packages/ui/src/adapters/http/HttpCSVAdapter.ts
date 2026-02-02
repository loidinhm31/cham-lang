/**
 * HTTP CSV Adapter (Stub)
 * CSV import/export are desktop-only features, not supported in web browser mode
 */

import type { ICSVService } from "@cham-lang/shared/services";
import type {
  ImportCSVRequest,
  SimpleImportRequest,
  ImportResult,
} from "@cham-lang/shared/services";

export class HttpCSVAdapter implements ICSVService {
  async getExportDirectory(): Promise<string> {
    throw new Error(
      "File system access is not supported in browser mode. Please use the desktop app.",
    );
  }

  async exportCollectionsCSV(
    _collectionIds: string[],
    _exportPath?: string,
  ): Promise<string> {
    throw new Error(
      "CSV export is not supported in browser mode. Please use the desktop app.",
    );
  }

  async chooseCSVSaveLocation(_defaultName: string): Promise<string | null> {
    throw new Error(
      "File dialogs are not supported in browser mode. Please use the desktop app.",
    );
  }

  async openExportDirectory(): Promise<void> {
    throw new Error(
      "File system access is not supported in browser mode. Please use the desktop app.",
    );
  }

  async importVocabulariesCSV(
    _request: ImportCSVRequest,
  ): Promise<ImportResult> {
    throw new Error(
      "CSV import is not supported in browser mode. Please use the desktop app.",
    );
  }

  async importSimpleVocabularies(
    _request: SimpleImportRequest,
  ): Promise<ImportResult> {
    throw new Error(
      "CSV import is not supported in browser mode. Please use the desktop app.",
    );
  }

  async generateCSVTemplate(_filePath: string): Promise<string> {
    throw new Error(
      "CSV template generation is not supported in browser mode. Please use the desktop app.",
    );
  }
}
