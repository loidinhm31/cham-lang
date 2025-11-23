import React from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
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

export const Dialog: React.FC<DialogProps> = ({
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
  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.iconBg}`}>
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            {title && (
              <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            )}
          </div>
          {type === "alert" && (
            <button
              onClick={handleCancel}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Message */}
        <div className="px-6 pb-6">
          <p className="text-gray-700 text-base leading-relaxed">{message}</p>
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
      </div>
    </div>
  );
};
