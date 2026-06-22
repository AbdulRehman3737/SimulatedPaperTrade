import { Indicators, MarketData } from "../types";
import { round2 } from "../utils/numberUtils";

const RSI_PERIOD = 14;
const EMA_FAST_PERIOD = 12;
const EMA_SLOW_PERIOD = 26;
const MACD_SIGNAL_PERIOD = 9;
const VOLUME_LOOKBACK_PERIOD = 20;

/**
 * Exponential moving average computed over every point in `values`,
 * seeded with a simple average of the first `period` points (or all
 * available points if there are fewer than `period`).
 */
export function calculateEMASeries(values: number[], period: number): number[] {
  if (values.length === 0) return [];

  const seedLength = Math.min(period, values.length);
  const seed = values.slice(0, seedLength).reduce((sum, v) => sum + v, 0) / seedLength;
  const k = 2 / (period + 1);

  const series = new Array<number>(values.length);
  for (let i = 0; i < seedLength; i++) series[i] = seed;

  let ema = seed;
  for (let i = seedLength; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    series[i] = ema;
  }

  return series;
}

/** Latest EMA value for `period`. */
export function calculateEMA(values: number[], period: number): number {
  const series = calculateEMASeries(values, period);
  return series.length > 0 ? series[series.length - 1] : 0;
}

/**
 * Wilder's RSI. Returns 50 (neutral) when there isn't enough data to
 * form a meaningful reading.
 */
export function calculateRSI(closes: number[], period: number = RSI_PERIOD): number {
  const effectivePeriod = Math.min(period, closes.length - 1);
  if (effectivePeriod <= 0) return 50;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= effectivePeriod; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gainSum += change;
    else lossSum += Math.abs(change);
  }

  let avgGain = gainSum / effectivePeriod;
  let avgLoss = lossSum / effectivePeriod;

  for (let i = effectivePeriod + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (effectivePeriod - 1) + gain) / effectivePeriod;
    avgLoss = (avgLoss * (effectivePeriod - 1) + loss) / effectivePeriod;
  }

  if (avgLoss === 0) return 100;
  if (avgGain === 0) return 0;

  const relativeStrength = avgGain / avgLoss;
  return 100 - 100 / (1 + relativeStrength);
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
}

/** MACD line (EMA12 - EMA26), its signal line (EMA9 of the MACD line), and the histogram. */
export function calculateMACD(closes: number[]): MACDResult {
  const fastSeries = calculateEMASeries(closes, EMA_FAST_PERIOD);
  const slowSeries = calculateEMASeries(closes, EMA_SLOW_PERIOD);
  const macdSeries = fastSeries.map((fast, i) => fast - slowSeries[i]);
  const signalSeries = calculateEMASeries(macdSeries, MACD_SIGNAL_PERIOD);

  const macd = macdSeries[macdSeries.length - 1] ?? 0;
  const signal = signalSeries[signalSeries.length - 1] ?? 0;
  return { macd, signal, histogram: macd - signal };
}

/**
 * Percentage change of the latest volume versus the average volume of
 * the preceding `period` candles. Positive values mean volume is
 * increasing relative to its recent average.
 */
export function calculateVolumeChange(volumes: number[], period: number = VOLUME_LOOKBACK_PERIOD): number {
  if (volumes.length < 2) return 0;

  const current = volumes[volumes.length - 1];
  const windowStart = Math.max(0, volumes.length - 1 - period);
  const priorWindow = volumes.slice(windowStart, volumes.length - 1);
  if (priorWindow.length === 0) return 0;

  const avgPrior = priorWindow.reduce((sum, v) => sum + v, 0) / priorWindow.length;
  if (avgPrior === 0) return 0;

  return ((current - avgPrior) / avgPrior) * 100;
}

/** Computes the full indicator set for a symbol from its candle history. */
export function calculateIndicators(market: MarketData): Indicators {
  const closes = market.candles.map((c) => c.close);
  const volumes = market.candles.map((c) => c.volume);
  const { macd, signal, histogram } = calculateMACD(closes);

  return {
    symbol: market.symbol,
    price: market.price,
    rsi: round2(calculateRSI(closes)),
    ema50: round2(calculateEMA(closes, 50)),
    ema200: round2(calculateEMA(closes, 200)),
    macd: round2(macd),
    macdSignal: round2(signal),
    macdHistogram: round2(histogram),
    volumeChange: round2(calculateVolumeChange(volumes)),
  };
}
