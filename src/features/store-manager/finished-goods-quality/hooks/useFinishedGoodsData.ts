// ============================================================
// HOOK — FINISHED GOODS & QUALITY
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import * as fgService from '../services/finishedGoodsQualityService';
import type { FinishedGoodsMetrics } from '../types';

export function useFinishedGoodsData() {
  const [metrics, setMetrics] = useState<FinishedGoodsMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const m = await fgService.fetchFGMetrics();
      setMetrics(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch FG metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { metrics, isLoading, error, refresh };
}
