import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Candle, CoinSymbol } from "../types";
import { formatCurrency } from "../utils/format";

interface PriceChartProps {
  candles: Candle[];
  symbol: CoinSymbol;
}

export function PriceChart({ candles, symbol }: PriceChartProps): JSX.Element {
  const data = candles.map((candle) => ({ timestamp: candle.timestamp, price: candle.close }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(value: number) => new Date(value).toLocaleDateString()}
          stroke="#64748b"
          fontSize={12}
        />
        <YAxis domain={["auto", "auto"]} stroke="#64748b" fontSize={12} tickFormatter={(value: number) => formatCurrency(value)} />
        <Tooltip
          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }}
          labelFormatter={(value: number) => new Date(value).toLocaleString()}
          formatter={(value: number) => [formatCurrency(value), symbol]}
        />
        <Line type="monotone" dataKey="price" stroke="#60a5fa" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
