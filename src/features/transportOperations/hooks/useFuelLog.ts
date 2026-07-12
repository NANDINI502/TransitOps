// Hook for managing fuel and expense operations
import { useState, useCallback } from 'react';
import { fuelExpenseService } from '@/services/fuelExpenseService';
import { FuelExpense } from '@/features/transportoperations/types/index';

export const useFuelLog = () => {
  const [fuels, setFuels] = useState<FuelExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFuels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fuelExpenseService.getAllFuelExpenses();
      setFuels(data);
      setError(null);
    } catch (err) {
      setError('Failed to load fuel and expense records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createFuelExpense = useCallback(async (data: Omit<FuelExpense, 'id'>) => {
    setLoading(true);
    try {
      const newFuelExpense = await fuelExpenseService.createFuelExpense(data);
      setFuels(prev => [...prev, newFuelExpense]);
      setError(null);
      return newFuelExpense;
    } catch (err) {
      setError('Failed to create fuel/expense record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFuelExpense = useCallback(async (id: string, data: Partial<FuelExpense>) => {
    setLoading(true);
    try {
      await fuelExpenseService.updateFuelExpense(id, data);
      setFuels(prev =>
        prev.map(item => (item.id === id ? { ...item, ...data } : item))
      );
      setError(null);
    } catch (err) {
      setError('Failed to update fuel/expense record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteFuelExpense = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await fuelExpenseService.deleteFuelExpense(id);
      setFuels(prev => prev.filter(item => item.id !== id));
      setError(null);
    } catch (err) {
      setError('Failed to delete fuel/expense record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getExpensesByVehicleId = useCallback(async (vehicleId: string) => {
    try {
      return await fuelExpenseService.getExpensesByVehicleId(vehicleId);
    } catch (err) {
      console.error('Failed to get expenses by vehicle ID:', err);
      return [];
    }
  }, []);

  const getExpensesByTripId = useCallback(async (tripId: string) => {
    try {
      return await fuelExpenseService.getExpensesByTripId(tripId);
    } catch (err) {
      console.error('Failed to get expenses by trip ID:', err);
      return [];
    }
  }, []);

  const getTotalFuelCost = useCallback(async () => {
    try {
      return await fuelExpenseService.getTotalFuelCost();
    } catch (err) {
      console.error('Failed to get total fuel cost:', err);
      return 0;
    }
  }, []);

  const getTotalMaintenanceCost = useCallback(async () => {
    try {
      return await fuelExpenseService.getTotalMaintenanceCost();
    } catch (err) {
      console.error('Failed to get total maintenance cost:', err);
      return 0;
    }
  }, []);

  return {
    fuels,
    loading,
    error,
    loadFuels,
    createFuelExpense,
    updateFuelExpense,
    deleteFuelExpense,
    getExpensesByVehicleId,
    getExpensesByTripId,
    getTotalFuelCost,
    getTotalMaintenanceCost,
  };
};