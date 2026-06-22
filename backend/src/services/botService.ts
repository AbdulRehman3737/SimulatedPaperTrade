import { calculateIndicators } from "../trading/indicators";
import { decideTrade } from "../trading/tradingEngine";
import { BotStatus, CoinSymbol, Holding, Portfolio, Settings, Trade } from "../types";
import { round2 } from "../utils/numberUtils";
import { readJsonFile, writeJsonFile } from "./fileStorage";
import { getHistoricalData } from "./marketService";

const PORTFOLIO_FILE = "portfolio.json";
const TRADES_FILE = "trades.json";
const SETTINGS_FILE = "settings.json";

const WATCHED_SYMBOLS: CoinSymbol[] = ["BTC", "ETH", "SOL"];
const DEFAULT_INTERVAL_MINUTES = Number(process.env.BOT_INTERVAL_MINUTES) || 5;

const DEFAULT_PORTFOLIO: Portfolio = { cash: 100000, holdings: [], totalProfit: 0 };
const DEFAULT_SETTINGS: Settings = {
  startingMoney: 100000,
  takeProfit: 10,
  stopLoss: 5,
  rsiBuy: 30,
  rsiSell: 70,
  investmentPerTrade: 5000,
  minVolumeChange: 0,
};

interface BotState {
  intervalHandle: NodeJS.Timeout | null;
  intervalMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

const state: BotState = {
  intervalHandle: null,
  intervalMinutes: DEFAULT_INTERVAL_MINUTES,
  lastRunAt: null,
  nextRunAt: null,
};

export function loadPortfolio(): Portfolio {
  return readJsonFile<Portfolio>(PORTFOLIO_FILE, DEFAULT_PORTFOLIO);
}

export function savePortfolio(portfolio: Portfolio): void {
  writeJsonFile(PORTFOLIO_FILE, portfolio);
}

export function loadSettings(): Settings {
  return readJsonFile<Settings>(SETTINGS_FILE, DEFAULT_SETTINGS);
}

export function saveSettings(settings: Settings): void {
  writeJsonFile(SETTINGS_FILE, settings);
}

export function loadTrades(): Trade[] {
  return readJsonFile<Trade[]>(TRADES_FILE, []);
}

function appendTrade(trade: Omit<Trade, "id">): Trade {
  const trades = loadTrades();
  const id = trades.length > 0 ? Math.max(...trades.map((t) => t.id)) + 1 : 1;
  const fullTrade: Trade = { ...trade, id };
  trades.push(fullTrade);
  writeJsonFile(TRADES_FILE, trades);
  return fullTrade;
}

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
export function buy(symbol: CoinSymbol, price: number, portfolio: Portfolio, settings: Settings, reason: string): Trade {
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

  return appendTrade({
    symbol,
    action: "BUY",
    price,
    amount: investment,
    reason,
    timestamp,
  });
}

/** Closes a simulated position, crediting cash and recording the trade. Mutates `portfolio`. */
export function sell(symbol: CoinSymbol, price: number, portfolio: Portfolio, reason: string): Trade {
  const holdingIndex = portfolio.holdings.findIndex((h) => h.symbol === symbol);
  if (holdingIndex === -1) {
    throw new Error(`No open position for ${symbol}`);
  }

  const holding = portfolio.holdings[holdingIndex];
  const { profit, profitPercent, proceeds } = calculateProfit(holding, price);

  portfolio.cash += proceeds;
  portfolio.totalProfit += profit;
  portfolio.holdings.splice(holdingIndex, 1);

  return appendTrade({
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

async function processSymbol(symbol: CoinSymbol, portfolio: Portfolio, settings: Settings): Promise<void> {
  const marketData = await getHistoricalData(symbol);
  const indicators = calculateIndicators(marketData);
  const holding = portfolio.holdings.find((h) => h.symbol === symbol);

  const decision = decideTrade({ indicators, portfolio, settings, holding });

  if (decision.action === "BUY") {
    buy(symbol, indicators.price, portfolio, settings, decision.reason);
  } else if (decision.action === "SELL" && holding) {
    sell(symbol, indicators.price, portfolio, decision.reason);
  }
}

/** One full bot tick: fetch data, decide, trade, and persist for every watched symbol. */
export async function runBotCycle(): Promise<void> {
  const settings = loadSettings();
  const portfolio = loadPortfolio();

  for (const symbol of WATCHED_SYMBOLS) {
    try {
      await processSymbol(symbol, portfolio, settings);
    } catch (error) {
      console.error(`[bot] Failed to process ${symbol}: ${(error as Error).message}`);
    }
  }

  savePortfolio(portfolio);
  state.lastRunAt = new Date().toISOString();
}

export function startBot(intervalMinutes: number = DEFAULT_INTERVAL_MINUTES): BotStatus {
  if (state.intervalHandle) {
    return getBotStatus();
  }

  state.intervalMinutes = intervalMinutes;
  const intervalMs = intervalMinutes * 60 * 1000;

  const tick = (): void => {
    void runBotCycle().finally(() => {
      state.nextRunAt = new Date(Date.now() + intervalMs).toISOString();
    });
  };

  tick();
  state.intervalHandle = setInterval(tick, intervalMs);

  return getBotStatus();
}

export function stopBot(): BotStatus {
  if (state.intervalHandle) {
    clearInterval(state.intervalHandle);
    state.intervalHandle = null;
    state.nextRunAt = null;
  }

  return getBotStatus();
}

export function getBotStatus(): BotStatus {
  return {
    running: state.intervalHandle !== null,
    intervalMinutes: state.intervalMinutes,
    lastRunAt: state.lastRunAt,
    nextRunAt: state.nextRunAt,
    watchedSymbols: WATCHED_SYMBOLS,
  };
}
