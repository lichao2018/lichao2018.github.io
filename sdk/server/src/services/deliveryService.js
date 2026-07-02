const crypto = require("crypto");

async function notifyGameDeliveryWebhook(game, payload) {
  if (!game?.deliveryWebhook) {
    return {
      sent: false,
      reason: "No deliveryWebhook configured",
    };
  }

  const body = JSON.stringify(payload);
  const headers = {
    "content-type": "application/json",
  };

  if (game.deliverySecret) {
    const signature = crypto
      .createHmac("sha256", game.deliverySecret)
      .update(body)
      .digest("hex");
    headers["x-sdk-signature"] = signature;
  }

  const response = await fetch(game.deliveryWebhook, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Delivery webhook failed (${response.status}): ${text}`);
  }

  return {
    sent: true,
    status: response.status,
  };
}

module.exports = { notifyGameDeliveryWebhook };
