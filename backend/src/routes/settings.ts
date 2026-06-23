import { Router } from "express";
import { BotManager } from "../services/botManager";
import { Settings } from "../types";
import { asyncHandler } from "../utils/asyncHandler";

const NUMERIC_FIELDS: (keyof Settings)[] = [
  "startingMoney",
  "takeProfit",
  "stopLoss",
  "rsiBuy",
  "rsiSell",
  "investmentPerTrade",
  "minVolumeChange",
];

function coerceNumericFields(current: Settings, updates: Partial<Settings>): Settings {
  const merged: Settings = { ...current };
  for (const field of NUMERIC_FIELDS) {
    const value = updates[field];
    if (value !== undefined) {
      merged[field] = Number(value);
    }
  }
  return merged;
}

function validateSettings(settings: Settings): string | null {
  if (!Object.values(settings).every((v) => Number.isFinite(v))) return "All settings must be valid numbers";
  if (!(settings.startingMoney > 0)) return "startingMoney must be greater than 0";
  if (!(settings.investmentPerTrade > 0)) return "investmentPerTrade must be greater than 0";
  if (!(settings.takeProfit > 0)) return "takeProfit must be greater than 0";
  if (!(settings.stopLoss > 0)) return "stopLoss must be greater than 0";
  if (settings.rsiBuy < 0 || settings.rsiBuy > 100) return "rsiBuy must be between 0 and 100";
  if (settings.rsiSell < 0 || settings.rsiSell > 100) return "rsiSell must be between 0 and 100";
  if (settings.rsiBuy >= settings.rsiSell) return "rsiBuy must be less than rsiSell";
  return null;
}

export function createSettingsRoutes(manager: BotManager): Router {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const { instanceId } = req.params;
      res.json(manager.loadSettings(instanceId));
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const { instanceId } = req.params;
      const merged = coerceNumericFields(manager.loadSettings(instanceId), req.body as Partial<Settings>);

      const validationError = validateSettings(merged);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      manager.saveSettings(instanceId, merged);
      res.json(merged);
    })
  );

  return router;
}
