import React, { useEffect, useState } from "react";
import { useNav } from "@cham-lang/ui/hooks";
import { useTranslation } from "react-i18next";
import {
  TopBar,
  HeroCard,
  QuickActionsCard,
  SearchFiltersCard,
} from "@cham-lang/ui/components/molecules";
import { CollectionList } from "@cham-lang/ui/components/organisms";
import { VocabularyService } from "@cham-lang/ui/services";
import { CollectionService } from "@cham-lang/ui/services";
import type { Collection } from "@cham-lang/shared/types";

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { navigate } = useNav();
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
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
      case "latestCreated":
        return sorted.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      case "oldestUpdated":
        return sorted.sort(
          (a, b) =>
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
        );
      case "oldestCreated":
        return sorted.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
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
          if (v.collectionId) collectionIds.add(v.collectionId);
        });
      }

      // Filter by topics if selected
      if (selectedTopics.length > 0) {
        const allVocabularies = await VocabularyService.getAllVocabularies();
        const topicMatches = allVocabularies.filter((v) =>
          v.topics.some((topic) => selectedTopics.includes(topic)),
        );
        topicMatches.forEach((v) => {
          if (v.collectionId) collectionIds.add(v.collectionId);
        });
      }

      // Filter by tags if selected
      if (selectedTags.length > 0) {
        const allVocabularies = await VocabularyService.getAllVocabularies();
        const tagMatches = allVocabularies.filter((v) =>
          v.tags.some((tag) => selectedTags.includes(tag)),
        );
        tagMatches.forEach((v) => {
          if (v.collectionId) collectionIds.add(v.collectionId);
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

      <div className="px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12 pt-8 pb-24">
        {/* Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6 mb-6">
          {/* Hero Card */}
          <div className="lg:col-span-2 xl:col-span-2 2xl:col-span-3">
            <HeroCard />
          </div>

          {/* Quick Actions Card */}
          <div className="lg:col-span-1 xl:col-span-2 2xl:col-span-3">
            <QuickActionsCard />
          </div>

          {/* Search & Filters Card */}
          <div className="lg:col-span-3 xl:col-span-4 2xl:col-span-6">
            <SearchFiltersCard
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSearch={handleSearch}
              availableTopics={availableTopics}
              availableTags={availableTags}
              selectedTopics={selectedTopics}
              selectedTags={selectedTags}
              onTopicsChange={setSelectedTopics}
              onTagsChange={setSelectedTags}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </div>
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
