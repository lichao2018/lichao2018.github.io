const express = require("express");
const config = require("../config");

function buildAdminRouter(store) {
  const router = express.Router();

  router.use((req, res, next) => {
    const apiKey = req.header("x-admin-key");
    if (apiKey !== config.adminApiKey) {
      return res.status(401).json({ error: "unauthorized" });
    }
    return next();
  });

  router.post("/games/register", (req, res) => {
    const { gameId, deliveryWebhook, deliverySecret, packageName } = req.body || {};
    if (!gameId) {
      return res.status(400).json({ error: "gameId is required" });
    }

    const game = store.upsertGame({
      gameId,
      deliveryWebhook,
      deliverySecret,
      packageName,
    });

    return res.json({ ok: true, game });
  });

  return router;
}

module.exports = { buildAdminRouter };
