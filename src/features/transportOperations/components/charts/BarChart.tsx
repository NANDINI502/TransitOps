// Bar chart component for visualizing data trends
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface BarChartProps {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
}

export const BarChart = ({ data, height = 250, color = '#3b82f6' }: BarChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[250px] flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" tickLine={false} />
      <YAxis tickLine={false} />
      <Tooltip />
      <Legend />
      <RechartsBarChart>
        <Bar dataKey="value" fill={color} barSize={20} />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

BarChart.displayName = 'BarChart';