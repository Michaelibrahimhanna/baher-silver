import { Money, zeroMoney, multiplyMoney } from '../types/money';

export interface TaxRule {
  id: string;
  name: string;
  category: 'standard' | 'bullion' | 'exempt';
  ratePercent: number;
  description: string;
}

export const DATA_DRIVEN_TAX_RULES: TaxRule[] = [
  {
    id: 'vat-eg-std',
    name: 'Egyptian VAT Standard',
    category: 'standard',
    ratePercent: 14.0,
    description: 'Standard 14% Value Added Tax on finished jewelry items.',
  },
  {
    id: 'vat-eg-bullion',
    name: 'Silver Bullion Zero-Rate',
    category: 'bullion',
    ratePercent: 0.0,
    description: '0% VAT rate applicable to raw silver bullion bars.',
  },
  {
    id: 'vat-exempt',
    name: 'Exempt Category',
    category: 'exempt',
    ratePercent: 0.0,
    description: 'Tax exempt under special export or diplomatic status.',
  },
];

class TaxService {
  private defaultRule = DATA_DRIVEN_TAX_RULES[0];

  calculateTax(
    taxableSubtotal: Money,
    category: 'standard' | 'bullion' | 'exempt' = 'standard'
  ): { taxAmount: Money; ratePercent: number; ruleApplied: TaxRule } {
    const rule = DATA_DRIVEN_TAX_RULES.find(r => r.category === category) || this.defaultRule;
    if (rule.ratePercent === 0 || taxableSubtotal.amountInCents === 0) {
      return {
        taxAmount: zeroMoney(taxableSubtotal.currency),
        ratePercent: 0,
        ruleApplied: rule,
      };
    }

    const calculatedTax = multiplyMoney(taxableSubtotal, rule.ratePercent / 100);
    return {
      taxAmount: calculatedTax,
      ratePercent: rule.ratePercent,
      ruleApplied: rule,
    };
  }
}

export const taxService = new TaxService();
