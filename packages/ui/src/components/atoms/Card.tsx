import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@cham-lang/shared/utils";

const cardVariants = cva(
  "clay-card rounded-3xl p-4 border-[3px] border-(--color-border-light) transition-all duration-200 shadow-clay-card",
  {
    variants: {
      variant: {
        default: "bg-(--color-bg-white)",
        glass: "bg-(--glass-bg) backdrop-blur-md",
        "clay-gray": "bg-gray-200",
        "clay-peach": "bg-(--color-clay-peach)",
        "clay-blue": "bg-(--color-clay-blue)",
        "clay-mint": "bg-(--color-clay-mint)",
        "clay-lilac": "bg-(--color-clay-lilac)",
        "clay-yellow": "bg-(--color-clay-yellow)",
        "clay-pink": "bg-(--color-clay-pink)",
        gradient: "btn-secondary-primary text-white",
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
      "font-semibold leading-none tracking-tight text-(--color-text-primary)",
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
