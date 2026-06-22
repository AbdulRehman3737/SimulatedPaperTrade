import { Router } from "express";
import { loadPortfolio, loadSettings, savePortfolio } from "../services/botService";
import { Portfolio } from "../types";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(loadPortfolio());
  })
);

/** Resets the simulated wallet back to the configured starting money, clearing all positions. */
router.post(
  "/reset",
  asyncHandler(async (_req, res) => {
    const settings = loadSettings();
    const portfolio: Portfolio = { cash: settings.startingMoney, holdings: [], totalProfit: 0 };
    savePortfolio(portfolio);
    res.json(portfolio);
  })
);

export default router;
