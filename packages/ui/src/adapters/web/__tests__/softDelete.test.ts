import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../database";
import { IndexedDBVocabularyAdapter } from "../IndexedDBVocabularyAdapter";
import { IndexedDBCollectionAdapter } from "../IndexedDBCollectionAdapter";
import { IndexedDBSyncStorage } from "../sync/IndexedDBSyncStorage";
import type { PullRecord } from "@qm-hub/sync-client-types";

const vocabAdapter = new IndexedDBVocabularyAdapter();
const collectionAdapter = new IndexedDBCollectionAdapter();
const storage = new IndexedDBSyncStorage();

const now = new Date().toISOString();

async function seedCollection(id = "coll-1", wordCount = 0) {
  await db.collections.add({
    id,
    name: "Test",
    description: "",
    language: "en",
    sharedWith: [],
    isPublic: false,
    wordCount,
    createdAt: now,
    updatedAt: now,
    syncVersion: 1,
    syncedAt: 1000,
  });
}

async function seedVocab(id = "vocab-1", collectionId = "coll-1") {
  await db.vocabularies.add({
    id,
    word: "test",
    wordType: "noun",
    level: "A1",
    ipa: "",
    definitions: [],
    exampleSentences: [],
    topics: [],
    tags: [],
    relatedWords: [],
    language: "en",
    collectionId,
    createdAt: now,
    updatedAt: now,
    syncVersion: 1,
    syncedAt: 1000,
  });
}

beforeEach(async () => {
  await db.collections.clear();
  await db.vocabularies.clear();
  await db.topics.clear();
  await db.tags.clear();
  await db.userLearningLanguages.clear();
  await db.collectionSharedUsers.clear();
  await db.practiceProgress.clear();
  await db._syncMeta.clear();
  await db._pendingChanges.clear();
});

// =============================================================================
// Vocabulary soft-delete
// =============================================================================

describe("IndexedDBVocabularyAdapter - soft delete", () => {
  it("marks deleted:1 instead of hard-deleting", async () => {
    await seedCollection("coll-1", 1);
    await seedVocab("vocab-1");

    await vocabAdapter.deleteVocabulary("vocab-1");

    const record = await db.vocabularies.get("vocab-1");
    expect(record).toBeDefined();
    expect(record?.deleted).toBe(1);
    expect(record?.deletedAt).toBeGreaterThan(0);
    expect(record?.syncedAt).toBeUndefined();
  });

  it("excludes soft-deleted records from getAllVocabularies", async () => {
    await seedCollection("coll-1");
    await seedVocab("vocab-1");
    await seedVocab("vocab-2");
    await vocabAdapter.deleteVocabulary("vocab-1");

    const all = await vocabAdapter.getAllVocabularies();
    expect(all.map((v) => v.id)).not.toContain("vocab-1");
    expect(all.map((v) => v.id)).toContain("vocab-2");
  });

  it("excludes soft-deleted from getVocabulariesByCollection", async () => {
    await seedCollection("coll-1", 2);
    await seedVocab("vocab-1");
    await seedVocab("vocab-2");
    await vocabAdapter.deleteVocabulary("vocab-1");

    const results = await vocabAdapter.getVocabulariesByCollection("coll-1");
    expect(results.map((v) => v.id)).not.toContain("vocab-1");
  });

  it("decrements wordCount on soft-delete", async () => {
    await seedCollection("coll-1", 1);
    await seedVocab("vocab-1");

    await vocabAdapter.deleteVocabulary("vocab-1");

    const coll = await db.collections.get("coll-1");
    expect(coll?.wordCount).toBe(0);
  });

  it("increments syncVersion on soft-delete for pending push", async () => {
    await seedCollection("coll-1");
    await seedVocab("vocab-1");

    await vocabAdapter.deleteVocabulary("vocab-1");

    const record = await db.vocabularies.get("vocab-1");
    expect(record?.syncVersion).toBe(2); // was 1, incremented
  });
});

// =============================================================================
// Collection soft-delete
// =============================================================================

describe("IndexedDBCollectionAdapter - soft delete", () => {
  it("marks collection and its vocabs as deleted:1", async () => {
    await seedCollection("coll-1", 2);
    await seedVocab("vocab-1");
    await seedVocab("vocab-2");

    await collectionAdapter.deleteCollection("coll-1");

    const coll = await db.collections.get("coll-1");
    expect(coll?.deleted).toBe(1);

    const v1 = await db.vocabularies.get("vocab-1");
    const v2 = await db.vocabularies.get("vocab-2");
    expect(v1?.deleted).toBe(1);
    expect(v2?.deleted).toBe(1);
  });

  it("excludes soft-deleted collections from getUserCollections", async () => {
    await seedCollection("coll-1");
    await seedCollection("coll-2");
    await collectionAdapter.deleteCollection("coll-1");

    const collections = await collectionAdapter.getUserCollections();
    expect(collections.map((c) => c.id)).not.toContain("coll-1");
    expect(collections.map((c) => c.id)).toContain("coll-2");
  });
});

// =============================================================================
// getPendingChanges — soft-deleted records pushed as deleted:true
// =============================================================================

