import { EquityPoint, Trade } from "../types";

/**
 * Builds a step-wise equity curve from the trade log: starts at
 * `startingMoney` and steps up/down on every closed (SELL) trade's
 * realized profit. A final point pins the curve to `currentValue` (cash
 * + mark-to-market value of open positions) so the chart reflects
 * unrealized P/L too.
 */
export function buildEquityCurve(trades: Trade[], startingMoney: number, currentValue: number): EquityPoint[] {
  const closedTrades = trades
    .filter((trade): trade is Trade & { profit: number } => trade.action === "SELL" && trade.profit !== undefined)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const points: EquityPoint[] = [];
  let runningValue = startingMoney;

  if (closedTrades.length > 0) {
    points.push({ timestamp: closedTrades[0].timestamp, value: runningValue });
  }

  for (const trade of closedTrades) {
    runningValue += trade.profit;
    points.push({ timestamp: trade.timestamp, value: runningValue });
  }

  points.push({ timestamp: new Date().toISOString(), value: currentValue });
  return points;
}
