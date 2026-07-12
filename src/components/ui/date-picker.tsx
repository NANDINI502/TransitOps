import * as React from "react";
import { Input } from "@/components/ui/input";

interface DatePickerProps {
  value: Date | string | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  min?: Date;
  max?: Date;
  disabled?: boolean;
  required?: boolean;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date",
  min,
  max,
  disabled = false,
  required = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    onChange(date);
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  return (
    <input
      type="date"
      value={formatValue(value)}
      onChange={handleChange}
      placeholder={placeholder}
      min={min ? formatDate(min) : undefined}
      max={max ? formatDate(max) : undefined}
      disabled={disabled}
      required={required}
      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
    />
  );
};

const formatValue = (value: Date | string | null): string => {
  if (!value) return "";
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  // Assume it's already a date string in YYYY-MM-DD format
  return value.split("T")[0];
};

export default DatePicker;