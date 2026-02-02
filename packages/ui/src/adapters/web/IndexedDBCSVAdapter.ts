import type {
  ICSVService,
  ImportCSVRequest,
  SimpleImportRequest,
  ImportResult,
} from "@cham-lang/shared/services";
import { db, generateId, getCurrentTimestamp } from "./database";

export class IndexedDBCSVAdapter implements ICSVService {
  async getExportDirectory(): Promise<string> {
    return "Downloads";
  }

  async exportCollectionsCSV(
    collectionIds: string[],
    _exportPath?: string,
  ): Promise<string> {
    const rows: string[] = [];
    rows.push(
      "collection_name,word,word_type,level,ipa,language,definitions,example_sentences,topics,tags",
    );

    for (const collectionId of collectionIds) {
      const collection = await db.collections.get(collectionId);
      if (!collection) continue;

      const vocabs = await db.vocabularies
        .where("collection_id")
        .equals(collectionId)
        .toArray();

      for (const vocab of vocabs) {
        const definitions = vocab.definitions.map((d) => d.meaning).join("; ");
        const examples = vocab.example_sentences.join("; ");
        const topics = vocab.topics.join("; ");
        const tags = vocab.tags.join("; ");

        rows.push(
          [
            csvEscape(collection.name),
            csvEscape(vocab.word),
            csvEscape(vocab.word_type),
            csvEscape(vocab.level),
            csvEscape(vocab.ipa),
            csvEscape(vocab.language),
            csvEscape(definitions),
            csvEscape(examples),
            csvEscape(topics),
            csvEscape(tags),
          ].join(","),
        );
      }
    }

    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    // Trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = `cham-lang-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    return "CSV exported successfully";
  }

  async chooseCSVSaveLocation(_defaultName: string): Promise<string | null> {
    // In web mode, we just download directly
    return null;
  }

  async openExportDirectory(): Promise<void> {
    // Not applicable in web mode
  }

  async importVocabulariesCSV(
    request: ImportCSVRequest,
  ): Promise<ImportResult> {
    if (!request.csv_text) {
      return {
        imported: 0,
        skipped: 0,
        errors: [
          "File-based CSV import is not supported in web mode. Provide csv_text instead.",
        ],
      };
    }

    const lines = parseCSVLines(request.csv_text);
    if (lines.length < 2) {
      return {
        imported: 0,
        skipped: 0,
        errors: ["CSV must have a header row and at least one data row."],
      };
    }

    const header = lines[0].map((h) => h.trim().toLowerCase());
    const colIdx = (name: string) => header.indexOf(name);

    // Required columns
    const wordIdx = colIdx("word");
    if (wordIdx === -1) {
      return {
        imported: 0,
        skipped: 0,
        errors: ["CSV header must contain a 'word' column."],
      };
    }

    // Optional column indices
    const collNameIdx = colIdx("collection_name");
    const wordTypeIdx = colIdx("word_type");
    const levelIdx = colIdx("level");
    const ipaIdx = colIdx("ipa");
    const langIdx = colIdx("language");
    const defsIdx =
      colIdx("definitions") !== -1 ? colIdx("definitions") : colIdx("meaning");
    const examplesIdx = colIdx("example_sentences");
    const topicsIdx = colIdx("topics");
    const tagsIdx = colIdx("tags");
    const relatedIdx = colIdx("related_words");

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const now = getCurrentTimestamp();

    // Cache: collection name -> collection id
    const collectionCache = new Map<string, string>();
    const collectionsCreated: string[] = [];

    // Pre-load existing collections
    const existingCollections = await db.collections.toArray();
    for (const c of existingCollections) {
      collectionCache.set(c.name.toLowerCase(), c.id);
    }

    // Track word counts to update per collection
    const importedPerCollection = new Map<string, number>();

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      const rowNum = i + 1;

      const word = row[wordIdx]?.trim();
      if (!word) {
        skipped++;
        errors.push(`Row ${rowNum}: empty word, skipped.`);
        continue;
      }

      // Determine target collection
      let collectionId = request.collectionId || "";
      const collectionName = collNameIdx !== -1 ? row[collNameIdx]?.trim() : "";

      if (!collectionId && collectionName) {
        const cached = collectionCache.get(collectionName.toLowerCase());
        if (cached) {
          collectionId = cached;
        } else if (request.create_missing_collections) {
          // Create collection
          const newId = generateId();
          const lang =
            langIdx !== -1 && row[langIdx]?.trim() ? row[langIdx].trim() : "en";
          await db.collections.add({
            id: newId,
            name: collectionName,
            description: "",
            language: lang,
            owner_id: "local",
            shared_with: [],
            is_public: false,
            word_count: 0,
            created_at: now,
            updated_at: now,
          });
          collectionCache.set(collectionName.toLowerCase(), newId);
          collectionsCreated.push(collectionName);
          collectionId = newId;
        } else {
          skipped++;
          errors.push(
            `Row ${rowNum}: collection "${collectionName}" not found and auto-create is disabled.`,
          );
          continue;
        }
      }

      if (!collectionId) {
        skipped++;
        errors.push(`Row ${rowNum}: no target collection specified.`);
        continue;
      }

      try {
        const definitions =
          defsIdx !== -1 && row[defsIdx]?.trim()
            ? row[defsIdx]
                .split(";")
                .map((m) => ({ meaning: m.trim() }))
                .filter((d) => d.meaning)
            : [];
        const examples =
          examplesIdx !== -1 && row[examplesIdx]?.trim()
            ? row[examplesIdx]
                .split(";")
                .map((s) => s.trim())
                .filter(Boolean)
            : [];
        const topics =
          topicsIdx !== -1 && row[topicsIdx]?.trim()
            ? row[topicsIdx]
                .split(";")
                .map((s) => s.trim())
                .filter(Boolean)
            : [];
        const tags =
          tagsIdx !== -1 && row[tagsIdx]?.trim()
            ? row[tagsIdx]
                .split(";")
                .map((s) => s.trim())
                .filter(Boolean)
            : [];
        const related =
          relatedIdx !== -1 && row[relatedIdx]?.trim()
            ? row[relatedIdx]
                .split(";")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((w) => ({ word: w, relationship: "" }))
            : [];

        await db.vocabularies.add({
          id: generateId(),
          word,
          word_type:
            wordTypeIdx !== -1 ? row[wordTypeIdx]?.trim() || "n/a" : "n/a",
          level: levelIdx !== -1 ? row[levelIdx]?.trim() || "" : "",
          ipa: ipaIdx !== -1 ? row[ipaIdx]?.trim() || "" : "",
          definitions,
          example_sentences: examples,
          topics,
          tags,
          related_words: related,
          language:
            langIdx !== -1 && row[langIdx]?.trim() ? row[langIdx].trim() : "en",
          collection_id: collectionId,
          user_id: "local",
          created_at: now,
          updated_at: now,
        });

        imported++;
        importedPerCollection.set(
          collectionId,
          (importedPerCollection.get(collectionId) || 0) + 1,
        );
      } catch (e) {
        skipped++;
        errors.push(`Row ${rowNum}: failed to import "${word}": ${e}`);
      }
    }

