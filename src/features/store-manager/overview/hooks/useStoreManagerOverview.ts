// ============================================================
// STORE MANAGER OVERVIEW — CUSTOM HOOK
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  fetchStoreManagerOverview,
  fetchAuthorizedWarehouses,
} from '../services/storeManagerOverviewService';
import type {
  StoreManagerOverviewData,
  Warehouse,
  CurrentUser,
} from '../types';

interface UseStoreManagerOverviewReturn {
  data: StoreManagerOverviewData | null;
  warehouses: Warehouse[];
  currentUser: CurrentUser | null;
  selectedWarehouseId: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  setSelectedWarehouseId: (id: string) => void;
  refresh: () => void;
}

export function useStoreManagerOverview(): UseStoreManagerOverviewReturn {
  const [data, setData] = useState<StoreManagerOverviewData | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load warehouses and user on mount
  useEffect(() => {
    fetchAuthorizedWarehouses()
      .then(({ warehouses: whs, currentUser: user }) => {
        setWarehouses(whs);
        setCurrentUser(user);
        // Auto-select if only one warehouse
        if (whs.length === 1) {
          setSelectedWarehouseId(whs[0].id);
        }
      })
      .catch(() => {
        setError('Failed to load warehouse information.');
      });
  }, []);

  const loadData = useCallback(
    async (warehouseId: string, refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const result = await fetchStoreManagerOverview(warehouseId);
        setData(result);
      } catch {
        setError('Failed to load overview data. Some workspace statuses may be unavailable.');
        setData(null);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  // Reload data when warehouse changes
  useEffect(() => {
    loadData(selectedWarehouseId);
  }, [selectedWarehouseId, loadData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      loadData(selectedWarehouseId, true);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedWarehouseId, loadData]);

  const refresh = useCallback(() => {
    loadData(selectedWarehouseId, true);
  }, [selectedWarehouseId, loadData]);

  return {
    data,
    warehouses,
    currentUser,
    selectedWarehouseId,
    isLoading,
    isRefreshing,
    error,
    setSelectedWarehouseId,
    refresh,
  };
}
