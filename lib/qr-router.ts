import { QRDestinationType, QRRouterConfig } from '@/types/catalog';

/**
 * Dynamic QR Router Service
 * Customer QR code payloads point strictly to dynamic router links: /r/[router_token].
 * The router maps dynamically to target destinations without reprinting QR physical labels.
 */

export const ROUTER_DESTINATION_MAP: Record<
  QRDestinationType,
  {
    name_ar: string;
    name_en: string;
    description: string;
    defaultTargetPattern: string;
    isDisabled?: boolean;
  }
> = {
  product: {
    name_ar: 'صفحة المنتج بالمتجر',
    name_en: 'Storefront Product Page',
    description: 'توجيه العميل مباشرة إلى صفحة شراء ومعلومات المنتج',
    defaultTargetPattern: '/(storefront)/products/[slug]',
  },
  warranty: {
    name_ar: 'فحص الضمان الذكي',
    name_en: 'Smart Warranty Verification',
    description: 'توجيه العميل إلى صفحة التحقق من سريان الضمان الفضي مدى الحياة',
    defaultTargetPattern: '/warranty/verify?token=[token]',
  },
  authentication: {
    name_ar: 'التحقق من الأصالة والتشفير',
    name_en: 'Authenticity & Encrypted Certificate',
    description: 'التحقق من بصمة الفضة الرقمية وشهادة الأصالة المشفرة',
    defaultTargetPattern: '/verify/[token]',
  },
  repair: {
    name_ar: 'خدمات التلميع والإنقاذ والصيانة',
    name_en: 'Polishing & Repair Center',
    description: 'تقديم طلب صيانة أو إعادة تلميع للقطعة الفضية',
    defaultTargetPattern: '/repairs/track?token=[token]',
  },
  certificate: {
    name_ar: 'شهادة النقاء والمواصفات',
    name_en: 'Silver Purity Certificate',
    description: 'استعراض شهادة عيار الفضة المعتمدة مدمجة برقم الشحنة',
    defaultTargetPattern: '/certificate/[token]',
  },
  memories: {
    name_ar: 'ذكريات باهر (Baher Memories)',
    name_en: 'Baher Memories Digital Portal',
    description: 'بوابة إهداء الذكريات والتسجيلات الفضية الخالدة (سبرينت قادم)',
    defaultTargetPattern: '/memories/[token]',
    isDisabled: true,
  },
  future_services: {
    name_ar: 'خدمات مستقبلية قابلة للتهيئة (Custom Webhook)',
    name_en: 'Configurable Future Service Endpoint',
    description: 'رابط خارجي مخصص أو مسار جديد مخصص في النظام',
    defaultTargetPattern: '/services/custom?token=[token]',
  },
};

export function generateQRRouterConfig(
  productSlug: string,
  destinationType: QRDestinationType = 'product',
  customUrl?: string
): QRRouterConfig {
  const token = `BSQR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  return {
    qr_code: `QR-ROUTER-${token}`,
    router_token: token,
    destination_type: destinationType,
    custom_target_url: customUrl,
    is_active: true,
    scan_count: 0,
    created_at: new Date().toISOString(),
  };
}

export function resolveQRDestinationUrl(
  config: QRRouterConfig,
  productSlug: string,
  baseUrl: string = 'https://bahersilver.com'
): { targetUrl: string; isDisabled: boolean; message?: string } {
  const destMeta = ROUTER_DESTINATION_MAP[config.destination_type];

  if (!config.is_active) {
    return {
      targetUrl: `${baseUrl}/qr/inactive`,
      isDisabled: true,
      message: 'رمز الاستجابة السريعة متوقف حالياً.',
    };
  }

  if (destMeta?.isDisabled || config.destination_type === 'memories') {
    return {
      targetUrl: `${baseUrl}/memories/disabled`,
      isDisabled: true,
      message: 'خدمة Baher Memories تحت التطوير وستكون متاح قريباً.',
    };
  }

  if (config.custom_target_url && config.custom_target_url.trim().length > 0) {
    return {
      targetUrl: config.custom_target_url,
      isDisabled: false,
    };
  }

  // Map default target patterns
  let relativePath = destMeta.defaultTargetPattern;
  relativePath = relativePath.replace('[slug]', productSlug).replace('[token]', config.router_token);

  return {
    targetUrl: `${baseUrl}${relativePath}`,
    isDisabled: false,
  };
}
