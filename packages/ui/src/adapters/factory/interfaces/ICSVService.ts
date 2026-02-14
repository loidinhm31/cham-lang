/**
 * CSV Service Interface
 * Contract that both Tauri and Web adapters must implement
 */

export interface ExportCSVRequest {
  collectionIds: string[];
  includeProgress?: boolean;
}

export interface ImportCSVRequest {
  filePath?: string;
  csvText?: string;
  collectionId?: string;
  createMissingCollections?: boolean;
}

export interface SimpleImportRequest {
  collectionId: string;
  language?: string;
  words: Array<{
    word: string;
    definition: string;
    ipa?: string;
  }>;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  collectionsCreated?: string[];
}

export interface ICSVService {
  // Export
  getExportDirectory(): Promise<string>;
  exportCollectionsCSV(
    collectionIds: string[],
    exportPath?: string,
  ): Promise<string>;
  chooseCSVSaveLocation(defaultName: string): Promise<string | null>;
  openExportDirectory(): Promise<void>;

  // Import
  importVocabulariesCSV(request: ImportCSVRequest): Promise<ImportResult>;
  importSimpleVocabularies(request: SimpleImportRequest): Promise<ImportResult>;

  // Template
  generateCSVTemplate(filePath: string): Promise<string>;
}
