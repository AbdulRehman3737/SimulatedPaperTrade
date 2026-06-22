import axios from "axios";
import { Candle, CoinSymbol, MarketData } from "../types";

const BINANCE_BASE_URL = "https://api.binance.com/api/v3";
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

const BINANCE_PAIRS: Record<CoinSymbol, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
};

const COINGECKO_IDS: Record<CoinSymbol, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
};

const HTTP_TIMEOUT_MS = 10_000;
const CANDLE_INTERVAL = "1h";
const CANDLE_LIMIT = 300;
const PRICE_CACHE_TTL_MS = 10_000;
const HISTORY_CACHE_TTL_MS = 30_000;

function coinGeckoHeaders(): Record<string, string> {
  const apiKey = process.env.COINGECKO_API_KEY;
  return apiKey ? { "x-cg-demo-api-key": apiKey } : {};
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  return entry && entry.expiresAt > Date.now() ? entry.value : undefined;
}

function setCached<T>(key: string, value: T, ttlMs: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function assertSupportedSymbol(symbol: string): CoinSymbol {
  const upper = symbol.toUpperCase();
  if (upper in BINANCE_PAIRS) {
    return upper as CoinSymbol;
  }
  throw new Error(`Unsupported symbol "${symbol}". Supported: ${Object.keys(BINANCE_PAIRS).join(", ")}`);
}

export function getSupportedSymbols(): CoinSymbol[] {
  return Object.keys(BINANCE_PAIRS) as CoinSymbol[];
}

async function fetchPriceFromBinance(symbol: CoinSymbol): Promise<number> {
  const { data } = await axios.get<{ price: string }>(`${BINANCE_BASE_URL}/ticker/price`, {
    params: { symbol: BINANCE_PAIRS[symbol] },
    timeout: HTTP_TIMEOUT_MS,
  });
  return parseFloat(data.price);
}

async function fetchPriceFromCoinGecko(symbol: CoinSymbol): Promise<number> {
  const id = COINGECKO_IDS[symbol];
  const { data } = await axios.get<Record<string, { usd: number }>>(`${COINGECKO_BASE_URL}/simple/price`, {
    params: { ids: id, vs_currencies: "usd" },
    timeout: HTTP_TIMEOUT_MS,
    headers: coinGeckoHeaders(),
  });
  const price = data[id]?.usd;
  if (price === undefined) {
    throw new Error(`CoinGecko returned no price for "${symbol}"`);
  }
  return price;
}

/** Current spot price in USD. Tries Binance first, falls back to CoinGecko. */
export async function getCurrentPrice(symbol: string): Promise<number> {
  const coin = assertSupportedSymbol(symbol);
  const cacheKey = `price:${coin}`;
  const cached = getCached<number>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const price = await fetchPriceFromBinance(coin);
    setCached(cacheKey, price, PRICE_CACHE_TTL_MS);
    return price;
  } catch (binanceError) {
    try {
      const price = await fetchPriceFromCoinGecko(coin);
      setCached(cacheKey, price, PRICE_CACHE_TTL_MS);
      return price;
    } catch (coinGeckoError) {
      throw new Error(
        `Failed to fetch current price for ${coin} from Binance and CoinGecko: ` +
          `${(binanceError as Error).message}; ${(coinGeckoError as Error).message}`
      );
    }
  }
}

type BinanceKline = (string | number)[];

async function fetchHistoricalFromBinance(symbol: CoinSymbol): Promise<Candle[]> {
  const { data } = await axios.get<BinanceKline[]>(`${BINANCE_BASE_URL}/klines`, {
    params: { symbol: BINANCE_PAIRS[symbol], interval: CANDLE_INTERVAL, limit: CANDLE_LIMIT },
    timeout: HTTP_TIMEOUT_MS,
  });

  return data.map((kline) => ({
    timestamp: Number(kline[0]),
    open: parseFloat(String(kline[1])),
    high: parseFloat(String(kline[2])),
    low: parseFloat(String(kline[3])),
    close: parseFloat(String(kline[4])),
    volume: parseFloat(String(kline[5])),
  }));
}

async function fetchHistoricalFromCoinGecko(symbol: CoinSymbol): Promise<Candle[]> {
  const id = COINGECKO_IDS[symbol];
  const { data } = await axios.get<{
    prices: [number, number][];
    total_volumes: [number, number][];
  }>(`${COINGECKO_BASE_URL}/coins/${id}/market_chart`, {
    params: { vs_currency: "usd", days: 10 },
    timeout: HTTP_TIMEOUT_MS,
    headers: coinGeckoHeaders(),
  });

  // CoinGecko's market_chart endpoint has no true OHLC at this resolution,
  // so each candle is approximated from consecutive close prices.
  const { prices, total_volumes: volumes } = data;

  return prices.map(([timestamp, close], i) => {
    const open = i > 0 ? prices[i - 1][1] : close;
    return {
      timestamp,
      open,
      high: Math.max(open, close),
      low: Math.min(open, close),
      close,
      volume: volumes[i]?.[1] ?? 0,
    };
  });
}

/** Hourly OHLCV candles (most recent ~300 hours). Tries Binance first, falls back to CoinGecko. */
export async function getHistoricalData(symbol: string): Promise<MarketData> {
  const coin = assertSupportedSymbol(symbol);
  const cacheKey = `history:${coin}`;
  const cached = getCached<Candle[]>(cacheKey);

  let candles: Candle[];
  if (cached !== undefined) {
    candles = cached;
  } else {
    try {
      candles = await fetchHistoricalFromBinance(coin);
    } catch (binanceError) {
      try {
        candles = await fetchHistoricalFromCoinGecko(coin);
      } catch (coinGeckoError) {
        throw new Error(
          `Failed to fetch historical data for ${coin} from Binance and CoinGecko: ` +
            `${(binanceError as Error).message}; ${(coinGeckoError as Error).message}`
        );
      }
    }
    setCached(cacheKey, candles, HISTORY_CACHE_TTL_MS);
  }

  const price = candles.length > 0 ? candles[candles.length - 1].close : await getCurrentPrice(coin);
  return { symbol: coin, price, candles };
}
