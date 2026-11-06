// ============================================================
// RECEIVING CENTRE — DATA HOOK
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchReceivingData } from '../services/receivingService';
import type { ReceivingPageData } from '../types';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useReceivingData(warehouseId: string) {
  const [data, setData] = useState<ReceivingPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const result = await fetchReceivingData(warehouseId);
      setData(result);
    } catch (err) {
      setError('Receiving data could not be loaded. Using last known values.');
      console.error('Receiving data fetch failed:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    load(false);
    timerRef.current = setInterval(() => load(true), REFRESH_INTERVAL_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { data, isLoading, isRefreshing, error, refresh };
}
