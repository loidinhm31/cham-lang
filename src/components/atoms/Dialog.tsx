import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export type DialogType = "alert" | "confirm";
export type DialogVariant = "info" | "success" | "warning" | "error";

interface DialogProps {
  isOpen: boolean;
  type: DialogType;
  variant?: DialogVariant;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

const variantConfig = {
  info: {
    icon: Info,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-100",
  },
  success: {
    icon: CheckCircle,
    iconColor: "text-green-500",
    iconBg: "bg-green-100",
  },
  warning: {
    icon: AlertCircle,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-100",
  },
  error: {
    icon: AlertCircle,
    iconColor: "text-red-500",
    iconBg: "bg-red-100",
  },
};

const Dialog: React.FC<DialogProps> = ({
  isOpen,
  type,
  variant = "info",
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) => {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onConfirm(); // For alerts, close on any action
    }
  };

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => !open && handleCancel()}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%]",
            "bg-white rounded-2xl shadow-2xl p-0",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "focus:outline-none",
          )}
          onEscapeKeyDown={handleCancel}
          onPointerDownOutside={(e) => {
            // Prevent closing on outside click for confirm dialogs
            if (type === "confirm") {
              e.preventDefault();
            }
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-full", config.iconBg)}>
                <Icon className={cn("w-6 h-6", config.iconColor)} />
              </div>
              {title && (
                <DialogPrimitive.Title className="text-xl font-bold text-gray-800">
                  {title}
                </DialogPrimitive.Title>
              )}
            </div>
            {type === "alert" && (
              <DialogPrimitive.Close asChild>
                <button
                  onClick={handleCancel}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </DialogPrimitive.Close>
            )}
          </div>

          {/* Message */}
          <div className="px-6 pb-6">
            <DialogPrimitive.Description className="text-gray-700 text-base leading-relaxed">
              {message}
            </DialogPrimitive.Description>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6">
            {type === "confirm" ? (
              <div className="flex gap-3">
                <Button
                  variant="glass"
                  fullWidth
                  onClick={handleCancel}
                  className="border-2 border-gray-200"
                >
                  {cancelText}
                </Button>
                <Button
                  variant={variant === "error" ? "danger" : "primary"}
                  fullWidth
                  onClick={handleConfirm}
                >
                  {confirmText}
                </Button>
              </div>
            ) : (
              <Button variant="primary" fullWidth onClick={handleConfirm}>
                {confirmText}
              </Button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export { Dialog };
