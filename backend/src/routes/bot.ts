import { Router } from "express";
import { getBotStatus, startBot, stopBot } from "../services/botService";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get(
  "/status",
  asyncHandler(async (_req, res) => {
    res.json(getBotStatus());
  })
);

router.post(
  "/start",
  asyncHandler(async (req, res) => {
    const requestedInterval = Number(req.body?.intervalMinutes);
    const status = Number.isFinite(requestedInterval) && requestedInterval > 0 ? startBot(requestedInterval) : startBot();
    res.json(status);
  })
);

router.post(
  "/stop",
  asyncHandler(async (_req, res) => {
    res.json(stopBot());
  })
);

export default router;
