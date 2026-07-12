import { doc, updateDoc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';

export interface Maintenance {
  id?: string;
  vehicleId: string;
  vehicleName: string;
  type: 'Oil Change' | 'Repair' | 'Inspection' | 'Tyres';
  description: string;
  scheduledDate: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'Scheduled' | 'In Progress' | 'Completed';
  estimatedCost: number;
  actualCost?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export const maintenanceService = {
  // Create a new maintenance record
  createMaintenance: async (data: Omit<Maintenance, 'id'>) => {
    const docRef = await addDoc(collection(db, 'maintenances'), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id: docRef.id, ...data };
  },

  // Get all maintenance records
  getAllMaintenances: async () => {
    const q = query(collection(db, 'maintenances'));
    const querySnapshot = await getDocs(q);
    const maintenances: Maintenance[] = [];
    querySnapshot.forEach((doc) => {
      maintenances.push({ id: doc.id, ...doc.data() } as Maintenance);
    });
    return maintenances;
  },

  // Get maintenance by ID
  getMaintenanceById: async (id: string) => {
    const docRef = doc(db, 'maintenances', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Maintenance;
    }
    return null;
  },

  // Update maintenance record
  updateMaintenance: async (id: string, data: Partial<Maintenance>) => {
    const docRef = doc(db, 'maintenances', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });
  },

  // Delete maintenance record
  deleteMaintenance: async (id: string) => {
    await deleteDoc(doc(db, 'maintenances', id));
  },

  // Start maintenance (change status to In Progress and set startedAt)
  startMaintenance: async (id: string) => {
    const maintenance = await maintenanceService.getMaintenanceById(id);
    if (!maintenance) throw new Error('Maintenance not found');
    
    // Update maintenance status
    await maintenanceService.updateMaintenance(id, {
      status: 'In Progress',
      startedAt: new Date(),
    });
    
    // Update vehicle status to 'In Shop'
    const vehicleRef = doc(db, 'vehicles', maintenance.vehicleId);
    const vehicleSnap = await getDoc(vehicleRef);
    if (vehicleSnap.exists()) {
      await updateDoc(vehicleRef, {
        status: 'In Shop',
        updatedAt: new Date(),
      });
    }
  },

  // Complete maintenance (change status to Completed and set completedAt)
  completeMaintenance: async (id: string) => {
    const maintenance = await maintenanceService.getMaintenanceById(id);
    if (!maintenance) throw new Error('Maintenance not found');
    
    // Update maintenance status
    await maintenanceService.updateMaintenance(id, {
      status: 'Completed',
      completedAt: new Date(),
    });
    
    // Update vehicle status back to 'Available' unless it's retired
    const vehicleRef = doc(db, 'vehicles', maintenance.vehicleId);
    const vehicleSnap = await getDoc(vehicleRef);
    if (vehicleSnap.exists()) {
      const vehicleData = vehicleSnap.data();
      // Only set to Available if not retired
      if (vehicleData.status !== 'Retired') {
        await updateDoc(vehicleRef, {
          status: 'Available',
          updatedAt: new Date(),
        });
      }
    }
  },

  // Get maintenances for a specific vehicle
  getMaintenancesByVehicleId: async (vehicleId: string) => {
    const q = query(collection(db, 'maintenances'), where('vehicleId', '==', vehicleId));
    const querySnapshot = await getDocs(q);
    const maintenances: Maintenance[] = [];
    querySnapshot.forEach((doc) => {
      maintenances.push({ id: doc.id, ...doc.data() } as Maintenance);
    });
    return maintenances;
  },
};
