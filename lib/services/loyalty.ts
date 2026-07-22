import { Money, CurrencyCode, createMoney, zeroMoney } from '../types/money';

export type LoyaltyTier = 'Silver' | 'Gold' | 'Platinum';

export interface CustomerLoyaltyProfile {
  customerId: string;
  customerName: string;
  email: string;
  pointsBalance: number;
  lifetimePointsEarned: number;
  tier: LoyaltyTier;
  referralCode: string;
  referralCount: number;
  joinedAt: string;
}

export interface LoyaltyRedemptionResult {
  success: boolean;
  pointsRedeemed: number;
  discountMoney: Money;
  newPointsBalance: number;
  errorMessage?: string;
}

export const TIER_THRESHOLDS: Record<LoyaltyTier, { minPoints: number; multiplier: number; perkEn: string; perkAr: string }> = {
  Silver: { minPoints: 0, multiplier: 1.0, perkEn: 'Standard 1x Points on Purchases', perkAr: 'نقاط أساسية مضاعفة ١×' },
  Gold: { minPoints: 1000, multiplier: 1.25, perkEn: '1.25x Points + Free Express Shipping', perkAr: '١٫٢٥× نقاط + شحن سريع مجاني' },
  Platinum: { minPoints: 2500, multiplier: 1.5, perkEn: '1.5x Points + VIP Concierge & Early Access', perkAr: '١٫٥× نقاط + VIP وتخفيضات مبكرة' },
};

class LoyaltyService {
  /**
   * Calculates loyalty points earned from order purchase amount
   * Rule: 1 base point per 10 EGP spent, multiplied by tier multiplier
   */
  calculateEarnedPoints(amountInCents: number, tier: LoyaltyTier = 'Silver'): number {
    const baseAmountEgp = amountInCents / 100;
    const basePoints = Math.floor(baseAmountEgp / 10);
    const multiplier = TIER_THRESHOLDS[tier].multiplier;
    return Math.floor(basePoints * multiplier);
  }

  /**
   * Determines loyalty tier from lifetime points
   */
  calculateTier(lifetimePoints: number): LoyaltyTier {
    if (lifetimePoints >= TIER_THRESHOLDS.Platinum.minPoints) return 'Platinum';
    if (lifetimePoints >= TIER_THRESHOLDS.Gold.minPoints) return 'Gold';
    return 'Silver';
  }

  /**
   * Redeems loyalty points for monetary discount
   * Rule: 100 points = 50 EGP discount
   */
  redeemPoints(
    profile: CustomerLoyaltyProfile,
    pointsToRedeem: number,
    currency: CurrencyCode = 'EGP'
  ): LoyaltyRedemptionResult {
    if (pointsToRedeem <= 0) {
      return {
        success: false,
        pointsRedeemed: 0,
        discountMoney: zeroMoney(currency),
        newPointsBalance: profile.pointsBalance,
        errorMessage: 'Invalid points amount.',
      };
    }

    if (pointsToRedeem > profile.pointsBalance) {
      return {
        success: false,
        pointsRedeemed: 0,
        discountMoney: zeroMoney(currency),
        newPointsBalance: profile.pointsBalance,
        errorMessage: 'Insufficient loyalty points balance.',
      };
    }

    // 100 points = 50 EGP discount (0.50 EGP per point)
    const discountAmountEgp = (pointsToRedeem / 100) * 50;
    const discountMoney = createMoney(discountAmountEgp, currency);
    const newPointsBalance = profile.pointsBalance - pointsToRedeem;

    return {
      success: true,
      pointsRedeemed: pointsToRedeem,
      discountMoney,
      newPointsBalance,
    };
  }

  /**
   * Generates demo customer profile
   */
  getDemoProfile(): CustomerLoyaltyProfile {
    return {
      customerId: 'cust-892401',
      customerName: 'Alex Vance',
      email: 'alex.vance@example.com',
      pointsBalance: 1250,
      lifetimePointsEarned: 1450,
      tier: 'Gold',
      referralCode: 'BAHER-ALEX925',
      referralCount: 4,
      joinedAt: '2025-11-15T00:00:00.000Z',
    };
  }
}

export const loyaltyService = new LoyaltyService();
