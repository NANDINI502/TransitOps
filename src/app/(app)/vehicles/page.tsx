import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VehicleForm } from '@/components/vehicles/VehicleForm';
import { VehicleTable } from '@/components/vehicles/VehicleTable';
import { Dialog, DialogContent, Description, Footer, Header, Title, Trigger } from '@/components/ui/dialog';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch vehicles from Firestore
  const loadVehicles = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'vehicles'), orderBy('vehicleName'));
      const querySnapshot = await getDocs(q);
      const list: any[] = [];
      querySnapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setVehicles(list);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load vehicles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Create vehicle
  const handleCreate = async (data: any) => {
    try {
      await addDoc(collection(db, 'vehicles'), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      toast({
        title: 'Success',
        description: 'Vehicle added successfully',
      });
      setOpenCreateDialog(false);
      await loadVehicles();
    } catch (error: any) {
      console.error('Error creating vehicle:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add vehicle',
        variant: 'destructive',
      });
    }
  };

  // Update vehicle
  const handleUpdate = async (data: any) => {
    if (!selectedVehicle) return;
    try {
      const vehicleRef = doc(db, 'vehicles', selectedVehicle.id);
      await updateDoc(vehicleRef, {
        ...data,
        updatedAt: new Date(),
      });
      toast({
        title: 'Success',
        description: 'Vehicle updated successfully',
      });
      setOpenEditDialog(false);
      await loadVehicles();
    } catch (error: any) {
      console.error('Error updating vehicle:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update vehicle',
        variant: 'destructive',
      });
    }
  };

  // Delete vehicle
  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'vehicles', deletingId));
      toast({
        title: 'Success',
        description: 'Vehicle deleted successfully',
      });
      setDeletingId(null);
      await loadVehicles();
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete vehicle',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Vehicle Management</h1>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <Button variant="outline" onClick={() => setOpenCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* Create Vehicle Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <Trigger asChild>
          <div className="hidden">Open Dialog</div>
        </Trigger>
        <DialogContent className="w-96 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
            <DialogDescription>
              Enter vehicle details
            </DialogDescription>
          </DialogHeader>
          <VehicleForm onSubmit={handleCreate} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenCreateDialog(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Vehicle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Vehicle Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <Trigger asChild>
          <div className="hidden">Open Dialog</div>
        </Trigger>
        <DialogContent className="w-96 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>
              Update vehicle details
            </DialogDescription>
          </DialogHeader>
          <VehicleForm onSubmit={handleUpdate} initialData={selectedVehicle} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenEditDialog(false)}>
              Cancel
            </Button>
            <Button type="submit">Update Vehicle</Button>
          </DialogFooter>
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
              Are you sure you want to delete this vehicle? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogContent>
            <p className="mb-4">This will permanently remove the vehicle.</p>
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

      {/* Vehicles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicle List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-[200px] items-center justify-center">
              Loading vehicles...
            </div>
          ) : (
            <VehicleTable
              vehicles={vehicles}
              onEdit={(id) => {
                const vehicle = vehicles.find(v => v.id === id);
                if (vehicle) {
                  setSelectedVehicle(vehicle);
                  setOpenEditDialog(true);
                }
              }}
              onDelete={(id) => {
                setDeletingId(id);
              }}
              onStatusChange={(id, status) => {
                // We'll implement status change if needed
                console.log(`Change status of ${id} to ${status}`);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
