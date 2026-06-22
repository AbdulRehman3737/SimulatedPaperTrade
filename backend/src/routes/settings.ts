import { Router } from "express";
import { loadSettings, saveSettings } from "../services/botService";
import { Settings } from "../types";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

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

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(loadSettings());
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const merged = coerceNumericFields(loadSettings(), req.body as Partial<Settings>);

    const validationError = validateSettings(merged);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    saveSettings(merged);
    res.json(merged);
  })
);

export default router;
