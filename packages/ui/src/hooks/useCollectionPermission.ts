import { useState, useEffect } from "react";
import type { Collection } from "@cham-lang/shared/types";

interface CollectionPermission {
  isOwner: boolean;
  canEdit: boolean;
  permission: "owner" | "editor" | "viewer" | null;
  loading: boolean;
}

export function useCollectionPermission(
  collection: Collection | null,
): CollectionPermission {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadUserId = async () => {
      try {
        const { getAuthService } = await import("@cham-lang/ui/adapters");
        const authService = getAuthService();
        const tokens = await authService.getTokens();
        if (!cancelled && tokens.userId) {
          setUserId(tokens.userId);
        }
      } catch {
        // If auth service unavailable, leave userId null
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    loadUserId();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!collection) {
    return { isOwner: false, canEdit: false, permission: null, loading };
  }

  // No sharedBy means this is the owner's collection
  if (!collection.sharedBy) {
    return {
      isOwner: true,
      canEdit: true,
      permission: "owner",
      loading: false,
    };
  }

  // Shared collection - check permission in sharedWith
  if (loading || !userId) {
    return { isOwner: false, canEdit: false, permission: null, loading };
  }

  const sharedEntry = collection.sharedWith?.find((s) => s.userId === userId);

  if (sharedEntry?.permission === "editor") {
    return {
      isOwner: false,
      canEdit: true,
      permission: "editor",
      loading: false,
    };
  }

  return {
    isOwner: false,
    canEdit: false,
    permission: "viewer",
    loading: false,
  };
}
