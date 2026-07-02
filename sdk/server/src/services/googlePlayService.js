const fs = require("fs");
const { google } = require("googleapis");
const config = require("../config");

let cachedClient = null;

function getAndroidPublisherClient() {
  if (cachedClient) return cachedClient;

  let credentials = null;
  if (config.googleServiceAccountJson) {
    credentials = JSON.parse(config.googleServiceAccountJson);
  } else if (config.googleCredentialsPath && fs.existsSync(config.googleCredentialsPath)) {
    credentials = JSON.parse(fs.readFileSync(config.googleCredentialsPath, "utf-8"));
  }

  if (!credentials) {
    throw new Error("Google service account credentials are missing");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });

  cachedClient = google.androidpublisher({ version: "v3", auth });
  return cachedClient;
}

async function verifyProductPurchase({ packageName, productId, purchaseToken }) {
  const client = getAndroidPublisherClient();
  const response = await client.purchases.products.get({
    packageName,
    productId,
    token: purchaseToken,
  });

  return response.data;
}

async function consumeProductPurchase({ packageName, productId, purchaseToken }) {
  const client = getAndroidPublisherClient();
  await client.purchases.products.consume({
    packageName,
    productId,
    token: purchaseToken,
  });
}

module.exports = {
  verifyProductPurchase,
  consumeProductPurchase,
};
