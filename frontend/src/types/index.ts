export type CoinSymbol = "BTC" | "ETH" | "SOL";

export type TradeAction = "BUY" | "SELL" | "HOLD";

export interface Holding {
  symbol: CoinSymbol;
  amount: number;
  entryPrice: number;
  investedValue: number;
  openedAt: string;
}

export interface Portfolio {
  cash: number;
  holdings: Holding[];
  totalProfit: number;
}

export interface Trade {
  id: number;
  symbol: CoinSymbol;
  action: "BUY" | "SELL";
  price: number;
  amount: number;
  reason: string;
  /** Set on SELL trades: the price the closed position was originally opened at. */
  entryPrice?: number;
  profit?: number;
  profitPercent?: number;
  timestamp: string;
}

export interface Settings {
  startingMoney: number;
  takeProfit: number;
  stopLoss: number;
  rsiBuy: number;
  rsiSell: number;
  investmentPerTrade: number;
  /** Minimum volume change (%) required for a BUY signal. Set to -999 to effectively disable. */
  minVolumeChange: number;
}

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicators {
  symbol: CoinSymbol;
  price: number;
  rsi: number;
  ema50: number;
  ema200: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  volumeChange: number;
}

export interface MarketData {
  symbol: CoinSymbol;
  price: number;
  candles: Candle[];
  indicators: Indicators;
}

export interface BotStatus {
  running: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  watchedSymbols: CoinSymbol[];
}

export interface EquityPoint {
  timestamp: string;
  value: number;
}
