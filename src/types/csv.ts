/**
 * CSV Import/Export type definitions
 */

export interface CsvExportRequest {
  collection_ids: string[];
}

export interface CsvImportRequest {
  /** Either file_path or csv_text must be provided */
  file_path?: string;
  /** CSV content as plain text (alternative to file_path) */
  csv_text?: string;
  /** If provided, import all vocabularies into this collection */
  target_collection_id?: string;
  create_missing_collections: boolean;
}

export interface SimpleImportRequest {
  /** Tab-separated values: collection_name, word, definition */
  csv_text: string;
  /** Default language for new collections (e.g., "ko", "en", "vi") */
  default_language: string;
  /** If provided, import all vocabularies into this collection */
  target_collection_id?: string;
  /** Auto-create collections if they don't exist */
  create_missing_collections: boolean;
}

export interface CsvImportResult {
  success: boolean;
  rows_imported: number;
  rows_failed: number;
  errors: CsvImportError[];
  collections_created: string[];
}

export interface CsvImportError {
  row_number: number;
  error_message: string;
  row_data: string;
}

export interface ValidationReport {
  valid: boolean;
  total_rows: number;
  errors: CsvImportError[];
}
