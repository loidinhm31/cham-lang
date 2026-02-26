import { useCallback, useEffect, useState } from "react";
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from "@cham-lang/shared/types";
import { CollectionService } from "@cham-lang/ui/services";

interface UseCollectionsOptions {
  autoLoad?: boolean;
}

export const useCollections = (options: UseCollectionsOptions = {}) => {
  const { autoLoad = true } = options;

  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCollections = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const collectionList = await CollectionService.getUserCollections();
      setCollections(collectionList);
      // Auto-select first collection if none selected
      setSelectedCollectionId((prev) => {
        if (collectionList.length > 0 && !prev) {
          return collectionList[0].id ?? null;
        }
        return prev;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load collections",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCollection = async (
    request: CreateCollectionRequest,
  ): Promise<string> => {
    const collectionId = await CollectionService.createCollection(request);
    await loadCollections();
    setSelectedCollectionId(collectionId);
    return collectionId;
  };

  const updateCollection = async (
    request: UpdateCollectionRequest,
  ): Promise<void> => {
    setCollections((prev) =>
      prev.map((c) => (c.id === request.id ? { ...c, ...request } : c)),
    );
    try {
      await CollectionService.updateCollection(request);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update collection");
      await loadCollections();
      throw err;
    }
  };

  const deleteCollection = async (collectionId: string): Promise<void> => {
    const snapshot = collections;
    setCollections((prev) => prev.filter((c) => c.id !== collectionId));
    if (selectedCollectionId === collectionId) {
      setSelectedCollectionId(
        snapshot.length > 1
          ? snapshot.find((c) => c.id !== collectionId)?.id || null
          : null,
      );
    }
    try {
      await CollectionService.deleteCollection(collectionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete collection");
      await loadCollections();
      throw err;
    }
  };

  const shareCollection = async (
    collectionId: string,
    shareWithUsername: string,
  ): Promise<void> => {
    await CollectionService.shareCollection(collectionId, shareWithUsername);
    await loadCollections();
  };

  const unshareCollection = async (
    collectionId: string,
    userIdToRemove: string,
  ): Promise<void> => {
    await CollectionService.unshareCollection(collectionId, userIdToRemove);
    await loadCollections();
  };

  useEffect(() => {
    if (autoLoad) {
      loadCollections();
    }
  }, [autoLoad, loadCollections]);

  const selectedCollection = collections.find(
    (c) => c.id === selectedCollectionId,
  );

  return {
    collections,
    selectedCollectionId,
    selectedCollection,
    setSelectedCollectionId,
    isLoading,
    error,
    setError,
    loadCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    shareCollection,
    unshareCollection,
  };
};
