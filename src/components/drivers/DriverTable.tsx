import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';

interface Driver {
  id: string;
  driverName: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiry: Date;
  phone: string;
  safetyScore: number;
  status: 'Available' | 'On Trip' | 'Off Duty' | 'Suspended';
}

interface DriverTableProps {
  drivers: Driver[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Driver['status']) => void;
}

export const DriverTable = ({
  drivers,
  onEdit,
  onDelete,
  onStatusChange,
}: DriverTableProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const isAllSelected = drivers.every(d => selectedIds.has(d.id));

  const selectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(drivers.map(d => d.id)));
    }
  };

  const statusBadge = (status: Driver['status']) => {
    switch (status) {
      case 'Available':
        return <Badge variant="secondary">Available</Badge>;
      case 'On Trip':
        return <Badge variant="destructive">On Trip</Badge>;
      case 'Off Duty':
        return <Badge variant="secondary">Off Duty</Badge>;
      case 'Suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={selectAll}
            aria-label="Select all"
          />
          <span className="text-sm font-medium text-gray-600">
            {selectedIds.size} of {drivers.length} selected
          </span>
        </div>
        <div>
          {/* Bulk actions would go here */}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHeader className="w-8">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={selectAll}
                aria-label="Select all"
              />
            </TableHeader>
            <TableHeader>Driver Name</TableHeader>
            <TableHeader>License Number</TableHeader>
            <TableHeader>License Category</TableHeader>
            <TableHeader>License Expiry</TableHeader>
            <TableHeader>Phone</TableHeader>
            <TableHeader className="w-16">Safety Score</TableHeader>
            <TableHeader className="w-20">Status</TableHeader>
            <TableHeader className="w-16">Actions</TableHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.map(driver => (
            <TableRow
              key={driver.id}
              className={selectedIds.has(driver.id) ? 'bg-blue-50' : ''}
              onClick={() => toggleSelect(driver.id)}
            >
              <TableCell className="w-8">
                <Checkbox
                  checked={selectedIds.has(driver.id)}
                  onCheckedChange={checked => toggleSelect(driver.id)}
                  aria-label={`Select ${driver.driverName}`}
                />
              </TableCell>
              <TableCell className="font-medium">{driver.driverName}</TableCell>
              <TableCell>{driver.licenseNumber}</TableCell>
              <TableCell>{driver.licenseCategory}</TableCell>
              <TableCell>
                {new Date(driver.licenseExpiry).toLocaleDateString()}
                {/* Show warning if expiring soon */}
                {new Date(driver.licenseExpiry).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000 && (
                  <span className="ml-2 inline-block px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                    Expires Soon
                  </span>
                )}
              </TableCell>
              <TableCell>{driver.phone}</TableCell>
              <TableCell className="text-center">{driver.safetyScore}</TableCell>
              <TableCell className="text-center">{statusBadge(driver.status)}</TableCell>
              <TableCell className="flex justify-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(driver.id);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sq" aria-label="More actions">
                      <DotPicker className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={4}>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(driver.id);
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {drivers.length === 0 && (
            <TableRow>
              <TableHeader colSpan="8" className="py-8 text-center text-gray-500">
                No drivers found
              </TableHeader>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
