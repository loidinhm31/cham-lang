import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Brain, Plus } from "lucide-react";
import { SearchBar, TopBar } from "@/components/molecules";
import { CollectionList } from "@/components/organisms";
import {
  Button,
  SearchableMultiSelect,
  Select,
  Accordion,
} from "@/components/atoms";
import { VocabularyService } from "@/services/vocabulary.service";
import { CollectionService } from "@/services/collection.service";
import type { Collection } from "@/types/collection";

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
    return (
      localStorage.getItem("collections_sort_preference") || "latestUpdated"
    );
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
        const matchingVocabularies = await VocabularyService.searchVocabularies(
          {
            query: searchQuery,
          },
        );
        matchingVocabularies.forEach((v) => {
          if (v.collection_id) collectionIds.add(v.collection_id);
        });
      }

      // Filter by topics if selected
      if (selectedTopics.length > 0) {
        const allVocabularies = await VocabularyService.getAllVocabularies();
        const topicMatches = allVocabularies.filter((v) =>
          v.topics.some((topic) => selectedTopics.includes(topic)),
        );
        topicMatches.forEach((v) => {
          if (v.collection_id) collectionIds.add(v.collection_id);
        });
      }

      // Filter by tags if selected
      if (selectedTags.length > 0) {
        const allVocabularies = await VocabularyService.getAllVocabularies();
        const tagMatches = allVocabularies.filter((v) =>
          v.tags.some((tag) => selectedTags.includes(tag)),
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
    navigate(`/collections/${collection.id}`, {
      state: { fromPage: "home" },
    });
  };

  return (
    <>
      <TopBar title={t("app.name")} showBack={false} />

      <div className="px-6 pt-8 space-y-6 pb-24">
        {/* Hero Section - Vibrant Block-Based */}
        <div className="text-center py-8">
          <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-purple-400 to-pink-500 rounded-[32px] border-[4px] border-purple-600 shadow-[0_10px_0_rgba(0,0,0,0.15),0_5px_15px_rgba(0,0,0,0.12)] flex items-center justify-center transform hover:rotate-3 transition-transform duration-300">
            <img src="/chameleon.svg" alt="Cham Lang" className="w-20 h-20" />
          </div>
          <h1 className="text-5xl font-black text-gray-900 mb-3 tracking-tight">
            {t("app.name").toUpperCase()}
          </h1>
          <p className="text-xl font-semibold text-indigo-600">
            {t("app.tagline")}
          </p>
        </div>

        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          placeholder={t("vocabulary.search")}
        />

        {/* Filter Accordion */}
        <Accordion title={t("buttons.filter")} defaultOpen={false}>
          {/* Topic and Tag Filters */}
          <div className="flex flex-col md:flex-row gap-4 pt-4">
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
        </Accordion>

        {/* Action Buttons - Vibrant Block Layout */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="secondary"
            size="lg"
            icon={Brain}
            onClick={() => navigate("/practice")}
            className="h-20 flex-col gap-2"
          >
            {t("practice.title")}
          </Button>
          <Button
            variant="primary"
            size="lg"
            icon={Plus}
            onClick={() => navigate("/vocabulary/add")}
            className="h-20 flex-col gap-2"
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
