(function (global) {
  "use strict";

  function requestJson(baseUrl, path, options) {
    var url = String(baseUrl || "").replace(/\/$/, "") + path;
    return fetch(url, {
      method: options.method || "GET",
      headers: {
        "content-type": "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    }).then(function (res) {
      return res.json().then(function (json) {
        if (!res.ok) {
          var message = (json && json.error) || "Request failed";
          throw new Error(message);
        }
        return json;
      });
    });
  }

  function AndroidBridge() {}

  AndroidBridge.prototype.call = function (method, payload) {
    var bridge = global.AndroidSDK;
    if (!bridge || typeof bridge[method] !== "function") {
      return Promise.reject(new Error("Android bridge method missing: " + method));
    }

    try {
      var value = bridge[method](JSON.stringify(payload || {}));
      if (value && typeof value.then === "function") {
        return value;
      }
      if (typeof value === "string") {
        return Promise.resolve(JSON.parse(value));
      }
      return Promise.resolve(value || null);
    } catch (err) {
      return Promise.reject(err);
    }
  };

  function WebBridge(fbAppId) {
    this.fbAppId = fbAppId || "";
  }

  WebBridge.prototype.ensureFacebookSdk = function () {
    if (!global.FB) {
      return Promise.reject(new Error("Facebook JS SDK is not loaded"));
    }

    return new Promise(
      function (resolve) {
        global.FB.init({
          appId: this.fbAppId,
          cookie: true,
          xfbml: false,
          version: "v20.0",
        });
        resolve();
      }.bind(this)
    );
  };

  WebBridge.prototype.facebookLogin = function () {
    return this.ensureFacebookSdk().then(function () {
      return new Promise(function (resolve, reject) {
        global.FB.login(
          function (response) {
            var token = response && response.authResponse && response.authResponse.accessToken;
            if (!token) {
              reject(new Error("User cancelled Facebook login"));
              return;
            }
            resolve({ accessToken: token });
          },
          { scope: "public_profile,email" }
        );
      });
    });
  };

  WebBridge.prototype.showRewardedAd = function () {
    return Promise.reject(new Error("Web platform does not support AdMob rewarded ad"));
  };

  WebBridge.prototype.showInterstitialAd = function () {
    return Promise.reject(new Error("Web platform does not support AdMob interstitial ad"));
  };

  WebBridge.prototype.purchaseGoogleProduct = function () {
    return Promise.reject(new Error("Web platform does not support Google Play purchase"));
  };

  function HtmlGameSdk(config) {
    this.config = Object.assign(
      {
        gameId: "",
        serverBaseUrl: "",
        packageName: "",
        platform: "android",
        fbAppId: "",
      },
      config || {}
    );

    this.state = {
      accountId: "",
      sdkToken: "",
      profile: null,
    };

    this.bridge =
      this.config.platform === "web"
        ? new WebBridge(this.config.fbAppId)
        : new AndroidBridge();
  }

  HtmlGameSdk.prototype.loginWithFacebook = function () {
    var self = this;
    return this.bridge.facebookLogin().then(function (result) {
      var fbAccessToken = result && (result.accessToken || result.fbAccessToken);
      if (!fbAccessToken) {
        throw new Error("fbAccessToken missing from bridge response");
      }

      return requestJson(self.config.serverBaseUrl, "/v1/auth/facebook", {
        method: "POST",
        body: {
          gameId: self.config.gameId,
          fbAccessToken: fbAccessToken,
        },
      }).then(function (authResult) {
        self.state.accountId = authResult.accountId;
        self.state.sdkToken = authResult.sdkToken;
        self.state.profile = authResult.profile;
        return authResult;
      });
    });
  };

  HtmlGameSdk.prototype.showRewardedAd = function (placement) {
    return this.bridge.showRewardedAd({ placement: placement || "default" });
  };

  HtmlGameSdk.prototype.showInterstitialAd = function (placement) {
    return this.bridge.showInterstitialAd({ placement: placement || "default" });
  };

  HtmlGameSdk.prototype.purchaseGoogleProduct = function (productId) {
    var self = this;
    if (!this.state.accountId) {
      return Promise.reject(new Error("Please login before purchase"));
    }

    return this.bridge
      .purchaseGoogleProduct({ productId: productId })
      .then(function (purchaseResult) {
        var payload = {
          gameId: self.config.gameId,
          accountId: self.state.accountId,
          packageName:
            purchaseResult.packageName || self.config.packageName || "",
          productId: productId,
          purchaseToken: purchaseResult.purchaseToken,
          externalOrderId: purchaseResult.orderId || "",
        };

        if (!payload.packageName || !payload.purchaseToken) {
          throw new Error("purchase bridge result missing packageName or purchaseToken");
        }

        return requestJson(self.config.serverBaseUrl, "/v1/payments/google/verify-deliver", {
          method: "POST",
          body: payload,
        });
      });
  };

  HtmlGameSdk.prototype.getSession = function () {
    return Object.assign({}, this.state);
  };

  global.HtmlGameSdk = HtmlGameSdk;
})(window);
