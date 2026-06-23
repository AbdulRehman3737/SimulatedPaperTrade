import { Router } from "express";
import { BotManager } from "../services/botManager";
import { asyncHandler } from "../utils/asyncHandler";

export function createBotRoutes(manager: BotManager): Router {
  const router = Router({ mergeParams: true });

  router.get(
    "/status",
    asyncHandler(async (req, res) => {
      const { instanceId } = req.params;
      res.json(manager.getBotStatus(instanceId));
    })
  );

  router.post(
    "/start",
    asyncHandler(async (req, res) => {
      const { instanceId } = req.params;
      const requestedInterval = Number(req.body?.intervalMinutes);
      const status =
        Number.isFinite(requestedInterval) && requestedInterval > 0
          ? manager.startBot(instanceId, requestedInterval)
          : manager.startBot(instanceId);
      res.json(status);
    })
  );

  router.post(
    "/stop",
    asyncHandler(async (req, res) => {
      const { instanceId } = req.params;
      res.json(manager.stopBot(instanceId));
    })
  );

  return router;
}
