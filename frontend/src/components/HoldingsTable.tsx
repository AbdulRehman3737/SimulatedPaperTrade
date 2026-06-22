import { CoinSymbol, Holding } from "../types";
import { formatCurrency, formatNumber, formatPercent } from "../utils/format";

interface HoldingsTableProps {
  holdings: Holding[];
  currentPrices: Partial<Record<CoinSymbol, number>>;
}

export function HoldingsTable({ holdings, currentPrices }: HoldingsTableProps): JSX.Element {
  if (holdings.length === 0) {
    return <p className="text-sm text-slate-500">No active positions.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-slate-400">
          <th className="py-2 font-medium">Coin</th>
          <th className="py-2 font-medium">Amount</th>
          <th className="py-2 font-medium">Entry Price</th>
          <th className="py-2 font-medium">Current Price</th>
          <th className="py-2 font-medium">Unrealized P/L</th>
        </tr>
      </thead>
      <tbody>
        {holdings.map((holding) => {
          const currentPrice = currentPrices[holding.symbol] ?? holding.entryPrice;
          const currentValue = holding.amount * currentPrice;
          const profit = currentValue - holding.investedValue;
          const profitPercent = holding.investedValue === 0 ? 0 : (profit / holding.investedValue) * 100;
          const tone = profit >= 0 ? "text-emerald-400" : "text-red-400";

          return (
            <tr key={holding.symbol} className="border-t border-slate-800">
              <td className="py-2 font-medium text-slate-100">{holding.symbol}</td>
              <td className="py-2">{formatNumber(holding.amount)}</td>
              <td className="py-2">{formatCurrency(holding.entryPrice)}</td>
              <td className="py-2">{formatCurrency(currentPrice)}</td>
              <td className={`py-2 ${tone}`}>
                {formatCurrency(profit)} ({formatPercent(profitPercent)})
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
