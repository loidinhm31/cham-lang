import React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

const Accordion: React.FC<AccordionProps> = ({
  title,
  children,
  defaultOpen = false,
  className,
}) => {
  return (
    <AccordionPrimitive.Root
      type="single"
      collapsible
      defaultValue={defaultOpen ? "item" : undefined}
      className={cn(
        "bg-white/60 backdrop-blur-lg rounded-2xl shadow-lg overflow-hidden",
        className,
      )}
    >
      <AccordionPrimitive.Item value="item">
        <AccordionPrimitive.Header className="flex">
          <AccordionPrimitive.Trigger
            className={cn(
              "flex flex-1 items-center justify-between px-4 py-3 text-left",
              "hover:bg-white/40 transition-all duration-200",
              "group",
            )}
          >
            <span className="font-semibold text-gray-800">{title}</span>
            <ChevronDown
              className={cn(
                "w-5 h-5 text-gray-600 transition-transform duration-300 ease-out",
                "group-data-[state=open]:rotate-180",
              )}
            />
          </AccordionPrimitive.Trigger>
        </AccordionPrimitive.Header>
        <AccordionPrimitive.Content
          className={cn(
            "overflow-hidden",
            "data-[state=closed]:animate-accordion-up",
            "data-[state=open]:animate-accordion-down",
          )}
        >
          <div className="px-4 pb-4 space-y-3 border-t border-gray-200/50">
            {children}
          </div>
        </AccordionPrimitive.Content>
      </AccordionPrimitive.Item>
    </AccordionPrimitive.Root>
  );
};

export { Accordion };
