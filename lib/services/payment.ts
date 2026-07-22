import { Money, CurrencyCode } from '../types/money';
import { PaymentAttempt } from '../types/orderAggregate';

export type PaymentProviderType =
  | 'Paymob'
  | 'VodafoneCash'
  | 'InstaPay'
  | 'Meeza'
  | 'Stripe'
  | 'ApplePay'
  | 'GooglePay'
  | 'Fawry'
  | 'ValU'
  | 'COD';

export interface PaymentInitializationRequest {
  orderId: string;
  amount: Money;
  currency: string;
  customerEmail: string;
  customerPhone?: string;
  idempotencyKey: string;
  retryCount?: number;
  metadata?: Record<string, unknown>;
}

export interface PaymentInitializationResponse {
  paymentAttemptId: string;
  idempotencyKey: string;
  provider: PaymentProviderType;
  providerReference: string;
  redirectUrl?: string;
  clientSecret?: string;
  fawryReferenceNumber?: string;
  instaPayAddress?: string;
  status: 'Pending' | 'Success' | 'Declined' | 'Timeout' | 'Expired' | 'Failed';
}

export interface IPaymentProvider {
  getProviderName(): PaymentProviderType;
  getSupportedCountries(): string[]; // e.g. ['EG', 'GLOBAL']
  getSupportedCurrencies(): CurrencyCode[]; // e.g. ['EGP', 'USD', 'EUR']
  initializePayment(request: PaymentInitializationRequest): Promise<PaymentInitializationResponse>;
  verifyPayment(paymentAttemptId: string, payload: unknown): Promise<{ success: boolean; providerReference: string }>;
}

/**
 * 1. Paymob Provider (Primary Gateway - Cards & Wallets)
 */
class PaymobProvider implements IPaymentProvider {
  getProviderName(): PaymentProviderType { return 'Paymob'; }
  getSupportedCountries(): string[] { return ['EG', 'GLOBAL']; }
  getSupportedCurrencies(): CurrencyCode[] { return ['EGP', 'USD', 'EUR']; }

  async initializePayment(request: PaymentInitializationRequest): Promise<PaymentInitializationResponse> {
    const attemptId = `paymob-att-${Math.random().toString(36).substring(2, 9)}`;
    const providerRef = `PAYMOB-TXN-${Math.floor(1000000 + Math.random() * 9000000)}`;
    
    return {
      paymentAttemptId: attemptId,
      idempotencyKey: request.idempotencyKey,
      provider: 'Paymob',
      providerReference: providerRef,
      redirectUrl: `https://accept.paymobsolutions.com/api/acceptance/iframes/sample?payment_token=${providerRef}`,
      status: 'Pending',
    };
  }

  async verifyPayment(paymentAttemptId: string, payload: unknown): Promise<{ success: boolean; providerReference: string }> {
    const p = payload as { id?: string } | undefined;
    return { success: true, providerReference: p?.id || paymentAttemptId || 'PAYMOB-VERIFIED' };
  }
}

/**
 * 2. Vodafone Cash Provider (Mobile Wallet - Egypt)
 */
class VodafoneCashProvider implements IPaymentProvider {
  getProviderName(): PaymentProviderType { return 'VodafoneCash'; }
  getSupportedCountries(): string[] { return ['EG']; }
  getSupportedCurrencies(): CurrencyCode[] { return ['EGP']; }

  async initializePayment(request: PaymentInitializationRequest): Promise<PaymentInitializationResponse> {
    const attemptId = `vfcash-att-${Math.random().toString(36).substring(2, 9)}`;
    const providerRef = `VFCASH-OTP-${Math.floor(10000000 + Math.random() * 90000000)}`;

    return {
      paymentAttemptId: attemptId,
      idempotencyKey: request.idempotencyKey,
      provider: 'VodafoneCash',
      providerReference: providerRef,
      redirectUrl: `https://vf.cash/pay?ref=${providerRef}`,
      status: 'Pending',
    };
  }

