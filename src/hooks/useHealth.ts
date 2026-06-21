import { useState, useCallback } from 'react';
import { api } from '@/utils/api';
import type { ClientHealthScore, HealthConfig, HealthHistoryRecord } from '../../shared/types';

export function useHealth() {
  const [healthConfig, setHealthConfig] = useState<HealthConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<HealthConfig>('/health/config');
      if (res.success && res.data) {
        setHealthConfig(res.data);
        return res.data;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health config');
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  const updateHealthConfig = useCallback(async (config: Partial<HealthConfig>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.put<HealthConfig>('/health/config', config);
      if (res.success && res.data) {
        setHealthConfig(res.data);
        return res.data;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update health config');
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  const resetHealthConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<HealthConfig>('/health/config/reset');
      if (res.success && res.data) {
        setHealthConfig(res.data);
        return res.data;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset health config');
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  const getClientHealth = useCallback(async (clientId: string, force = false) => {
    try {
      const res = await api.get<ClientHealthScore>(
        `/health/clients/${clientId}${force ? '?force=true' : ''}`
      );
      if (res.success && res.data) {
        return res.data;
      }
    } catch {
      return null;
    }
    return null;
  }, []);

  const getClientHealthHistory = useCallback(
    async (clientId: string, limit?: number, start?: string, end?: string) => {
      try {
        let url = `/health/clients/${clientId}/history`;
        const params: string[] = [];
        if (limit) params.push(`limit=${limit}`);
        if (start) params.push(`start=${start}`);
        if (end) params.push(`end=${end}`);
        if (params.length > 0) url += `?${params.join('&')}`;

        const res = await api.get<HealthHistoryRecord[]>(url);
        if (res.success && res.data) {
          return res.data;
        }
      } catch {
        return [];
      }
      return [];
    },
    []
  );

  const getLowHealthClients = useCallback(async (threshold?: number) => {
    try {
      const url = threshold ? `/health/low-health?threshold=${threshold}` : '/health/low-health';
      const res = await api.get<any[]>(url);
      if (res.success && res.data) {
        return res.data;
      }
    } catch {
      return [];
    }
    return [];
  }, []);

  const recalculateAllHealth = useCallback(async () => {
    try {
      const res = await api.post('/health/recalculate');
      return res.success;
    } catch {
      return false;
    }
  }, []);

  const clearHealthCache = useCallback(async () => {
    try {
      const res = await api.post('/health/cache/clear');
      return res.success;
    } catch {
      return false;
    }
  }, []);

  return {
    healthConfig,
    loading,
    error,
    fetchHealthConfig,
    updateHealthConfig,
    resetHealthConfig,
    getClientHealth,
    getClientHealthHistory,
    getLowHealthClients,
    recalculateAllHealth,
    clearHealthCache,
  };
}
