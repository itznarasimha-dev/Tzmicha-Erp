// ============================================================
// INVENTORY — DATA HOOK
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchInventoryData } from '../services/inventoryService';
import type { InventoryPageData } from '../types';

const REFRESH_MS = 5 * 60 * 1000;

export function useInventoryData(warehouseId: string) {
  const [data, setData]           = useState<InventoryPageData | null>(null);
  const [isLoading, setLoading]   = useState(true);
  const [isRefreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const result = await fetchInventoryData(warehouseId);
      setData(result);
    } catch (e) {
      setError('Inventory data could not be loaded. Displayed figures may be out of date.');
      console.error('Inventory fetch failed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    load(false);
    timer.current = setInterval(() => load(true), REFRESH_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);
  return { data, isLoading, isRefreshing, error, refresh };
}
