import Link from 'next/link';
import { UserIcon } from '@react-icons/all-files/ui/UserIcon';
import { TruckIcon } from '@react-icons/all-files/ui/TruckIcon';
import { CalendarIcon } from '@react-icons/all-files/ui/CalendarIcon';
import { FuelPumpIcon } from '@react-icons/all-files/ui/FuelPumpIcon';
import { BarChart3Icon } from '@react-icons/all-files/ui/BarChart3Icon';
import { settings02 } from 'lucide-react';

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-white bg-opacity-50 backdrop-blur-sm border-r border-gray-200">
      <div className="flex h-full flex-col p-4 space-y-6">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-blue-500/20 rounded-md flex items-center justify-center">
            <UserIcon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">TransitOps</h2>
            <p className="text-sm text-gray-500">Transport Operations</p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col space-y-1">
          <Link href="/(app)/dashboard" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
            <BarChart3Icon className="h-4 w-4 mr-3" />
            Dashboard
          </Link>
          <Link href="/(app)/vehicles" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
            <TruckIcon className="h-4 w-4 mr-3" />
            Vehicles
          </Link>
          <Link href="/(app)/drivers" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
            <UserIcon className="h-4 w-4 mr-3" />
            Drivers
          </Link>
          <Link href="/(app)/trips" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
            <CalendarIcon className="h-4 w-4 mr-3" />
            Trips
          </Link>
          <Link href="/(app)/maintenance" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
            <FuelPumpIcon className="h-4 w-4 mr-3" />
            Maintenance
          </Link>
          <Link href="/(app)/fuel" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
            <FuelPumpIcon className="h-4 w-4 mr-3" />
            Fuel & Expense
          </Link>
          <Link href="/(app)/reports" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
            <BarChart3Icon className="h-4 w-4 mr-3" />
            Reports
          </Link>
        </nav>

        <div className="border-t border-gray-200 pt-4">
          <Link href="/(app)/settings" className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">
            <settings02 className="h-4 w-4 mr-3" />
            Settings
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={() => {
              // TODO: Implement logout
              alert('Logout functionality to be implemented');
            }}
          >
            Logout
          </Button>
        </div>
      </div>
    </aside>
  );
};