  async verifyPayment(paymentAttemptId: string): Promise<{ success: boolean; providerReference: string }> {
    return { success: true, providerReference: `VFCASH-VERIFIED-${paymentAttemptId}` };
  }
}

/**
 * 3. InstaPay Provider (Egyptian IPN - Instant Payment Network)
 */
class InstaPayProvider implements IPaymentProvider {
  getProviderName(): PaymentProviderType { return 'InstaPay'; }
  getSupportedCountries(): string[] { return ['EG']; }
  getSupportedCurrencies(): CurrencyCode[] { return ['EGP']; }

  async initializePayment(request: PaymentInitializationRequest): Promise<PaymentInitializationResponse> {
    const attemptId = `instapay-att-${Math.random().toString(36).substring(2, 9)}`;
    const ipnRef = `IPN-${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    return {
      paymentAttemptId: attemptId,
      idempotencyKey: request.idempotencyKey,
      provider: 'InstaPay',
      providerReference: ipnRef,
      instaPayAddress: 'bahersilver@instapay',
      redirectUrl: `instapay://pay?address=bahersilver@instapay&amount=${request.amount.amountInCents / 100}`,
      status: 'Pending',
    };
  }

  async verifyPayment(paymentAttemptId: string): Promise<{ success: boolean; providerReference: string }> {
    return { success: true, providerReference: `INSTAPAY-OK-${paymentAttemptId}` };
  }
}

/**
 * 4. Meeza Provider (Egyptian National Card & Wallet Scheme)
 */
class MeezaProvider implements IPaymentProvider {
  getProviderName(): PaymentProviderType { return 'Meeza'; }
  getSupportedCountries(): string[] { return ['EG']; }
  getSupportedCurrencies(): CurrencyCode[] { return ['EGP']; }

  async initializePayment(request: PaymentInitializationRequest): Promise<PaymentInitializationResponse> {
    const attemptId = `meeza-att-${Math.random().toString(36).substring(2, 9)}`;
    const providerRef = `MEEZA-${Math.floor(10000000 + Math.random() * 90000000)}`;

    return {
      paymentAttemptId: attemptId,
      idempotencyKey: request.idempotencyKey,
      provider: 'Meeza',
      providerReference: providerRef,
      redirectUrl: `https://meeza.eg/pay?ref=${providerRef}`,
      status: 'Pending',
    };
  }

  async verifyPayment(paymentAttemptId: string): Promise<{ success: boolean; providerReference: string }> {
    return { success: true, providerReference: `MEEZA-OK-${paymentAttemptId}` };
  }
}

/**
 * 5. Stripe Provider (Global Credit & Debit Cards)
 */
class StripeProvider implements IPaymentProvider {
  getProviderName(): PaymentProviderType { return 'Stripe'; }
  getSupportedCountries(): string[] { return ['GLOBAL', 'EG', 'US', 'EU']; }
  getSupportedCurrencies(): CurrencyCode[] { return ['USD', 'EUR', 'EGP']; }

  async initializePayment(request: PaymentInitializationRequest): Promise<PaymentInitializationResponse> {
    const attemptId = `stripe-att-${Math.random().toString(36).substring(2, 9)}`;
    const providerRef = `pi_${Math.random().toString(36).substring(2, 16)}`;
    
    return {
      paymentAttemptId: attemptId,
      idempotencyKey: request.idempotencyKey,
      provider: 'Stripe',
      providerReference: providerRef,
      clientSecret: `${providerRef}_secret_${Math.random().toString(36).substring(2, 10)}`,
      status: 'Pending',
    };
  }

  async verifyPayment(paymentAttemptId: string, payload: unknown): Promise<{ success: boolean; providerReference: string }> {
    const p = payload as { paymentIntentId?: string } | undefined;
    return { success: true, providerReference: p?.paymentIntentId || paymentAttemptId || 'STRIPE-VERIFIED' };
  }
}

/**
 * 6. Apple Pay Provider (Digital Wallet)
 */
