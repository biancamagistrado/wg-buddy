import { useCallback, useEffect, useState } from "react";
import { ApiError } from "./api";

/**
 * Runs an async function and tracks loading / error / data for it.
 *
 * This is the one piece of shared plumbing in the frontend: every page needs to
 * fetch something, show a spinner, and be able to refetch after a change.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const reload = useCallback(async () => {
    setError(null);
    try {
      setData(await run());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the server");
    } finally {
      setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    run()
      .then((result) => !cancelled && setData(result))
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Could not reach the server");
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [run]);

  return { data, loading, error, reload, setData };
}

/** Remembers which member you are, so items can be attributed without login. */
export function useCurrentMember(householdId: string | undefined) {
  const key = `wgbuddy:member:${householdId ?? "none"}`;
  const [memberId, setMemberId] = useState<string | null>(() => localStorage.getItem(key));

  useEffect(() => {
    setMemberId(localStorage.getItem(key));
  }, [key]);

  const choose = useCallback(
    (id: string | null) => {
      if (id) localStorage.setItem(key, id);
      else localStorage.removeItem(key);
      setMemberId(id);
    },
    [key],
  );

  return [memberId, choose] as const;
}
