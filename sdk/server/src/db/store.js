const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {
      accounts: [],
      games: [],
      purchaseOrders: [],
    };
  }

  init() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.filePath)) {
      this.persist();
      return;
    }

    const raw = fs.readFileSync(this.filePath, "utf-8");
    if (!raw.trim()) {
      this.persist();
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      this.data.accounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
      this.data.games = Array.isArray(parsed.games) ? parsed.games : [];
      this.data.purchaseOrders = Array.isArray(parsed.purchaseOrders) ? parsed.purchaseOrders : [];
    } catch (error) {
      throw new Error(`Failed to parse DB file: ${error.message}`);
    }
  }

  persist() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
  }

  upsertGame({ gameId, deliveryWebhook, deliverySecret, packageName }) {
    const now = new Date().toISOString();
    const existing = this.data.games.find((item) => item.gameId === gameId);

    if (existing) {
      existing.deliveryWebhook = deliveryWebhook || existing.deliveryWebhook;
      existing.deliverySecret = deliverySecret || existing.deliverySecret;
      existing.packageName = packageName || existing.packageName;
      existing.updatedAt = now;
      this.persist();
      return existing;
    }

    const game = {
      gameId,
      deliveryWebhook: deliveryWebhook || "",
      deliverySecret: deliverySecret || "",
      packageName: packageName || "",
      createdAt: now,
      updatedAt: now,
    };

    this.data.games.push(game);
    this.persist();
    return game;
  }

  findGame(gameId) {
    return this.data.games.find((item) => item.gameId === gameId) || null;
  }

  findOrCreateAccount({ gameId, fbUserId, fbName }) {
    const now = new Date().toISOString();
    const existing = this.data.accounts.find(
      (item) => item.gameId === gameId && item.fbUserId === fbUserId
    );

    if (existing) {
      existing.fbName = fbName || existing.fbName;
      existing.lastLoginAt = now;
      existing.updatedAt = now;
      this.persist();
      return { account: existing, isNew: false };
    }

    const account = {
      accountId: crypto.randomUUID(),
      gameId,
      fbUserId,
      fbName: fbName || "",
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    this.data.accounts.push(account);
    this.persist();
    return { account, isNew: true };
  }

  findAccount(accountId) {
    return this.data.accounts.find((item) => item.accountId === accountId) || null;
  }

  findOrderByPurchaseToken(gameId, purchaseToken) {
    return (
      this.data.purchaseOrders.find(
        (item) => item.gameId === gameId && item.purchaseToken === purchaseToken
      ) || null
    );
  }

  createOrder(order) {
    const now = new Date().toISOString();
    const normalized = {
      orderId: crypto.randomUUID(),
      status: "pending",
      consumed: false,
      delivered: false,
      createdAt: now,
      updatedAt: now,
      ...order,
    };

    this.data.purchaseOrders.push(normalized);
    this.persist();
    return normalized;
  }

  updateOrder(orderId, patch) {
    const target = this.data.purchaseOrders.find((item) => item.orderId === orderId);
    if (!target) return null;

    Object.assign(target, patch, { updatedAt: new Date().toISOString() });
    this.persist();
    return target;
  }
}

module.exports = { JsonStore };
