import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit2, Trash2, DotPicker } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

interface VehicleTableProps {
  vehicles: Vehicle[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Vehicle['status']) => void;
}

export const VehicleTable = ({
  vehicles,
  onEdit,
  onDelete,
  onStatusChange,
}: VehicleTableProps) => {
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

  const isAllSelected = vehicles.every(v => selectedIds.has(v.id));

  const selectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(vehicles.map(v => v.id)));
    }
  };

  const statusBadge = (status: Vehicle['status']) => {
    switch (status) {
      case 'Available':
        return <Badge variant="secondary">Available</Badge>;
      case 'On Trip':
        return <Badge variant="destructive">On Trip</Badge>;
      case 'In Shop':
        return <Badge variant="outline">In Shop</Badge>;
      case 'Retired':
        return <Badge variant="ghost">Retired</Badge>;
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
            {selectedIds.size} of {vehicles.length} selected
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
            <TableHeader>Registration Number</TableHeader>
            <TableHeader>Vehicle Name</TableHeader>
            <TableHeader>Model</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader className="w-24">Capacity</TableHeader>
            <TableHeader className="w-24">Odometer</TableHeader>
            <TableHeader className="w-24">Cost</TableHeader>
            <TableHeader className="w-24">Status</TableHeader>
            <TableHeader className="w-16">Actions</TableHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map(vehicle => (
            <TableRow
              key={vehicle.id}
              className={selectedIds.has(vehicle.id) ? 'bg-blue-50' : ''}
              onClick={() => toggleSelect(vehicle.id)}
            >
              <TableCell className="w-8">
                <Checkbox
                  checked={selectedIds.has(vehicle.id)}
                  onCheckedChange={checked => toggleSelect(vehicle.id)}
                  aria-label={`Select ${vehicle.vehicleName}`}
                />
              </TableCell>
              <TableCell className="font-medium">{vehicle.registrationNumber}</TableCell>
              <TableCell>{vehicle.vehicleName}</TableCell>
              <TableCell>{vehicle.vehicleModel}</TableCell>
              <TableCell>{vehicle.vehicleType}</TableCell>
              <TableCell className="text-right">{vehicle.maxLoadCapacity.toLocaleString()} kg</TableCell>
              <TableCell className="text-right">{vehicle.odometer.toLocaleString()} km</TableCell>
              <TableCell className="text-right">${vehicle.acquisitionCost.toLocaleString()}</TableCell>
              <TableCell className="text-center">{statusBadge(vehicle.status)}</TableCell>
              <TableCell className="flex justify-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(vehicle.id);
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
                        onDelete(vehicle.id);
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {vehicles.length === 0 && (
            <TableRow>
              <TableHeader colSpan="10" className="py-8 text-center text-gray-500">
                No vehicles found
              </TableHeader>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
