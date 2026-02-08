import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@cham-lang/shared/utils";

const cardVariants = cva(
  "clay-card rounded-3xl p-4 border-[3px] border-[var(--color-border-light)] transition-all duration-200 shadow-clay-card",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-bg-white)]",
        glass: "bg-[var(--glass-bg)] backdrop-blur-md",
        "clay-gray": "bg-gray-200",
        "clay-peach": "bg-[var(--color-clay-peach)]",
        "clay-blue": "bg-[var(--color-clay-blue)]",
        "clay-mint": "bg-[var(--color-clay-mint)]",
        "clay-lilac": "bg-[var(--color-clay-lilac)]",
        "clay-yellow": "bg-[var(--color-clay-yellow)]",
        "clay-pink": "bg-[var(--color-clay-pink)]",
        gradient:
          "bg-linear-to-br from-[var(--color-secondary-500)] to-[var(--color-primary-500)] text-white",
      },
      hover: {
        true: "cursor-pointer hover:translate-y-[-2px] hover:shadow-clay-card-hover active:translate-y-[2px] active:shadow-clay-card-active",
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
    className={cn(
      "font-semibold leading-none tracking-tight text-[var(--color-text-primary)]",
      className,
    )}
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
