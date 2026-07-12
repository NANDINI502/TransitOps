// Pie chart component for visualizing data distribution
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PieChartProps {
  data: { name: string; value: number }[];
  height?: number;
}

export const PieChart = ({ data, height = 250 }: PieChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[250px] flex items-center justify-center text-gray-400">
        No data available
      </div>
    );
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={120}
          labelLine={{ show: false }}
          label={{ show: false }}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

PieChart.displayName = 'PieChart';