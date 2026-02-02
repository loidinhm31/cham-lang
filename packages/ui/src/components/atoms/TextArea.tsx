import React from "react";
import { cn } from "@cham-lang/shared/utils";

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full py-3 px-4 bg-white/60 backdrop-blur-lg rounded-2xl shadow-lg border-0 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-800 placeholder-gray-500 resize-none",
            error && "ring-2 ring-red-500",
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  },
);
TextArea.displayName = "TextArea";

export { TextArea };