class ApplePayProvider implements IPaymentProvider {
  getProviderName(): PaymentProviderType { return 'ApplePay'; }
  getSupportedCountries(): string[] { return ['GLOBAL', 'EG', 'US', 'EU']; }
  getSupportedCurrencies(): CurrencyCode[] { return ['USD', 'EUR', 'EGP']; }

  async initializePayment(request: PaymentInitializationRequest): Promise<PaymentInitializationResponse> {
    const attemptId = `applepay-att-${Math.random().toString(36).substring(2, 9)}`;
    const providerRef = `APAY-TOKEN-${Math.random().toString(36).substring(2, 12)}`;

    return {
      paymentAttemptId: attemptId,
      idempotencyKey: request.idempotencyKey,
      provider: 'ApplePay',
      providerReference: providerRef,
      status: 'Pending',
    };
  }

  async verifyPayment(paymentAttemptId: string): Promise<{ success: boolean; providerReference: string }> {
    return { success: true, providerReference: `APAY-VERIFIED-${paymentAttemptId}` };
  }
}

/**
 * 7. Google Pay Provider (Digital Wallet)
 */
class GooglePayProvider implements IPaymentProvider {
  getProviderName(): PaymentProviderType { return 'GooglePay'; }
  getSupportedCountries(): string[] { return ['GLOBAL', 'EG', 'US', 'EU']; }
  getSupportedCurrencies(): CurrencyCode[] { return ['USD', 'EUR', 'EGP']; }

  async initializePayment(request: PaymentInitializationRequest): Promise<PaymentInitializationResponse> {
    const attemptId = `gpay-att-${Math.random().toString(36).substring(2, 9)}`;
    const providerRef = `GPAY-TOKEN-${Math.random().toString(36).substring(2, 12)}`;

    return {
      paymentAttemptId: attemptId,
      idempotencyKey: request.idempotencyKey,
      provider: 'GooglePay',
      providerReference: providerRef,
      status: 'Pending',
    };
  }

  async verifyPayment(paymentAttemptId: string): Promise<{ success: boolean; providerReference: string }> {
    return { success: true, providerReference: `GPAY-VERIFIED-${paymentAttemptId}` };
  }
}

/**
 * 8. Fawry Provider (Kiosk & Retail Reference Code)
 */
class FawryProvider implements IPaymentProvider {
  getProviderName(): PaymentProviderType { return 'Fawry'; }
  getSupportedCountries(): string[] { return ['EG']; }
  getSupportedCurrencies(): CurrencyCode[] { return ['EGP']; }

  async initializePayment(request: PaymentInitializationRequest): Promise<PaymentInitializationResponse> {
    const attemptId = `fawry-att-${Math.random().toString(36).substring(2, 9)}`;
    const fawryRef = `${Math.floor(900000000 + Math.random() * 100000000)}`;

    return {
      paymentAttemptId: attemptId,
      idempotencyKey: request.idempotencyKey,
      provider: 'Fawry',
      providerReference: `FAWRY-${fawryRef}`,
      fawryReferenceNumber: fawryRef,
      status: 'Pending',
    };
  }

  async verifyPayment(paymentAttemptId: string): Promise<{ success: boolean; providerReference: string }> {
    return { success: true, providerReference: `FAWRY-OK-${paymentAttemptId}` };
  }
}

/**
 * 9. ValU Provider (Buy Now Pay Later Installments)
 */
class ValuProvider implements IPaymentProvider {
  getProviderName(): PaymentProviderType { return 'ValU'; }
  getSupportedCountries(): string[] { return ['EG']; }
  getSupportedCurrencies(): CurrencyCode[] { return ['EGP']; }

  async initializePayment(request: PaymentInitializationRequest): Promise<PaymentInitializationResponse> {
    const attemptId = `valu-att-${Math.random().toString(36).substring(2, 9)}`;
    const providerRef = `VALU-PLAN-${Math.floor(1000000 + Math.random() * 9000000)}`;

    return {
      paymentAttemptId: attemptId,
      idempotencyKey: request.idempotencyKey,
      provider: 'ValU',
      providerReference: providerRef,
      redirectUrl: `https://valu.com.eg/checkout?ref=${providerRef}`,
      status: 'Pending',
    };
  }

