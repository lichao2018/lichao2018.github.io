const express = require("express");
const config = require("./config");
const { JsonStore } = require("./db/store");
const { buildAuthRouter } = require("./routes/auth");
const { buildPaymentsRouter } = require("./routes/payments");
const { buildAdminRouter } = require("./routes/admin");

const app = express();
app.use(express.json({ limit: "1mb" }));

const store = new JsonStore(config.dbFile);
store.init();

app.get("/health", (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use("/v1/auth", buildAuthRouter(store));
app.use("/v1/payments", buildPaymentsRouter(store));
app.use("/v1/admin", buildAdminRouter(store));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "internal_server_error" });
});

app.listen(config.port, () => {
  console.log(`[sdk-server] listening on :${config.port}`);
});
