import { BotInstance, BotStatus, CoinSymbol, Portfolio, Settings, Trade } from "../types";
import { runBotCycle } from "./botService";
import { readJsonFile, writeJsonFile } from "./fileStorage";

const INSTANCES_FILE = "instances.json";

const WATCHED_SYMBOLS: CoinSymbol[] = ["BTC", "ETH", "SOL"];
const DEFAULT_INTERVAL_MINUTES = Number(process.env.BOT_INTERVAL_MINUTES) || 5;

const DEFAULT_PORTFOLIO: Portfolio = { cash: 100000, holdings: [], totalProfit: 0 };
const DEFAULT_SETTINGS: Settings = {
  startingMoney: 100000,
  takeProfit: 10,
  stopLoss: 5,
  rsiBuy: 60,
  rsiSell: 70,
  investmentPerTrade: 5000,
  minVolumeChange: -999,
};

interface BotInstanceState {
  instance: BotInstance;
  intervalHandle: NodeJS.Timeout | null;
  intervalMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadInstances(): BotInstance[] {
  return readJsonFile<BotInstance[]>(INSTANCES_FILE, []);
}

function saveInstances(instances: BotInstance[]): void {
  writeJsonFile(INSTANCES_FILE, instances);
}

export class BotManager {
  private instances: Map<string, BotInstanceState> = new Map();

  private static readonly DEFAULT_INSTANCES: { name: string; color: string; settings: Partial<Settings> }[] = [
    {
      name: "Quick Profit",
      color: "#10b981",
      settings: { takeProfit: 0.3, stopLoss: 0.3, rsiBuy: 60, rsiSell: 65, investmentPerTrade: 2000, startingMoney: 50000 },
    },
    {
      name: "Swing Trader",
      color: "#3b82f6",
      settings: { takeProfit: 3, stopLoss: 1.5, rsiBuy: 50, rsiSell: 70, investmentPerTrade: 3000, startingMoney: 50000 },
    },
    {
      name: "Scalper",
      color: "#f59e0b",
      settings: { takeProfit: 0.15, stopLoss: 0.15, rsiBuy: 55, rsiSell: 60, investmentPerTrade: 1000, startingMoney: 50000 },
    },
  ];

  constructor() {
    const registry = loadInstances();

    if (registry.length === 0) {
      for (const def of BotManager.DEFAULT_INSTANCES) {
        const instance: BotInstance = {
          id: generateId(),
          name: def.name,
          color: def.color,
          createdAt: new Date().toISOString(),
        };
        registry.push(instance);

        const portfolio: Portfolio = { cash: def.settings.startingMoney ?? DEFAULT_SETTINGS.startingMoney, holdings: [], totalProfit: 0 };
        const settings: Settings = { ...DEFAULT_SETTINGS, ...def.settings };
        writeJsonFile("portfolio.json", portfolio, instance.id);
        writeJsonFile("settings.json", settings, instance.id);
        writeJsonFile("trades.json", [], instance.id);
      }
      saveInstances(registry);
    }

    for (const instance of registry) {
      this.instances.set(instance.id, {
        instance,
        intervalHandle: null,
        intervalMinutes: DEFAULT_INTERVAL_MINUTES,
        lastRunAt: null,
        nextRunAt: null,
      });
    }
  }

  listInstances(): BotInstance[] {
    return Array.from(this.instances.values()).map((s) => s.instance);
  }

  getInstance(id: string): BotInstance {
    const state = this.instances.get(id);
    if (!state) throw new Error(`Bot instance "${id}" not found`);
    return state.instance;
  }

  createInstance(name: string, color: string): BotInstance {
    const instance: BotInstance = {
      id: generateId(),
      name,
      color,
      createdAt: new Date().toISOString(),
    };

    this.instances.set(instance.id, {
      instance,
      intervalHandle: null,
      intervalMinutes: DEFAULT_INTERVAL_MINUTES,
      lastRunAt: null,
      nextRunAt: null,
    });

    const registry = loadInstances();
    registry.push(instance);
    saveInstances(registry);

    const dataDir = instance.id;
    writeJsonFile("settings.json", { ...DEFAULT_SETTINGS }, dataDir);
    writeJsonFile("portfolio.json", { ...DEFAULT_PORTFOLIO }, dataDir);
    writeJsonFile("trades.json", [], dataDir);

    this.startBot(instance.id);

    return instance;
  }

