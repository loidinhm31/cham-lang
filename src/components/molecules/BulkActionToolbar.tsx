import React from "react";
import { useTranslation } from "react-i18next";
import { X, FolderInput } from "lucide-react";
import { Button } from "@/components/atoms";

interface BulkActionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onMove: () => void;
  onCancel: () => void;
}

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onMove,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <div className="sticky top-20 z-30 pt-4">
      <div className="max-w-2xl md:max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-4 shadow-lg border-2 border-amber-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onSelectAll}
                className="text-sm font-medium text-teal-600 hover:text-teal-700 transition"
              >
                {selectedCount === totalCount
                  ? t("collection.deselectAll")
                  : t("collection.selectAll")}
              </button>
              <span className="text-sm font-semibold text-gray-700">
                {t("collection.selectedCount", { count: selectedCount })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="glass"
                size="sm"
                icon={X}
                onClick={onCancel}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={FolderInput}
                onClick={onMove}
                disabled={selectedCount === 0}
              >
                {t("collection.moveSelected")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
