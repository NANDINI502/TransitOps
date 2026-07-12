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
import { DotPicker, Trash2, Edit2, CheckCircle2, XCircle, Calendar, DollarSign, Fuel, CreditCard, Truck, MapPin } from 'lucide-react';
import { Dialog, DialogContent, Description, Footer, Header, Title, Trigger } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { db } from '@/firebase/config';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { toast } from '@/components/ui/use-toast';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const expenseTypes = ['Fuel', 'Maintenance', 'Toll', 'Parking', 'Insurance', 'Other'] as const;

const fuelExpenseSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  tripId: z.string().optional(), // Optional trip association
  type: z.enum(expenseTypes),
  amount: z.number().min(0.01, 'Amount must be positive'),
  date: z.date(),
  description: z.string().optional(),
  // Fuel-specific fields
  fuelLiters: z.number().min(0, 'Liters must be positive or zero').optional(),
  odometer: z.number().min(0, 'Odometer must be positive or zero').optional(),
});

type FuelExpenseFormValues = z.infer<typeof fuelExpenseSchema>;

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

export default function FuelExpensePage() {
  const [expenses, setExpenses] = useState<FuelExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<FuelExpense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FuelExpenseFormValues>({
    resolver: zodResolver(fuelExpenseSchema),
    defaultValues: {
      vehicleId: '',
      tripId: '',
      type: expenseTypes[0],
      amount: 0,
      date: new Date(),
    },
  });

  // Fetch expenses from Firestore
  const loadExpenses = async () => {
    setLoading(true);
    try {
      const expensesCol = collection(db, 'fuelExpenses');
      const q = query(expensesCol);
      const querySnapshot = await getDocs(q);
      const expensesList: FuelExpense[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        expensesList.push({
          id: doc.id,
          vehicleId: data.vehicleId,
          vehicleName: `Vehicle ${data.vehicleId}`, // Placeholder
          tripId: data.tripId,
          type: data.type,
          amount: data.amount,
          date: data.date?.toDate() || new Date(),
          description: data.description,
          fuelLiters: data.fuelLiters,
          odometer: data.odometer,
        });
      });
      setExpenses(expensesList);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast({
        title: 'Error',
        description: 'Failed to load expenses',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Create expense
  const handleCreateSubmit = async (data: FuelExpenseFormValues) => {
    try {
      const docRef = await addDoc(collection(db, 'fuelExpenses'), {
        vehicleId: data.vehicleId,
        tripId: data.tripId || null,
        type: data.type,
        amount: data.amount,
        date: data.date,
        description: data.description || null,
        fuelLiters: data.fuelLiters || null,
        odometer: data.odometer || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      toast({
        title: 'Success',
        description: 'Expense recorded successfully',
      });
      reset();
      setOpenCreateDialog(false);
      await loadExpenses();
    } catch (error: any) {
      console.error('Error creating expense:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to record expense',
        variant: 'destructive',
      });
    }
  };

  // Update expense
  const handleUpdateSubmit = async (data: FuelExpenseFormValues) => {
    if (!selectedExpense) return;
    try {
      const expenseRef = doc(db, 'fuelExpenses', selectedExpense.id);
      await updateDoc(expenseRef, {
        vehicleId: data.vehicleId,
        tripId: data.tripId || null,
        type: data.type,
        amount: data.amount,
        date: data.date,
        description: data.description || null,
        fuelLiters: data.fuelLiters || null,
        odometer: data.odometer || null,
        updatedAt: new Date(),
      });

      toast({
        title: 'Success',
        description: 'Expense updated successfully',
      });
      setOpenEditDialog(false);
      await loadExpenses();
    } catch (error: any) {
      console.error('Error updating expense:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update expense',
        variant: 'destructive',
      });
    }
  };

  // Delete expense
  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'fuelExpenses', deletingId));
      toast({
        title: 'Success',
        description: 'Expense deleted successfully',
      });
      setDeletingId(null);
      await loadExpenses();
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete expense',
        variant: 'destructive',
      });
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (expenses.length === 0) {
      toast({
        title: 'Warning',
        description: 'No data to export',
      });
      return;
    }

    const headers = [
      'Date',
      'Vehicle ID',
      'Type',
      'Amount ($)',
      'Fuel (Liters)',
      'Odometer',
      'Description',
    ];

    const csvRows = [];
    csvRows.push(headers.join(','));

    expenses.forEach((expense) => {
      const row = [
        expense.date.toLocaleDateString(),
        expense.vehicleId,
        expense.type,
        expense.amount.toFixed(2),
        expense.fuelLiters !== undefined ? expense.fuelLiters.toFixed(2) : '',
        expense.odometer !== undefined ? expense.odometer.toString() : '',
        `"${(expense.description || '').replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fuel_expenses_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF
  const exportToPDF = () => {
    if (expenses.length === 0) {
      toast({
        title: 'Warning',
        description: 'No data to export',
      });
      return;
    }

    const doc = new jsPDF();
    const head = [['Date', 'Vehicle ID', 'Type', 'Amount ($)', 'Fuel (L)', 'Odometer', 'Description']];
    const body = expenses.map((expense) => [
      expense.date.toLocaleDateString(),
      expense.vehicleId,
      expense.type,
      `$${expense.amount.toFixed(2)}`,
      expense.fuelLiters !== undefined ? `${expense.fuelLiters.toFixed(2)} L` : 'N/A',
      expense.odometer !== undefined ? expense.odometer.toString() : 'N/A',
      expense.description || '',
    ]);

    (doc as any).autoTable({
      head,
      body,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      margin: { top: 20 },
    });

    doc.save(`fuel_expenses_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Load initial data
  useEffect(() => {
    loadExpenses();
  }, []);

  if (loading) {
    return <div className="flex h-[200px] items-center justify-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Fuel & Expense Management</h1>
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <Button variant="outline" onClick={() => setOpenCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
          <Button 
            variant="outline"
            onClick={exportToCSV}
          >
            <Download className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            variant="outline"
            onClick={exportToPDF}
          >
            <FileText className="mr-1 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Create Expense Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <Trigger asChild>
          <div className="hidden">Open Dialog</div>
        </Trigger>
        <DialogContent className="w-96 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>
              Record a fuel or expense entry
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
              <label htmlFor="tripId" className="text-sm font-medium text-gray-700">
                Trip ID (Optional)
              </label>
              <Input
                id="tripId"
                placeholder="Enter trip ID if applicable"
                {...register('tripId')}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium text-gray-700">
                Expense Type
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
                  {expenseTypes.map((type) => (
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
              <label htmlFor="amount" className="text-sm font-medium text-gray-700">
                Amount ($)
              </label>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                {...register('amount')}
                required
                className={errors.amount ? 'border-red-500' : undefined}
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                id="date"
                type="date"
                {...register('date')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={2}
                {...register('description')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              ></textarea>
            </div>

            {/* Fuel-specific fields */}
            {register('type').value === 'Fuel' && (
              <>
                <div className="space-y-2">
                  <label htmlFor="fuelLiters" className="text-sm font-medium text-gray-700">
                    Fuel Liters
                  </label>
                  <Input
                    id="fuelLiters"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('fuelLiters')}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="odometer" className="text-sm font-medium text-gray-700">
                    Odometer (km)
                  </label>
                  <Input
                    id="odometer"
                    type="number"
                    min="0"
                    step="1"
                    {...register('odometer')}
                  />
                </div>
              </>
            }

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setOpenCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Add Expense
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <Trigger asChild>
          <div className="hidden">Open Dialog</div>
        </Trigger>
        <DialogContent className="w-96 sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update expense details
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
                defaultValue={selectedExpense?.vehicleId || ''}
                required
                className={errors.vehicleId ? 'border-red-500' : undefined}
              />
              {errors.vehicleId && (
                <p className="text-sm text-red-600">{errors.vehicleId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="tripId" className="text-sm font-medium text-gray-700">
                Trip ID (Optional)
              </label>
              <Input
                id="tripId"
                placeholder="Enter trip ID if applicable"
                {...register('tripId')}
                defaultValue={selectedExpense?.tripId || ''}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium text-gray-700">
                Expense Type
              </label>
              <Select
                id="type"
                {...register('type')}
                defaultValue={selectedExpense?.type || expenseTypes[0]}
                className={errors.type ? 'border-red-500' : undefined}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {expenseTypes.map((type) => (
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
              <label htmlFor="amount" className="text-sm font-medium text-gray-700">
                Amount ($)
              </label>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                {...register('amount')}
                defaultValue={selectedExpense?.amount || 0}
                required
                className={errors.amount ? 'border-red-500' : undefined}
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                id="date"
                type="date"
                {...register('date')}
                defaultValue={selectedExpense?.date
                  ? selectedExpense.date.toISOString().split('T')[0]
                  : ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={2}
                {...register('description')}
                defaultValue={selectedExpense?.description || ''}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              ></textarea>
            </div>

            {/* Fuel-specific fields for edit */}
            {(selectedExpense?.type === 'Fuel' || register('type').value === 'Fuel') && (
              <>
                <div className="space-y-2">
                  <label htmlFor="fuelLiters" className="text-sm font-medium text-gray-700">
                    Fuel Liters
                  </label>
                  <Input
                    id="fuelLiters"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('fuelLiters')}
                    defaultValue={selectedExpense?.fuelLiters || 0}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="odometer" className="text-sm font-medium text-gray-700">
                    Odometer (km)
                  </label>
                  <Input
                    id="odometer"
                    type="number"
                    min="0"
                    step="1"
                    {...register('odometer')}
                    defaultValue={selectedExpense?.odometer || 0}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => setOpenEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Update Expense
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
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogContent>
            <p className="mb-4">This will permanently remove the expense record.</p>
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

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No expense records found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <Th>Date</Th>
                  <Th>Vehicle ID</Th>
                  <Th>Type</Th>
                  <Th className="w-20">Amount</Th>
                  <Th className="w-20">Fuel (L)</Th>
                  <Th className="w-20">Odometer</Th>
                  <Th>Description</Th>
                  <Th className="w-16">Actions</Th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-gray-50">
                    <TableCell>
                      {new Date(expense.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">{expense.vehicleId}</TableCell>
                    <TableCell>{expense.type}</TableCell>
                    <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      {expense.fuelLiters !== undefined ? `${expense.fuelLiters.toFixed(2)} L` : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {expense.odometer !== undefined ? expense.odometer.toString() : '-'}
                    </TableCell>
                    <TableCell>{expense.description || '-'}</TableCell>
                    <TableCell className="flex justify-center space-x-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sq" aria-label="More actions">
                            <DotPicker className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={4}>
                          <DropdownMenuItem onClick={() => {
                            setSelectedExpense(expense);
                            setOpenEditDialog(true);
                          }}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setDeletingId(expense.id);
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
