import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Users } from "lucide-react";
import { Button, Input } from "@cham-lang/ui/components/atoms";
import { SharedUserItem } from "@cham-lang/ui/components/molecules";
import { AuthService, CollectionService } from "@cham-lang/ui/services";
import { useDialog } from "@cham-lang/ui/contexts";
import type { Collection } from "@cham-lang/shared/types";

interface ShareCollectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  collection: Collection;
  onShareSuccess?: () => void;
}

export const ShareCollectionDialog: React.FC<ShareCollectionDialogProps> = ({
  isOpen,
  onClose,
  collection,
  onShareSuccess,
}) => {
  const { t } = useTranslation();
  const { showAlert } = useDialog();
  const [username, setUsername] = useState("");
  const [selectedPermission, setSelectedPermission] = useState<
    "viewer" | "editor"
  >("viewer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const tokens = await AuthService.getTokens();
        if (tokens.userId) {
          setCurrentUserId(tokens.userId);
        }
      } catch (error) {
        console.error("Failed to get current user:", error);
      }
    };

    if (isOpen) {
      loadCurrentUser();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setUsername("");
      setSelectedPermission("viewer");
      setError(null);
    }
  }, [isOpen]);

  const validateUsername = (): string | null => {
    if (!username.trim()) {
      return t("auth.fillAllFields");
    }

    // Check if trying to share with self
    if (username.trim() === currentUserId) {
      return t("collections.shareDialog.cannotShareWithSelf");
    }

    // Check if already shared with this user
    // Note: We'll check again after lookup, but this is a quick check if username matches any existing IDs (unlikely but possible)
    const isAlreadyShared = collection.sharedWith.some(
      (user) => user.userId === username.trim(),
    );
    if (isAlreadyShared) {
      return t("collections.shareDialog.alreadyShared");
    }

    return null;
  };

  const handleShare = async () => {
    setError(null);

    const validationError = validateUsername();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      // Lookup user first
      const user = await AuthService.lookupUserByUsername(username.trim());

      if (!user) {
        setError(t("collections.shareDialog.userNotFound"));
        setLoading(false);
        return;
      }

      // Check if trying to share with self (using ID)
      if (user.userId === currentUserId) {
        setError(t("collections.shareDialog.cannotShareWithSelf"));
        setLoading(false);
        return;
      }

      // Check if already shared (using ID)
      const isAlreadyShared = collection.sharedWith.some(
        (sharedUser) => sharedUser.userId === user.userId,
      );
      if (isAlreadyShared) {
        setError(t("collections.shareDialog.alreadyShared"));
        setLoading(false);
        return;
      }

      await CollectionService.shareCollection(collection.id!, user.userId);

      // Show success message
      showAlert(t("collections.shareDialog.shareSuccess"), {
        variant: "success",
      });

      // Reset form
      setUsername("");
      setSelectedPermission("viewer");

      // Trigger callback to refresh collection data
      if (onShareSuccess) {
        onShareSuccess();
      }
    } catch (err: any) {
      console.error("Failed to share collection:", err);
      const errorMessage =
        err?.message || t("collections.shareDialog.shareFailed");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = async (
    userId: string,
    newPermission: "viewer" | "editor",
  ) => {
    try {
      // Update permission by modifying the sharedWith array
      const updatedSharedWith = collection.sharedWith.map((user) =>
        user.userId === userId ? { ...user, permission: newPermission } : user,
      );

      await CollectionService.updateCollection({
        id: collection.id!,
        sharedWith: updatedSharedWith,
      });

      showAlert(t("collections.shareDialog.permissionChanged"), {
        variant: "success",
      });

      // Trigger callback to refresh collection data
      if (onShareSuccess) {
        onShareSuccess();
      }
    } catch (err) {
      console.error("Failed to update permission:", err);
      showAlert(t("messages.error"), { variant: "error" });
      throw err;
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      await CollectionService.unshareCollection(collection.id!, userId);

      showAlert(t("collections.shareDialog.userRemoved"), {
        variant: "success",
      });

      // Trigger callback to refresh collection data
      if (onShareSuccess) {
        onShareSuccess();
      }
    } catch (err) {
      console.error("Failed to remove user:", err);
      showAlert(t("messages.error"), { variant: "error" });
      throw err;
    }
  };

  if (!isOpen) return null;

  // Only owner can share (sharedBy is undefined/null for own collections)
  const isOwner = !collection.sharedBy;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg relative max-h-[85vh] flex flex-col bg-white rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Header */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {t("collections.shareDialog.title")}
        </h2>

        {/* Share Form */}
        {isOwner && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              {t("collections.shareDialog.shareWith")}
            </h3>

            <div className="space-y-4">
              <Input
                placeholder={t("collections.shareDialog.usernamePlaceholder")}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                error={error || undefined}
                disabled={loading}
              />

              {/* Permission Radio Buttons */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="permission"
                    value="viewer"
                    checked={selectedPermission === "viewer"}
                    onChange={() => setSelectedPermission("viewer")}
                    disabled={loading}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      {t("collections.shareDialog.viewer")}
                    </div>
                    <div className="text-xs text-gray-600">
                      {t("collections.shareDialog.viewerDescription")}
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="permission"
                    value="editor"
                    checked={selectedPermission === "editor"}
                    onChange={() => setSelectedPermission("editor")}
                    disabled={loading}
                    className="w-4 h-4 text-orange-600"
                  />
                  <div>
                    <div className="text-sm font-bold text-gray-900">
                      {t("collections.shareDialog.editor")}
                    </div>
                    <div className="text-xs text-gray-600">
                      {t("collections.shareDialog.editorDescription")}
                    </div>
                  </div>
                </label>
              </div>

              <Button
                type="button"
                variant="primary"
                fullWidth
                onClick={handleShare}
                disabled={loading}
              >
                {loading
                  ? t("collections.shareDialog.sharing")
                  : t("collections.shareDialog.shareButton")}
              </Button>
            </div>
          </div>
        )}

        {/* Shared Users List */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t("collections.shareDialog.sharedWith", {
              count: collection.sharedWith.length,
            })}
          </h3>

          {collection.sharedWith.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t("collections.shareDialog.notSharedYet")}
            </div>
          ) : (
            <div className="space-y-2">
              {collection.sharedWith.map((sharedUser) => (
                <SharedUserItem
                  key={sharedUser.userId}
                  sharedUser={sharedUser}
                  collectionId={collection.id!}
                  isOwner={isOwner}
                  onPermissionChange={handlePermissionChange}
                  onRemove={handleRemoveUser}
                />
              ))}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <Button type="button" variant="glass" fullWidth onClick={onClose}>
            {t("buttons.close")}
          </Button>
        </div>
      </div>
    </div>
  );
};
