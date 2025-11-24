import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Brain, Plus } from "lucide-react";
import { SearchBar, TopBar } from "@/components/molecules";
import { CollectionList } from "@/components/organisms";
import { Button } from "@/components/atoms";
import { VocabularyService } from "@/services/vocabulary.service.ts";
import { CollectionService } from "@/services/collection.service.ts";
import type { Collection } from "@/types/collection.ts";

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const data = await CollectionService.getUserCollections();
      setCollections(data);
    } catch (error) {
      console.error("Failed to load collections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadCollections();
      return;
    }

    try {
      setLoading(true);
      // Search vocabularies to find matching words
      const matchingVocabularies = await VocabularyService.searchVocabularies({
        query: searchQuery,
      });

      // Extract unique collection IDs from matching vocabularies
      const collectionIds = new Set(
        matchingVocabularies.map((v) => v.collection_id).filter((id) => id), // Filter out undefined/null values
      );

      // Get all user collections
      const allCollections = await CollectionService.getUserCollections();

      // Filter collections to only show those with matching words
      const filteredCollections = allCollections.filter((collection) =>
        collectionIds.has(collection.id || ""),
      );

      setCollections(filteredCollections);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectionClick = (collection: Collection) => {
    navigate(`/collections/${collection.id}`);
  };

  return (
    <>
      <TopBar title={t("app.name")} showBack={false} />

      <div className="px-4 pt-6 space-y-2">
        {/* Hero Section */}
        <div className="text-center py-3">
          <img
            src="/chameleon.svg"
            alt="Cham Lang"
            className="w-24 h-24 mx-auto mb-4"
          />
          <h1 className="text-4xl font-black text-gray-800 mb-2">
            {t("app.name").toUpperCase()}
          </h1>
          <p className="text-lg text-gray-700">{t("app.tagline")}</p>
        </div>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          placeholder={t("vocabulary.search")}
        />

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            icon={Brain}
            fullWidth
            onClick={() => navigate("/practice")}
          >
            {t("practice.title")}
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            fullWidth
            onClick={() => navigate("/vocabulary/add")}
          >
            {t("vocabulary.add")}
          </Button>
        </div>

        {/* Collection List */}
        <CollectionList
          collections={collections}
          onCollectionClick={handleCollectionClick}
          loading={loading}
        />
      </div>
    </>
  );
};
