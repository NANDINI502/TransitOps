// Hook for managing expense operations (non-fuel)
import { useState, useCallback } from 'react';
import { fuelExpenseService } from '@/services/fuelExpenseService';
import { FuelExpense } from '@/features/transportoperations/types/index';

export const useExpense = () => {
  const [expenses, setExpenses] = useState<FuelExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = useCallback(async (excludeFuel = true) => {
    setLoading(true);
    try {
      const allExpenses = await fuelExpenseService.getAllFuelExpenses();
      // Filter out fuel expenses if requested
      const filteredExpenses = excludeFuel
        ? allExpenses.filter(expense => expense.type !== 'Fuel')
        : allExpenses;
      setExpenses(filteredExpenses);
      setError(null);
    } catch (err) {
      setError('Failed to load expense records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createExpense = useCallback(async (data: Omit<FuelExpense, 'id'>) => {
    // Ensure the type is not ' Fuel' for this expense-specific hook
    const expenseData = { ...data, type: data.type || 'Other' };
    setLoading(true);
    try {
      const newExpense = await fuelExpenseService.createFuelExpense(expenseData);
      setExpenses(prev => [...prev, newExpense]);
      setError(null);
      return newExpense;
    } catch (err) {
      setError('Failed to create expense record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateExpense = useCallback(async (id: string, data: Partial<FuelExpense>) => {
    setLoading(true);
    try {
      await fuelExpenseService.updateFuelExpense(id, data);
      setExpenses(prev =>
        prev.map(item => (item.id === id ? { ...item, ...data } : item))
      );
      setError(null);
    } catch (err) {
      setError('Failed to update expense record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await fuelExpenseService.deleteFuelExpense(id);
      setExpenses(prev => prev.filter(item => item.id !== id));
      setError(null);
    } catch (err) {
      setError('Failed to delete expense record');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getExpensesByVehicleId = useCallback(async (vehicleId: string, excludeFuel = true) => {
    try {
      const expenses = await fuelExpenseService.getExpensesByVehicleId(vehicleId);
      return excludeFuel
        ? expenses.filter(expense => expense.type !== 'Fuel')
        : expenses;
    } catch (err) {
      console.error('Failed to get expenses by vehicle ID:', err);
      return [];
    }
  }, []);

  const getExpensesByTripId = useCallback(async (tripId: string, excludeFuel = true) => {
    try {
      const expenses = await fuelExpenseService.getExpensesByTripId(tripId);
      return excludeFuel
        ? expenses.filter(expense => expense.type !== 'Fuel')
        : expenses;
    } catch (err) {
      console.error('Failed to get expenses by trip ID:', err);
      return [];
    }
  }, []);

  const getTotalExpenseCost = useCallback(async (excludeFuel = true) => {
    try {
      const expenses = await fuelExpenseService.getAllFuelExpenses();
      const filteredExpenses = excludeFuel
        ? expenses.filter(expense => expense.type !== 'Fuel')
        : expenses;
      return filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    } catch (err) {
      console.error('Failed to get total expense cost:', err);
      return 0;
    }
  }, []);

  return {
    expenses,
    loading,
    error,
    loadExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    getExpensesByVehicleId,
    getExpensesByTripId,
    getTotalExpenseCost,
  };
};