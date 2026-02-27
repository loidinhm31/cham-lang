import "fake-indexeddb/auto";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { getDb, initDb } from "../database";
import { IndexedDBCollectionAdapter } from "../IndexedDBCollectionAdapter";

const adapter = new IndexedDBCollectionAdapter();

beforeAll(() => initDb());

async function createTestCollection(id: string = "coll-1") {
  await getDb().collections.add({
    id,
    name: "Test Collection",
    description: "",
    language: "en",
    sharedWith: [],
    isPublic: false,
    wordCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncVersion: 1,
    syncedAt: 1000,
  });
}

beforeEach(async () => {
  await getDb().collections.clear();
  await getDb().collectionSharedUsers.clear();
  await getDb().vocabularies.clear();
  await getDb()._pendingChanges.clear();
});

describe("shareCollection", () => {
  it("creates sharing record with no permission field (viewer-only model)", async () => {
    await createTestCollection();
    await adapter.shareCollection("coll-1", "user-2");

    const su = await getDb().collectionSharedUsers
      .where("collectionId")
      .equals("coll-1")
      .first();
    expect(su?.userId).toBe("user-2");
    expect(su).not.toHaveProperty("permission");

    const coll = await getDb().collections.get("coll-1");
    expect(coll?.sharedWith).toContainEqual({ userId: "user-2" });
  });

  it("returns early if already shared", async () => {
    await createTestCollection();
    await adapter.shareCollection("coll-1", "user-2");
    const result = await adapter.shareCollection("coll-1", "user-2");

    expect(result).toContain("already shared");
    const count = await getDb().collectionSharedUsers
      .where("collectionId")
      .equals("coll-1")
      .count();
    expect(count).toBe(1);
  });

  it("throws if collection not found", async () => {
    await expect(
      adapter.shareCollection("nonexistent", "user-2"),
    ).rejects.toThrow("Collection not found");
  });
});

describe("unshareCollection", () => {
  it("soft-deletes the shared user record and updates sharedWith", async () => {
    await createTestCollection();
    await adapter.shareCollection("coll-1", "user-2");

    await adapter.unshareCollection("coll-1", "user-2");

    // Record still exists but is soft-deleted
    const su = await getDb().collectionSharedUsers
      .where("collectionId")
      .equals("coll-1")
      .first();
    expect(su).toBeDefined();
    expect(su?.deleted).toBe(1);
    expect(su?.syncedAt).toBeUndefined();

    const coll = await getDb().collections.get("coll-1");
    expect(coll?.sharedWith).toHaveLength(0);
  });

  it("marks soft-deleted sharing record as unsynced for push", async () => {
    await createTestCollection();
    await adapter.shareCollection("coll-1", "user-2");

    // Simulate previously synced sharing record
    const su = await getDb().collectionSharedUsers
      .where("collectionId")
      .equals("coll-1")
      .first();
    await getDb().collectionSharedUsers.update(su!.id, { syncedAt: 1000 });

    await adapter.unshareCollection("coll-1", "user-2");

    const afterDelete = await getDb().collectionSharedUsers.get(su!.id);
    expect(afterDelete?.deleted).toBe(1);
    expect(afterDelete?.syncedAt).toBeUndefined(); // queued for push
  });
});
