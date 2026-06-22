import { getTrades } from "../api/client";
import { ActionBadge } from "../components/ActionBadge";
import { ErrorMessage } from "../components/ErrorMessage";
import { Spinner } from "../components/Spinner";
import { usePolling } from "../hooks/usePolling";
import { formatCurrency, formatDateTime, formatPercent } from "../utils/format";

const POLL_INTERVAL_MS = 15_000;

export default function TradeHistory(): JSX.Element {
  const { data: trades, error, loading } = usePolling(getTrades, POLL_INTERVAL_MS);

  if (loading && !trades) return <Spinner />;
  if (error) return <ErrorMessage message={error} />;

  const sorted = [...(trades ?? [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-200">Trade History</h2>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500">No trades yet. The bot will record activity here once it starts trading.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Coin</th>
                <th className="py-2 font-medium">Action</th>
                <th className="py-2 font-medium">Entry Price</th>
                <th className="py-2 font-medium">Exit Price</th>
                <th className="py-2 font-medium">Profit/Loss</th>
                <th className="py-2 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((trade) => {
                const isSell = trade.action === "SELL";
                const profitTone = (trade.profit ?? 0) >= 0 ? "text-emerald-400" : "text-red-400";

                return (
                  <tr key={trade.id} className="border-t border-slate-800 align-top">
                    <td className="py-2 whitespace-nowrap text-slate-400">{formatDateTime(trade.timestamp)}</td>
                    <td className="py-2 font-medium text-slate-100">{trade.symbol}</td>
                    <td className="py-2">
                      <ActionBadge action={trade.action} />
                    </td>
                    <td className="py-2">{formatCurrency(isSell ? trade.entryPrice ?? 0 : trade.price)}</td>
                    <td className="py-2">{isSell ? formatCurrency(trade.price) : "—"}</td>
                    <td className={`py-2 ${isSell ? profitTone : ""}`}>
                      {isSell && trade.profit !== undefined
                        ? `${formatCurrency(trade.profit)} (${formatPercent(trade.profitPercent ?? 0)})`
                        : "—"}
                    </td>
                    <td className="py-2 max-w-xs text-slate-400">{trade.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
