import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Badge, Select } from "@cham-lang/ui/components/atoms";
import { useDialog } from "@cham-lang/ui/contexts";
import type { SharedUser } from "@cham-lang/shared/types";

interface SharedUserItemProps {
  sharedUser: SharedUser;
  collectionId: string;
  isOwner: boolean;
  onPermissionChange: (
    userId: string,
    permission: "viewer" | "editor",
  ) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
}

export const SharedUserItem: React.FC<SharedUserItemProps> = ({
  sharedUser,
  collectionId,
  isOwner,
  onPermissionChange,
  onRemove,
}) => {
  const { t } = useTranslation();
  const { showConfirm } = useDialog();
  const [loading, setLoading] = useState(false);

  const permissionOptions = [
    {
      value: "viewer",
      label: t("collections.shareDialog.viewer"),
    },
    {
      value: "editor",
      label: t("collections.shareDialog.editor"),
    },
  ];

  const handlePermissionChange = async (newPermission: string) => {
    if (!isOwner || loading) return;

    try {
      setLoading(true);
      await onPermissionChange(
        sharedUser.user_id,
        newPermission as "viewer" | "editor",
      );
    } catch (error) {
      console.error("Failed to change permission:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!isOwner) return;

    const confirmed = await showConfirm(
      t("collections.shareDialog.removeAccess") +
        "\n\n" +
        t("collections.shareDialog.removeAccessDescription"),
      {
        variant: "error",
      },
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await onRemove(sharedUser.user_id);
    } catch (error) {
      console.error("Failed to remove user:", error);
    } finally {
      setLoading(false);
    }
  };

  // Badge color based on permission
  const badgeVariant = sharedUser.permission === "editor" ? "warning" : "info";

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-300 bg-white hover:border-gray-400 transition-colors">
      {/* User ID Badge */}
      <Badge variant={badgeVariant} className="flex-shrink-0 max-w-[150px]">
        <div className="truncate" title={sharedUser.user_id}>
          {sharedUser.user_id}
        </div>
      </Badge>

      {/* Permission Dropdown */}
      <div className="flex-1">
        <Select
          options={permissionOptions}
          value={sharedUser.permission}
          onValueChange={handlePermissionChange}
          disabled={!isOwner || loading}
          className="min-w-[120px]"
        />
      </div>

      {/* Remove Button */}
      <button
        onClick={handleRemove}
        disabled={!isOwner || loading}
        className="flex-shrink-0 p-2 rounded-full hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors group"
        title={t("collections.remove")}
      >
        <X className="w-5 h-5 text-gray-600 group-hover:text-red-600 transition-colors" />
      </button>
    </div>
  );
};
