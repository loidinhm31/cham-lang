import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import * as Checkbox from "@radix-ui/react-checkbox";
import { X, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchableMultiSelectProps {
  label?: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = "Select...",
  className,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleToggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const handleRemove = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== option));
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {label && (
        <label className="block text-sm font-bold text-gray-800 mb-2">
          {label}
        </label>
      )}

      {/* Selection display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "min-h-12 py-2 px-4 bg-white rounded-2xl border-[3px] cursor-pointer flex flex-wrap gap-2 items-center transition-all duration-200",
          "shadow-[0_4px_0_rgba(0,0,0,0.1),0_2px_6px_rgba(0,0,0,0.05),inset_0_-1px_2px_rgba(0,0,0,0.05)]",
          isOpen
            ? "border-indigo-500 shadow-[0_4px_0_rgba(79,70,229,0.3),0_2px_8px_rgba(79,70,229,0.2),inset_0_-1px_2px_rgba(0,0,0,0.05)]"
            : "border-gray-300",
        )}
      >
        {selected.length === 0 ? (
          <span className="text-gray-400">{placeholder}</span>
        ) : (
          selected.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-lg text-sm font-medium"
            >
              {item}
              <button
                onClick={(e) => handleRemove(item, e)}
                className="hover:text-indigo-900 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
        <ChevronDown
          className={cn(
            "w-5 h-5 text-gray-500 ml-auto transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 w-full mt-2 bg-white rounded-2xl border-[3px] border-gray-200 max-h-80 overflow-hidden",
            "shadow-[0_8px_0_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.15)]",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2",
          )}
        >
          {/* Search input */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("buttons.search")}
              className={cn(
                "w-full px-4 py-2 rounded-xl border-2 border-gray-200 bg-gray-50",
                "focus:outline-none focus:border-indigo-500 focus:bg-white",
                "text-gray-800 placeholder-gray-400 transition-all duration-200",
              )}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options list */}
          <div className="max-h-60 overflow-y-auto p-2">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-gray-500 text-center">
                {t("common.noOptionsFound")}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  onClick={() => handleToggle(option)}
                  className={cn(
                    "px-3 py-2 cursor-pointer rounded-xl flex items-center gap-3 transition-colors",
                    selected.includes(option)
                      ? "bg-indigo-100"
                      : "hover:bg-gray-100",
                  )}
                >
                  <Checkbox.Root
                    checked={selected.includes(option)}
                    onCheckedChange={() => handleToggle(option)}
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors",
                      selected.includes(option)
                        ? "bg-indigo-600 border-indigo-600"
                        : "bg-white border-gray-300",
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox.Indicator>
                      <Check className="h-3.5 w-3.5 text-white" />
                    </Checkbox.Indicator>
                  </Checkbox.Root>
                  <span
                    className={cn(
                      "text-gray-800",
                      selected.includes(option) &&
                        "font-semibold text-indigo-900",
                    )}
                  >
                    {option}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
