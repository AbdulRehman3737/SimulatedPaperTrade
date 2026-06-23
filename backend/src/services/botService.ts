import { calculateIndicators } from "../trading/indicators";
import { decideTrade } from "../trading/tradingEngine";
import { CoinSymbol, Holding, Portfolio, Settings, Trade } from "../types";
import { round2 } from "../utils/numberUtils";
import { getHistoricalData } from "./marketService";

/** Profit/loss for closing `holding` at `exitPrice`. */
export function calculateProfit(
  holding: Holding,
  exitPrice: number
): { profit: number; profitPercent: number; proceeds: number } {
  const proceeds = holding.amount * exitPrice;
  const profit = proceeds - holding.investedValue;
  const profitPercent = holding.investedValue === 0 ? 0 : (profit / holding.investedValue) * 100;
  return { profit, profitPercent, proceeds };
}

/** Opens a simulated position, deducting cash and recording the trade. Mutates `portfolio`. */
export function buy(
  symbol: CoinSymbol,
  price: number,
  portfolio: Portfolio,
  settings: Settings,
  reason: string,
  appendTrade: (trade: Trade) => void
): void {
  const investment = Math.min(settings.investmentPerTrade, portfolio.cash);
  if (investment <= 0) {
    throw new Error(`Insufficient cash to buy ${symbol}`);
  }

  const timestamp = new Date().toISOString();

  portfolio.cash -= investment;
  portfolio.holdings.push({
    symbol,
    amount: investment / price,
    entryPrice: price,
    investedValue: investment,
    openedAt: timestamp,
  });

  appendTrade({
    id: 0,
    symbol,
    action: "BUY",
    price,
    amount: investment,
    reason,
    timestamp,
  });
}

/** Closes a simulated position, crediting cash and recording the trade. Mutates `portfolio`. */
export function sell(
  symbol: CoinSymbol,
  price: number,
  portfolio: Portfolio,
  reason: string,
  appendTrade: (trade: Trade) => void
): void {
  const holdingIndex = portfolio.holdings.findIndex((h) => h.symbol === symbol);
  if (holdingIndex === -1) {
    throw new Error(`No open position for ${symbol}`);
  }

  const holding = portfolio.holdings[holdingIndex];
  const { profit, profitPercent, proceeds } = calculateProfit(holding, price);

  portfolio.cash += proceeds;
  portfolio.totalProfit += profit;
  portfolio.holdings.splice(holdingIndex, 1);

  appendTrade({
    id: 0,
    symbol,
    action: "SELL",
    price,
    amount: proceeds,
    reason,
    entryPrice: holding.entryPrice,
    profit: round2(profit),
    profitPercent: round2(profitPercent),
    timestamp: new Date().toISOString(),
  });
}

async function processSymbol(
  symbol: CoinSymbol,
  portfolio: Portfolio,
  settings: Settings,
  appendTrade: (trade: Trade) => void
): Promise<void> {
  const marketData = await getHistoricalData(symbol);
  const indicators = calculateIndicators(marketData);
  const holding = portfolio.holdings.find((h) => h.symbol === symbol);

  const decision = decideTrade({ indicators, portfolio, settings, holding });

  if (decision.action === "BUY") {
    buy(symbol, indicators.price, portfolio, settings, decision.reason, appendTrade);
  } else if (decision.action === "SELL" && holding) {
    sell(symbol, indicators.price, portfolio, decision.reason, appendTrade);
  }
}

/** One full bot tick: fetch data, decide, trade for every watched symbol. Returns updated portfolio. */
export async function runBotCycle(
  settings: Settings,
  portfolio: Portfolio,
  watchedSymbols: CoinSymbol[],
  appendTrade?: (trade: Trade) => void
): Promise<Portfolio> {
  const trades: Trade[] = [];
  const recordTrade = appendTrade ?? ((trade: Trade) => { trades.push(trade); });

  for (const symbol of watchedSymbols) {
    try {
      await processSymbol(symbol, portfolio, settings, recordTrade);
    } catch (error) {
      console.error(`[bot] Failed to process ${symbol}: ${(error as Error).message}`);
    }
  }

  return portfolio;
}
