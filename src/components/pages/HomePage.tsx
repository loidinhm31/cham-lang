import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Brain, Plus } from "lucide-react";
import { SearchBar, TopBar } from "@/components/molecules";
import { CollectionList } from "@/components/organisms";
import { Button, SearchableMultiSelect, Select } from "@/components/atoms";
import { VocabularyService } from "@/services/vocabulary.service.ts";
import { CollectionService } from "@/services/collection.service.ts";
import type { Collection } from "@/types/collection.ts";

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Filter states
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Sort state - load from localStorage or default to "latestUpdated"
  const [sortBy, setSortBy] = useState<string>(() => {
    return localStorage.getItem("collections_sort_preference") || "latestUpdated";
  });

  useEffect(() => {
    loadCollections();
    loadTopicsAndTags();
  }, []);

  // Re-filter when topics or tags selection changes
  useEffect(() => {
    if (selectedTopics.length > 0 || selectedTags.length > 0) {
      handleSearch();
    } else if (!searchQuery.trim()) {
      loadCollections();
    }
  }, [selectedTopics, selectedTags]);

  // Re-sort when sort order changes and save preference
  useEffect(() => {
    setCollections((prev) => sortCollections(prev));
    localStorage.setItem("collections_sort_preference", sortBy);
  }, [sortBy]);

  const sortCollections = (collectionsToSort: Collection[]) => {
    const sorted = [...collectionsToSort];
    switch (sortBy) {
      case "latestUpdated":
        return sorted.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        );
      case "latestCreated":
        return sorted.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      case "oldestUpdated":
        return sorted.sort(
          (a, b) =>
            new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
        );
      case "oldestCreated":
        return sorted.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      case "name":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted;
    }
  };

  const loadCollections = async () => {
    try {
      setLoading(true);
      const data = await CollectionService.getUserCollections();
      setCollections(sortCollections(data));
    } catch (error) {
      console.error("Failed to load collections:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTopicsAndTags = async () => {
    try {
      const [topics, tags] = await Promise.all([
        VocabularyService.getAllTopics(),
        VocabularyService.getAllTags(),
      ]);
      setAvailableTopics(topics);
      setAvailableTags(tags);
    } catch (error) {
      console.error("Failed to load topics and tags:", error);
    }
  };

  const handleSearch = async () => {
    if (
      !searchQuery.trim() &&
      selectedTopics.length === 0 &&
      selectedTags.length === 0
    ) {
      loadCollections();
      return;
    }

    try {
      setLoading(true);

      // Get all user collections
      const allCollections = await CollectionService.getUserCollections();
      const collectionIds = new Set<string>();

      // Search by word query if provided
      if (searchQuery.trim()) {
        const matchingVocabularies = await VocabularyService.searchVocabularies({
          query: searchQuery,
        });
        matchingVocabularies.forEach((v) => {
          if (v.collection_id) collectionIds.add(v.collection_id);
        });
      }

      // Filter by topics if selected
      if (selectedTopics.length > 0) {
        const allVocabularies = await VocabularyService.getAllVocabularies();
        const topicMatches = allVocabularies.filter((v) =>
          v.topics.some((topic) => selectedTopics.includes(topic))
        );
        topicMatches.forEach((v) => {
          if (v.collection_id) collectionIds.add(v.collection_id);
        });
      }

      // Filter by tags if selected
      if (selectedTags.length > 0) {
        const allVocabularies = await VocabularyService.getAllVocabularies();
        const tagMatches = allVocabularies.filter((v) =>
          v.tags.some((tag) => selectedTags.includes(tag))
        );
        tagMatches.forEach((v) => {
          if (v.collection_id) collectionIds.add(v.collection_id);
        });
      }

      // Filter collections to only show those with matching criteria
      const filteredCollections = allCollections.filter((collection) =>
        collectionIds.has(collection.id || ""),
      );

      setCollections(sortCollections(filteredCollections));
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

        {/* Topic and Tag Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <SearchableMultiSelect
            label={t("vocabulary.topics")}
            options={availableTopics}
            selected={selectedTopics}
            onChange={setSelectedTopics}
            placeholder={t("vocabulary.selectTopics")}
          />
          <SearchableMultiSelect
            label={t("vocabulary.tags")}
            options={availableTags}
            selected={selectedTags}
            onChange={setSelectedTags}
            placeholder={t("vocabulary.selectTags")}
          />
        </div>

        {/* Sort Selector */}
        <Select
          label={t("collections.sortBy")}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          options={[
            {
              value: "latestUpdated",
              label: t("collections.sortLatestUpdated"),
            },
            {
              value: "latestCreated",
              label: t("collections.sortLatestCreated"),
            },
            {
              value: "oldestUpdated",
              label: t("collections.sortOldestUpdated"),
            },
            {
              value: "oldestCreated",
              label: t("collections.sortOldestCreated"),
            },
            { value: "name", label: t("collections.sortName") },
          ]}
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
