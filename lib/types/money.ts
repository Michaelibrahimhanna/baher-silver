export type CurrencyCode = 'EGP' | 'USD' | 'EUR';

export interface Money {
  amountInCents: number; // Stored as integer (cents/piastres) to eliminate floating point issues
  currency: CurrencyCode;
}

// Exchange rates relative to EGP (Base currency)
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  EGP: 1,
  USD: 0.021, // ~47.6 EGP per USD
  EUR: 0.019, // ~52.6 EGP per EUR
};

/**
 * Creates a Money object from a human-readable decimal amount (e.g. 150.50)
 */
export function createMoney(amount: number, currency: CurrencyCode = 'EGP'): Money {
  return {
    amountInCents: Math.round(amount * 100),
    currency,
  };
}

/**
 * Converts Money object to human-readable decimal float (e.g. 150.50)
 */
export function moneyToDecimal(money: Money): number {
  return money.amountInCents / 100;
}

/**
 * Formats a Money object into a formatted string (e.g., "EGP 150.50" or "$15.00")
 */
export function formatMoney(money: Money, locale: string = 'en'): string {
  const decimal = moneyToDecimal(money);
  const formatter = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(decimal);
}

/**
 * Decimal-safe Addition
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    const convertedB = convertMoney(b, a.currency);
    return {
      amountInCents: a.amountInCents + convertedB.amountInCents,
      currency: a.currency,
    };
  }
  return {
    amountInCents: a.amountInCents + b.amountInCents,
    currency: a.currency,
  };
}

/**
 * Decimal-safe Subtraction
 */
export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    const convertedB = convertMoney(b, a.currency);
    return {
      amountInCents: Math.max(0, a.amountInCents - convertedB.amountInCents),
      currency: a.currency,
    };
  }
  return {
    amountInCents: Math.max(0, a.amountInCents - b.amountInCents),
    currency: a.currency,
  };
}

/**
 * Decimal-safe Multiplication
 */
export function multiplyMoney(money: Money, factor: number): Money {
  return {
    amountInCents: Math.round(money.amountInCents * factor),
    currency: money.currency,
  };
}

/**
 * Decimal-safe Currency Conversion
 */
export function convertMoney(money: Money, targetCurrency: CurrencyCode): Money {
  if (money.currency === targetCurrency) return money;
  
  const sourceRate = EXCHANGE_RATES[money.currency];
  const targetRate = EXCHANGE_RATES[targetCurrency];
  
  const egpCents = money.amountInCents / sourceRate;
  const targetCents = Math.round(egpCents * targetRate);

  return {
    amountInCents: targetCents,
    currency: targetCurrency,
  };
}

/**
 * Zero Money Helper
 */
export function zeroMoney(currency: CurrencyCode = 'EGP'): Money {
  return { amountInCents: 0, currency };
}
