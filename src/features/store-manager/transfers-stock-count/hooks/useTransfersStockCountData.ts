// ============================================================
// HOOK — TRANSFERS & STOCK COUNT
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import * as tscService from '../services/transfersStockCountService';
import type { TransferMetrics } from '../types';

export function useTransfersStockCountData() {
  const [metrics, setMetrics] = useState<TransferMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const m = await tscService.fetchTransferMetrics();
      setMetrics(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { metrics, isLoading, error, refresh };
}
