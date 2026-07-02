# HTML Game Android SDK (Client + Server)

This repository provides a reusable SDK for HTML games that will be packaged as Android APK/AAB.

Included capabilities:

- Client SDK:
  - Facebook login
  - AdMob ad bridge (reward/interstitial)
  - Google Play purchase flow
- Server SDK:
  - Facebook login verification + account creation/storage
  - Google Play purchase verification
  - Consumable purchase consume
  - Delivery webhook callback to your game server

The same SDK can be reused by future HTML games by changing `gameId`, package name, and webhook.

## Project structure

```text
client/
  webgame-sdk.js
  webgame-sdk.d.ts
server/
  .env.example
  package.json
  src/
    index.js
    config.js
    db/store.js
    routes/
      auth.js
      payments.js
      admin.js
    services/
      facebookService.js
      googlePlayService.js
      deliveryService.js
docs/
  api.md
  android-bridge.md
examples/
  demo.html
```

## Quick start (server)

1. Install dependencies:

```bash
cd server
npm install
```

2. Configure env:

```bash
copy .env.example .env
```

3. Start server:

```bash
npm run dev
```

4. Register game config:

```bash
curl -X POST http://localhost:8080/v1/admin/games/register \\
  -H "content-type: application/json" \\
  -H "x-admin-key: replace_with_admin_api_key" \\
  -d "{\"gameId\":\"game_001\",\"packageName\":\"com.example.game001\",\"deliveryWebhook\":\"https://your-game-server.com/sdk/deliver\"}"
```

## Client integration

Include `client/webgame-sdk.js` in your game page and initialize:

```html
<script src="webgame-sdk.js"></script>
<script>
  const sdk = new HtmlGameSdk({
    gameId: "game_001",
    serverBaseUrl: "https://sdk-server.example.com",
    platform: "android",
    packageName: "com.example.game001"
  });

  async function onLoginClick() {
    const login = await sdk.loginWithFacebook();
    console.log("account", login.accountId);
  }

  async function onPayClick() {
    const result = await sdk.purchaseGoogleProduct("coins_100");
    console.log(result);
  }
</script>
```

## Important notes

- You must implement native Android bridge (`window.AndroidSDK`) for FB/AdMob/Billing.
- Configure Google Play service account credentials in server `.env`.
- Always use HTTPS in production.
- Keep `SDK_JWT_SECRET`, `ADMIN_API_KEY` secure.

See:

- `docs/android-bridge.md`
- `docs/api.md`
- `examples/demo.html`
