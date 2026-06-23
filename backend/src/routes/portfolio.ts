import { Router } from "express";
import { BotManager } from "../services/botManager";
import { Portfolio } from "../types";
import { asyncHandler } from "../utils/asyncHandler";

export function createPortfolioRoutes(manager: BotManager): Router {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const { instanceId } = req.params;
      res.json(manager.loadPortfolio(instanceId));
    })
  );

  router.post(
    "/reset",
    asyncHandler(async (req, res) => {
      const { instanceId } = req.params;
      const settings = manager.loadSettings(instanceId);
      const portfolio: Portfolio = { cash: settings.startingMoney, holdings: [], totalProfit: 0 };
      manager.savePortfolio(instanceId, portfolio);
      res.json(portfolio);
    })
  );

  return router;
}
