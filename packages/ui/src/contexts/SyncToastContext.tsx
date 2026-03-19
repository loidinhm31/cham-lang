import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type ToastType = "success" | "error" | "syncing";

export interface SyncToast {
  id: string;
  message: string;
  type: ToastType;
}

export type ToastPosition =
  | "top-right"
  | "top-center"
  | "bottom-right"
  | "bottom-center";

interface SyncToastContextValue {
  toasts: SyncToast[];
  position: ToastPosition;
  addToast: (message: string, type: ToastType) => string;
  removeToast: (id: string) => void;
  updateToast: (id: string, message: string, type: ToastType) => void;
}

const SyncToastContext = createContext<SyncToastContextValue | null>(null);

// "syncing" has a 30s safety-net timeout; success/error auto-dismiss normally
const AUTO_DISMISS_MS: Record<ToastType, number | null> = {
  success: 3000,
  error: 8000,
  syncing: 30_000,
};

const MAX_TOASTS = 3;

export function SyncToastProvider({
  position = "top-right",
  children,
}: {
  position?: ToastPosition;
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<SyncToast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const idCounterRef = useRef(0);
  const toastsRef = useRef<SyncToast[]>([]);
  toastsRef.current = toasts;

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const scheduleRemove = useCallback((id: string, type: ToastType) => {
    const existing = timers.current.get(id);
    if (existing) clearTimeout(existing);

    const delay = AUTO_DISMISS_MS[type];
    if (delay == null) return;

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timers.current.delete(id);
    }, delay);
    timers.current.set(id, timer);
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType): string => {
      const id = `st-${++idCounterRef.current}`;
      const current = toastsRef.current;

      // Cancel timers for any toasts that FIFO eviction will drop
      if (current.length >= MAX_TOASTS) {
        const evictCount = current.length - MAX_TOASTS + 1;
        for (let i = 0; i < evictCount; i++) {
          const evictedId = current[i].id;
          const timer = timers.current.get(evictedId);
          if (timer) {
            clearTimeout(timer);
            timers.current.delete(evictedId);
          }
        }
      }

      setToasts((prev) => {
        const next = [...prev, { id, message, type }];
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
      });
      scheduleRemove(id, type);
      return id;
    },
    [scheduleRemove],
  );

  const removeToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateToast = useCallback(
    (id: string, message: string, type: ToastType) => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, message, type } : t)),
      );
      scheduleRemove(id, type);
    },
    [scheduleRemove],
  );

  return (
    <SyncToastContext.Provider
      value={{ toasts, position, addToast, removeToast, updateToast }}
    >
      {children}
    </SyncToastContext.Provider>
  );
}

export function useSyncToastContext(): SyncToastContextValue {
  const ctx = useContext(SyncToastContext);
  if (!ctx) throw new Error("useSyncToastContext must be used within SyncToastProvider");
  return ctx;
}
