// ============================================================
// HOOK — SALES FULFILMENT
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import * as sfService from '../services/salesFulfilmentService';
import type { FulfilmentMetrics } from '../types';

export function useSalesFulfilmentData() {
  const [metrics, setMetrics] = useState<FulfilmentMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const m = await sfService.fetchFulfilmentMetrics();
      setMetrics(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fulfilment metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { metrics, isLoading, error, refresh };
}
