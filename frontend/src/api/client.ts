import axios from "axios";
import { BotInstance, BotStatus, CoinSymbol, MarketData, Portfolio, Settings, Trade } from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Instance management

export async function listInstances(): Promise<BotInstance[]> {
  const { data } = await api.get<BotInstance[]>("/instances");
  return data;
}

export async function createInstance(name: string, color: string): Promise<BotInstance> {
  const { data } = await api.post<BotInstance>("/instances", { name, color });
  return data;
}

export async function deleteInstance(id: string): Promise<void> {
  await api.delete(`/instances/${id}`);
}

export async function updateInstance(id: string, patch: Partial<Pick<BotInstance, "name" | "color">>): Promise<BotInstance> {
  const { data } = await api.patch<BotInstance>(`/instances/${id}`, patch);
  return data;
}

// Instance-scoped data

export async function getPortfolio(instanceId: string): Promise<Portfolio> {
  const { data } = await api.get<Portfolio>(`/instances/${instanceId}/portfolio`);
  return data;
}

export async function resetPortfolio(instanceId: string): Promise<Portfolio> {
  const { data } = await api.post<Portfolio>(`/instances/${instanceId}/portfolio/reset`);
  return data;
}

export async function getTrades(instanceId: string): Promise<Trade[]> {
  const { data } = await api.get<Trade[]>(`/instances/${instanceId}/trades`);
  return data;
}

export async function getSettings(instanceId: string): Promise<Settings> {
  const { data } = await api.get<Settings>(`/instances/${instanceId}/settings`);
  return data;
}

export async function updateSettings(instanceId: string, settings: Partial<Settings>): Promise<Settings> {
  const { data } = await api.post<Settings>(`/instances/${instanceId}/settings`, settings);
  return data;
}

export async function getBotStatus(instanceId: string): Promise<BotStatus> {
  const { data } = await api.get<BotStatus>(`/instances/${instanceId}/bot/status`);
  return data;
}

export async function startBot(instanceId: string, intervalMinutes?: number): Promise<BotStatus> {
  const { data } = await api.post<BotStatus>(`/instances/${instanceId}/bot/start`, { intervalMinutes });
  return data;
}

export async function stopBot(instanceId: string): Promise<BotStatus> {
  const { data } = await api.post<BotStatus>(`/instances/${instanceId}/bot/stop`);
  return data;
}

// Global (shared market data)

export async function getMarket(symbol: CoinSymbol): Promise<MarketData> {
  const { data } = await api.get<MarketData>(`/market/${symbol}`);
  return data;
}

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { error?: string } | undefined)?.error ?? error.message;
  }
  return error instanceof Error ? error.message : "Unknown error";
}
