export type NotificationCategory =
  | 'orders'
  | 'payments'
  | 'stock_alert'
  | 'ai_suggestion'
  | 'approval'
  | 'supplier';

export interface EnterpriseNotificationItem {
  id: string;
  category: NotificationCategory;
  title_ar: string;
  title_en: string;
  message_ar: string;
  message_en: string;
  read: boolean;
  timestamp: string;
  action_url?: string;
}

export const INITIAL_ENTERPRISE_NOTIFICATIONS: EnterpriseNotificationItem[] = [
  {
    id: 'ntf-1',
    category: 'orders',
    title_ar: 'طلب جديد #BS-2026-000099',
    title_en: 'New Order #BS-2026-000099',
    message_ar: 'تم الدفع بنجاح بقيمة 1,250 EGP عبر Paymob.',
    message_en: 'Payment approved for 1,250 EGP via Paymob.',
    read: false,
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    action_url: '/admin/orders/BS-2026-000099',
  },
  {
    id: 'ntf-2',
    category: 'stock_alert',
    title_ar: 'تنبيه انخفاض المخزون (Low Stock Alert)',
    title_en: 'Low Stock Alert',
    message_ar: 'انخفض مخزون "أقراط قطرة الأناقة" إلى 2 قطعة فقط.',
    message_en: 'Elegance Drop Earrings stock reached 2 items.',
    read: false,
    timestamp: new Date(Date.now() - 35 * 60000).toISOString(),
    action_url: '/admin/catalog/products/p2',
  },
  {
    id: 'ntf-3',
    category: 'ai_suggestion',
    title_ar: 'توصية الذكاء الاصطناعي Baher Brain',
    title_en: 'AI Brain Recommendation',
    message_ar: 'يُنصح بإضافة 3 كلمات مفتاحية SEO لزيادة ظهور خاتم الفضة.',
    message_en: 'Recommended adding 3 SEO keywords for silver ring.',
    read: true,
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    action_url: '/admin/catalog/products/p1',
  },
  {
    id: 'ntf-4',
    category: 'supplier',
    title_ar: 'شحنة مورد خان الخليلي',
    title_en: 'Supplier Shipment Dispatched',
    message_ar: 'تم إرسال شحنة الفضة الخام رقم SUP-883 من القاهرة.',
    message_en: 'Raw silver shipment SUP-883 dispatched from Cairo.',
    read: true,
    timestamp: new Date(Date.now() - 240 * 60000).toISOString(),
    action_url: '/admin/erp/suppliers',
  },
];

class EnterpriseNotificationStore {
  private items: EnterpriseNotificationItem[] = INITIAL_ENTERPRISE_NOTIFICATIONS;

  getNotifications(): EnterpriseNotificationItem[] {
    return this.items;
  }

  getUnreadCount(): number {
    return this.items.filter((i) => !i.read).length;
  }

  markAsRead(id: string): void {
    this.items = this.items.map((i) => (i.id === id ? { ...i, read: true } : i));
  }

  markAllAsRead(): void {
    this.items = this.items.map((i) => ({ ...i, read: true }));
  }

  clearAll(): void {
    this.items = [];
  }

  addNotification(item: Omit<EnterpriseNotificationItem, 'id' | 'timestamp' | 'read'>): EnterpriseNotificationItem {
    const newNotif: EnterpriseNotificationItem = {
      ...item,
      id: `ntf-${Date.now()}`,
      read: false,
      timestamp: new Date().toISOString(),
    };
    this.items = [newNotif, ...this.items];
    return newNotif;
  }
}

export const enterpriseNotificationStore = new EnterpriseNotificationStore();
