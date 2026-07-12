// Types for Transport Operations Module

/** Vehicle interface - matches existing vehicle data structure */
export interface Vehicle {
  id: string;
  registrationNumber: string;
  vehicleName: string;
  vehicleModel: string;
  vehicleType: string; // e.g., Truck, Van, Truck
  maxLoadCapacity: number; // in kg or tons
  odometer: number; // current odometer reading
  acquisitionCost: number;
  status: 'Available' | 'On Trip' | 'In Shop' | 'Retired';
  createdAt?: Date;
  updatedAt?: Date;
}

/** Trip interface - matches existing trip data structure */
export interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: number; // in kg
  distance: number; // in km
  status: 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';
  date: Date;
  revenue?: number; // revenue generated from this trip
  fuelConsumed?: number; // in liters
  createdAt?: Date;
  updatedAt?: Date;
}

/** Maintenance record */
export interface Maintenance {
  id: string;
  vehicleId: string;
  vehicleName: string; // denormalized for UI performance
  type: 'Oil Change' | 'Repair' | 'Inspection' | 'Tyres' | 'Other';
  description: string;
  scheduledDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  estimatedCost: number;
  actualCost?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Fuel log entry */
export interface FuelLog {
  id: string;
  vehicleId: string;
  vehicleName: string;
  tripId?: string; // optional link to trip
  date: Date;
  fuelLiters: number; // liters filled
  costPerLiter: number; // cost per liter
  totalCost: number; // calculated: fuelLiters * costPerLiter
  odometer: number; // odometer reading at time of fueling
  location?: string; // where fueled
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/** Expense entry */
export interface Expense {
  id: string;
  vehicleId: string;
  vehicleName: string;
  tripId?: string; // optional link to trip
  type: 'Fuel' | 'Maintenance' | 'Toll' | 'Parking' | 'Insurance' | 'Other';
  amount: number;
  date: Date;
  description?: string;
  vendor?: string;
  receiptUrl?: string; // URL to receipt image/document
  createdAt?: Date;
  updatedAt?: Date;
}

/** KPI metrics for dashboard */
export interface KPIMetrics {
  fuelEfficiency: number; // km per liter
  fleetUtilization: number; // percentage
  totalOperationalCost: number;
  totalFuelCost: number;
  totalMaintenanceCost: number;
  totalRevenue: number;
  roi: number; // return on investment percentage
  costPerTrip: number;
  costPerKm: number;
}

/** Chart data point */
export interface ChartDataPoint {
  name: string;
  value: number;
}

/** Monthly expense trend data */
export interface MonthlyExpense {
  month: string;
  total: number;
}

/** Maintenance by type data */
export interface MaintenanceByType {
  type: string;
  count: number;
}

/** Filter options for reports */
export interface ReportFilters {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  vehicleId: string | null;
  maintenanceType: string | null;
  expenseType: string | null;
}

/** Date range presets */
export const DATE_RANGE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last 3 Months', value: '3m' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Custom', value: 'custom' }
] as const;

export type DateRangePreset = typeof DATE_RANGE_PRESETS[number]['value'];