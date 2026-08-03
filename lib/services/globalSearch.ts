export interface GlobalSearchResultItem {
  id: string;
  category: 'product' | 'order' | 'customer' | 'inventory' | 'supplier' | 'qr_code' | 'invoice' | 'setting';
  title: string;
  subtitle?: string;
  badge?: string;
  url: string;
  score?: number;
}

export class GlobalSearchService {
  private static mockDatabaseIndex: GlobalSearchResultItem[] = [
    // Products
    { id: 'p1', category: 'product', title: 'خاتم فضة التراث الملكي عيار 925', subtitle: 'SKU: BS-RIN-SIL-101 | 180 EGP', badge: 'Published', url: '/admin/catalog/products/p1' },
    { id: 'p2', category: 'product', title: 'أقراط قطرة الأناقة الملكية', subtitle: 'SKU: BS-EAR-SIL-102 | 95 EGP', badge: 'Published', url: '/admin/catalog/products/p2' },
    { id: 'p3', category: 'product', title: 'قلادة مفتاح الحياة الفرعونية (Ankh)', subtitle: 'SKU: BS-NEC-SIL-103 | 1250 EGP', badge: 'Best Seller', url: '/admin/catalog/products/p3' },
    
    // Orders
    { id: 'ord-1', category: 'order', title: 'طلب رقم #BS-2026-000099', subtitle: 'العميل: أليكس فانس | Total: 1,250 EGP', badge: 'Paid', url: '/admin/orders/BS-2026-000099' },
    { id: 'ord-2', category: 'order', title: 'طلب رقم #BS-2026-000088', subtitle: 'العميل: د. طارق فؤاد | Total: 2,850 EGP', badge: 'Processing', url: '/admin/orders/BS-2026-000088' },

    // Customers
    { id: 'cust-1', category: 'customer', title: 'Alex Vance (أليكس فانس)', subtitle: 'alex@example.com | +201012345678', badge: 'Gold Tier', url: '/admin/customers/cust-1' },
    { id: 'cust-2', category: 'customer', title: 'د. طارق فؤاد', subtitle: 'tarek@example.com | القاهرة', badge: 'Platinum Tier', url: '/admin/customers/cust-2' },

    // Inventory
    { id: 'inv-1', category: 'inventory', title: 'خزينة القاهرة الرئيسية (Cairo Central Vault)', subtitle: 'المخزون الحالي: 1,450 قطعة فضية', badge: 'Main Vault', url: '/admin/erp/warehouses' },
    { id: 'inv-2', category: 'inventory', title: 'تسوية مخزون الفضة الخام - عيار 925', subtitle: 'الوزن: 450 جرام', badge: 'In Stock', url: '/admin/erp/inventory' },

    // Suppliers
    { id: 'sup-1', category: 'supplier', title: 'خان الخليلي للصياغة اليدوية (Cairo Craft Supplier)', subtitle: 'مورد معتمد الفضة والزركون', badge: 'Active Supplier', url: '/admin/erp/suppliers' },

    // QR Codes
    { id: 'qr-1', category: 'qr_code', title: 'QR-ROUTER-BSQR-HERITAGE-101', subtitle: 'وجهة العميل الديناميكية: صفحة المنتج', badge: 'Dynamic QR Router', url: '/r/BSQR-HERITAGE-101' },
    { id: 'qr-2', category: 'qr_code', title: 'QR-ROUTER-BSQR-WARRANTY-505', subtitle: 'وجهة العميل الديناميكية: شهادة الضمان', badge: 'Warranty Router', url: '/r/BSQR-WARRANTY-505' },

    // Invoices
    { id: 'invc-1', category: 'invoice', title: 'فاتورة ضريبية #INV-BS-2026-000099', subtitle: 'قيمة الفاتورة: 1,250 EGP | VAT 14%', badge: 'Tax Invoice', url: '/admin/invoices/INV-BS-2026-000099' },

    // Settings
    { id: 'set-1', category: 'setting', title: 'إعدادات العملة والضرائب (Currency & Taxes)', subtitle: 'العملة الرئيسية EGP | نسبة ضريبة المبيعات 14%', badge: 'Settings', url: '/admin/settings' },
    { id: 'set-2', category: 'setting', title: 'موجّه الـ QR الديناميكي الذكي (Dynamic QR Router)', subtitle: 'الوجهة الافتراضية والتحويلات الخاروجية', badge: 'Settings', url: '/admin/settings' },
  ];

  static search(query: string): GlobalSearchResultItem[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return this.mockDatabaseIndex.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      (item.badge && item.badge.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  }
}
