import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const driverFormSchema = z.object({
  driverName: z.string().min(2, 'Driver name is required'),
  licenseNumber: z.string().min(2, 'License number is required'),
  licenseCategory: z.enum(['A', 'B', 'C', 'D', 'E']),
  licenseExpiry: z.date(),
  phone: z.string().min(10, 'Phone number is required'),
  safetyScore: z.number().min(0).max(100).default(0),
  status: z.enum(['Available', 'On Trip', 'Off Duty', 'Suspended']),
});

type DriverFormValues = z.infer<typeof driverFormSchema>;

interface DriverFormProps {
  onSubmit: (data: DriverFormValues) => Promise<void>;
  initialData?: DriverFormValues;
}

export const DriverForm = ({
  onSubmit,
  initialData,
}: DriverFormProps) => {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: initialData ?? {
      driverName: '',
      licenseNumber: '',
      licenseCategory: 'B',
      licenseExpiry: new Date(),
      phone: '',
      safetyScore: 0,
      status: 'Available',
    },
  });

  const handleSubmitWithLoading = async (data: DriverFormValues) => {
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
          <label htmlFor="driverName" className="text-sm font-medium text-gray-700">
            Driver Name *
          </label>
          <Input
            id="driverName"
            placeholder="Enter driver name"
            {...register('driverName')}
            required
            className={errors.driverName ? 'border-red-500' : undefined}
          />
          {errors.driverName && (
            <p className="text-sm text-red-600">{errors.driverName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="licenseNumber" className="text-sm font-medium text-gray-700">
            License Number *
          </label>
          <Input
            id="licenseNumber"
            placeholder="Enter license number"
            {...register('licenseNumber')}
            required
            className={errors.licenseNumber ? 'border-red-500' : undefined}
          />
          {errors.licenseNumber && (
            <p className="text-sm text-red-600">{errors.licenseNumber.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="licenseCategory" className="text-sm font-medium text-gray-700">
            License Category *
          </label>
          <Select
            id="licenseCategory"
            {...register('licenseCategory')}
            required
            className={errors.licenseCategory ? 'border-red-500' : undefined}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
              <SelectItem value="D">D</SelectItem>
              <SelectItem value="E">E</SelectItem>
            </SelectContent>
          </Select>
          {errors.licenseCategory && (
            <p className="text-sm text-red-600">{errors.licenseCategory.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="licenseExpiry" className="text-sm font-medium text-gray-700">
            License Expiry Date *
          </label>
          <input
            id="licenseExpiry"
            type="date"
            {...register('licenseExpiry')}
            required
            className={errors.licenseExpiry ? 'border-red-500' : undefined}
          />
          {errors.licenseExpiry && (
            <p className="text-sm text-red-600">{errors.licenseExpiry.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium text-gray-700">
            Phone Number *
          </label>
          <Input
            id="phone"
            placeholder="Enter phone number"
            {...register('phone')}
            required
            className={errors.phone ? 'border-red-500' : undefined}
          />
          {errors.phone && (
            <p className="text-sm text-red-600">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="safetyScore" className="text-sm font-medium text-gray-700">
            Safety Score (0-100)
          </label>
          <Input
            id="safetyScore"
            type="number"
            min="0"
            max="100"
            step="1"
            {...register('safetyScore')}
            className={errors.safetyScore ? 'border-red-500' : undefined}
          />
          {errors.safetyScore && (
            <p className="text-sm text-red-600">{errors.safetyScore.message}</p>
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
              <SelectItem value="Off Duty">Off Duty</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
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
          {loading ? 'Saving...' : 'Save Driver'}
        </Button>
      </div>
    </form>
  );
};
