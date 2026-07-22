import { Money, createMoney, zeroMoney, multiplyMoney } from '../types/money';

export type DiscountType = 'fixed' | 'percentage' | 'free_shipping';

export interface ConditionalCoupon {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountCap?: number;
  minOrderAmountInCents?: number;
  applicableCategory?: string;
  expiresAt: string;
  maxUses: number;
  currentUses: number;
  isStackable: boolean;
  firstOrderOnly?: boolean;
}

export const DEMO_COUPONS: ConditionalCoupon[] = [
  {
    code: 'SILVER10',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscountCap: 500,
    minOrderAmountInCents: 50000,
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 1000,
    currentUses: 42,
    isStackable: false,
  },
  {
    code: 'WELCOME200',
    discountType: 'fixed',
    discountValue: 200,
    minOrderAmountInCents: 100000,
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 500,
    currentUses: 120,
    isStackable: false,
    firstOrderOnly: true,
  },
  {
    code: 'FREESHIP',
    discountType: 'free_shipping',
    discountValue: 0,
    minOrderAmountInCents: 30000,
    expiresAt: '2026-12-31T23:59:59Z',
    maxUses: 2000,
    currentUses: 310,
    isStackable: true,
  },
];

export interface CouponValidationResult {
  valid: boolean;
  coupon?: ConditionalCoupon;
  discountAmount: Money;
  isFreeShipping: boolean;
  errorMessage?: string;
}

class CouponEngine {
  validateAndCalculate(
    couponCode: string,
    subtotal: Money,
    isFirstOrder = false
  ): CouponValidationResult {
    const normalizedCode = couponCode.trim().toUpperCase();
    const coupon = DEMO_COUPONS.find(c => c.code === normalizedCode);

    if (!coupon) {
      return {
        valid: false,
        discountAmount: zeroMoney(subtotal.currency),
        isFreeShipping: false,
        errorMessage: 'Invalid coupon code.',
      };
    }

    if (new Date() > new Date(coupon.expiresAt)) {
      return {
        valid: false,
        discountAmount: zeroMoney(subtotal.currency),
        isFreeShipping: false,
        errorMessage: 'This coupon has expired.',
      };
    }

    if (coupon.currentUses >= coupon.maxUses) {
      return {
        valid: false,
        discountAmount: zeroMoney(subtotal.currency),
        isFreeShipping: false,
        errorMessage: 'Coupon maximum usage limit reached.',
      };
    }

    if (coupon.minOrderAmountInCents && subtotal.amountInCents < coupon.minOrderAmountInCents) {
      const minDecimal = coupon.minOrderAmountInCents / 100;
      return {
        valid: false,
        discountAmount: zeroMoney(subtotal.currency),
        isFreeShipping: false,
        errorMessage: `Minimum order amount of ${subtotal.currency} ${minDecimal.toFixed(2)} required.`,
      };
    }

    if (coupon.firstOrderOnly && !isFirstOrder) {
      return {
        valid: false,
        discountAmount: zeroMoney(subtotal.currency),
        isFreeShipping: false,
        errorMessage: 'This coupon is valid for first-time orders only.',
      };
    }

    if (coupon.discountType === 'free_shipping') {
      return {
        valid: true,
        coupon,
        discountAmount: zeroMoney(subtotal.currency),
        isFreeShipping: true,
      };
    }

    if (coupon.discountType === 'fixed') {
      const fixedDiscountMoney = createMoney(coupon.discountValue, subtotal.currency);
      const finalDiscount = fixedDiscountMoney.amountInCents > subtotal.amountInCents 
        ? subtotal 
        : fixedDiscountMoney;

      return {
        valid: true,
        coupon,
        discountAmount: finalDiscount,
        isFreeShipping: false,
      };
    }

    if (coupon.discountType === 'percentage') {
      let percentMoney = multiplyMoney(subtotal, coupon.discountValue / 100);
      if (coupon.maxDiscountCap) {
        const capMoney = createMoney(coupon.maxDiscountCap, subtotal.currency);
        if (percentMoney.amountInCents > capMoney.amountInCents) {
          percentMoney = capMoney;
        }
      }
      return {
        valid: true,
        coupon,
        discountAmount: percentMoney,
        isFreeShipping: false,
      };
    }

    return {
      valid: false,
      discountAmount: zeroMoney(subtotal.currency),
      isFreeShipping: false,
      errorMessage: 'Unsupported coupon type.',
    };
  }
}

export const couponEngine = new CouponEngine();
