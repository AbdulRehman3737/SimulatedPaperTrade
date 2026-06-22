import { Router } from "express";
import { getHistoricalData, getSupportedSymbols } from "../services/marketService";
import { calculateIndicators } from "../trading/indicators";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get(
  "/:symbol",
  asyncHandler(async (req, res) => {
    const symbol = req.params.symbol.toUpperCase();
    const supported = getSupportedSymbols();

    if (!supported.some((s) => s === symbol)) {
      res.status(400).json({ error: `Unsupported symbol "${req.params.symbol}". Supported: ${supported.join(", ")}` });
      return;
    }

    const marketData = await getHistoricalData(symbol);
    const indicators = calculateIndicators(marketData);
    res.json({ ...marketData, indicators });
  })
);

export default router;
