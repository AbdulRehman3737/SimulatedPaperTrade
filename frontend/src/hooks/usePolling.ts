import { useCallback, useEffect, useRef, useState } from "react";
import { extractErrorMessage } from "../api/client";

interface UsePollingResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

/** Fetches once immediately, then on a fixed interval (skipped if `intervalMs <= 0`). */
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Keeps `load` referentially stable while always calling the latest fetcher.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (intervalMs <= 0) return undefined;
    const handle = setInterval(load, intervalMs);
    return () => clearInterval(handle);
  }, [load, intervalMs]);

  return { data, error, loading, refetch: load };
}
