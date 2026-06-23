import useSWR from "swr";
import type { BotStatus, Portfolio, Settings, Trade } from "../types";
import * as api from "../api/client";

const POLL_INTERVAL_MS = 15_000;

type Key = [string, string];

function portfolioFetcher([, id]: Key): Promise<Portfolio> {
  return api.getPortfolio(id);
}

function tradesFetcher([, id]: Key): Promise<Trade[]> {
  return api.getTrades(id);
}

function settingsFetcher([, id]: Key): Promise<Settings> {
  return api.getSettings(id);
}

function botStatusFetcher([, id]: Key): Promise<BotStatus> {
  return api.getBotStatus(id);
}

function instanceKey(key: string, instanceId: string | null | undefined): Key | null {
  return instanceId ? [key, instanceId] : null;
}

export function usePortfolio(instanceId: string | null | undefined) {
  return useSWR(instanceKey("portfolio", instanceId), portfolioFetcher, {
    refreshInterval: POLL_INTERVAL_MS,
    revalidateOnFocus: true,
    errorRetryCount: 2,
  });
}

export function useTrades(instanceId: string | null | undefined) {
  return useSWR(instanceKey("trades", instanceId), tradesFetcher, {
    refreshInterval: POLL_INTERVAL_MS,
    revalidateOnFocus: true,
    errorRetryCount: 2,
  });
}

export function useSettings(instanceId: string | null | undefined) {
  return useSWR(instanceKey("settings", instanceId), settingsFetcher, {
    revalidateOnFocus: true,
    errorRetryCount: 2,
  });
}

export function useBotStatus(instanceId: string | null | undefined) {
  return useSWR(instanceKey("bot-status", instanceId), botStatusFetcher, {
    refreshInterval: POLL_INTERVAL_MS,
    revalidateOnFocus: true,
    errorRetryCount: 2,
  });
}
