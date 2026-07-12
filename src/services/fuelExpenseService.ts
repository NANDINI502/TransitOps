import { doc, updateDoc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';

export interface FuelExpense {
  id?: string;
  vehicleId: string;
  vehicleName: string;
  tripId?: string;
  type: 'Fuel' | 'Maintenance' | 'Toll' | 'Parking' | 'Insurance' | 'Other';
  amount: number;
  date: Date;
  description?: string;
  fuelLiters?: number;
  odometer?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export const fuelExpenseService = {
  // Create a new fuel/expense record
  createFuelExpense: async (data: Omit<FuelExpense, 'id'>) => {
    const docRef = await addDoc(collection(db, 'fuelExpenses'), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id: docRef.id, ...data };
  },

  // Get all fuel/expense records
  getAllFuelExpenses: async () => {
    const q = query(collection(db, 'fuelExpenses'));
    const querySnapshot = await getDocs(q);
    const expenses: FuelExpense[] = [];
    querySnapshot.forEach((doc) => {
      expenses.push({ id: doc.id, ...doc.data() } as FuelExpense);
    });
    return expenses;
  },

  // Get fuel/expense by ID
  getFuelExpenseById: async (id: string) => {
    const docRef = doc(db, 'fuelExpenses', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as FuelExpense;
    }
    return null;
  },

  // Update fuel/expense record
  updateFuelExpense: async (id: string, data: Partial<FuelExpense>) => {
    const docRef = doc(db, 'fuelExpenses', id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });
  },

  // Delete fuel/expense record
  deleteFuelExpense: async (id: string) => {
    await deleteDoc(doc(db, 'fuelExpenses', id));
  },

  // Get expenses for a specific vehicle
  getExpensesByVehicleId: async (vehicleId: string) => {
    const q = query(collection(db, 'fuelExpenses'), where('vehicleId', '==', vehicleId));
    const querySnapshot = await getDocs(q);
    const expenses: FuelExpense[] = [];
    querySnapshot.forEach((doc) => {
      expenses.push({ id: doc.id, ...doc.data() } as FuelExpense);
    });
    return expenses;
  },

  // Get expenses for a specific trip
  getExpensesByTripId: async (tripId: string) => {
    const q = query(collection(db, 'fuelExpenses'), where('tripId', '==', tripId));
    const querySnapshot = await getDocs(q);
    const expenses: FuelExpense[] = [];
    querySnapshot.forEach((doc) => {
      expenses.push({ id: doc.id, ...doc.data() } as FuelExpense);
    });
    return expenses;
  },

  // Get total fuel cost for a date range
  getTotalFuelCost: async (startDate: Date, endDate: Date) => {
    const q = query(
      collection(db, 'fuelExpenses'),
      where('type', '==', 'Fuel'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const querySnapshot = await getDocs(q);
    let total = 0;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      total += data.amount || 0;
    });
    return total;
  },

  // Get total maintenance cost for a date range
  getTotalMaintenanceCost: async (startDate: Date, endDate: Date) => {
    const q = query(
      collection(db, 'fuelExpenses'),
      where('type', '==', 'Maintenance'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    );
    const querySnapshot = await getDocs(q);
    let total = 0;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      total += data.amount || 0;
    });
    return total;
  }
};
