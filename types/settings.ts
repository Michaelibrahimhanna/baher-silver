import { CurrencyCode } from '@/lib/types/money';
import { QRDestinationType } from './catalog';

export interface GeneralBrandingSettings {
  storeNameEn: string;
  storeNameAr: string;
  storeLogoUrl: string;
  primaryCurrency: CurrencyCode;
  supportedCurrencies: CurrencyCode[];
  defaultLanguage: 'ar' | 'en';
  timezone: string;
}

export interface TaxPricingSettings {
  standardVatPercent: number;
  bullionZeroRateEnabled: boolean;
  silverSpotMarkupPercent: number;
  autoUpdateSilverPrices: boolean;
}

export interface ShippingFulfillmentSettings {
  defaultCarrier: 'bosta' | 'aramex';
  freeShippingThresholdEgp: number;
  flatRateCairoEgp: number;
  flatRateGovernoratesEgp: number;
}

export interface QRRouterSettings {
  defaultDestination: QRDestinationType;
  baseUrl: string;
  enableDynamicRouter: boolean;
  scanAnalyticsTracking: boolean;
}

export interface SystemSeoSettings {
  defaultMetaTitleAr: string;
  defaultMetaTitleEn: string;
  defaultMetaDescriptionAr: string;
  defaultMetaDescriptionEn: string;
  defaultOgImage: string;
}

export interface BaherSilverSettings {
  general: GeneralBrandingSettings;
  tax: TaxPricingSettings;
  shipping: ShippingFulfillmentSettings;
  qrRouter: QRRouterSettings;
  seo: SystemSeoSettings;
}
