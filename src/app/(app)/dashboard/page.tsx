import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart } from 'recharts';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/firebase/config';

export default function Dashboard() {
  const [stats, setStats] = useState({
    activeVehicles: 0,
    availableVehicles: 0,
    maintenanceVehicles: 0,
    activeTrips: 0,
    pendingTrips: 0,
    driversOnDuty: 0,
    fleetUtilization: 0,
  });

  useEffect(() => {
    // Fetch dashboard stats from Firestore
    const loadStats = async () => {
      try {
        // In a real app, we would fetch from respective collections
        // For now, we'll use mock data
        setStats({
          activeVehicles: 15,
          availableVehicles: 8,
          maintenanceVehicles: 3,
          activeTrips: 12,
          pendingTrips: 5,
          driversOnDuty: 14,
          fleetUtilization: 80,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="h-full">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Active Vehicles</h3>
              <p className="text-2xl font-bold">{stats.activeVehicles}</p>
            </div>
            <Badge variant="secondary" className="p-1">
              <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 004.435 1.916 3.42 3.42 0 11-4.853 2.908 3.42 3.42 0 00-1.318.197A3.32 3.32 0 015.016 10.047a3.32 3.32 0 011.791 0 3.33 3.33 0 013.071-1.193z"></path>
              </svg>
            </Badge>
          </div>
        </Card>

        <Card className="h-full">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Available Vehicles</h3>
              <p className="text-2xl font-bold">{stats.availableVehicles}</p>
            </div>
            <Badge variant="secondary" className="p-1">
              <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m2 0a2 2 0 110-4 2 2 0 000-4h-2m2 4H9a2 2 0 01-2-2V7a2 2 0 012-2h2m2 4a2 2 0 100-4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </Badge>
          </div>
        </Card>

        <Card className="h-full">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Vehicles in Maintenance</h3>
              <p className="text-2xl font-bold">{stats.maintenanceVehicles}</p>
            </div>
            <Badge variant="secondary" className="p-1">
              <svg className="h-4 w-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464-0L3.732 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </Badge>
          </div>
        </Card>

        <Card className="h-full">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Active Trips</h3>
              <p className="text-2xl font-bold">{stats.activeTrips}</p>
            </div>
            <Badge variant="secondary" className="p-1">
              <svg className="h-4 w-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m2 0a2 2 0 110-4 2 2 0 000-4h-2m2 4H9a2 2 0 01-2-2V7a2 2 0 012-2h2m2 4a2 2 0 100-4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </Badge>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="mb-4 font-semibold">Fleet Utilization</h2>
          <div className="h-96 w-full">
            <BarChart
              width={600}
              height={300}
              data={[
                { name: 'Jan', available: 10, total: 15 },
                { name: 'Feb', available: 12, total: 15 },
                { name: 'Mar', available: 8, total: 15 },
                { name: 'Apr', available: 14, total: 15 },
                { name: 'May', available: 11, total: 15 },
                { name: 'Jun', available: 13, total: 15 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar name="Available Vehicles" dataKey="available" stackId="a" fill="#4f46e5" />
              <Bar name="Total Vehicles" dataKey="total" stackId="a" fill="#e5e7eb" />
            </BarChart>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Monthly Trips</h2>
          <div className="h-96 w-full">
            <BarChart
              width={600}
              height={300}
              data={[
                { name: 'Jan', completed: 45, cancelled: 5 },
                { name: 'Feb', completed: 52, cancelled: 3 },
                { name: 'Mar', completed: 38, cancelled: 8 },
                { name: 'Apr', completed: 60, cancelled: 2 },
                { name: 'May', completed: 55, cancelled: 4 },
                { name: 'Jun', completed: 48, cancelled: 6 },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar name="Completed" dataKey="completed" stackId="a" fill="#10b981" />
              <Bar name="Cancelled" dataKey="cancelled" stackId="a" fill="#ef4444" />
            </BarChart>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <h2 className="mb-4 font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button className="w-full flex items-center justify-between px-4 py-3">
            <span className="flex-1 text-left">Schedule Maintenance</span>
            <span className="ml-2">+</span>
          </Button>
          <Button className="w-full flex items-center justify-between px-4 py-3">
            <span className="flex-1 text-left">Log Fuel Expense</span>
            <span className="ml-2">+</span>
          </Button>
          <Button className="w-full flex items-center justify-between px-4 py-3">
            <span className="flex-1 text-left">Assign Driver</span>
            <span className="ml-2">+</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
