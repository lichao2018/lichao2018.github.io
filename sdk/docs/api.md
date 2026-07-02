# Server API

Base URL: `https://your-sdk-server`

## Health

- `GET /health`

## Register game (admin)

- `POST /v1/admin/games/register`
- Header: `x-admin-key: <ADMIN_API_KEY>`

Request:

```json
{
  "gameId": "game_001",
  "packageName": "com.example.game001",
  "deliveryWebhook": "https://game-server.example.com/sdk/deliver",
  "deliverySecret": "optional_webhook_hmac_secret"
}
```

## Facebook login -> account

- `POST /v1/auth/facebook`

Request:

```json
{
  "gameId": "game_001",
  "fbAccessToken": "EAAB..."
}
```

Response:

```json
{
  "ok": true,
  "isNew": false,
  "accountId": "uuid",
  "sdkToken": "jwt",
  "profile": {
    "fbUserId": "123456",
    "fbName": "Player"
  }
}
```

## Google verify + consume + deliver

- `POST /v1/payments/google/verify-deliver`

Request:

```json
{
  "gameId": "game_001",
  "accountId": "uuid",
  "packageName": "com.example.game001",
  "productId": "coins_100",
  "purchaseToken": "purchase_token",
  "externalOrderId": "GPA.1234-5678"
}
```

Response:

```json
{
  "ok": true,
  "idempotent": false,
  "order": {
    "orderId": "uuid",
    "status": "delivered",
    "consumed": true,
    "delivered": true
  }
}
```

Delivery webhook payload sent to your game server:

```json
{
  "event": "purchase_deliver",
  "gameId": "game_001",
  "accountId": "uuid",
  "orderId": "uuid",
  "productId": "coins_100",
  "purchaseToken": "purchase_token",
  "packageName": "com.example.game001",
  "externalOrderId": "GPA.1234-5678"
}
```
