// Hook for managing reports and analytics
import { useState, useCallback } from 'react';
import { reportService } from '@/services/reportService';
import { ReportFilters, KPIs, MonthlyExpense, MaintenanceTypeCount } from '@/features/transportoperations/types/index';

export const useReports = () => {
  const [kpiData, setKpiData] = useState<KPIs | null>(null);
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense[]>([]);
  const [maintenanceByType, setMaintenanceByType] = useState<MaintenanceTypeCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKPIs = useCallback(async (filters: ReportFilters) => {
    setLoading(true);
    try {
      const data = await reportService.calculateKPIs(filters);
      setKpiData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load KPI data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMonthlyExpenses = useCallback(async (filters: ReportFilters) => {
    setLoading(true);
    try {
      const data = await reportService.calculateMonthlyExpenses(filters);
      setMonthlyExpenses(data);
      setError(null);
    } catch (err) {
      setError('Failed to load monthly expenses');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMaintenanceByType = useCallback(async (filters: ReportFilters) => {
    setLoading(true);
    try {
      const data = await reportService.getMaintenanceByType(filters);
      setMaintenanceByType(data);
      setError(null);
    } catch (err) {
      setError('Failed to load maintenance by type');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllReports = useCallback(async (filters: ReportFilters) => {
    setLoading(true);
    try {
      // Load all reports in parallel
      const [kpiData, monthlyExpenses, maintenanceByType] = await Promise.all([
        reportService.calculateKPIs(filters),
        reportService.calculateMonthlyExpenses(filters),
        reportService.getMaintenanceByType(filters),
      ]);
      setKpiData(kpiData);
      setMonthlyExpenses(monthlyExpenses);
      setMaintenanceByType(maintenanceByType);
      setError(null);
    } catch (err) {
      setError('Failed to load reports');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const exportToCSV = useCallback(async (filters: ReportFilters) => {
    try {
      return await reportService.exportToCSV(filters);
    } catch (err) {
      throw new Error('Failed to export to CSV');
    }
  }, []);

  const exportToPDF = useCallback(async (filters: ReportFilters) => {
    try {
      return await reportService.exportToPDF(filters);
    } catch (err) {
      throw new Error('Failed to export to PDF');
    }
  }, []);

  return {
    kpiData,
    monthlyExpenses,
    maintenanceByType,
    loading,
    error,
    loadKPIs,
    loadMonthlyExpenses,
    loadMaintenanceByType,
    loadAllReports,
    exportToCSV,
    exportToPDF,
  };
};