import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-3xl p-4 border-[3px] border-black/10 transition-all duration-200 shadow-[0_8px_0_rgba(0,0,0,0.1),0_4px_12px_rgba(0,0,0,0.08),inset_0_-2px_4px_rgba(0,0,0,0.05)]",
  {
    variants: {
      variant: {
        default: "bg-white",
        glass: "bg-white",
        "clay-gray": "bg-gray-200",
        "clay-peach": "bg-[#FDBCB4]",
        "clay-blue": "bg-[#ADD8E6]",
        "clay-mint": "bg-[#98FF98]",
        "clay-lilac": "bg-[#E6E6FA]",
        "clay-yellow": "bg-[#FFF9C4]",
        "clay-pink": "bg-[#FFD1DC]",
        gradient: "bg-gradient-to-br from-indigo-500 to-purple-500 text-white",
      },
      hover: {
        true: "cursor-pointer hover:translate-y-[-2px] hover:shadow-[0_10px_0_rgba(0,0,0,0.1),0_6px_16px_rgba(0,0,0,0.12),inset_0_-2px_4px_rgba(0,0,0,0.05)] active:translate-y-[2px] active:shadow-[0_4px_0_rgba(0,0,0,0.1),0_2px_8px_rgba(0,0,0,0.08),inset_0_-1px_2px_rgba(0,0,0,0.05)]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      hover: false,
    },
  },
);

export type CardVariant = NonNullable<
  VariantProps<typeof cardVariants>["variant"]
>;

interface CardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant, hover, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, hover }), className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardContent, CardFooter, cardVariants };
