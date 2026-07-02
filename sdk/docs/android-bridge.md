# Android Bridge Contract

The HTML game runs inside Android WebView. Native layer must expose `window.AndroidSDK` methods.

## 1) Add JS bridge in Android

```kotlin
class AndroidSdkBridge(
    private val activity: Activity,
    private val billingManager: BillingManager,
    private val fbLoginManager: FbLoginManager,
    private val adsManager: AdsManager
) {
    @JavascriptInterface
    fun facebookLogin(payloadJson: String): String {
        val token = fbLoginManager.loginAndGetAccessToken(activity)
        return "{\"accessToken\":\"$token\"}"
    }

    @JavascriptInterface
    fun showRewardedAd(payloadJson: String): String {
        adsManager.showRewarded(activity)
        return "{\"ok\":true}"
    }

    @JavascriptInterface
    fun showInterstitialAd(payloadJson: String): String {
        adsManager.showInterstitial(activity)
        return "{\"ok\":true}"
    }

    @JavascriptInterface
    fun purchaseGoogleProduct(payloadJson: String): String {
        val productId = JSONObject(payloadJson).optString("productId")
        val purchase = billingManager.purchase(activity, productId)
        return JSONObject()
            .put("orderId", purchase.orderId)
            .put("productId", productId)
            .put("purchaseToken", purchase.purchaseToken)
            .put("packageName", purchase.packageName)
            .toString()
    }
}

// webView setup
webView.settings.javaScriptEnabled = true
webView.addJavascriptInterface(AndroidSdkBridge(...), "AndroidSDK")
```

## 2) Required bridge methods

- `facebookLogin(payloadJson: string): string | Promise<string>`
- `showRewardedAd(payloadJson: string): string | Promise<string>`
- `showInterstitialAd(payloadJson: string): string | Promise<string>`
- `purchaseGoogleProduct(payloadJson: string): string | Promise<string>`

Return JSON string with required fields.

## 3) Security recommendations

- Disable bridge on untrusted domains.
- Only load game URL from your allowlist.
- Use HTTPS between game and SDK server.
- Verify package name on server (`ALLOWED_ANDROID_PACKAGES`).
