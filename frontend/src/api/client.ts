import axios from "axios";
import { BotStatus, CoinSymbol, MarketData, Portfolio, Settings, Trade } from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

export async function getPortfolio(): Promise<Portfolio> {
  const { data } = await api.get<Portfolio>("/portfolio");
  return data;
}

export async function resetPortfolio(): Promise<Portfolio> {
  const { data } = await api.post<Portfolio>("/portfolio/reset");
  return data;
}

export async function getTrades(): Promise<Trade[]> {
  const { data } = await api.get<Trade[]>("/trades");
  return data;
}

export async function getMarket(symbol: CoinSymbol): Promise<MarketData> {
  const { data } = await api.get<MarketData>(`/market/${symbol}`);
  return data;
}

export async function getSettings(): Promise<Settings> {
  const { data } = await api.get<Settings>("/settings");
  return data;
}

export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  const { data } = await api.post<Settings>("/settings", settings);
  return data;
}

export async function getBotStatus(): Promise<BotStatus> {
  const { data } = await api.get<BotStatus>("/bot/status");
  return data;
}

export async function startBot(intervalMinutes?: number): Promise<BotStatus> {
  const { data } = await api.post<BotStatus>("/bot/start", { intervalMinutes });
  return data;
}

export async function stopBot(): Promise<BotStatus> {
  const { data } = await api.post<BotStatus>("/bot/stop");
  return data;
}

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { error?: string } | undefined)?.error ?? error.message;
  }
  return error instanceof Error ? error.message : "Unknown error";
}
