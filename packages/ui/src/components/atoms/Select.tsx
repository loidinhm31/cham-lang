import React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@cham-lang/shared/utils";
import { usePortalContainer } from "@cham-lang/ui/hooks";

interface SelectProps {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}

const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  placeholder = "Select...",
  value,
  onValueChange,
  disabled,
  className,
  fullWidth = false,
}) => {
  const container = usePortalContainer();

  return (
    <div className={cn(fullWidth && "w-full", className)}>
      {label && (
        <label className="block text-sm font-bold text-(--color-text-primary) mb-2">
          {label}
        </label>
      )}
      <SelectPrimitive.Root
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          className={cn(
            "flex h-12 items-center justify-between rounded-2xl border-[3px] bg-(--color-bg-white) px-4 py-3 text-base text-(--color-text-primary) transition-all duration-200",
            fullWidth && "w-full",
            "shadow-[0_4px_0_rgba(0,0,0,0.1),0_2px_6px_rgba(0,0,0,0.05),inset_0_-1px_2px_rgba(0,0,0,0.05)]",
            "focus:outline-none focus:border-(--color-primary-500) focus:shadow-[0_4px_0_var(--color-shadow-primary),0_2px_8px_var(--color-shadow-primary-soft),inset_0_-1px_2px_rgba(0,0,0,0.05)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-red-500" : "border-(--color-border-light)",
            "[&>span]:line-clamp-1",
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-5 w-5 text-(--color-text-muted)" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal container={container ?? undefined}>
          <SelectPrimitive.Content
            className={cn(
              "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-2xl border-[3px] border-(--color-border-light) bg-(--color-bg-white) text-(--color-text-primary)",
              "shadow-[0_8px_0_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.15)]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
              "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            )}
            position="popper"
            sideOffset={8}
          >
            <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1 bg-(--color-bg-white)">
              <ChevronUp className="h-4 w-4 text-(--color-text-muted)" />
            </SelectPrimitive.ScrollUpButton>

            <SelectPrimitive.Viewport className="p-2">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-xl py-3 px-4 text-base outline-none transition-colors",
                    "hover:bg-(--color-primary-500)/10 focus:bg-(--color-primary-500)/15 focus:text-(--color-text-primary)",
                    "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                    "data-[state=checked]:bg-(--color-primary-500)/15 data-[state=checked]:text-(--color-text-primary) data-[state=checked]:font-semibold",
                  )}
                >
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-3 flex items-center justify-center">
                    <Check className="h-4 w-4 text-(--color-primary-500)" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>

            <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1 bg-(--color-bg-white)">
              <ChevronDown className="h-4 w-4 text-(--color-text-muted)" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {error && (
        <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
      )}
    </div>
  );
};

export { Select };
