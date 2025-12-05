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
        <label className="block text-sm font-bold text-gray-800 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-indigo-600" />
        )}
        <input
          className={`w-full py-3 ${Icon ? "pl-12" : "pl-4"} pr-4 text-base bg-white rounded-2xl border-[3px] ${error ? "border-red-500" : "border-gray-300"} shadow-[0_4px_0_rgba(0,0,0,0.1),0_2px_6px_rgba(0,0,0,0.05),inset_0_-1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:border-indigo-500 focus:shadow-[0_4px_0_rgba(79,70,229,0.3),0_2px_8px_rgba(79,70,229,0.2),inset_0_-1px_2px_rgba(0,0,0,0.05)] text-gray-800 placeholder-gray-400 transition-all duration-200 ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
      )}
    </div>
  );
};
