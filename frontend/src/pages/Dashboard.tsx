import { useState } from "react";
import { getBotStatus, getMarket, getPortfolio, getSettings, getTrades, startBot, stopBot } from "../api/client";
import { BotControl } from "../components/BotControl";
import { ErrorMessage } from "../components/ErrorMessage";
import { HoldingsTable } from "../components/HoldingsTable";
import { PortfolioGrowthChart } from "../components/PortfolioGrowthChart";
import { PriceChart } from "../components/PriceChart";
import { Spinner } from "../components/Spinner";
import { usePolling } from "../hooks/usePolling";
import { CoinSymbol, MarketData } from "../types";
import { buildEquityCurve } from "../utils/equityCurve";
import { formatCurrency, formatPercent } from "../utils/format";
import { calculateHoldingsValue, calculateWinRate } from "../utils/portfolioMetrics";
import { StatCard } from "../components/StatCard";

const SYMBOLS: CoinSymbol[] = ["BTC", "ETH", "SOL"];
const POLL_INTERVAL_MS = 15_000;

async function fetchAllMarketData(): Promise<Record<CoinSymbol, MarketData>> {
  const results = await Promise.all(SYMBOLS.map((symbol) => getMarket(symbol)));
  return SYMBOLS.reduce((acc, symbol, index) => {
    acc[symbol] = results[index];
    return acc;
  }, {} as Record<CoinSymbol, MarketData>);
}

export default function Dashboard(): JSX.Element {
  const [selectedSymbol, setSelectedSymbol] = useState<CoinSymbol>("BTC");
  const [botBusy, setBotBusy] = useState(false);

  const { data: portfolio, error: portfolioError } = usePolling(getPortfolio, POLL_INTERVAL_MS);
  const { data: trades, error: tradesError } = usePolling(getTrades, POLL_INTERVAL_MS);
  const { data: settings } = usePolling(getSettings, POLL_INTERVAL_MS);
  const { data: marketData, error: marketError } = usePolling(fetchAllMarketData, POLL_INTERVAL_MS);
  const { data: botStatus, refetch: refetchBotStatus } = usePolling(getBotStatus, POLL_INTERVAL_MS);

  const error = portfolioError || tradesError || marketError;

  const currentPrices: Partial<Record<CoinSymbol, number>> = {};
  if (marketData) {
    for (const symbol of SYMBOLS) {
      currentPrices[symbol] = marketData[symbol]?.price;
    }
  }

  const holdingsValue = portfolio ? calculateHoldingsValue(portfolio.holdings, currentPrices) : 0;
  const currentPortfolioValue = (portfolio?.cash ?? 0) + holdingsValue;
  const startingMoney = settings?.startingMoney ?? currentPortfolioValue;
  const totalProfitLoss = currentPortfolioValue - startingMoney;
  const totalProfitLossPercent = startingMoney === 0 ? 0 : (totalProfitLoss / startingMoney) * 100;
  const winRate = trades ? calculateWinRate(trades) : 0;
  const closedTradeCount = trades?.filter((trade) => trade.action === "SELL").length ?? 0;
  const equityCurve = trades && settings ? buildEquityCurve(trades, settings.startingMoney, currentPortfolioValue) : [];

  async function handleStart(): Promise<void> {
    setBotBusy(true);
    try {
      await startBot();
      await refetchBotStatus();
    } finally {
      setBotBusy(false);
    }
  }

  async function handleStop(): Promise<void> {
    setBotBusy(true);
    try {
      await stopBot();
      await refetchBotStatus();
    } finally {
      setBotBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <BotControl status={botStatus} onStart={handleStart} onStop={handleStop} busy={botBusy} />

      {error && <ErrorMessage message={error} />}

      {!portfolio ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Fake Balance (Cash)" value={formatCurrency(portfolio.cash)} />
            <StatCard label="Portfolio Value" value={formatCurrency(currentPortfolioValue)} />
            <StatCard
              label="Total Profit/Loss"
              value={`${formatCurrency(totalProfitLoss)} (${formatPercent(totalProfitLossPercent)})`}
              tone={totalProfitLoss >= 0 ? "positive" : "negative"}
            />
            <StatCard label="Win Rate" value={`${winRate.toFixed(1)}%`} sublabel={`${closedTradeCount} closed trades`} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-200">Portfolio Growth</h2>
              <PortfolioGrowthChart data={equityCurve} />
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-200">Price Chart</h2>
                <div className="flex gap-1">
                  {SYMBOLS.map((symbol) => (
                    <button
                      key={symbol}
                      onClick={() => setSelectedSymbol(symbol)}
                      className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                        selectedSymbol === symbol
                          ? "bg-emerald-700 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-slate-100"
                      }`}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </div>
              {marketData?.[selectedSymbol] ? (
                <PriceChart candles={marketData[selectedSymbol].candles} symbol={selectedSymbol} />
              ) : (
                <Spinner />
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-200">Active Positions</h2>
            <HoldingsTable holdings={portfolio.holdings} currentPrices={currentPrices} />
          </div>
        </>
      )}
    </div>
  );
}
