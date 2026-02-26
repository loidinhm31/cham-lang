import { useState, useEffect, useRef } from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Standardize loading/error/data state pattern for async operations.
 * Cancels in-flight fetch on dep change or unmount (via cancelled flag).
 *
 * @param fn - Async function to call. If identity changes frequently, wrap in useCallback
 *   to avoid unnecessary re-fetches. fn is captured in a ref so it doesn't need to be
 *   in deps, but note: if fn closes over state that changes without changing deps, results
 *   may be stale — keep deps and fn closure in sync.
 * @param deps - Standard React effect deps. Changing these cancels the previous in-flight
 *   operation and starts a new one.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  // Track the latest fn ref to avoid stale closures without adding fn to deps
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));

    fnRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
