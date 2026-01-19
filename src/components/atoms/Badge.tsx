import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-block px-3 py-1.5 text-xs font-bold rounded-xl border-2 shadow-[0_3px_0_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.05)]",
  {
    variants: {
      variant: {
        primary: "bg-indigo-500 text-white border-indigo-600",
        secondary: "bg-purple-500 text-white border-purple-600",
        success: "bg-emerald-500 text-white border-emerald-600",
        warning: "bg-orange-500 text-white border-orange-600",
        info: "bg-cyan-500 text-white border-cyan-600",
        glass: "bg-white text-gray-800 border-gray-300",
        peach: "bg-[#FDBCB4] text-gray-800 border-[#FCA89D]",
        blue: "bg-[#ADD8E6] text-gray-800 border-[#8FC4DE]",
        mint: "bg-[#98FF98] text-gray-800 border-[#7EE57E]",
        lilac: "bg-[#E6E6FA] text-gray-800 border-[#D0D0F0]",
        yellow: "bg-[#FFF9C4] text-gray-800 border-[#FFF59D]",
        pink: "bg-[#FFD1DC] text-gray-800 border-[#FFB3C1]",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

export type BadgeVariant = NonNullable<
  VariantProps<typeof badgeVariants>["variant"]
>;

interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant, className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant }), className)}
        {...props}
      >
        {children}
      </span>
    );
  },
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