  async verifyPayment(paymentAttemptId: string): Promise<{ success: boolean; providerReference: string }> {
    return { success: true, providerReference: `VALU-OK-${paymentAttemptId}` };
  }
}

/**
 * 10. Cash on Delivery (COD) Provider
 */
class CodProvider implements IPaymentProvider {
  getProviderName(): PaymentProviderType { return 'COD'; }
  getSupportedCountries(): string[] { return ['EG']; }
  getSupportedCurrencies(): CurrencyCode[] { return ['EGP']; }

  async initializePayment(request: PaymentInitializationRequest): Promise<PaymentInitializationResponse> {
    const attemptId = `cod-att-${Math.random().toString(36).substring(2, 9)}`;
    return {
      paymentAttemptId: attemptId,
      idempotencyKey: request.idempotencyKey,
      provider: 'COD',
      providerReference: `COD-REF-${Date.now()}`,
      status: 'Pending',
    };
  }

  async verifyPayment(paymentAttemptId: string): Promise<{ success: boolean; providerReference: string }> {
    return { success: true, providerReference: `COD-CONFIRMED-${paymentAttemptId}` };
  }
}

/**
 * CENTRAL PAYMENT REGISTRY & SERVICE FACTORY
 */
class PaymentService {
  private providers: Map<PaymentProviderType, IPaymentProvider> = new Map();
  private idempotencyStore: Map<string, PaymentAttempt> = new Map();

  constructor() {
    this.registerProvider(new PaymobProvider());
    this.registerProvider(new VodafoneCashProvider());
    this.registerProvider(new InstaPayProvider());
    this.registerProvider(new MeezaProvider());
    this.registerProvider(new StripeProvider());
    this.registerProvider(new ApplePayProvider());
    this.registerProvider(new GooglePayProvider());
    this.registerProvider(new FawryProvider());
    this.registerProvider(new ValuProvider());
    this.registerProvider(new CodProvider());
  }

  public registerProvider(provider: IPaymentProvider): void {
    this.providers.set(provider.getProviderName(), provider);
  }

  public getProvider(providerType: PaymentProviderType): IPaymentProvider {
    const provider = this.providers.get(providerType);
    if (!provider) {
      return this.providers.get('Paymob')!;
    }
    return provider;
  }

  public getSupportedProviders(): PaymentProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Automatically filter available payment methods based on customer country and currency!
   */
  public getAvailableProviders(countryCode = 'EG', currency: CurrencyCode = 'EGP'): PaymentProviderType[] {
    const uppercaseCountry = countryCode.toUpperCase();
    const available: PaymentProviderType[] = [];

    for (const [name, provider] of this.providers.entries()) {
      const countries = provider.getSupportedCountries();
      const currencies = provider.getSupportedCurrencies();

      const countryMatches = countries.includes('GLOBAL') || countries.includes(uppercaseCountry);
      const currencyMatches = currencies.includes(currency);

      if (countryMatches && currencyMatches) {
        available.push(name);
      }
    }

    return available;
  }

  /**
   * Process Payment Attempt with strict IDEMPOTENCY KEY validation
   */
  async processPaymentAttempt(
    providerType: PaymentProviderType,
    request: PaymentInitializationRequest
  ): Promise<PaymentAttempt> {
    if (this.idempotencyStore.has(request.idempotencyKey)) {
      return this.idempotencyStore.get(request.idempotencyKey)!;
    }

    const provider = this.getProvider(providerType);
    const response = await provider.initializePayment(request);

    const attempt: PaymentAttempt = {
      paymentAttemptId: response.paymentAttemptId,
      idempotencyKey: request.idempotencyKey,
      provider: response.provider,
      providerReference: response.providerReference,
      amount: request.amount,
      status: response.status,
      retryCount: request.retryCount || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.idempotencyStore.set(request.idempotencyKey, attempt);
    return attempt;
  }
}

export const paymentService = new PaymentService();
