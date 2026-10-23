/**
 * Baher Silver — POS Terminology & Localization Dictionary (Arabic-First)
 *
 * Centralized bilingual dictionary for all POS terminal interfaces,
 * cashier operations, discount management, manager overrides, and receipts.
 */

export type SupportedLocale = 'ar' | 'en';

export const POS_TERMINOLOGY = {
  ar: {
    // Header & Meta
    system_title: 'نظام نقاط البيع — باهر للفضة (Baher POS)',
    terminal_console: 'شاشة نقطة البيع',
    terminal_label: 'نقطة البيع:',
    branch_cairo: 'فرع بوتيك القاهرة الرئيسي • Cairo Main Boutique',
    shift_active: 'الوردية نشطة (Shift Active)',
    shift_closed: 'الوردية مغلقة (Shift Closed)',
    cashier_label: 'الكاشير (Cashier):',
    expected_cash: 'النقدية المتوقعة (Expected Cash):',
    currency: 'ج.م',
    currency_code: 'EGP',

    // Action Bar Buttons
    process_return: 'إرجاع فاتورة (Process Return)',
    cash_movement: 'حركة نقدية (Cash Movement)',
    close_shift: 'إغلاق الوردية (Close Shift Z-Report)',
    open_shift: 'فتح وردية كاشير (Open Shift)',

    // Product Search & Presets
    search_placeholder: 'امسح باركود القطعة، الرقم التسلسلي، أو ابحث باسم المنتج... (Scan Barcode / Serial / SKU)',
    lookup_button: 'بحث (Lookup)',
    quick_presets_heading: 'الكتالوج السريع • اضغط للإضافة للسلة (Quick Catalog Presets)',
    purity_925: 'عيار 925',
    serialized_badge: 'قطعة مرقمة (Serialized)',
    retail_badge: 'تجزئة عامة (Retail)',
    weight_label: 'جرام (g)',

    // Cart
    active_cart: 'السلة النشطة (Active Cart)',
    items_count: 'عناصر',
    customer_label: 'العميل (Customer):',
    anonymous_customer: 'عميل عام غير مسجل (Walk-In Anonymous)',
    attach_customer: 'ربط عميل (Attach) ←',
    detach_customer: 'إلغاء الربط',
    empty_cart_title: 'السلة فارغة حالياً (Cart is currently empty)',
    empty_cart_subtitle: 'امسح باركود المنتج أو اختر من الكتالوج السريع لبدء البيع',
    subtotal: 'المجموع الفرعي (Subtotal)',
    total_silver_weight: 'إجمالي وزن الفضة (Total Silver Weight):',
    commercial_discount: 'الخصم التجاري (Discount)',
    apply_discount_btn: 'تطبيق خصم (Apply Discount)',
    edit_discount_btn: 'تعديل الخصم (Edit Discount)',
    remove_discount_btn: 'حذف الخصم (Remove Discount)',
    manager_approved_badge: 'معتمد من المدير (Manager Approved)',
    net_payable: 'الصافي للدفع (Net Payable)',
    proceed_to_payment: 'المتابعة للدفع (Proceed to Payment)',

    // Discount Modal
    discount_modal_title: 'تطبيق خصم تجاري (Apply Commercial Discount)',
    discount_type_percent: 'نسبة مئوية (%)',
    discount_type_fixed: 'مبلغ ثابت (ج.م EGP)',
    discount_value_label: 'قيمة الخصم المطلوبة (Discount Value)',
    discount_reason_label: 'سبب الخصم (Reason)',
    discount_reason_placeholder: 'أدخل سبب منح الخصم (إلزامي في حال تجاوز حد الكاشير)...',
    cashier_limit_info: 'صلاحية الكاشير المباشرة: حتى 5% أو 150 ج.م كحد أقصى (Cashier Limit: <= 5% or <= 150 EGP)',
    manager_override_warning: 'تنبيه: الخصم يتجاوز صلاحية الكاشير ويتطلب اعتماد المدير (Manager Override Required)',
    manager_credentials_title: 'بيانات اعتماد المدير المصرح له (Manager Approval Credentials)',
    manager_email_label: 'البريد الإلكتروني للمدير (Manager Email)',
    manager_password_label: 'كلمة المرور للمدير (Manager Password)',
    authorize_override_btn: 'اعتماد الخصم بواسطة المدير (Authorize Override)',
    apply_cashier_discount_btn: 'تطبيق الخصم المباشر (Apply Discount)',
    cancel_btn: 'إلغاء (Close)',
    discount_approved_success: 'تم اعتماد وتوثيق الخصم بنجاح من المدير (Approved by Manager):',

    // Cash Movement Modal
    cash_movement_title: 'حركة نقدية بالدرج (Till Cash Movement)',
    active_drawer_label: 'درج الخزينة النشط (Active Drawer)',
    available_cash_label: 'النقدية المتاحة (Available Cash)',
    cash_out: 'سحب نقدي (Cash Out)',
    expense: 'مصروفات (Expense)',
    safe_drop: 'إيداع الخزينة (Safe Drop)',
    cash_movement_amount: 'المبلغ (ج.م EGP)',
    cash_movement_reason: 'السبب / البيان (Reason)',
    confirm_movement_btn: 'تأكيد الحركة النقدية (Confirm Movement)',
    movement_confirmed_banner: 'تم تأكيد الحركة من الخادم (Movement Confirmed by Server)',

    // Payment Tender Modal
    payment_title: 'الدفع والتحصيل (Payment Tender)',
    net_amount_due: 'المبلغ الصافي المطلوب تحصيله (Net Payable):',
    payment_method_label: 'طريقة التحصيل (Payment Method):',
    pay_cash: 'نقدي (Cash)',
    pay_card: 'بطاقة مصرفية (Card)',
    pay_instapay: 'إنستاباي (InstaPay)',
    pay_split: 'دفع مجزأ (Split)',
    cash_tendered_label: 'المبلغ النقدي المسلم من العميل (Cash Tendered):',
    change_due_label: 'المتبقي للعميل الفكة (Change Due):',
    confirm_payment_btn: 'إتمام الفاتورة وطباعة الإيصال (Complete Sale)',

    // Receipt Modal
    receipt_title: 'فاتورة ضريبية مبسطة (Simplified Tax Invoice)',
    receipt_success_banner: 'تم تنفيذ الفاتورة وتسجيل السند المخزني والمالي بنجاح',
    receipt_no_label: 'رقم الفاتورة (Receipt #):',
    receipt_date_label: 'التاريخ والوقت (Date):',
    receipt_cashier_label: 'الكاشير المسؤول (Cashier):',
    receipt_customer_label: 'بيانات العميل (Customer):',
    receipt_items_label: 'تفاصيل الأصناف (Items Breakdown):',
    receipt_subtotal: 'المجموع قبل الخصم (Subtotal):',
    receipt_discount: 'الخصم الممنوح (Discount):',
    receipt_manager_override: 'اعتماد المدير الاستثنائي (Manager Override):',
    receipt_total: 'الإجمالي الصافي المدفوع (Net Total):',
    zatca_qr_caption: 'رمز التحقق الإلكتروني المعتمد ZATCA / ETA',
    next_customer_btn: 'فاتورة جديدة / العميل التالي (New Sale) ←'
  },
  en: {
    // Header & Meta
    system_title: 'Baher POS Console',
    terminal_console: 'Terminal Console',
    terminal_label: 'Terminal:',
    branch_cairo: 'Cairo Main Boutique',
    shift_active: 'Shift Active',
    shift_closed: 'Shift Closed',
    cashier_label: 'Cashier:',
    expected_cash: 'Expected Cash:',
    currency: 'EGP',
    currency_code: 'EGP',

    // Action Bar Buttons
    process_return: 'Process Return',
    cash_movement: 'Cash Movement',
    close_shift: 'Close Shift (Z-Report)',
    open_shift: 'Open Cashier Shift',

    // Product Search & Presets
    search_placeholder: 'Scan EAN-13 Barcode, Serial (SN-BHR-...), or Product SKU...',
    lookup_button: 'Lookup',
    quick_presets_heading: 'QUICK CATALOG PRESETS • CLICK TO ADD TO CART',
    purity_925: '925',
    serialized_badge: 'Serialized',
    retail_badge: 'RETAIL',
    weight_label: 'g',

    // Cart
    active_cart: 'Active Cart',
    items_count: 'items',
    customer_label: 'Customer:',
    anonymous_customer: 'Walk-In (Anonymous)',
    attach_customer: 'Attach →',
    detach_customer: 'Detach',
    empty_cart_title: 'Cart is currently empty',
    empty_cart_subtitle: 'Scan an EAN-13 barcode or select a preset to start checkout',
    subtotal: 'Subtotal',
    total_silver_weight: 'Total Silver Weight:',
    commercial_discount: 'Commercial Discount',
    apply_discount_btn: 'Apply Discount',
    edit_discount_btn: 'Edit Discount',
    remove_discount_btn: 'Remove Discount',
    manager_approved_badge: 'Manager Approved',
    net_payable: 'Net Payable',
    proceed_to_payment: 'Proceed to Payment',

    // Discount Modal
    discount_modal_title: 'Apply Commercial Discount',
    discount_type_percent: 'Percentage (%)',
    discount_type_fixed: 'Fixed Amount (EGP)',
    discount_value_label: 'Discount Value',
    discount_reason_label: 'Discount Reason',
    discount_reason_placeholder: 'Enter reason (mandatory for manager override)...',
    cashier_limit_info: 'Cashier Authority: Up to 5% or 150 EGP maximum.',
    manager_override_warning: 'Notice: This discount exceeds cashier authority and requires manager approval.',
    manager_credentials_title: 'Authorized Manager Credentials (Store Manager / Admin)',
    manager_email_label: 'Manager Email',
    manager_password_label: 'Manager Password',
    authorize_override_btn: 'Authorize & Approve Discount',
    apply_cashier_discount_btn: 'Apply Cashier Discount',
    cancel_btn: 'Cancel',
    discount_approved_success: 'Discount successfully authorized by manager:',

    // Cash Movement Modal
    cash_movement_title: 'Till Cash Movement',
    active_drawer_label: 'ACTIVE TERMINAL DRAWER',
    available_cash_label: 'AVAILABLE CASH',
    cash_out: 'Cash Out',
    expense: 'Expense',
    safe_drop: 'Safe Drop',
    cash_movement_amount: 'Amount (EGP)',
    cash_movement_reason: 'Reason / Description',
    confirm_movement_btn: 'Confirm Movement',
    movement_confirmed_banner: 'Movement Confirmed by Server',

    // Payment Tender Modal
    payment_title: 'Payment Tender',
    net_amount_due: 'Net Payable Amount:',
    payment_method_label: 'Payment Method:',
    pay_cash: 'Cash',
    pay_card: 'Card',
    pay_instapay: 'InstaPay',
    pay_split: 'Split Payment',
    cash_tendered_label: 'Cash Tendered:',
    change_due_label: 'Change Due:',
    confirm_payment_btn: 'Complete Sale & Print Receipt',

    // Receipt Modal
    receipt_title: 'Simplified Tax Invoice',
    receipt_success_banner: 'Transaction successfully executed and ledger sealed',
    receipt_no_label: 'Receipt #:',
    receipt_date_label: 'Date & Time:',
    receipt_cashier_label: 'Cashier:',
    receipt_customer_label: 'Customer:',
    receipt_items_label: 'Items Breakdown:',
    receipt_subtotal: 'Subtotal:',
    receipt_discount: 'Discount:',
    receipt_manager_override: 'Manager Override:',
    receipt_total: 'Net Total Paid:',
    zatca_qr_caption: 'ZATCA / ETA Electronic Tax Verification QR',
    next_customer_btn: 'New Sale / Next Customer ->'
  }
};

export function getPosTerminology(locale: string = 'ar') {
  const normLocale: SupportedLocale = locale === 'en' ? 'en' : 'ar';
  return POS_TERMINOLOGY[normLocale];
}
