import React from "react";
import { LucideIcon } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "glass"
  | "outline"
  | "success"
  | "danger";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "text-white bg-gradient-to-br from-amber-400 to-orange-500 border-amber-600",
  secondary:
    "text-white bg-gradient-to-br from-indigo-500 to-purple-500 border-indigo-700",
  glass: "text-gray-800 bg-white border-gray-300 hover:bg-gray-50",
  outline:
    "text-indigo-600 bg-white border-indigo-500 hover:bg-indigo-50 shadow-[0_4px_0_rgba(79,70,229,0.2)]",
  success:
    "text-white bg-gradient-to-br from-emerald-400 to-teal-500 border-emerald-700",
  danger:
    "text-white bg-gradient-to-br from-red-400 to-pink-500 border-red-700",
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: "py-1.5 px-3 text-xs",
  sm: "py-2 px-4 text-sm",
  md: "py-3 px-6 text-base",
  lg: "py-3.5 px-8 text-lg",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  icon: Icon,
  iconPosition = "left",
  fullWidth = false,
  children,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "font-bold rounded-2xl border-[3px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const shadowStyles =
    "shadow-[0_6px_0_rgba(0,0,0,0.15),0_3px_8px_rgba(0,0,0,0.1),inset_0_-2px_3px_rgba(0,0,0,0.1)]";
  const hoverStyles =
    "hover:translate-y-[-2px] hover:shadow-[0_8px_0_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.12),inset_0_-2px_3px_rgba(0,0,0,0.1)]";
  const activeStyles =
    "active:translate-y-[3px] active:shadow-[0_3px_0_rgba(0,0,0,0.15),0_1px_4px_rgba(0,0,0,0.1),inset_0_-1px_2px_rgba(0,0,0,0.1)]";
  const disabledStyles =
    "disabled:translate-y-0 disabled:shadow-[0_6px_0_rgba(0,0,0,0.15),0_3px_8px_rgba(0,0,0,0.1),inset_0_-2px_3px_rgba(0,0,0,0.1)]";
  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseStyles} ${shadowStyles} ${hoverStyles} ${activeStyles} ${disabledStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {Icon && iconPosition === "left" && (
        <Icon className="inline w-5 h-5 mr-2" />
      )}
      {children}
      {Icon && iconPosition === "right" && (
        <Icon className="inline w-5 h-5 ml-2" />
      )}
    </button>
  );
};
