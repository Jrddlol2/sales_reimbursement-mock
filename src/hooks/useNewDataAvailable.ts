import { useEffect, useRef, useState } from 'react';

/**
 * Polls `fetchIds` on an interval and flags when the set of ids it returns
 * differs from `currentIds` — without touching the page's own state. The
 * caller decides what "refresh" means (usually just re-running its normal
 * fetch) and calls `dismiss()` once it has.
 *
 * Deliberately never replaces data on its own: a silent mid-review swap
 * out from under the user is worse than a moment of staleness, so this
 * only ever surfaces a dismissible signal.
 */
export function useNewDataAvailable(params: {
  fetchIds: () => Promise<string[]>;
  currentIds: string[];
  intervalMs?: number;
}) {
  const { fetchIds, currentIds, intervalMs = 60000 } = params;
  const [hasNewData, setHasNewData] = useState(false);
  const currentIdsRef = useRef(currentIds);
  currentIdsRef.current = currentIds;
  const fetchIdsRef = useRef(fetchIds);
  fetchIdsRef.current = fetchIds;

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const latestIds = await fetchIdsRef.current();
        const currentSet = new Set(currentIdsRef.current);
        const differs = latestIds.length !== currentSet.size || latestIds.some(id => !currentSet.has(id));
        if (differs) setHasNewData(true);
      } catch {
        // Background convenience check, not a critical path — ignore.
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return {
    hasNewData,
    dismiss: () => setHasNewData(false),
  };
}
