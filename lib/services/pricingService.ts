import { Money, zeroMoney, addMoney, subtractMoney, convertMoney, CurrencyCode } from '../types/money';
import { PricingSnapshot } from '../types/orderAggregate';
import { shippingService } from './shipping';
import { taxService } from './tax';
import { couponEngine, ConditionalCoupon } from './coupon';

export interface CartItemInput {
  productId: string;
  unitPrice: Money;
  quantity: number;
}

export interface PricingCalculationRequest {
  items: CartItemInput[];
  governorate: string;
  carrierId?: string;
  couponCode?: string;
  currency?: CurrencyCode;
  isFirstOrder?: boolean;
}

export interface PricingCalculationResult {
  snapshot: PricingSnapshot;
  subtotal: Money;
  discount: Money;
  shippingFee: Money;
  taxAmount: Money;
  total: Money;
  appliedCoupon?: ConditionalCoupon;
  isFreeShipping: boolean;
  couponErrorMessage?: string;
}

class PricingService {
  calculatePricing(request: PricingCalculationRequest): PricingCalculationResult {
    const targetCurrency: CurrencyCode = request.currency || 'EGP';

    let subtotalCents = 0;
    for (const item of request.items) {
      const convertedPrice = convertMoney(item.unitPrice, targetCurrency);
      subtotalCents += convertedPrice.amountInCents * item.quantity;
    }
    const subtotal: Money = { amountInCents: subtotalCents, currency: targetCurrency };

    let discount = zeroMoney(targetCurrency);
    let isFreeShippingCoupon = false;
    let appliedCoupon: ConditionalCoupon | undefined = undefined;
    let couponErrorMessage: string | undefined = undefined;

    if (request.couponCode && request.couponCode.trim().length > 0) {
      const couponResult = couponEngine.validateAndCalculate(
        request.couponCode,
        subtotal,
        request.isFirstOrder
      );

      if (couponResult.valid) {
        discount = couponResult.discountAmount;
        isFreeShippingCoupon = couponResult.isFreeShipping;
        appliedCoupon = couponResult.coupon;
      } else {
        couponErrorMessage = couponResult.errorMessage;
      }
    }

    const discountedSubtotal = subtractMoney(subtotal, discount);

    const shippingResult = shippingService.calculateShippingCost(
      request.governorate,
      discountedSubtotal,
      request.carrierId || 'bosta',
      isFreeShippingCoupon
    );
    const shippingFee = convertMoney(shippingResult.fee, targetCurrency);

    const taxResult = taxService.calculateTax(discountedSubtotal, 'standard');
    const taxAmount = convertMoney(taxResult.taxAmount, targetCurrency);

    const total = addMoney(addMoney(discountedSubtotal, shippingFee), taxAmount);

    const snapshot: PricingSnapshot = {
      subtotal,
      discount,
      shipping: shippingFee,
      taxes: taxAmount,
      total,
      exchangeRate: targetCurrency === 'USD' ? 0.021 : targetCurrency === 'EUR' ? 0.019 : 1,
      currency: targetCurrency,
      calculatedAt: new Date().toISOString(),
    };

    return {
      snapshot,
      subtotal,
      discount,
      shippingFee,
      taxAmount,
      total,
      appliedCoupon,
      isFreeShipping: shippingResult.isFree || isFreeShippingCoupon,
      couponErrorMessage,
    };
  }
}

export const pricingService = new PricingService();
