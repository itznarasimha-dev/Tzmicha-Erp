// ============================================================
// PRODUCTION MATERIALS — DATA HOOK
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProductionMaterialData } from '../services/productionMaterialsService';
import type { ProductionMaterialPageData } from '../types';

interface UseProductionMaterialsReturn {
  data: ProductionMaterialPageData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => void;
}

export function useProductionMaterials(warehouseId: string): UseProductionMaterialsReturn {
  const [data, setData] = useState<ProductionMaterialPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const result = await fetchProductionMaterialData(warehouseId);
        if (mountedRef.current) setData(result);
      } catch (err) {
        if (mountedRef.current)
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load production material data. Please retry.',
          );
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [warehouseId],
  );

  useEffect(() => {
    mountedRef.current = true;
    load(false);
    return () => { mountedRef.current = false; };
  }, [load]);

  const refresh = useCallback(() => { load(true); }, [load]);

  return { data, isLoading, isRefreshing, error, refresh };
}
