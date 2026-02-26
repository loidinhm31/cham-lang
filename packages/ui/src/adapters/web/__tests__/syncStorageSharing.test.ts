import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../database";
import { IndexedDBSyncStorage } from "../sync/IndexedDBSyncStorage";
import type { PullRecord } from "@qm-hub/sync-client-types";

const storage = new IndexedDBSyncStorage();

beforeEach(async () => {
  await db.collections.clear();
  await db.vocabularies.clear();
  await db.topics.clear();
  await db.tags.clear();
  await db.userLearningLanguages.clear();
  await db.collectionSharedUsers.clear();
  await db.practiceProgress.clear();
  await db._pendingChanges.clear();
});

describe("applyRemoteChanges - collectionSharedUsers", () => {
  it("stores shared user record without permission field", async () => {
    const record: PullRecord = {
      tableName: "collectionSharedUsers",
      rowId: "su-1",
      data: {
        id: "su-1",
        collectionId: "coll-1",
        userId: "user-2",
        createdAt: 1700000000,
        syncVersion: 1,
      },
      version: 1,
      deleted: false,
      syncedAt: "",
    };

    await storage.applyRemoteChanges([record]);

    const su = await db.collectionSharedUsers.get("su-1");
    expect(su?.userId).toBe("user-2");
    expect(su).not.toHaveProperty("permission");
  });
});

describe("getPendingChanges - shared collections", () => {
  it("includes shared collections in pending changes", async () => {
    await db.collections.add({
      id: "coll-1",
      name: "Shared Coll",
      description: "",
      language: "en",
      sharedBy: "owner-123",
      sharedWith: [],
      isPublic: false,
      wordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncVersion: 1,
      syncedAt: undefined,
    });

    const records = await storage.getPendingChanges("editor-456");
    const colls = records.filter((r) => r.tableName === "collections");
    expect(colls).toHaveLength(1);
    expect(colls[0].rowId).toBe("coll-1");
  });

  it("sets ownerId to sharedBy for shared collections", async () => {
    await db.collections.add({
      id: "coll-1",
      name: "Shared",
      description: "",
      language: "en",
      sharedBy: "owner-123",
      sharedWith: [],
      isPublic: false,
      wordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncVersion: 1,
      syncedAt: undefined,
    });

    const records = await storage.getPendingChanges("editor-456");
    const coll = records.find((r) => r.tableName === "collections");
    expect(coll?.data.ownerId).toBe("owner-123");
  });

  it("sets ownerId to userId for own collections", async () => {
    await db.collections.add({
      id: "coll-2",
      name: "My Own",
      description: "",
      language: "en",
      sharedWith: [],
      isPublic: false,
      wordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncVersion: 1,
      syncedAt: undefined,
    });

    const records = await storage.getPendingChanges("user-456");
    const coll = records.find((r) => r.tableName === "collections");
    expect(coll?.data.ownerId).toBe("user-456");
  });

  it("sets ownerId to null when no userId and no sharedBy", async () => {
    await db.collections.add({
      id: "coll-3",
      name: "Orphan",
      description: "",
      language: "en",
      sharedWith: [],
      isPublic: false,
      wordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncVersion: 1,
      syncedAt: undefined,
    });

    const records = await storage.getPendingChanges();
    const colls = records.filter((r) => r.tableName === "collections");
    expect(colls).toHaveLength(1);
    expect(colls[0].data.ownerId).toBeNull();
  });

  it("excludes synced shared collections", async () => {
    await db.collections.add({
      id: "coll-4",
      name: "Synced Shared",
      description: "",
      language: "en",
      sharedBy: "owner-123",
      sharedWith: [],
      isPublic: false,
      wordCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncVersion: 2,
      syncedAt: 1700000000,
    });

    const records = await storage.getPendingChanges("editor-456");
    const colls = records.filter((r) => r.tableName === "collections");
    expect(colls).toHaveLength(0);
  });
});
