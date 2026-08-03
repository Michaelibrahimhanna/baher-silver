export type SystemDomain = 'orders' | 'payments' | 'inventory' | 'catalog' | 'security' | 'master_data' | 'ai_brain';

export interface GlobalActivityEvent {
  id: string;
  domain: SystemDomain;
  actor_name: string;
  actor_role: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

class GlobalActivityBus {
  private events: GlobalActivityEvent[] = [
    {
      id: 'act-101',
      domain: 'orders',
      actor_name: 'System Checkout Engine',
      actor_role: 'System',
      title_ar: 'طلب جديد #BS-2026-000099',
      title_en: 'New Order Received #BS-2026-000099',
      description_ar: 'تم استقبال طلب جديد من العميل Alex Vance بقيمة 1,250 EGP عبر بوابة Paymob.',
      description_en: 'Received order from Alex Vance value 1,250 EGP via Paymob.',
      severity: 'success',
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    },
    {
      id: 'act-102',
      domain: 'payments',
      actor_name: 'Paymob Gateway',
      actor_role: 'Integration',
      title_ar: 'تأكيد الدفع الإلكتروني',
      title_en: 'Payment Confirmation Approved',
      description_ar: 'تم خصم 1,250 EGP بنجاح وإصدار المعاملة رقم TXN-998822.',
      description_en: 'Successfully processed 1,250 EGP transaction TXN-998822.',
      severity: 'success',
      timestamp: new Date(Date.now() - 4 * 60000).toISOString(),
    },
    {
      id: 'act-103',
      domain: 'inventory',
      actor_name: 'Inventory Controller',
      actor_role: 'Vault Officer',
      title_ar: 'خصم المخزون الآلي',
      title_en: 'Automatic Stock Deduction',
      description_ar: 'تم حجز وخصم قطعة واحدة من خاتم الفضة الفرعوني من خزينة القاهرة.',
      description_en: 'Reserved 1 unit of Pharaonic Silver Ring from Cairo Vault.',
      severity: 'info',
      timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
    },
    {
      id: 'act-104',
      domain: 'ai_brain',
      actor_name: 'Baher Brain AI Engine',
      actor_role: 'AI Assistant',
      title_ar: 'توصية تسعير الذكاء الاصطناعي',
      title_en: 'AI Pricing Recommendation',
      description_ar: 'تم اكتشاف ارتفاع بورصة الفضة العالمية بنسبة 0.4% وتوصية بتعديل مصنعية الفضة.',
      description_en: 'Detected 0.4% silver spot increase. Recommended formula cost adjustment.',
      severity: 'warning',
      timestamp: new Date(Date.now() - 1 * 60000).toISOString(),
    },
  ];

  getEvents(domainFilter?: SystemDomain): GlobalActivityEvent[] {
    if (!domainFilter) return this.events;
    return this.events.filter((e) => e.domain === domainFilter);
  }

  logEvent(event: Omit<GlobalActivityEvent, 'id' | 'timestamp'>): GlobalActivityEvent {
    const fullEvent: GlobalActivityEvent = {
      ...event,
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    this.events = [fullEvent, ...this.events];
    return fullEvent;
  }
}

export const globalActivityBus = new GlobalActivityBus();
