import { BaherSilverSettings } from '@/types/settings';

export const DEFAULT_BAHER_SETTINGS: BaherSilverSettings = {
  general: {
    storeNameEn: 'Baher Silver & Fine Jewelry',
    storeNameAr: 'باهر سيلفر للمجوهراات والفضيات',
    storeLogoUrl: '/logo.png',
    primaryCurrency: 'EGP',
    supportedCurrencies: ['EGP', 'USD', 'EUR'],
    defaultLanguage: 'ar',
    timezone: 'Africa/Cairo',
  },
  tax: {
    standardVatPercent: 14.0,
    bullionZeroRateEnabled: true,
    silverSpotMarkupPercent: 15.0,
    autoUpdateSilverPrices: true,
  },
  shipping: {
    defaultCarrier: 'bosta',
    freeShippingThresholdEgp: 2000,
    flatRateCairoEgp: 50,
    flatRateGovernoratesEgp: 85,
  },
  qrRouter: {
    defaultDestination: 'product',
    baseUrl: 'https://bahersilver.com',
    enableDynamicRouter: true,
    scanAnalyticsTracking: true,
  },
  seo: {
    defaultMetaTitleAr: 'باهر سيلفر | مجوهرات فضية 925 فاخرة مصرية',
    defaultMetaTitleEn: 'Baher Silver | Luxury 925 Sterling Silver Jewelry',
    defaultMetaDescriptionAr: 'تسوق أفضل المجوهرات والفضيات الأصلية عيار 925 المصنعة يدوياً ضمان مدى الحياة.',
    defaultMetaDescriptionEn: 'Handcrafted authentic 925 sterling silver jewelry with lifetime guarantee.',
    defaultOgImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f',
  },
};

class SettingsEngine {
  private currentSettings: BaherSilverSettings = DEFAULT_BAHER_SETTINGS;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('baher_silver_central_settings');
        if (stored) {
          this.currentSettings = JSON.parse(stored);
        }
      } catch {
        // Ignored
      }
    }
  }

  getSettings(): BaherSilverSettings {
    return this.currentSettings;
  }

  updateSettings(partial: Partial<BaherSilverSettings>): BaherSilverSettings {
    this.currentSettings = {
      ...this.currentSettings,
      ...partial,
      general: { ...this.currentSettings.general, ...(partial.general || {}) },
      tax: { ...this.currentSettings.tax, ...(partial.tax || {}) },
      shipping: { ...this.currentSettings.shipping, ...(partial.shipping || {}) },
      qrRouter: { ...this.currentSettings.qrRouter, ...(partial.qrRouter || {}) },
      seo: { ...this.currentSettings.seo, ...(partial.seo || {}) },
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('baher_silver_central_settings', JSON.stringify(this.currentSettings));
      } catch {
        // Ignored
      }
    }

    return this.currentSettings;
  }
}

export const settingsEngine = new SettingsEngine();
