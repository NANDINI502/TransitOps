import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/firebase/config';

export interface Vehicle {
  id: string;
  registrationNumber: string;
  vehicleName: string;
  vehicleModel: string;
  vehicleType: string;
  maxLoadCapacity: number;
  odometer: number;
  acquisitionCost: number;
  status: 'Available' | 'On Trip' | 'In Shop' | 'Retired';
}

export interface Maintenance {
  id: string;
  vehicleId: string;
  vehicleName: string;
  type: string;
  description: string;
  scheduledDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: string;
  estimatedCost: number;
  actualCost?: number;
}

export interface FuelExpense {
  id: string;
  vehicleId: string;
  vehicleName: string;
  tripId?: string;
  type: string;
  amount: number;
  date: Date;
  description?: string;
  fuelLiters?: number;
  odometer?: number;
}

export interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: number;
  distance: number;
  status: 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';
  date: Date;
}

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
}

export const reportService = {
  // Get all vehicles
  getAllVehicles: async () => {
    const q = query(collection(db, 'vehicles'));
    const querySnapshot = await getDocs(q);
    const vehicles: Vehicle[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      vehicles.push({
        id: doc.id,
        registrationNumber: data.registrationNumber || '',
        vehicleName: data.vehicleName || `Vehicle ${doc.id}`,
        vehicleModel: data.vehicleModel || '',
        vehicleType: data.vehicleType || 'Truck',
        maxLoadCapacity: data.maxLoadCapacity || 0,
        odometer: data.odometer || 0,
        acquisitionCost: data.acquisitionCost || 0,
        status: data.status as 'Available' | 'On Trip' | 'In Shop' | 'Retired',
      });
    });
    return vehicles;
  },

  // Get all maintenances
  getAllMaintenances: async () => {
    const q = query(collection(db, 'maintenances'));
    const querySnapshot = await getDocs(q);
    const maintenances: Maintenance[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      maintenances.push({
        id: doc.id,
        vehicleId: data.vehicleId || '',
        vehicleName: `Vehicle ${data.vehicleId}`,
        type: data.type || '',
        description: data.description || '',
        scheduledDate: data.scheduledDate?.toDate() || new Date(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        status: data.status || 'Scheduled',
        estimatedCost: data.estimatedCost || 0,
        actualCost: data.actualCost,
      });
    });
    return maintenances;
  },

  // Get all fuel expenses
  getAllFuelExpenses: async () => {
    const q = query(collection(db, 'fuelExpenses'));
    const querySnapshot = await getDocs(q);
    const expenses: FuelExpense[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      expenses.push({
        id: doc.id,
        vehicleId: data.vehicleId || '',
        vehicleName: `Vehicle ${data.vehicleId}`,
        tripId: data.tripId,
        type: data.type || '',
        amount: data.amount || 0,
        date: data.date?.toDate() || new Date(),
        description: data.description,
        fuelLiters: data.fuelLiters,
        odometer: data.odometer,
      });
    });
    return expenses;
  },

  // Get all trips
  getAllTrips: async () => {
    const q = query(collection(db, 'trips'));
    const querySnapshot = await getDocs(q);
    const trips: Trip[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      trips.push({
        id: doc.id,
        source: data.source || '',
        destination: data.destination || '',
        vehicleId: data.vehicleId || '',
        driverId: data.driverId || '',
        cargoWeight: data.cargoWeight || 0,
        distance: data.distance || 0,
        status: data.status as 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled',
        date: data.date?.toDate() || new Date(),
      });
    });
    return trips;
  },

  // Get filtered data based on date range
  getFilteredData: async (filters: ReportFilters) => {
    const { startDate, endDate } = filters;
    
    // Get maintenances in date range
    const maintenanceQ = query(
      collection(db, 'maintenances'),
      where('scheduledDate', '>=', startDate),
      where('scheduledDate', '<=', endDate)
    );
    const maintenanceSnapshot = await getDocs(maintenanceQ);
    const maintenances: Maintenance[] = [];
    maintenanceSnapshot.forEach((doc) => {
      const data = doc.data();
      maintenances.push({
        id: doc.id,
        vehicleId: data.vehicleId || '',
        vehicleName: `Vehicle ${data.vehicleId}`,
        type: data.type || '',
        description: data.description || '',
        scheduledDate: data.scheduledDate?.toDate() || new Date(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        status: data.status || 'Scheduled',
        estimatedCost: data.estimatedCost || 0,
        actualCost: data.actualCost,
      });
    });
    
    // Get expenses in date range
    const expenseQ = query(
      collection(db, 'fuelExpenses'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const expenseSnapshot = await getDocs(expenseQ);
    const expenses: FuelExpense[] = [];
    expenseSnapshot.forEach((doc) => {
      const data = doc.data();
      expenses.push({
        id: doc.id,
        vehicleId: data.vehicleId || '',
        vehicleName: `Vehicle ${data.vehicleId}`,
        tripId: data.tripId,
        type: data.type || '',
        amount: data.amount || 0,
        date: data.date?.toDate() || new Date(),
        description: data.description,
        fuelLiters: data.fuelLiters,
        odometer: data.odometer,
      });
    });
    
    // Get trips in date range
    const tripQ = query(
      collection(db, 'trips'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const tripSnapshot = await getDocs(tripQ);
    const trips: Trip[] = [];
    tripSnapshot.forEach((doc) => {
      const data = doc.data();
      trips.push({
        id: doc.id,
        source: data.source || '',
        destination: data.destination || '',
        vehicleId: data.vehicleId || '',
        driverId: data.driverId || '',
        cargoWeight: data.cargoWeight || 0,
        distance: data.distance || 0,
        status: data.status as 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled',
        date: data.date?.toDate() || new Date(),
      });
    });
    
    return { maintenances, expenses, trips };
  },

  // Calculate KPIs
  calculateKPIs: async (filters: ReportFilters) => {
    const data = await reportService.getFilteredData(filters);
    const { maintenances, expenses, trips } = data;
    
    // Get all vehicles for calculations
    const vehicles = await reportService.getAllVehicles();
    
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(v => v.status === 'Available').length;
    const inMaintenanceVehicles = vehicles.filter(v => v.status === 'In Shop').length;
    const totalTrips = trips.length;
    const completedTrips = trips.filter(t => t.status === 'Completed').length;
    const totalFuelCost = expenses
      .filter(e => e.type === 'Fuel')
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalMaintenanceCost = maintenances
      .reduce((sum, m) => sum + (m.actualCost || m.estimatedCost || 0), 0);
    const totalOperationalCost = totalFuelCost + totalMaintenanceCost;
    const fleetUtilization = totalVehicles > 0 
      ? ((totalVehicles - inMaintenanceVehicles) / totalVehicles) * 100 
      : 0;
    
    return {
      totalVehicles,
      availableVehicles,
      inMaintenanceVehicles,
      totalTrips,
      completedTrips,
      totalFuelCost,
      totalMaintenanceCost,
      totalOperationalCost,
      fleetUtilization
    };
  },

  // Calculate fuel efficiency
  calculateFuelEfficiency: async (filters: ReportFilters) => {
    const data = await reportService.getFilteredData(filters);
    const { expenses } = data;
    const vehicles = await reportService.getAllVehicles();
    
    const fuelEfficiencyData: { vehicleId: string; kmPerL: number }[] = [];
    
    vehicles.forEach(vehicle => {
      const vehicleFuelExpenses = expenses.filter(
        e => e.vehicleId === vehicle.id && e.type === 'Fuel' && e.fuelLiters && e.fuelLiters > 0
      );
      
      const totalFuel = vehicleFuelExpenses.reduce((sum, exp) => sum + (exp.fuelLiters || 0), 0);
      
      // For simplicity, we'll approximate distance from odometer readings
      // In a real app, you'd want to track distance per trip more accurately
      let totalDistance = 0;
      if (vehicleFuelExpenses.length >= 2) {
        // Sort by date
        const sortedExpenses = [...vehicleFuelExpenses].sort((a, b) => 
          a.date.getTime() - b.date.getTime()
        );
        
        // Calculate distance between consecutive fuel-ups
        for (let i = 1; i < sortedExpenses.length; i++) {
          const prev = sortedExpenses[i-1];
          const curr = sortedExpenses[i];
          if (prev.odometer && curr.odometer) {
            totalDistance += Math.abs((curr.odometer || 0) - (prev.odometer || 0));
          }
        }
      }
      
      const kmPerL = totalFuel > 0 ? totalDistance / totalFuel : 0;
      if (totalFuel > 0) {
        fuelEfficiencyData.push({ vehicleId: vehicle.vehicleName, kmPerL });
      }
    });
    
    return fuelEfficiencyData;
  },

  // Calculate monthly expenses trend
  calculateMonthlyExpenses: async (filters: ReportFilters) => {
    const { startDate, endDate } = filters;
    const expenses = (await reportService.getFilteredData(filters)).expenses;
    
    // Generate last 6 months
    const monthlyExpenses = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      
      const expensesForMonth = expenses.filter(
        exp => 
          exp.date.getMonth() === date.getMonth() && 
          exp.date.getFullYear() === date.getFullYear()
      );
      
      const total = expensesForMonth.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      monthlyExpenses.push({ month: monthName, total });
    }
    
    return monthlyExpenses;
  },

  // Maintenance by type
  getMaintenanceByType: async (filters: ReportFilters) => {
    const data = await reportService.getFilteredData(filters);
    const { maintenances } = data;
    
    const maintenanceTypes = ['Oil Change', 'Repair', 'Inspection', 'Tyres'];
    return maintenanceTypes.map(type => ({
      type,
      count: maintenances.filter(m => m.type === type).length,
    }));
  },

  // Export to CSV
  exportToCSV: async (data: any[], filename: string) => {
    if (data.length === 0) {
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    data.forEach(item => {
      const row = headers.map(field => {
        const value = (item as any)[field];
        if (value instanceof Date) return value.toISOString();
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        return value;
      });
      csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Export to PDF
  exportToPDF: async (data: any[], title: string) => {
    // This would require jsPDF which we'll assume is available
    // In a real implementation, we'd import and use jsPDF here
    console.log('Exporting to PDF:', { data, title });
  }
};
