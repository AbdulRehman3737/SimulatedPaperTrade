import { Holding, Indicators, Portfolio, Settings, TradeDecision } from "../types";

export interface StrategyContext {
  indicators: Indicators;
  portfolio: Portfolio;
  settings: Settings;
  /** The open position for this symbol, if any. */
  holding?: Holding;
}

/** A strategy inspects the context and either returns a decision or `null` to defer to the next strategy. */
export type Strategy = (context: StrategyContext) => TradeDecision | null;

/**
 * BUY when RSI signals oversold, the trend is bullish (EMA50 > EMA200),
 * and volume is increasing versus its recent average. Only fires when
 * there is no existing position in the symbol.
 */
export const rsiTrendVolumeBuyStrategy: Strategy = ({ indicators, settings, holding }) => {
  if (holding) return null;

  const { rsi, ema50, ema200, volumeChange } = indicators;
  const rsiOversold = rsi < settings.rsiBuy;
  const trendBullish = ema50 > ema200;
  const volumeIncreasing = volumeChange > 0;

  if (rsiOversold && trendBullish && volumeIncreasing) {
    return {
      action: "BUY",
      reason:
        `RSI ${rsi} < buy threshold ${settings.rsiBuy}, EMA50 (${ema50}) > EMA200 (${ema200}), ` +
        `volume up ${volumeChange}%`,
    };
  }

  return null;
};

/**
 * SELL an open position once it has hit the configured take-profit
 * percentage, or cut losses once it has hit the configured stop-loss
 * percentage.
 */
export const takeProfitStopLossStrategy: Strategy = ({ indicators, settings, holding }) => {
  if (!holding) return null;

  const profitPercent = calculateProfitPercent(holding.entryPrice, indicators.price);

  if (profitPercent >= settings.takeProfit) {
    return {
      action: "SELL",
      reason: `Take profit hit: +${profitPercent.toFixed(2)}% >= ${settings.takeProfit}%`,
    };
  }

  if (profitPercent <= -settings.stopLoss) {
    return {
      action: "SELL",
      reason: `Stop loss hit: ${profitPercent.toFixed(2)}% <= -${settings.stopLoss}%`,
    };
  }

  return null;
};

/** SELL an open position once RSI signals overbought. */
export const rsiOverboughtSellStrategy: Strategy = ({ indicators, settings, holding }) => {
  if (!holding) return null;

  if (indicators.rsi > settings.rsiSell) {
    return {
      action: "SELL",
      reason: `RSI ${indicators.rsi} > sell threshold ${settings.rsiSell}`,
    };
  }

  return null;
};

// Sell strategies run first (manage existing risk before considering new entries).
const sellStrategies: Strategy[] = [takeProfitStopLossStrategy, rsiOverboughtSellStrategy];
const buyStrategies: Strategy[] = [rsiTrendVolumeBuyStrategy];

/** Registers an additional SELL strategy, evaluated after the existing ones. */
export function addSellStrategy(strategy: Strategy): void {
  sellStrategies.push(strategy);
}

/** Registers an additional BUY strategy, evaluated after the existing ones. */
export function addBuyStrategy(strategy: Strategy): void {
  buyStrategies.push(strategy);
}

/** Runs every registered strategy in order and returns the first decision, or HOLD if none fire. */
export function decideTrade(context: StrategyContext): TradeDecision {
  for (const strategy of sellStrategies) {
    const decision = strategy(context);
    if (decision) return decision;
  }

  for (const strategy of buyStrategies) {
    const decision = strategy(context);
    if (decision) return decision;
  }

  return { action: "HOLD", reason: "No strategy conditions met" };
}

export function calculateProfitPercent(entryPrice: number, currentPrice: number): number {
  if (entryPrice === 0) return 0;
  return ((currentPrice - entryPrice) / entryPrice) * 100;
}
