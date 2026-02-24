import { useState, useEffect } from "react";
import type { Collection } from "@cham-lang/shared/types";

interface CollectionPermission {
  isOwner: boolean;
  canEdit: boolean;
  /** Derived UI role — not a stored field. All shared access is viewer-only. */
  role: "owner" | "viewer" | null;
  loading: boolean;
}

export function useCollectionPermission(
  collection: Collection | null,
): CollectionPermission {
  const [, setUserId] = useState<string | null>(null);
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
    return { isOwner: false, canEdit: false, role: null, loading };
  }

  // No sharedBy means this is the owner's collection
  if (!collection.sharedBy) {
    return {
      isOwner: true,
      canEdit: true,
      role: "owner",
      loading: false,
    };
  }

  // Shared collection — viewer-only, canEdit is always false for non-owners
  return {
    isOwner: false,
    canEdit: false,
    role: "viewer",
    loading: false,
  };
}