  updateInstance(id: string, patch: Partial<Pick<BotInstance, "name" | "color">>): BotInstance {
    const state = this.instances.get(id);
    if (!state) throw new Error(`Bot instance "${id}" not found`);

    const defined = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined)
    );
    Object.assign(state.instance, defined);

    const registry = loadInstances();
    const idx = registry.findIndex((i) => i.id === id);
    if (idx !== -1) {
      registry[idx] = state.instance;
      saveInstances(registry);
    }

    return state.instance;
  }

  deleteInstance(id: string): void {
    this.stopBot(id);
    this.instances.delete(id);

    const registry = loadInstances().filter((i) => i.id !== id);
    saveInstances(registry);
  }

  startBot(id: string, intervalMinutes: number = DEFAULT_INTERVAL_MINUTES): BotStatus {
    const state = this.instances.get(id);
    if (!state) throw new Error(`Bot instance "${id}" not found`);

    if (state.intervalHandle) {
      return this.getBotStatus(id);
    }

    state.intervalMinutes = intervalMinutes;
    const intervalMs = intervalMinutes * 60 * 1000;

    const tick = (): void => {
      const settings = this.loadSettings(id);
      const portfolio = this.loadPortfolio(id);
      const trades = this.loadTrades(id);
      let nextId = trades.length > 0 ? Math.max(...trades.map((t) => t.id)) + 1 : 1;

      runBotCycle(settings, portfolio, WATCHED_SYMBOLS, (trade) => {
        trade.id = nextId++;
        trades.push(trade);
        writeJsonFile("trades.json", trades, id);
      })
        .then((updatedPortfolio) => {
          this.savePortfolio(id, updatedPortfolio);
          state.lastRunAt = new Date().toISOString();
          state.nextRunAt = new Date(Date.now() + intervalMs).toISOString();
        })
        .catch((err) => {
          console.error(`[bot:${id}] Cycle error: ${(err as Error).message}`);
        });
    };

    tick();
    state.intervalHandle = setInterval(tick, intervalMs);

    return this.getBotStatus(id);
  }

  stopBot(id: string): BotStatus {
    const state = this.instances.get(id);
    if (!state) throw new Error(`Bot instance "${id}" not found`);

    if (state.intervalHandle) {
      clearInterval(state.intervalHandle);
      state.intervalHandle = null;
      state.nextRunAt = null;
    }

    return this.getBotStatus(id);
  }

  getBotStatus(id: string): BotStatus {
    const state = this.instances.get(id);
    if (!state) throw new Error(`Bot instance "${id}" not found`);

    return {
      running: state.intervalHandle !== null,
      intervalMinutes: state.intervalMinutes,
      lastRunAt: state.lastRunAt,
      nextRunAt: state.nextRunAt,
      watchedSymbols: WATCHED_SYMBOLS,
    };
  }

  startAll(): void {
    for (const id of this.instances.keys()) {
      this.startBot(id);
    }
  }

  loadPortfolio(id: string): Portfolio {
    return readJsonFile<Portfolio>("portfolio.json", DEFAULT_PORTFOLIO, id);
  }

  savePortfolio(id: string, portfolio: Portfolio): void {
    writeJsonFile("portfolio.json", portfolio, id);
  }

  loadSettings(id: string): Settings {
    return readJsonFile<Settings>("settings.json", DEFAULT_SETTINGS, id);
  }

  saveSettings(id: string, settings: Settings): void {
    writeJsonFile("settings.json", settings, id);
  }

  loadTrades(id: string): Trade[] {
    return readJsonFile<Trade[]>("trades.json", [], id);
  }
}

export const botManager = new BotManager();
