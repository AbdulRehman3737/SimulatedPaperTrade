import { Router } from "express";
import { BotManager } from "../services/botManager";
import { asyncHandler } from "../utils/asyncHandler";

export function createTradesRoutes(manager: BotManager): Router {
  const router = Router({ mergeParams: true });

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const { instanceId } = req.params;
      res.json(manager.loadTrades(instanceId));
    })
  );

  return router;
}
