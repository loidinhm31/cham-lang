import React from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  SearchableMultiSelect,
  Select,
  Accordion,
} from "@/components/atoms";
import { SearchBar } from "@/components/molecules";

interface SearchFiltersCardProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  availableTopics: string[];
  availableTags: string[];
  selectedTopics: string[];
  selectedTags: string[];
  onTopicsChange: (topics: string[]) => void;
  onTagsChange: (tags: string[]) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
}

export const SearchFiltersCard: React.FC<SearchFiltersCardProps> = ({
  searchQuery,
  onSearchChange,
  onSearch,
  availableTopics,
  availableTags,
  selectedTopics,
  selectedTags,
  onTopicsChange,
  onTagsChange,
  sortBy,
  onSortChange,
}) => {
  const { t } = useTranslation();

  return (
    <Card variant="default">
      <div className="space-y-4">
        {/* Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          onSearch={onSearch}
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
              onChange={onTopicsChange}
              placeholder={t("vocabulary.selectTopics")}
            />
            <SearchableMultiSelect
              label={t("vocabulary.tags")}
              options={availableTags}
              selected={selectedTags}
              onChange={onTagsChange}
              placeholder={t("vocabulary.selectTags")}
            />
          </div>

          {/* Sort Selector */}
          <Select
            label={t("collections.sortBy")}
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
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
      </div>
    </Card>
  );
};
