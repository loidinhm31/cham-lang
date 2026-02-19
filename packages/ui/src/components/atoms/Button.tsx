import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { LucideIcon } from "lucide-react";
import { cn } from "@cham-lang/shared/utils";

const buttonVariants = cva(
  "font-bold rounded-2xl border-[3px] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-clay-btn hover:translate-y-[-2px] hover:shadow-clay-btn-hover active:translate-y-[3px] active:shadow-clay-btn-active disabled:translate-y-0 disabled:shadow-clay-btn",
  {
    variants: {
      variant: {
        primary: "text-white btn-primary border-(--color-primary-600)",
        secondary: "text-white btn-secondary border-(--color-secondary-600)",
        glass:
          "text-(--color-text-primary) bg-(--color-bg-white) border-(--color-border-light) hover:bg-(--color-bg-white)/80 backdrop-blur-md",
        outline:
          "text-(--color-primary-600) dark:text-(--color-primary-400) bg-(--color-bg-white) border-(--color-primary-500) hover:bg-indigo-50 dark:hover:bg-indigo-950/50 shadow-[0_4px_0_rgba(79,70,229,0.2)] dark:shadow-[0_4px_0_rgba(56,189,248,0.2)]",
        success: "text-white btn-success border-emerald-700",
        danger: "text-white btn-danger border-red-700",
      },
      size: {
        xs: "py-1.5 px-3 text-xs",
        sm: "py-2 px-4 text-sm",
        md: "py-3 px-6 text-base",
        lg: "py-3.5 px-8 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariant = NonNullable<
  VariantProps<typeof buttonVariants>["variant"]
>;
export type ButtonSize = NonNullable<
  VariantProps<typeof buttonVariants>["size"]
>;

interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant,
      size,
      icon: Icon,
      iconPosition = "left",
      fullWidth = false,
      children,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          fullWidth && "w-full",
          className,
        )}
        data-variant={variant}
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
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
