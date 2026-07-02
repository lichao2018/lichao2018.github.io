const express = require("express");
const config = require("../config");
const {
  verifyProductPurchase,
  consumeProductPurchase,
} = require("../services/googlePlayService");
const { notifyGameDeliveryWebhook } = require("../services/deliveryService");

function buildPaymentsRouter(store) {
  const router = express.Router();

  router.post("/google/verify-deliver", async (req, res) => {
    try {
      const {
        gameId,
        accountId,
        packageName,
        productId,
        purchaseToken,
        externalOrderId,
      } = req.body || {};

      if (!gameId || !accountId || !packageName || !productId || !purchaseToken) {
        return res.status(400).json({
          error: "gameId, accountId, packageName, productId, purchaseToken are required",
        });
      }

      if (config.allowedPackages.length > 0 && !config.allowedPackages.includes(packageName)) {
        return res.status(400).json({ error: "packageName is not allowed" });
      }

      const account = store.findAccount(accountId);
      if (!account || account.gameId !== gameId) {
        return res.status(404).json({ error: "account not found" });
      }

      const existingOrder = store.findOrderByPurchaseToken(gameId, purchaseToken);
      if (existingOrder && existingOrder.delivered) {
        return res.json({
          ok: true,
          idempotent: true,
          order: existingOrder,
        });
      }

      const purchase = await verifyProductPurchase({
        packageName,
        productId,
        purchaseToken,
      });

      if (purchase.purchaseState !== 0) {
        return res.status(400).json({
          error: "purchase is not completed",
          purchaseState: purchase.purchaseState,
        });
      }

      let order = existingOrder;
      if (!order) {
        order = store.createOrder({
          gameId,
          accountId,
          packageName,
          productId,
          purchaseToken,
          externalOrderId: externalOrderId || purchase.orderId || "",
          purchaseState: purchase.purchaseState,
          acknowledgementState: purchase.acknowledgementState,
          consumptionState: purchase.consumptionState,
          rawPurchase: purchase,
        });
      }

      // For consumable products, consume after verification to prevent duplicate delivery.
      if (purchase.consumptionState === 0) {
        await consumeProductPurchase({
          packageName,
          productId,
          purchaseToken,
        });
        order = store.updateOrder(order.orderId, { consumed: true, status: "consumed" });
      }

      const game = store.findGame(gameId);
      let webhookResult = null;
      try {
        webhookResult = await notifyGameDeliveryWebhook(game, {
          event: "purchase_deliver",
          gameId,
          accountId,
          orderId: order.orderId,
          productId,
          purchaseToken,
          packageName,
          externalOrderId: order.externalOrderId,
        });
      } catch (error) {
        order = store.updateOrder(order.orderId, {
          delivered: false,
          status: "delivery_failed",
          deliveryError: error.message,
        });
        return res.status(502).json({
          error: "purchase verified but delivery webhook failed",
          order,
        });
      }

      order = store.updateOrder(order.orderId, {
        delivered: true,
        status: "delivered",
        deliveryResult: webhookResult,
      });

      return res.json({
        ok: true,
        idempotent: false,
        order,
      });
    } catch (error) {
      return res.status(400).json({ error: error.message || "payment verify failed" });
    }
  });

  return router;
}

module.exports = { buildPaymentsRouter };
