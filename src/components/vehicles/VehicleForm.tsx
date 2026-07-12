import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const vehicleFormSchema = z.object({
  registrationNumber: z.string().min(2, 'Registration number is required'),
  vehicleName: z.string().min(1, 'Vehicle name is required'),
  vehicleModel: z.string().min(1, 'Model is required'),
  vehicleType: z.enum(['Truck', 'Van', 'Bus', 'Trailer', 'Other']),
  maxLoadCapacity: z.number().min(1, 'Capacity must be positive'),
  odometer: z.number().min(0, 'Odometer cannot be negative'),
  acquisitionCost: z.number().min(0, 'Cost cannot be negative'),
  status: z.enum(['Available', 'On Trip', 'In Shop', 'Retired']),
});

type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

interface VehicleFormProps {
  onSubmit: (data: VehicleFormValues) => Promise<void>;
  initialData?: VehicleFormValues;
}

export const VehicleForm = ({
  onSubmit,
  initialData,
}: VehicleFormProps) => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: initialData ?? {
      registrationNumber: '',
      vehicleName: '',
      vehicleModel: '',
      vehicleType: 'Truck',
      maxLoadCapacity: 0,
      odometer: 0,
      acquisitionCost: 0,
      status: 'Available',
    },
  });

  const handleSubmitWithLoading = async (data: VehicleFormValues) => {
    setLoading(true);
    try {
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleSubmitWithLoading)} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="registrationNumber" className="text-sm font-medium text-gray-700">
            Registration Number *
          </label>
          <Input
            id="registrationNumber"
            placeholder="ABC-1234"
            {...register('registrationNumber')}
            required
            className={errors.registrationNumber ? 'border-red-500' : undefined}
          />
          {errors.registrationNumber && (
            <p className="text-sm text-red-600">{errors.registrationNumber.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="vehicleName" className="text-sm font-medium text-gray-700">
            Vehicle Name *
          </label>
          <Input
            id="vehicleName"
            placeholder="Enter vehicle name"
            {...register('vehicleName')}
            required
            className={errors.vehicleName ? 'border-red-500' : undefined}
          />
          {errors.vehicleName && (
            <p className="text-sm text-red-600">{errors.vehicleName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="vehicleModel" className="text-sm font-medium text-gray-700">
            Model *
          </label>
          <Input
            id="vehicleModel"
            placeholder="Enter model"
            {...register('vehicleModel')}
            required
            className={errors.vehicleModel ? 'border-red-500' : undefined}
          />
          {errors.vehicleModel && (
            <p className="text-sm text-red-600">{errors.vehicleModel.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="vehicleType" className="text-sm font-medium text-gray-700">
            Type *
          </label>
          <Select
            id="vehicleType"
            {...register('vehicleType')}
            required
            className={errors.vehicleType ? 'border-red-500' : undefined}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Truck">Truck</SelectItem>
              <SelectItem value="Van">Van</SelectItem>
              <SelectItem value="Bus">Bus</SelectItem>
              <SelectItem value="Trailer">Trailer</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.vehicleType && (
            <p className="text-sm text-red-600">{errors.vehicleType.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="maxLoadCapacity" className="text-sm font-medium text-gray-700">
            Max Load Capacity (kg) *
          </label>
          <Input
            id="maxLoadCapacity"
            type="number"
            min="0"
            step="0.01"
            {...register('maxLoadCapacity')}
            required
            className={errors.maxLoadCapacity ? 'border-red-500' : undefined}
          />
          {errors.maxLoadCapacity && (
            <p className="text-sm text-red-600">{errors.maxLoadCapacity.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="odometer" className="text-sm font-medium text-gray-700">
            Odometer (km) *
          </label>
          <Input
            id="odometer"
            type="number"
            min="0"
            step="1"
            {...register('odometer')}
            required
            className={errors.odometer ? 'border-red-500' : undefined}
          />
          {errors.odometer && (
            <p className="text-sm text-red-600">{errors.odometer.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="acquisitionCost" className="text-sm font-medium text-gray-700">
            Acquisition Cost ($) *
          </label>
          <Input
            id="acquisitionCost"
            type="number"
            min="0"
            step="0.01"
            {...register('acquisitionCost')}
            required
            className={errors.acquisitionCost ? 'border-red-500' : undefined}
          />
          {errors.acquisitionCost && (
            <p className="text-sm text-red-600">{errors.acquisitionCost.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium text-gray-700">
            Status *
          </label>
          <Select
            id="status"
            {...register('status')}
            required
            className={errors.status ? 'border-red-500' : undefined}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="On Trip">On Trip</SelectItem>
              <SelectItem value="In Shop">In Shop</SelectItem>
              <SelectItem value="Retired">Retired</SelectItem>
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={() => reset()} disabled={loading}>
          Reset
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Vehicle'}
        </Button>
      </div>
    </form>
  );
};
