'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line, AreaCell, Cell } from 'recharts';
import { RefreshCw, Download, Settings, Filter, Calendar, DollarSign, Truck, Users, PieChart, CheckCircle2, Wrench, MapPin, Activity, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, Description, Footer, Header, Title, Trigger } from '@/components/ui/dialog';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { db } from '@/firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { toast } from '@/components/ui/use-toast';

interface Vehicle {
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

interface Maintenance {
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

interface FuelExpense {
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

interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  cargoWeight: number;
  distance: number;
  status: 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';
  date: Date;
  revenue: number; // Revenue generated from this trip
}

const maintenanceTypes = ['Oil Change', 'Repair', 'Inspection', 'Tyres'] as const;

const dateRangeOptions = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'This month', value: 'this_month' },
  { label: 'Last 3 months', value: '3m' },
  { label: 'This year', value: 'this_year' },
  { label: 'Custom', value: 'custom' },
] as const;

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<string>('30d');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [expenses, setExpenses] = useState<FuelExpense[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDateRangeDialog, setOpenDateRangeDialog] = useState(false);
  const [openExportDialog, setOpenExportDialog] = useState(false);

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = new Date();

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case '3m':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        startDate = customStartDate || new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        endDate = customEndDate || new Date();
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  };

  // Fetch all data
  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch vehicles
      const vehiclesSnap = await getDocs(collection(db, 'vehicles'));
      const vehiclesList: Vehicle[] = [];
      vehiclesSnap.forEach((doc) => {
        const data = doc.data();
        vehiclesList.push({
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
      setVehicles(vehiclesList);

      // Fetch maintenances
      const maintenancesSnap = await getDocs(collection(db, 'maintenances'));
      const maintenancesList: Maintenance[] = [];
      maintenancesSnap.forEach((doc) => {
        const data = doc.data();
        maintenancesList.push({
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
      setMaintenances(maintenancesList);

      // Fetch expenses
      const expensesSnap = await getDocs(collection(db, 'fuelExpenses'));
      const expensesList: FuelExpense[] = [];
      expensesSnap.forEach((doc) => {
        const data = doc.data();
        expensesList.push({
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
      setExpenses(expensesList);

      // Fetch trips
      const tripsSnap = await getDocs(collection(db, 'trips'));
      const tripsList: Trip[] = [];
      tripsSnap.forEach((doc) => {
        const data = doc.data();
        tripsList.push({
          id: doc.id,
          source: data.source || '',
          destination: data.destination || '',
          vehicleId: data.vehicleId || '',
          driverId: data.driverId || '',
          cargoWeight: data.cargoWeight || 0,
          distance: data.distance || 0,
          status: data.status as 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled',
          date: data.date?.toDate() || new Date(),
          revenue: data.revenue || 0, // Add revenue field
        });
      });
      setTrips(tripsList);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter data by date range
  const filterByDate = <T extends { date: Date }>(items: T[]) => {
    if (dateRange === 'custom' && (!customStartDate || !customEndDate)) return items;
    const { startDate, endDate } = getDateRange();
    return items.filter(
      (item) => item.date >= startDate && item.date <= endDate
    );
  };

  // Calculate KPIs
  const filteredExpenses = filterByDate(expenses);
  const filteredTrips = filterByDate(trips);
  const filteredMaintenances = filterByDate(maintenances);

  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter(v => v.status === 'Available').length;
  const inMaintenanceVehicles = vehicles.filter(v => v.status === 'In Shop').length;
  const totalTrips = filteredTrips.length;
  const completedTrips = filteredTrips.filter(t => t.status === 'Completed').length;
  const totalFuelCost = filteredExpenses
    .filter(e => e.type === 'Fuel')
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const totalMaintenanceCost = filteredMaintenances
    .reduce((sum, m) => sum + (m.actualCost || m.estimatedCost || 0), 0);
  const totalOperationalCost = totalFuelCost + totalMaintenanceCost;
  const fleetUtilization = totalVehicles > 0
    ? ((totalVehicles - inMaintenanceVehicles) / totalVehicles) * 100
    : 0;

  // Calculate fuel efficiency (km per liter) for vehicles with fuel data
  const fuelEfficiencyData: { vehicleId: string; kmPerL: number }[] = [];
  vehicles.forEach(vehicle => {
    const vehicleFuelExpenses = filteredExpenses.filter(
      e => e.vehicleId === vehicle.id && e.type === 'Fuel' && e.fuelLiters && e.fuelLiters > 0
    );
    const totalFuel = vehicleFuelExpenses.reduce((sum, exp) => sum + (exp.fuelLiters || 0), 0);
    // Approximate distance from odometer changes (simplified)
    const totalDistance = vehicleFuelExpenses.reduce((sum, exp) => {
      const prev = vehicleFuelExpenses.find(e => e.date < exp.date && e.odometer);
      return sum + (exp.odometer && prev?.odometer ? Math.abs(exp.odometer - prev.odometer) : 0);
    }, 0);
    const kmPerL = totalFuel > 0 ? totalDistance / totalFuel : 0;
    if (totalFuel > 0) {
      fuelEfficiencyData.push({ vehicleId: vehicle.vehicleName, kmPerL });
    }
  });

  // Calculate ROI (Return on Investment)
  const totalRevenue = filteredTrips
    .filter(t => t.status === 'Completed')
    .reduce((sum, trip) => sum + (t.revenue || 0), 0);
  const totalAcquisitionCost = vehicles.reduce((sum, vehicle) => sum + (vehicle.acquisitionCost || 0), 0);
  const fleetROI = totalAcquisitionCost > 0
    ? ((totalRevenue - totalMaintenanceCost - totalFuelCost) / totalAcquisitionCost) * 100
    : 0;

  // Monthly expenses trend
  const monthlyExpenses = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthName = date.toLocaleString('default', { month: 'short' });
    const expensesForMonth = filteredExpenses.filter(
      exp =>
        exp.date.getMonth() === date.getMonth() &&
        exp.date.getFullYear() === date.getFullYear()
    );
    const total = expensesForMonth.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    return { month: monthName, total };
  }).reverse();

  // Maintenance by type
  const maintenanceByType = maintenanceTypes.map(type => ({
    type,
    count: filteredMaintenances.filter(m => m.type === type).length,
  }));

  // Export to CSV
  const exportToCSV = () => {
    // Combine all data for export
    const allData = [
      { type: 'Vehicle', data: vehicles },
      { type: 'Maintenance', data: maintenances },
      { type: 'Expenses', data: expenses },
      { type: 'Trips', data: trips },
    ];

    let csvContent = '';
    allData.forEach(section => {
      csvContent += `${section.type.toUpperCase()} DATA\n\n`;

      if (section.data.length === 0) {
        csvContent += 'No data available\n\n';
        return;
      }

      // Get headers from first object
      const headers = Object.keys(section.data[0] as object);
      csvContent += headers.join(',') + '\n';

      // Add rows
      section.data.forEach(item => {
        const row = headers.map(field => {
          const value = (item as any)[field];
          if (value instanceof Date) return value.toISOString();
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
          return value;
        });
        csvContent += row.join(',') + '\n';
      });

      csvContent += '\n\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transitops_report_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(18);
    doc.text('TransitOps Operations Report', 20, yPosition);
    yPosition += 15;
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, yPosition);
    yPosition += 25;

    // Add summary statistics
    doc.setFontSize(14);
    doc.text('Summary Statistics', 20, yPosition);
    yPosition += 10;
    doc.setFontSize(10);
    doc.text(`Total Vehicles: ${totalVehicles}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Available Vehicles: ${availableVehicles}`, 20, yPosition);
    yPosition += 7;
    doc.text(`In Maintenance: ${inMaintenanceVehicles}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Fleet Utilization: ${fleetUtilization.toFixed(1)}%`, 20, yPosition);
    yPosition += 7;
    doc.text(`Total Trips: ${totalTrips}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Completed Trips: ${completedTrips}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Total Fuel Cost: $${totalFuelCost.toFixed(2)}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Total Maintenance Cost: $${totalMaintenanceCost.toFixed(2)}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Total Operational Cost: $${totalOperationalCost.toFixed(2)}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Fleet ROI: ${fleetROI >= 0 ? '+' : ''}${fleetROI.toFixed(1)}%`, 20, yPosition);
    yPosition += 20;

    // Maintenance by type section
    doc.text('Maintenance By Type:', 20, yPosition);
    yPosition += 15;
    maintenanceByType.forEach(item => {
      doc.text(`  ${item.type}: ${item.count}`, 25, yPosition);
      yPosition += 10;
    });

    doc.save(`transitops_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Load initial data
  useEffect(() => {
    loadData();
  }, [dateRange, customStartDate, customEndDate]);

  if (loading) {
    return <div className="flex h-[200px] items-center justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <Button variant="outline" onClick={() => setOpenDateRangeDialog(true)}>
            <Calendar className="mr-2 h-4 w-4" />
            Date Range: {dateRangeOptions.find(opt => opt.value === dateRange)?.label || 'Custom'}
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <FileText className="mr-1 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Date Range Dialog */}
      <Dialog open={openDateRangeDialog} onOpenChange={setOpenDateRangeDialog}>
        <Trigger asChild>
          <div className="hidden">Open Dialog</div>
        </Trigger>
        <DialogContent className="w-96 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Select Date Range</DialogTitle>
            <DialogDescription>
              Choose a date range for the report
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="dateRange" className="text-sm font-medium text-gray-700">
                Preset Ranges
              </label>
              <Select
                id="dateRange"
                value={dateRange}
                onValueChange={setDateRange}
                className={dateRange === 'custom' ? 'border-blue-500' : undefined}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select preset" />
                </SelectTrigger>
                <SelectContent>
                  {dateRangeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div className="space-y-2">
                  <label htmlFor="customStartDate" className="text-sm font-medium text-gray-700">
                    Start Date
                  </label>
                  <input
                    id="customStartDate"
                    type="date"
                    value={customStartDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : null;
                      setCustomStartDate(date);
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="customEndDate" className="text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    id="customEndDate"
                    type="date"
                    value={customEndDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : null;
                      setCustomEndDate(date);
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setOpenDateRangeDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">Apply Filter</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Fleet Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Vehicles</p>
                <p className="text-2xl font-bold">{totalVehicles}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Available</p>
                <p className="text-xl font-semibold text-green-600">{availableVehicles}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">In Maintenance</p>
                <p className="text-xl font-semibold text-red-600">{inMaintenanceVehicles}</p>
              </div>
              <Wrench className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Fleet Utilization</p>
                <p className="text-xl font-semibold">{fleetUtilization.toFixed(1)}%</p>
              </div>
              <Activity className="h-5 w-5 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trip Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Trips</p>
                <p className="text-2xl font-bold">{totalTrips}</p>
              </div>
              <MapPin className="h-8 w-8 text-blue-500" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Completed Trips</p>
                <p className="text-xl font-semibold text-green-600">{completedTrips}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                <p className="text-xl font-semibold">
                  {totalTrips > 0 ? ((completedTrips / totalTrips) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Fuel Cost</p>
                <p className="text-2xl font-bold">$ {totalFuelCost.toFixed(2)}</p>
              </div>
              <Fuel className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Maintenance Cost</p>
                <p className="text-xl font-semibold text-red-600">$ {totalMaintenanceCost.toFixed(2)}</p>
              </div>
              <Wrench className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Operational Cost</p>
                <p className="text-xl font-semibold text-blue-600">$ {totalOperationalCost.toFixed(2)}</p>
              </div>
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Fleet ROI</p>
                <p className="text-xl font-semibold">
                  {fleetROI >= 0 ? `+` : ''}{fleetROI.toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-5 w-5 {fleetROI >= 0 ? 'text-green-600' : 'text-red-600'}" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fuel Efficiency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fuelEfficiencyData.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Avg KM/L</p>
                    <p className="text-xl font-semibold">
                      {
                        fuelEfficiencyData.reduce((sum, item) => sum + item.kmPerL, 0) /
                        fuelEfficiencyData.length
                      }.toFixed(1)
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-indigo-500" />
                </div>
                <div className="space-y-2">
                  {fuelEfficiencyData.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.vehicleId}</span>
                      <span>{item.kmPerL.toFixed(1)} KM/L</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center py-4 text-gray-500">
                No fuel efficiency data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Expenses Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyExpenses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance By Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={maintenanceByType}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  labelLine={{ show: false }}
                  label={{ show: false }}
                >
                  {maintenanceByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={_COLORS_[index % _COLORS_.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Records</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredMaintenances.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No maintenance records found for the selected period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Vehicle</Th>
                    <Th>Type</Th>
                    <Th>Description</Th>
                    <Th className="w-32">Scheduled Date</Th>
                    <Th className="w-24">Status</Th>
                    <Th className="w-20">Estimated Cost</Th>
                    <Th className="w-20">Actual Cost</Th>
                    <Th className="w-16">Actions</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaintenances.map((maintenance) => (
                    <TableRow key={maintenance.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{maintenance.vehicleName}</TableCell>
                      <TableCell>{maintenance.type}</TableCell>
                      <TableCell>{maintenance.description}</TableCell>
                      <TableCell>
                        {new Date(maintenance.scheduledDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            maintenance.status === 'Completed'
                              ? 'secondary'
                              : maintenance.status === 'In Progress'
                                ? 'destructive'
                                : 'default'
                          }
                        >
                          {maintenance.status}
                        </Badge>
                      </TableCell>
                      <TableCell>${maintenance.estimatedCost.toFixed(2)}</TableCell>
                      <TableCell>
                        {maintenance.actualCost ? `$${maintenance.actualCost.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="flex justify-center space-x-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sq" aria-label="More actions">
                              <DotPicker className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={4}>
                            <DropdownMenuItem onClick={() => {
                              // Edit functionality would go here
                            }}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              // Delete functionality would go here
                            }}>
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Define colors for pie chart
const _COLORS_ = [
  '#FF6384',
  '#36A2EB',
  '#FFCE56',
  '#4BC0C0',
  '#9966FF',
  '#FF9F40',
  '#FF6384',
  '#C9CBCF',
  '#4BC0C0',
  '#FF6384'
];