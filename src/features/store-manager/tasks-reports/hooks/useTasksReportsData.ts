// ============================================================
// HOOK — TASKS & REPORTS
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import * as taskService from '../services/storeManagerTasksService';
import type { TaskMetrics } from '../types';

export function useTasksReportsData() {
  const [metrics, setMetrics] = useState<TaskMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const m = await taskService.fetchTaskMetrics();
      setMetrics(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch task metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { metrics, isLoading, error, refresh };
}
