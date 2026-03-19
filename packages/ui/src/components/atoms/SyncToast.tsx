import { useSyncToastContext, type ToastPosition } from "../../contexts/SyncToastContext";

function positionClasses(position: ToastPosition): string {
  switch (position) {
    case "top-right":
      return "top-4 right-4 max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:right-auto";
    case "top-center":
      return "top-4 left-1/2 -translate-x-1/2";
    case "bottom-right":
      return "bottom-4 right-4 max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:right-auto max-sm:bottom-4";
    case "bottom-center":
      return "bottom-4 left-1/2 -translate-x-1/2";
  }
}

export function SyncToast() {
  const { toasts, position, removeToast } = useSyncToastContext();

  if (toasts.length === 0) return null;

  return (
    <div
      className={`fixed z-[9999] flex flex-col gap-2 ${positionClasses(position)}`}
      aria-live="polite"
      aria-label="Sync notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[
            "flex items-center gap-3 max-w-80 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm text-sm font-medium text-(--color-text-primary)",
            toast.type === "success" && "bg-green-500/20 border-green-500/50",
            toast.type === "error" && "bg-red-500/20 border-red-500/50",
            toast.type === "syncing" && "bg-blue-500/20 border-blue-500/50",
          ]
            .filter(Boolean)
            .join(" ")}
          role="status"
        >
          {toast.type === "syncing" && (
            <svg
              className="shrink-0 h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {toast.type === "success" && (
            <svg
              className="shrink-0 h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {toast.type === "error" && (
            <svg
              className="shrink-0 h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <span className="flex-1 min-w-0 truncate">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
