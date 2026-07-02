export type SdkConfig = {
  gameId: string;
  serverBaseUrl: string;
  packageName?: string;
  platform?: "android" | "web";
  fbAppId?: string;
};

export type AuthResult = {
  ok: boolean;
  isNew: boolean;
  accountId: string;
  sdkToken: string;
  profile: {
    fbUserId: string;
    fbName: string;
  };
};

export type PurchaseResult = {
  ok: boolean;
  idempotent: boolean;
  order: {
    orderId: string;
    gameId: string;
    accountId: string;
    productId: string;
    purchaseToken: string;
    delivered: boolean;
    consumed: boolean;
    status: string;
  };
};

export declare class HtmlGameSdk {
  constructor(config: SdkConfig);
  loginWithFacebook(): Promise<AuthResult>;
  showRewardedAd(placement?: string): Promise<unknown>;
  showInterstitialAd(placement?: string): Promise<unknown>;
  purchaseGoogleProduct(productId: string): Promise<PurchaseResult>;
  getSession(): {
    accountId: string;
    sdkToken: string;
    profile: { fbUserId: string; fbName: string } | null;
  };
}
