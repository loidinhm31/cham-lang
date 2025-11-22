import React from "react";
import { LucideIcon } from "lucide-react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon: Icon,
  error,
  className = "",
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-teal-600" />
        )}
        <input
          className={`w-full py-3 ${Icon ? "pl-12" : "pl-4"} pr-4 text-base bg-white/60 backdrop-blur-lg rounded-2xl shadow-lg border-0 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-800 placeholder-gray-500 ${error ? "ring-2 ring-red-500" : ""} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};
