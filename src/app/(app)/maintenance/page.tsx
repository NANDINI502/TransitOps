'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DotPicker, Trash2, Edit2, CheckCircle2, XCircle, Calendar, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, Description, Footer, Header, Title, Trigger } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { maintenanceService } from '@/services/maintenanceService';
import { toast } from '@/components/ui/use-toast';

const maintenanceTypes = ['Oil Change', 'Repair', 'Inspection', 'Tyres'] as const;
const maintenanceStatuses = ['Scheduled', 'In Progress', 'Completed'] as const;

const maintenanceFormSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  type: z.enum(maintenanceTypes),
  description: z.string().min(10, 'Description is required'),
  scheduledDate: z.date(),
  estimatedCost: z.number().min(0, 'Cost must be positive'),
  actualCost: z.number().min(0, 'Cost must be positive').optional(),
});

type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;

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

export default function MaintenancePage() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      vehicleId: '',
      type: maintenanceTypes[0],
      description: '',
      scheduledDate: new Date(),
      estimatedCost: 0,
    },
  });

  // Fetch maintenances from Firestore
  const loadMaintenances = async () => {
    setLoading(true);
    try {
      const maintenancesList = await maintenanceService.getAllMaintenances();
      // For demo purposes, we'll use vehicleId as vehicleName
      // In a real app, you'd fetch vehicle names from vehicles collection
      const maintenancesWithNames = maintenancesList.map(m => ({
        ...m,
        vehicleName: `Vehicle ${m.vehicleId}`, // Placeholder - replace with actual vehicle name lookup
      })) as Maintenance[];
      setMaintenances(maintenancesWithNames);
    } catch (error) {
      console.error('Error fetching maintenances:', error);
      toast({
        title: 'Error',
        description: 'Failed to load maintenance records',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Create maintenance
  const handleCreateSubmit = async (data: MaintenanceFormValues) => {
    try {
      await maintenanceService.createMaintenance({
        vehicleId: data.vehicleId,
        vehicleName: `Vehicle ${data.vehicleId}`, // Placeholder
        type: data.type,
        description: data.description,
        scheduledDate: data.scheduledDate,
        status: 'Scheduled',
        estimatedCost: data.estimatedCost,
        actualCost: data.actualCost,
      });

      toast({
        title: 'Success',
        description: 'Maintenance scheduled successfully',
      });
      reset();
      setOpenCreateDialog(false);
      await loadMaintenances();
    } catch (error: any) {
      console.error('Error creating maintenance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule maintenance',
        variant: 'destructive',
      });
    }
  };

  // Update maintenance
  const handleUpdateSubmit = async (data: MaintenanceFormValues) => {
    if (!selectedMaintenance) return;
    try {
      await maintenanceService.updateMaintenance(selectedMaintenance.id, {
        vehicleId: data.vehicleId,
        vehicleName: `Vehicle ${data.vehicleId}`, // Placeholder
        type: data.type,
        description: data.description,
        scheduledDate: data.scheduledDate,
        estimatedCost: data.estimatedCost,
        actualCost: data.actualCost,
      });

      toast({
        title: 'Success',
        description: 'Maintenance updated successfully',
      });
      setOpenEditDialog(false);
      await loadMaintenances();
    } catch (error: any) {
      console.error('Error updating maintenance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update maintenance',
        variant: 'destructive',
      });
    }
  };

  // Delete maintenance
  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await maintenanceService.deleteMaintenance(deletingId);
      toast({
        title: 'Success',
        description: 'Maintenance deleted successfully',
      });
      setDeletingId(null);
      await loadMaintenances();
    } catch (error: any) {
      console.error('Error deleting maintenance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete maintenance',
        variant: 'destructive',
      });
    }
  };

  // Mark maintenance as started
  const handleStartMaintenance = async (id: string) => {
    try {
      await maintenanceService.startMaintenance(id);
      toast({
        title: 'Success',
        description: 'Maintenance started successfully',
      });
      await loadMaintenances();
    } catch (error: any) {
      console.error('Error starting maintenance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start maintenance',
        variant: 'destructive',
      });
    }
  };

  // Mark maintenance as completed
  const handleCompleteMaintenance = async (id: string) => {
    try {
      await maintenanceService.completeMaintenance(id);
      toast({
        title: 'Success',
        description: 'Maintenance completed successfully',
      });
      await loadMaintenances();
    } catch (error: any) {
      console.error('Error completing maintenance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete maintenance',
        variant: 'destructive',
      });
    }
  };

  // Load initial data
  useEffect(() => {
    loadMaintenances();
  }, []);

  if (loading) {
    return <div className="flex h-[200px] items-center justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Maintenance Management</h1>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <Button variant="outline" onClick={() => setOpenCreateDialog(true)}>
            Schedule Maintenance
          </Button>
        </div>
      </div>

      {/* Create Maintenance Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <Trigger asChild>
          <div className="hidden">Open Dialog</div>
        </Trigger>
        <DialogContent className="w-96 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule New Maintenance</DialogTitle>
            <DialogDescription>
              Schedule maintenance for a vehicle
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleCreateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="vehicleId" className="text-sm font-medium text-gray-700">
                Vehicle ID
              </label>
              <Input
                id="vehicleId"
                placeholder="Enter vehicle ID"
                {...register('vehicleId')}
                required
                className={errors.vehicleId ? 'border-red-500' : undefined}
              />
              {errors.vehicleId && (
                <p className="text-sm text-red-600">{errors.vehicleId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium text-gray-700">
                Maintenance Type
              </label>
              <Select
                id="type"
                {...register('type')}
                required
                className={errors.type ? 'border-red-500' : undefined}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {maintenanceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                {...register('description')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              ></textarea>
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="scheduledDate" className="text-sm font-medium text-gray-700">
                Scheduled Date
              </label>
              <input
                id="scheduledDate"
                type="date"
                {...register('scheduledDate')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="estimatedCost" className="text-sm font-medium text-gray-700">
                Estimated Cost ($)
              </label>
              <input
                id="estimatedCost"
                type="number"
                min="0"
                step="0.01"
                {...register('estimatedCost')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setOpenCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Schedule Maintenance
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Maintenance Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <Trigger asChild>
          <div className="hidden">Open Dialog</div>
        </Trigger>
        <DialogContent className="w-96 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Maintenance</DialogTitle>
            <DialogDescription>
              Update maintenance details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleUpdateSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="vehicleId" className="text-sm font-medium text-gray-700">
                Vehicle ID
              </label>
              <Input
                id="vehicleId"
                placeholder="Enter vehicle ID"
                {...register('vehicleId')}
                defaultValue={selectedMaintenance?.vehicleId || ''}
                required
                className={errors.vehicleId ? 'border-red-500' : undefined}
              />
              {errors.vehicleId && (
                <p className="text-sm text-red-600">{errors.vehicleId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium text-gray-700">
                Maintenance Type
              </label>
              <Select
                id="type"
                {...register('type')}
                defaultValue={selectedMaintenance?.type || maintenanceTypes[0]}
                className={errors.type ? 'border-red-500' : undefined}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {maintenanceTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                {...register('description')}
                defaultValue={selectedMaintenance?.description || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              ></textarea>
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="scheduledDate" className="text-sm font-medium text-gray-700">
                Scheduled Date
              </label>
              <input
                id="scheduledDate"
                type="date"
                {...register('scheduledDate')}
                defaultValue={selectedMaintenance?.scheduledDate
                  ? selectedMaintenance.scheduledDate.toISOString().split('T')[0]
                  : ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="estimatedCost" className="text-sm font-medium text-gray-700">
                Estimated Cost ($)
              </label>
              <input
                id="estimatedCost"
                type="number"
                min="0"
                step="0.01"
                {...register('estimatedCost')}
                defaultValue={selectedMaintenance?.estimatedCost || 0}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="actualCost" className="text-sm font-medium text-gray-700">
                Actual Cost ($)
              </label>
              <input
                id="actualCost"
                type="number"
                min="0"
                step="0.01"
                {...register('actualCost')}
                defaultValue={selectedMaintenance?.actualCost || 0}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setOpenEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update Maintenance
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <Dialog open={!!deletingId} onOpenChange={(open) => {
        if (!open) setDeletingId(null);
      }}>
        <Trigger asChild>
          <div className="hidden">Open Dialog</div>
        </Trigger>
        <DialogContent className="w-96">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this maintenance record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogContent>
            <p className="mb-4">This will permanently remove the maintenance record.</p>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleDelete}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {maintenances.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No maintenance records found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <Th className="w-20">Vehicle</Th>
                  <Th>Type</Th>
                  <Th className="w-32">Scheduled Date</Th>
                  <Th className="w-24">Status</Th>
                  <Th className="w-20">Estimated Cost</Th>
                  <Th className="w-20">Actions</Th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenances.map((maintenance) => (
                  <TableRow key={maintenance.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{maintenance.vehicleName}</TableCell>
                    <TableCell>{maintenance.type}</TableCell>
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
                    <TableCell>${maintenance.estimatedCost.toFixed(2)}
      </TableCell>
                    <TableCell className="flex justify-center space-x-2">
                      {!maintenance.startedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartMaintenance(maintenance.id)}
                        >
                          Start
                        </Button>
                      )}
                      {maintenance.startedAt && !maintenance.completedAt && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCompleteMaintenance(maintenance.id)}
                          >
                            Complete
                          </Button>
                        </>
                      )}
                      {maintenance.completedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          Completed
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sq" aria-label="More actions">
                            <DotPicker className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={4}>
                          <DropdownMenuItem onClick={() => {
                            setSelectedMaintenance(maintenance);
                            setOpenEditDialog(true);
                          }}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setDeletingId(maintenance.id);
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
  );
}
