export interface FeatureFlags {
  paymob: boolean;
  vodafoneCash: boolean;
  instaPay: boolean;
  meeza: boolean;
  stripe: boolean;
  applePay: boolean;
  googlePay: boolean;
  fawry: boolean;
  valu: boolean;
  cod: boolean;
  qrStory: boolean;
}

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  paymob: true,        // Primary Gateway
  vodafoneCash: true,  // Vodafone Cash Mobile Wallet
  instaPay: true,      // InstaPay IPN Instant Payment Network
  meeza: true,         // Meeza National Payment Cards & Wallets
  stripe: true,        // Secondary Gateway (Global Cards)
  applePay: true,      // Apple Pay Digital Wallet
  googlePay: true,     // Google Pay Digital Wallet
  fawry: true,         // Fawry Pay Kiosk & Reference
  valu: true,          // ValU BNPL Installments
  cod: true,           // Cash on Delivery
  qrStory: true,       // Interactive QR Receipt Story
};

class FeatureFlagService {
  private flags: FeatureFlags = { ...DEFAULT_FEATURE_FLAGS };

  getFlags(): FeatureFlags {
    return { ...this.flags };
  }

  isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag] ?? false;
  }

  setFlag(flag: keyof FeatureFlags, enabled: boolean): void {
    this.flags[flag] = enabled;
  }
}

export const featureFlagService = new FeatureFlagService();
