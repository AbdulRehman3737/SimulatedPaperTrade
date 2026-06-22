import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EquityPoint } from "../types";
import { formatCurrency } from "../utils/format";

interface PortfolioGrowthChartProps {
  data: EquityPoint[];
}

export function PortfolioGrowthChart({ data }: PortfolioGrowthChartProps): JSX.Element {
  if (data.length < 2) {
    return <p className="text-sm text-slate-500">Not enough trade history yet to chart portfolio growth.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(value: string) => new Date(value).toLocaleDateString()}
          stroke="#64748b"
          fontSize={12}
        />
        <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }}
          labelFormatter={(value: string) => new Date(value).toLocaleString()}
          formatter={(value: number) => [formatCurrency(value), "Equity"]}
        />
        <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
