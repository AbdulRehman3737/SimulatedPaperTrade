import { CoinSymbol, Holding, Trade } from "../types";

export function calculateHoldingsValue(holdings: Holding[], currentPrices: Partial<Record<CoinSymbol, number>>): number {
  return holdings.reduce((sum, holding) => sum + holding.amount * (currentPrices[holding.symbol] ?? holding.entryPrice), 0);
}

export function calculateWinRate(trades: Trade[]): number {
  const closedTrades = trades.filter((trade) => trade.action === "SELL" && trade.profit !== undefined);
  if (closedTrades.length === 0) return 0;

  const wins = closedTrades.filter((trade) => (trade.profit ?? 0) > 0).length;
  return (wins / closedTrades.length) * 100;
}
