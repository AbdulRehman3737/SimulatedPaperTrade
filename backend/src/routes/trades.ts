import { Router } from "express";
import { loadTrades } from "../services/botService";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(loadTrades());
  })
);

export default router;