    // Update word counts
    for (const [collId, count] of importedPerCollection) {
      const coll = await db.collections.get(collId);
      if (coll) {
        await db.collections.update(collId, {
          word_count: (coll.word_count || 0) + count,
        });
      }
    }

    return {
      imported,
      skipped,
      errors,
      collections_created: collectionsCreated,
    };
  }

  async importSimpleVocabularies(
    request: SimpleImportRequest,
  ): Promise<ImportResult> {
    const { collectionId, words, language } = request;

    if (!collectionId) {
      return {
        imported: 0,
        skipped: words.length,
        errors: [
          "No target collection specified. Auto-creating collections from simple import is not supported in web mode.",
        ],
      };
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];
    const now = getCurrentTimestamp();

    for (const item of words) {
      if (!item.word || !item.word.trim()) {
        skipped++;
        continue;
      }

      try {
        await db.vocabularies.add({
          id: generateId(),
          word: item.word.trim(),
          word_type: "n/a",
          level: "",
          ipa: item.ipa || "",
          definitions: item.definition?.trim()
            ? [{ meaning: item.definition.trim() }]
            : [],
          example_sentences: [],
          topics: [],
          tags: [],
          related_words: [],
          language: language || "en",
          collection_id: collectionId,
          user_id: "local",
          created_at: now,
          updated_at: now,
        });

        imported++;
      } catch (e) {
        errors.push(`Failed to import word "${item.word}": ${e}`);
        skipped++;
      }
    }

    // Update word count
    const coll = await db.collections.get(collectionId);
    if (coll) {
      await db.collections.update(collectionId, {
        word_count: (coll.word_count || 0) + imported,
      });
    }

    return { imported, skipped, errors };
  }

  async generateCSVTemplate(_filePath: string): Promise<string> {
    const template =
      "collection_name,word,word_type,level,ipa,language,meaning,translation,example,example_sentences,topics,tags\n";
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cham-lang-template.csv";
    a.click();
    URL.revokeObjectURL(url);
    return "Template downloaded";
  }
}

function csvEscape(value: string): string {
  if (!value) return '""';
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Parse CSV text into rows of fields, handling quoted fields with commas/newlines.
 */
function parseCSVLines(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ",") {
        current.push(field);
        field = "";
        i++;
      } else if (ch === "\r") {
        // skip \r
        i++;
      } else if (ch === "\n") {
        current.push(field);
        field = "";
        if (current.some((f) => f.trim())) {
          rows.push(current);
        }
        current = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Last field/row
  current.push(field);
  if (current.some((f) => f.trim())) {
    rows.push(current);
  }

  return rows;
}
