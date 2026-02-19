import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@cham-lang/shared/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, icon: Icon, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-bold text-(--color-text-primary) mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <Icon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-(--color-primary-600) dark:text-(--color-primary-400)" />
          )}
          <input
            ref={ref}
            className={cn(
              "w-full py-3 pr-4 text-base bg-(--color-bg-white) rounded-2xl border-[3px] shadow-clay-input focus:outline-none focus:border-(--color-primary-500) focus:shadow-clay-input-focus text-(--color-text-primary) placeholder-(--color-text-muted) transition-all duration-200",
              Icon ? "pl-12" : "pl-4",
              error ? "border-red-500" : "border-(--color-border-light)",
              className,
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
