import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Folder } from "lucide-react";
import { Button } from "@/components/atoms";
import { CollectionService } from "@/services/collection.service";
import type { Collection } from "@/types/collection";

interface CollectionSelectorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (collectionId: string) => void;
  currentCollectionId: string;
}

export const CollectionSelectorDialog: React.FC<
  CollectionSelectorDialogProps
> = ({ isOpen, onClose, onConfirm, currentCollectionId }) => {
  const { t } = useTranslation();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCollections();
    }
  }, [isOpen, currentCollectionId]);

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

  const loadCollections = async () => {
    try {
      setLoading(true);
      const data = await CollectionService.getUserCollections();
      // Filter out current collection
      const filtered = data.filter((c) => c.id !== currentCollectionId);
      setCollections(filtered);
      setSelectedId(""); // Reset selection
    } catch (error) {
      console.error("Failed to load collections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedId) {
      onConfirm(selectedId);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg relative max-h-[80vh] flex flex-col bg-white rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {t("collection.moveToCollection")}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">{t("app.loading")}</div>
          </div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Folder className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-600 text-center">
              {t("collection.noOtherCollections")}
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-2 mb-6 pr-2">
              {collections.map((collection) => {
                if (!collection.id) return null;
                return (
                  <button
                    key={collection.id}
                    onClick={() => setSelectedId(collection.id!)}
                    className={`w-full p-4 border-2 rounded-xl transition-all text-left ${
                      selectedId === collection.id
                        ? "border-amber-500 bg-amber-100 shadow-lg ring-2 ring-amber-200"
                        : "border-gray-400 hover:border-amber-400 bg-gray-50 hover:bg-amber-50 shadow hover:shadow-md"
                    }`}
                  >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 text-lg">
                        {collection.name}
                      </div>
                      {collection.description && (
                        <div className="text-sm text-gray-700 mt-1 line-clamp-2">
                          {collection.description}
                        </div>
                      )}
                      <div className="text-sm font-medium text-teal-700 mt-2 flex items-center gap-3">
                        <span className="uppercase">{collection.language}</span>
                        <span className="text-gray-500">•</span>
                        <span>
                          {t("collection.wordCount", {
                            count: collection.word_count,
                          })}
                        </span>
                      </div>
                    </div>
                    {selectedId === collection.id && (
                      <div className="ml-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
              })}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="glass"
                fullWidth
                onClick={onClose}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                variant="primary"
                fullWidth
                onClick={handleConfirm}
                disabled={!selectedId}
              >
                {t("collection.move")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
