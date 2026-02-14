/**
 * CSV Import/Export type definitions
 */

export interface CsvExportRequest {
  collectionIds: string[];
}

export interface ExportResult {
  message: string;
  filePath: string;
  fileName: string;
}

export interface CsvImportRequest {
  /** Either filePath or csvText must be provided */
  filePath?: string;
  /** CSV content as plain text (alternative to filePath) */
  csvText?: string;
  /** If provided, import all vocabularies into this collection */
  targetCollectionId?: string;
  createMissingCollections: boolean;
}

export interface SimpleImportRequest {
  /** Tab-separated values: collection_name, word, definition */
  csvText: string;
  /** Default language for new collections (e.g., "ko", "en", "vi") */
  defaultLanguage: string;
  /** If provided, import all vocabularies into this collection */
  targetCollectionId?: string;
  /** Auto-create collections if they don't exist */
  createMissingCollections: boolean;
}

export interface CsvImportResult {
  success: boolean;
  rowsImported: number;
  rowsFailed: number;
  errors: CsvImportError[];
  collectionsCreated: string[];
}

export interface CsvImportError {
  rowNumber: number;
  errorMessage: string;
  rowData: string;
}

export interface ValidationReport {
  valid: boolean;
  totalRows: number;
  errors: CsvImportError[];
}
