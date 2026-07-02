const express = require("express");
const jwt = require("jsonwebtoken");
const { verifyFacebookAccessToken } = require("../services/facebookService");
const config = require("../config");

function buildAuthRouter(store) {
  const router = express.Router();

  router.post("/facebook", async (req, res) => {
    try {
      const { gameId, fbAccessToken } = req.body || {};
      if (!gameId || !fbAccessToken) {
        return res.status(400).json({
          error: "gameId and fbAccessToken are required",
        });
      }

      const fb = await verifyFacebookAccessToken(fbAccessToken);
      const { account, isNew } = store.findOrCreateAccount({
        gameId,
        fbUserId: fb.fbUserId,
        fbName: fb.fbName,
      });

      const sdkToken = jwt.sign(
        {
          accountId: account.accountId,
          gameId,
          fbUserId: fb.fbUserId,
        },
        config.jwtSecret,
        { expiresIn: "30d" }
      );

      return res.json({
        ok: true,
        isNew,
        accountId: account.accountId,
        sdkToken,
        profile: {
          fbUserId: fb.fbUserId,
          fbName: fb.fbName,
        },
      });
    } catch (error) {
      return res.status(401).json({ error: error.message || "Facebook login failed" });
    }
  });

  return router;
}

module.exports = { buildAuthRouter };
