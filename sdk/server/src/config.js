const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const allowedPackages = process.env.ALLOWED_ANDROID_PACKAGES
  ? process.env.ALLOWED_ANDROID_PACKAGES.split(",").map((item) => item.trim()).filter(Boolean)
  : [];

module.exports = {
  port: Number(process.env.PORT || 8080),
  jwtSecret: process.env.SDK_JWT_SECRET || "dev_sdk_secret_change_me",
  adminApiKey: process.env.ADMIN_API_KEY || "dev_admin_key",
  dbFile: process.env.DB_FILE
    ? path.resolve(process.cwd(), process.env.DB_FILE)
    : path.resolve(process.cwd(), "data/sdk-db.json"),
  googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "",
  googleCredentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || "",
  allowedPackages,
};