describe("IndexedDBSyncStorage.getPendingChanges - soft delete propagation", () => {
  it("emits deleted:true for unsynced soft-deleted vocab", async () => {
    await seedCollection("coll-1");
    // Seed a soft-deleted vocab with syncedAt=undefined
    await db.vocabularies.add({
      id: "vocab-del",
      word: "gone",
      wordType: "noun",
      level: "A1",
      ipa: "",
      definitions: [],
      exampleSentences: [],
      topics: [],
      tags: [],
      relatedWords: [],
      language: "en",
      collectionId: "coll-1",
      createdAt: now,
      updatedAt: now,
      syncVersion: 2,
      syncedAt: undefined,
      deleted: 1,
      deletedAt: Date.now(),
    });

    const pending = await storage.getPendingChanges("user-1");
    const deleteRecord = pending.find((r) => r.rowId === "vocab-del");
    expect(deleteRecord).toBeDefined();
    expect(deleteRecord?.deleted).toBe(true);
    expect(Object.keys(deleteRecord?.data ?? {})).toHaveLength(0);
  });

  it("emits deleted:false for unsynced non-deleted vocab", async () => {
    await seedCollection("coll-1");
    // Re-seed with syncedAt=undefined (unsynced upsert)
    await db.vocabularies.add({
      id: "vocab-new",
      word: "hello",
      wordType: "noun",
      level: "A1",
      ipa: "",
      definitions: [],
      exampleSentences: [],
      topics: [],
      tags: [],
      relatedWords: [],
      language: "en",
      collectionId: "coll-1",
      createdAt: now,
      updatedAt: now,
      syncVersion: 1,
      syncedAt: undefined,
    });

    const pending = await storage.getPendingChanges("user-1");
    const upsertRecord = pending.find((r) => r.rowId === "vocab-new");
    expect(upsertRecord?.deleted).toBe(false);
    expect((upsertRecord?.data as { word?: string })?.word).toBe("hello");
  });
});

// =============================================================================
// applyRemoteChanges — atomic transaction (soft-delete on server push)
// =============================================================================

describe("IndexedDBSyncStorage.applyRemoteChanges - soft delete from server", () => {
  it("soft-deletes vocab when server sends deleted:true", async () => {
    await seedCollection("coll-1", 1);
    await seedVocab("vocab-1");

    const record: PullRecord = {
      tableName: "vocabularies",
      rowId: "vocab-1",
      version: 2,
      deleted: true,
      data: {},
      syncedAt: "",
    };

    await storage.applyRemoteChanges([record]);

    const vocab = await db.vocabularies.get("vocab-1");
    expect(vocab).toBeDefined();
    expect(vocab?.deleted).toBe(1);
    expect(vocab?.deletedAt).toBeGreaterThan(0);
  });

  it("soft-deletes collection and all its vocabs when server sends deleted:true", async () => {
    await seedCollection("coll-1", 2);
    await seedVocab("vocab-1");
    await seedVocab("vocab-2");

    const record: PullRecord = {
      tableName: "collections",
      rowId: "coll-1",
      version: 2,
      deleted: true,
      data: {},
      syncedAt: "",
    };

    await storage.applyRemoteChanges([record]);

    const coll = await db.collections.get("coll-1");
    expect(coll?.deleted).toBe(1);

    const v1 = await db.vocabularies.get("vocab-1");
    const v2 = await db.vocabularies.get("vocab-2");
    expect(v1?.deleted).toBe(1);
    expect(v2?.deleted).toBe(1);
  });

  it("upserts a new collection record from server", async () => {
    const record: PullRecord = {
      tableName: "collections",
      rowId: "coll-server",
      version: 1,
      deleted: false,
      syncedAt: "",
      data: {
        id: "coll-server",
        name: "From Server",
        description: "",
        language: "en",
        ownerId: "user-1",
        isPublic: false,
        wordCount: 0,
        createdAt: 1700000000,
        updatedAt: 1700000000,
        syncVersion: 1,
      },
    };

    await storage.applyRemoteChanges([record]);

    const coll = await db.collections.get("coll-server");
    expect(coll?.name).toBe("From Server");
    expect(coll?.deleted).toBeUndefined();
  });
});

// =============================================================================
// hydrateSharedWith — soft-deleted sharing records excluded
// =============================================================================

describe("IndexedDBCollectionAdapter - hydrateSharedWith with soft-deleted sharing", () => {
  it("excludes soft-deleted sharing records from sharedWith after unshare", async () => {
    await seedCollection("coll-1");
    await collectionAdapter.shareCollection("coll-1", "user-2");

    // Unshare — soft-deletes the collectionSharedUsers record
    await collectionAdapter.unshareCollection("coll-1", "user-2");

    // getUserCollections re-hydrates sharedWith via hydrateSharedWith
    const collections = await collectionAdapter.getUserCollections();
    const coll = collections.find((c) => c.id === "coll-1");
    expect(coll?.sharedWith).toHaveLength(0);
  });

  it("allows re-share after unshare (soft-deleted record is not a duplicate)", async () => {
    await seedCollection("coll-1");
    await collectionAdapter.shareCollection("coll-1", "user-2");
    await collectionAdapter.unshareCollection("coll-1", "user-2");

    // Re-share should succeed (not return "already shared")
    const result = await collectionAdapter.shareCollection("coll-1", "user-2");
    expect(result).not.toContain("already shared");

    // New active sharing record should exist
    const coll = await collectionAdapter.getCollection("coll-1");
    expect(coll.sharedWith).toContainEqual({ userId: "user-2" });
  });
});

// =============================================================================
// updateVocabulary — guard against soft-deleted vocab
// =============================================================================

describe("IndexedDBVocabularyAdapter - updateVocabulary on soft-deleted", () => {
  it("throws if vocab is soft-deleted", async () => {
    await seedCollection("coll-1", 1);
    await seedVocab("vocab-1");
    await vocabAdapter.deleteVocabulary("vocab-1");

    await expect(
      vocabAdapter.updateVocabulary({ id: "vocab-1", word: "resurrected" }),
    ).rejects.toThrow("Vocabulary not found");
  });
});
