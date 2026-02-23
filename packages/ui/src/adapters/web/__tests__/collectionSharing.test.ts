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

describe("shareCollection with permission parameter", () => {
  it("shares with default viewer permission", async () => {
    await createTestCollection();
    await adapter.shareCollection("coll-1", "user-2");

    const su = await db.collectionSharedUsers
      .where("collectionId")
      .equals("coll-1")
      .first();
    expect(su?.permission).toBe("viewer");

    const coll = await db.collections.get("coll-1");
    expect(coll?.sharedWith).toContainEqual({ userId: "user-2", permission: "viewer" });
  });

  it("shares with explicit editor permission", async () => {
    await createTestCollection();
    await adapter.shareCollection("coll-1", "user-2", "editor");

    const su = await db.collectionSharedUsers
      .where("collectionId")
      .equals("coll-1")
      .first();
    expect(su?.permission).toBe("editor");

    const coll = await db.collections.get("coll-1");
    expect(coll?.sharedWith).toContainEqual({ userId: "user-2", permission: "editor" });
  });

  it("shares with explicit viewer permission", async () => {
    await createTestCollection();
    await adapter.shareCollection("coll-1", "user-2", "viewer");

    const su = await db.collectionSharedUsers
      .where("collectionId")
      .equals("coll-1")
      .first();
    expect(su?.permission).toBe("viewer");
  });

  it("returns early if already shared", async () => {
    await createTestCollection();
    await adapter.shareCollection("coll-1", "user-2", "viewer");
    const result = await adapter.shareCollection("coll-1", "user-2", "editor");

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

describe("updateSharePermission", () => {
  it("updates permission from viewer to editor in both tables", async () => {
    await createTestCollection();
    await adapter.shareCollection("coll-1", "user-2", "viewer");
    await adapter.updateSharePermission("coll-1", "user-2", "editor");

    const su = await db.collectionSharedUsers
      .where("collectionId")
      .equals("coll-1")
      .first();
    expect(su?.permission).toBe("editor");

    const coll = await db.collections.get("coll-1");
    const entry = coll?.sharedWith.find((s) => s.userId === "user-2");
    expect(entry?.permission).toBe("editor");
  });

  it("marks collectionSharedUsers record as unsynced after update", async () => {
    await createTestCollection();
    await adapter.shareCollection("coll-1", "user-2", "viewer");

    // Simulate previously synced state
    const su = await db.collectionSharedUsers
      .where("collectionId")
      .equals("coll-1")
      .first();
    await db.collectionSharedUsers.update(su!.id, { syncedAt: 1000, syncVersion: 2 });

    await adapter.updateSharePermission("coll-1", "user-2", "editor");

    const updated = await db.collectionSharedUsers.get(su!.id);
    expect(updated?.syncedAt).toBeUndefined();
    expect(updated?.syncVersion).toBe(3); // incremented from 2
  });

  it("updates permission from editor to viewer", async () => {
    await createTestCollection();
    await adapter.shareCollection("coll-1", "user-2", "editor");
    await adapter.updateSharePermission("coll-1", "user-2", "viewer");

    const su = await db.collectionSharedUsers
      .where("collectionId")
      .equals("coll-1")
      .first();
    expect(su?.permission).toBe("viewer");
  });

  it("throws if collection not found", async () => {
    await expect(
      adapter.updateSharePermission("nonexistent", "user-2", "editor"),
    ).rejects.toThrow("Collection not found");
  });

  it("throws if shared user record not found", async () => {
    await createTestCollection();
    await expect(
      adapter.updateSharePermission("coll-1", "user-2", "editor"),
    ).rejects.toThrow("Shared user record not found");
  });
});
