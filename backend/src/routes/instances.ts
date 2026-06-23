import { Router } from "express";
import { BotManager } from "../services/botManager";
import { asyncHandler } from "../utils/asyncHandler";

export function createInstanceRoutes(manager: BotManager): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      res.json(manager.listInstances());
    })
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const { name, color } = req.body as { name?: string; color?: string };

      if (!name || typeof name !== "string" || !name.trim()) {
        res.status(400).json({ error: "name is required" });
        return;
      }

      const instance = manager.createInstance(name.trim(), color ?? "#10b981");
      res.status(201).json(instance);
    })
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { name, color } = req.body as { name?: string; color?: string };

      try {
        const instance = manager.updateInstance(id, { name, color });
        res.json(instance);
      } catch (err) {
        res.status(404).json({ error: (err as Error).message });
      }
    })
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      if (!manager.listInstances().find((i) => i.id === id)) {
        res.status(404).json({ error: `Bot instance "${id}" not found` });
        return;
      }

      manager.deleteInstance(id);
      res.json({ ok: true });
    })
  );

  return router;
}
