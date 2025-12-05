import React from "react";

export type CardVariant =
  | "default"
  | "glass"
  | "clay-peach"
  | "clay-blue"
  | "clay-mint"
  | "clay-lilac"
  | "clay-yellow"
  | "clay-pink"
  | "gradient";

interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: "bg-white",
  glass: "bg-white",
  "clay-peach": "bg-[#FDBCB4]",
  "clay-blue": "bg-[#ADD8E6]",
  "clay-mint": "bg-[#98FF98]",
  "clay-lilac": "bg-[#E6E6FA]",
  "clay-yellow": "bg-[#FFF9C4]",
  "clay-pink": "bg-[#FFD1DC]",
  gradient: "bg-gradient-to-br from-indigo-500 to-purple-500 text-white",
};

export const Card: React.FC<CardProps> = ({
  variant = "default",
  children,
  className = "",
  onClick,
  hover = false,
}) => {
  const baseStyles =
    "rounded-3xl p-4 border-[3px] border-black/10 transition-all duration-200";
  const shadowStyles =
    "shadow-[0_8px_0_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.08),inset_0_-2px_4px_rgba(0,0,0,0.05)]";
  const hoverStyles = hover
    ? "cursor-pointer hover:translate-y-[-2px] hover:shadow-[0_10px_0_rgba(0,0,0,0.1),0_6px_16px_rgba(0,0,0,0.12),inset_0_-2px_4px_rgba(0,0,0,0.05)] active:translate-y-[2px] active:shadow-[0_4px_0_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.08),inset_0_-1px_2px_rgba(0,0,0,0.05)]"
    : "";

  return (
    <div
      className={`${baseStyles} ${shadowStyles} ${variantStyles[variant]} ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
