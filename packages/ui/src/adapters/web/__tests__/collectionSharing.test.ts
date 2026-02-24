import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../database";
import { IndexedDBCollectionAdapter } from "../IndexedDBCollectionAdapter";

const adapter = new IndexedDBCollectionAdapter();

async function createTestCollection(id: string = "coll-1") {
  await db.collections.add({
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
  await db.collections.clear();
  await db.collectionSharedUsers.clear();
  await db.vocabularies.clear();
  await db._pendingChanges.clear();
});

describe("shareCollection", () => {
  it("creates sharing record with no permission field (viewer-only model)", async () => {
    await createTestCollection();
    await adapter.shareCollection("coll-1", "user-2");

    const su = await db.collectionSharedUsers
      .where("collectionId")
      .equals("coll-1")
      .first();
    expect(su?.userId).toBe("user-2");
    expect(su).not.toHaveProperty("permission");

    const coll = await db.collections.get("coll-1");
    expect(coll?.sharedWith).toContainEqual({ userId: "user-2" });
  });

  it("returns early if already shared", async () => {
    await createTestCollection();
    await adapter.shareCollection("coll-1", "user-2");
    const result = await adapter.shareCollection("coll-1", "user-2");

    expect(result).toContain("already shared");
    const count = await db.collectionSharedUsers
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
  it("removes the shared user record and updates sharedWith", async () => {
    await createTestCollection();
    await adapter.shareCollection("coll-1", "user-2");

    await adapter.unshareCollection("coll-1", "user-2");

    const su = await db.collectionSharedUsers
      .where("collectionId")
      .equals("coll-1")
      .first();
    expect(su).toBeUndefined();

    const coll = await db.collections.get("coll-1");
    expect(coll?.sharedWith).toHaveLength(0);
  });

  it("tracks the deletion as a pending change", async () => {
    await createTestCollection();
    await adapter.shareCollection("coll-1", "user-2");

    // Simulate synced state for the sharing record
    const su = await db.collectionSharedUsers
      .where("collectionId")
      .equals("coll-1")
      .first();
    await db.collectionSharedUsers.update(su!.id, { syncedAt: 1000 });

    await adapter.unshareCollection("coll-1", "user-2");

    const pending = await db._pendingChanges.toArray();
    expect(pending.some((p) => p.tableName === "collectionSharedUsers")).toBe(
      true,
    );
  });
});
