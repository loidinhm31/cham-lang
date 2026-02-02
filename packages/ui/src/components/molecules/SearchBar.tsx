import React from "react";
import { Search } from "lucide-react";
import { Input } from "@cham-lang/ui/components/atoms";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = "Search...",
  onSearch,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onSearch) {
      onSearch();
    }
  };

  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyPress={handleKeyPress}
      placeholder={placeholder}
      icon={Search}
    />
  );
};
