import React, { createContext, useContext, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogType,
  DialogVariant,
} from "@cham-lang/ui/components/atoms";

interface DialogOptions {
  type: DialogType;
  variant?: DialogVariant;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogContextType {
  showAlert: (
    message: string,
    options?: Partial<Omit<DialogOptions, "type" | "message">>,
  ) => void;
  showConfirm: (
    message: string,
    options?: Partial<Omit<DialogOptions, "type" | "message">>,
  ) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: DialogOptions;
  }>({
    isOpen: false,
    options: {
      type: "alert",
      message: "",
    },
  });

  const showAlert = useCallback(
    (
      message: string,
      options?: Partial<Omit<DialogOptions, "type" | "message">>,
    ) => {
      resolveRef.current = null;
      setDialogState({
        isOpen: true,
        options: {
          type: "alert",
          variant: "info",
          confirmText: "OK",
          ...options,
          message,
        },
      });
    },
    [],
  );

  const showConfirm = useCallback(
    (
      message: string,
      options?: Partial<Omit<DialogOptions, "type" | "message">>,
    ): Promise<boolean> => {
      return new Promise((resolve) => {
        resolveRef.current = resolve;
        setDialogState({
          isOpen: true,
          options: {
            type: "confirm",
            variant: "warning",
            confirmText: "Confirm",
            cancelText: "Cancel",
            ...options,
            message,
          },
        });
      });
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <Dialog
        isOpen={dialogState.isOpen}
        type={dialogState.options.type}
        variant={dialogState.options.variant}
        title={dialogState.options.title}
        message={dialogState.options.message}
        confirmText={dialogState.options.confirmText}
        cancelText={dialogState.options.cancelText}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </DialogContext.Provider>
  );
};

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
};
