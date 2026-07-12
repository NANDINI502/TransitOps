// Hook for managing maintenance operations
import { useState, useCallback } from 'react';
import { maintenanceService } from '@/services/maintenanceService';
import { Maintenance } from '@/features/transportoperations/types/index';

export const useMaintenance = () => {
  const [maintenances, setMaintenances] = useState<Management[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMaintenances = useCallback(async () => {
    setLoading(true);
    try {
      const data = await maintenanceService.getAllMaintenances();
      setMaintenances(data);
      setError(null);
    } catch (err) {
      setError('Failed to load maintenance records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createMaintenance = useCallback(async (data: Omit<Maintenance, 'id'>) => {
    setLoading(true);
    try {
      const newMaintenance = await maintenanceService.createMaintenance(data);
      setMaintenances(prev => [...prev, newMaintenance]);
      setError(null);
      return newMaintenance;
    } catch (err) {
      setError('Failed to create maintenance record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMaintenance = useCallback(async (id: string, data: Partial<Maintenance>) => {
    setLoading(true);
    try {
      await maintenanceService.updateMaintenance(id, data);
      setMaintenances(prev =>
        prev.map(m => m.id === id ? { ...m, ...data } : m)
      );
      setError(null);
    } catch (err) {
      setError('Failed to update maintenance record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteMaintenance = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await maintenanceService.deleteMaintenance(id);
      setMaintenances(prev => prev.filter(m => m.id !== id));
      setError(null);
    } catch (err) {
      setError('Failed to delete maintenance record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const startMaintenance = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await maintenanceService.startMaintenance(id);
      setMaintenances(prev =>
        prev.map(m =>
          m.id === id
            ? { ...m, status: 'In Progress', startedAt: new Date() }
            : m
        )
      );
      setError(null);
    } catch (err) {
      setError('Failed to start maintenance');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const completeMaintenance = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await maintenanceService.completeMaintenance(id);
      setMaintenances(prev =>
        prev.map(m =>
          m.id === id
            ? { ...m, status: 'Completed', completedAt: new Date() }
            : m
        )
      );
      setError(null);
    } catch (err) {
      setError('Failed to complete maintenance');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    maintenances,
    loading,
    error,
    loadMaintenances,
    createMaintenance,
    updateMaintenance,
    deleteMaintenance,
    startMaintenance,
    completeMaintenance,
  };
};

// Fix the type - Maintenance is already imported correctly