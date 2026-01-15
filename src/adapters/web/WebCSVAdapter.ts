/**
 * Web CSV Adapter
 * Implements CSV import/export using browser APIs
 */

import type {
  ICSVService,
  ImportCSVRequest,
  SimpleImportRequest,
  ImportResult,
} from "@/adapters";
import { db, generateId, now } from "./db";

export class WebCSVAdapter implements ICSVService {
  async getExportDirectory(): Promise<string> {
    // Web doesn't have a fixed export directory
    return "Downloads (browser default)";
  }

  async exportCollectionsCSV(
    collectionIds: string[],
    _exportPath?: string,
  ): Promise<string> {
    // Gather all vocabularies from selected collections
    const rows: string[][] = [
      [
        "word",
        "word_type",
        "level",
        "ipa",
        "definitions",
        "example_sentences",
        "topics",
        "tags",
        "language",
        "collection_name",
      ],
    ];

    for (const collectionId of collectionIds) {
      const collection = await db.collections.get(collectionId);
      const collectionName = collection?.name || "Unknown";

      const vocabs = await db.vocabularies
        .where("collection_id")
        .equals(collectionId)
        .toArray();

      for (const vocab of vocabs) {
        rows.push([
          vocab.word,
          vocab.word_type,
          vocab.level,
          vocab.ipa,
          JSON.stringify(vocab.definitions),
          JSON.stringify(vocab.example_sentences),
          vocab.topics.join(";"),
          vocab.tags.join(";"),
          vocab.language,
          collectionName,
        ]);
      }
    }

    // Convert to CSV string
    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    // Create blob and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chamlang_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return `Exported ${rows.length - 1} vocabularies`;
  }

  async chooseCSVSaveLocation(_defaultName: string): Promise<string | null> {
    // Web uses browser's download location
    return "browser-download";
  }

  async openExportDirectory(): Promise<void> {
    // Can't open directories in web, show a message instead
    alert(
      "In web mode, exports are saved to your browser's download folder. Please check your Downloads.",
    );
  }

  async importVocabulariesCSV(
    request: ImportCSVRequest,
  ): Promise<ImportResult> {
    // For web, we need to handle file input differently
    // This would typically be called after a file picker
    console.warn(
      "importVocabulariesCSV: In web mode, use file input element. FilePath:",
      request.filePath,
    );

    return {
      imported: 0,
      skipped: 0,
      errors: [
        "Web import requires using the file input element. Please use the import dialog.",
      ],
    };
  }

  async importSimpleVocabularies(
    request: SimpleImportRequest,
  ): Promise<ImportResult> {
    const timestamp = now();
    let imported = 0;
    const errors: string[] = [];

    // Get the collection to determine language
    const collection = await db.collections.get(request.collectionId);
    if (!collection) {
      return {
        imported: 0,
        skipped: request.words.length,
        errors: [`Collection not found: ${request.collectionId}`],
      };
    }

    for (const wordData of request.words) {
      try {
        const id = generateId();

        await db.vocabularies.add({
          id,
          word: wordData.word,
          word_type: "n/a",
          level: "Beginner",
          ipa: wordData.ipa || "",
          definitions: [{ meaning: wordData.definition }],
          example_sentences: [],
          topics: [],
          tags: [],
          related_words: [],
          language: collection.language,
          collection_id: request.collectionId,
          user_id: "local-user",
          created_at: timestamp,
          updated_at: timestamp,
        });

        imported++;
      } catch (error) {
        errors.push(`Failed to import "${wordData.word}": ${error}`);
      }
    }

    // Update collection word count
    if (imported > 0) {
      await db.collections.update(request.collectionId, {
        word_count: collection.word_count + imported,
        updated_at: timestamp,
      });
    }

    return {
      imported,
      skipped: request.words.length - imported,
      errors,
    };
  }

  async generateCSVTemplate(_filePath: string): Promise<string> {
    const templateContent = `word,word_type,level,ipa,definition,translation,example,topics,tags
example,noun,Beginner,[ɪɡˈzæmpəl],"a thing characteristic of its kind",ví dụ,"This is an example sentence.",vocabulary;learning,new`;

    const blob = new Blob([templateContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "chamlang_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return "Template downloaded";
  }

  /**
   * Web-specific method: Parse CSV file from user input
   */
  async parseCSVFile(file: File): Promise<string[][]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split("\n");
        const rows = lines.map((line) => {
          // Simple CSV parsing (doesn't handle all edge cases)
          const cells: string[] = [];
          let current = "";
          let inQuotes = false;

          for (const char of line) {
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
              cells.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          cells.push(current.trim());
          return cells;
        });
        resolve(rows.filter((row) => row.some((cell) => cell)));
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }
}
