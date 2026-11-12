'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  Scale, 
  Receipt, 
  Boxes, 
  BookOpen, 
  RefreshCw, 
  TrendingUp, 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  ArrowUpRight, 
  Coins, 
  Building2, 
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Lock,
  Layers,
  ChevronRight
} from 'lucide-react';

interface DashboardTelemetry {
  inventory: {
    totalPieces: number;
    totalGrossWeightGrams: number;
    totalNetWeightGrams: number;
    fineSilver999Grams: number;
    availablePieces: number;
    soldPieces: number;
    pendingInspectionPieces: number;
    quarantinedPieces: number;
  };
  sales: {
    invoiceCount: number;
    totalRevenueEgp: number;
    retailRevenueEgp: number;
    wholesaleRevenueEgp: number | null;
    soldSilverGrams: number;
  };
  traders: {
    activeTradersCount: number;
    traderCashBalanceEgp: number;
    traderSilver999BalanceGrams: number;
  } | null;
  returns: {
    returnCount: number;
    totalRefundedEgp: number;
    totalReturnedWeightGrams: number;
  };
  shift: {
    id: string;
    status: string;
    terminalId: string;
    openedAt: string;
    cashierName: string;
    openingFloat: number;
    currentExpectedCash: number;
  } | null;
  spotRate: {
    spotPricePerGramEgp: number;
    basePurity: number;
    effectiveDate: string;
  } | null;
  recentInvoices: Array<{
    id: string;
    invoice_number: string;
    invoice_date: string;
    customer_name: string;
    total_items_count: number;
    final_total_egp: string;
    payment_method: string;
    status: string;
    invoice_type: string;
    created_at: string;
  }>;
}

export default function BaherSilverDashboardPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const isArabic = locale !== 'en';

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<DashboardTelemetry | null>(null);
  const [userRole, setUserRole] = React.useState<string>('StoreManager');
  const [isCashier, setIsCashier] = React.useState<boolean>(false);
  const [refreshing, setRefreshing] = React.useState(false);

  const fetchDashboardTelemetry = React.useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      const res = await fetch('/api/dashboard/stats', {
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!res.ok) {
        if (res.status === 401) {
          setError(isArabic ? 'يرجى تسجيل الدخول لعرض لوحة التحكم' : 'Please log in to view the dashboard');
          return;
        }
        throw new Error(`HTTP_${res.status}`);
      }

      const json = await res.json();
      if (json.success && json.telemetry) {
        setData(json.telemetry);
        setUserRole(json.userRole || 'StoreManager');
        setIsCashier(Boolean(json.isCashier));
      } else {
        throw new Error(json.error || 'Failed to load telemetry');
      }
    } catch (err: any) {
      console.error('Dashboard telemetry fetch failed:', err);
      setError(isArabic ? 'تعذر جلب مؤشرات قاعدة البيانات الحالية' : 'Failed to fetch PostgreSQL telemetry');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isArabic]);

  React.useEffect(() => {
    fetchDashboardTelemetry();
  }, [fetchDashboardTelemetry]);

  // Formatters
  const fmtGrams = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return isArabic ? '0.00 جم' : '0.00 g';
    return `${Number(val).toLocaleString(isArabic ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${isArabic ? 'جم' : 'g'}`;
  };

  const fmtEgp = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return isArabic ? '0.00 ج.م' : 'EGP 0.00';
    return `${Number(val).toLocaleString(isArabic ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${isArabic ? 'ج.م' : 'EGP'}`;
  };

  const fmtNum = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return Number(val).toLocaleString(isArabic ? 'ar-EG' : 'en-US');
  };

  return (
    <div className="min-h-screen bg-[#07070A] text-neutral-100 p-4 md:p-6 lg:p-8" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Top Banner / Store Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">💎</span>
            <h1 className="text-xl md:text-2xl font-serif font-bold tracking-wide text-[#F0D060]">
              {isArabic ? 'باهر سيلفر — لوحة تحكم الفضة وإدارة المحل' : 'Baher Silver — Real-time Silver ERP Dashboard'}
            </h1>
          </div>
          <p className="text-xs text-neutral-400">
            {isArabic 
              ? 'مؤشرات تشغيلية حية متصلة بقاعدة بيانات Staging المعزولة (PostgreSQL 18.6)' 
              : 'Live operational telemetry bound to isolated Staging PostgreSQL 18.6'}
          </p>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Spot Rate Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#111118] border border-[#D4AF37]/30 text-xs">
            <span className="text-neutral-400">{isArabic ? 'فضة 999:' : 'Silver 999:'}</span>
            <span className="font-mono font-bold text-[#D4AF37]">
              {data?.spotRate ? `${data.spotRate.spotPricePerGramEgp} ج.م/جم` : (isArabic ? 'غير محدد' : 'N/A')}
            </span>
          </div>

          {/* Active Shift Pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs ${
            data?.shift?.status === 'OPEN'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-neutral-800 border-neutral-700 text-neutral-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${data?.shift?.status === 'OPEN' ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`}></span>
            <span>
              {data?.shift?.status === 'OPEN'
                ? (isArabic ? `وردية مفتوحة (${data.shift.cashierName})` : `Shift Open (${data.shift.cashierName})`)
                : (isArabic ? 'لا توجد وردية مفتوحة' : 'No Open Shift')}
            </span>
          </div>

          {/* User Role Badge */}
          <div className="px-3 py-1.5 rounded-sm bg-white/5 border border-white/10 text-xs font-semibold text-neutral-300">
            {userRole}
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchDashboardTelemetry}
            disabled={refreshing}
            className="p-2 rounded-sm bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-all disabled:opacity-50"
            title={isArabic ? 'تحديث البيانات' : 'Refresh Telemetry'}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#D4AF37]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state if any */}
      {error && (
        <div className="mb-6 p-4 rounded-sm bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button 
            onClick={fetchDashboardTelemetry}
            className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold"
          >
            {isArabic ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      )}

      {/* Row 1: Primary Silver & Inventory Telemetry (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Net Silver Weight */}
        <div className="p-4 rounded-sm bg-[#0E0E14] border border-white/10 hover:border-[#D4AF37]/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">{isArabic ? 'إجمالي وزن الفضة بالمخزون' : 'Net Silver Stock Weight'}</span>
            <Scale className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-white mb-1">
            {loading ? '...' : fmtGrams(data?.inventory.totalNetWeightGrams)}
          </div>
          <div className="text-[11px] text-[#D4AF37] flex items-center justify-between">
            <span>{isArabic ? 'مكافئ عيار 999 النقي:' : 'Pure 999 Equivalent:'}</span>
            <span className="font-mono font-semibold">{fmtGrams(data?.inventory.fineSilver999Grams)}</span>
          </div>
        </div>

        {/* Card 2: Serialized Stock Pieces */}
        <div className="p-4 rounded-sm bg-[#0E0E14] border border-white/10 hover:border-emerald-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">{isArabic ? 'القطع المتسلسلة بالمخزون' : 'Serialized Pieces'}</span>
            <Boxes className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-white mb-1">
            {loading ? '...' : `${fmtNum(data?.inventory.totalPieces)} ${isArabic ? 'قطعة' : 'pcs'}`}
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center justify-between">
            <span className="text-emerald-400">{isArabic ? 'متاح بالفترينا:' : 'Available:'} {fmtNum(data?.inventory.availablePieces)}</span>
            <span className="text-neutral-500">|</span>
            <span className="text-neutral-400">{isArabic ? 'مباع:' : 'Sold:'} {fmtNum(data?.inventory.soldPieces)}</span>
          </div>
        </div>

        {/* Card 3: Today's Revenue */}
        <div className="p-4 rounded-sm bg-[#0E0E14] border border-white/10 hover:border-[#D4AF37]/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">{isArabic ? 'إجمالي المبيعات المحققة' : 'Total Sales Revenue'}</span>
            <Receipt className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-[#F0D060] mb-1">
            {loading ? '...' : fmtEgp(data?.sales.totalRevenueEgp)}
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center justify-between">
            <span>{isArabic ? 'قطاعي:' : 'Retail:'} {fmtEgp(data?.sales.retailRevenueEgp)}</span>
            {!isCashier && (
              <>
                <span className="text-neutral-500">|</span>
                <span>{isArabic ? 'جملة:' : 'WS:'} {fmtEgp(data?.sales.wholesaleRevenueEgp)}</span>
              </>
            )}
          </div>
        </div>

        {/* Card 4: Cash Drawer Float */}
        <div className="p-4 rounded-sm bg-[#0E0E14] border border-white/10 hover:border-amber-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">{isArabic ? 'نقدية الوردية المتوقعة' : 'Expected Drawer Cash'}</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl md:text-2xl font-bold font-mono text-white mb-1">
            {loading ? '...' : fmtEgp(data?.shift?.currentExpectedCash || data?.shift?.openingFloat || 0)}
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center justify-between">
            <span>{isArabic ? 'رصيد الافتتاح:' : 'Opening Float:'}</span>
            <span className="font-mono">{fmtEgp(data?.shift?.openingFloat || 0)}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Secondary Financial & Quality Telemetry (3 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Card 5: Wholesale Trader Receivables (Dual Ledger) */}
        {!isCashier ? (
          <div className="p-4 rounded-sm bg-[#0E0E14] border border-white/10 hover:border-blue-500/40 transition-all shadow-sm">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-xs font-medium">{isArabic ? 'مستحقات الحسابات المفتوحة (تجار الجملة)' : 'Wholesale Receivables'}</span>
              <BookOpen className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex flex-col gap-1 mb-2">
              <div className="text-lg font-bold font-mono text-white">
                {fmtEgp(data?.traders?.traderCashBalanceEgp || 0)}
              </div>
              <div className="text-xs font-mono text-blue-300">
                {fmtGrams(data?.traders?.traderSilver999BalanceGrams || 0)} {isArabic ? 'عيار 999 نقي' : 'Fine 999'}
              </div>
            </div>
            <div className="text-[11px] text-neutral-400">
              {isArabic ? `تجار نشطون: ${fmtNum(data?.traders?.activeTradersCount || 0)} تاجر` : `Active traders: ${fmtNum(data?.traders?.activeTradersCount || 0)}`}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-sm bg-[#0E0E14] border border-white/5 opacity-60 flex flex-col justify-center items-center text-center p-6">
            <Lock className="w-5 h-5 text-neutral-500 mb-2" />
            <span className="text-xs font-medium text-neutral-400">
              {isArabic ? 'حسابات تجار الجملة محجوبة عن الكاشير' : 'Wholesale accounts restricted for Cashier'}
            </span>
          </div>
        )}

        {/* Card 6: Returns & Quality Inspection Lifecycle P0 */}
        <div className="p-4 rounded-sm bg-[#0E0E14] border border-white/10 hover:border-rose-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">{isArabic ? 'المرتجعات والتفتيش (P0)' : 'Returns & Inspection (P0)'}</span>
            <RotateCcw className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white mb-1">
            {fmtEgp(data?.returns.totalRefundedEgp)}
          </div>
          <div className="text-[11px] text-neutral-400 flex items-center justify-between">
            <span className="text-amber-400 font-semibold">
              {isArabic 
                ? `قيد الفحص: ${fmtNum(data?.inventory.pendingInspectionPieces)} قطعة` 
                : `Inspection: ${fmtNum(data?.inventory.pendingInspectionPieces)} pcs`}
            </span>
            <span className="text-neutral-500">|</span>
            <span>{isArabic ? `عدد العمليات: ${fmtNum(data?.returns.returnCount)}` : `Count: ${fmtNum(data?.returns.returnCount)}`}</span>
          </div>
        </div>

        {/* Card 7: Quick Operational Health */}
        <div className="p-4 rounded-sm bg-[#0E0E14] border border-white/10 hover:border-emerald-500/40 transition-all shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">{isArabic ? 'حالة سلامة النظام والميزان' : 'Scale & Engine Safety'}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>{isArabic ? 'بوابة التحقق من الوزن: نشطة' : 'Weight Gate: ENFORCED'}</span>
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            {isArabic 
              ? 'ميزان EK-1200 وتوقيع HMAC وتفتيش المرتجعات تعمل بتكامل كامل مع PostgreSQL' 
              : 'EK-1200 RS-232, HMAC attestations & Returns P0 bound with PostgreSQL'}
          </p>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="mb-8">
        <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
          {isArabic ? 'إجراءات تشغيلية سريعة' : 'Quick Operational Workflows'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href={isArabic ? '/ar/admin/pos' : '/en/admin/pos'}
            className="flex items-center gap-3 p-3 rounded-sm bg-[#111118] border border-white/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all group"
          >
            <div className="w-8 h-8 rounded-sm bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white group-hover:text-[#F0D060] truncate">{isArabic ? 'نقطة البيع (POS)' : 'Retail POS'}</div>
              <div className="text-[10px] text-neutral-400 truncate">{isArabic ? 'بيع قطاعي وإيصال' : 'Checkout & Receipt'}</div>
            </div>
          </Link>

          <Link
            href={isArabic ? '/ar/admin/coding' : '/en/admin/coding'}
            className="flex items-center gap-3 p-3 rounded-sm bg-[#111118] border border-white/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all group"
          >
            <div className="w-8 h-8 rounded-sm bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Scale className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white group-hover:text-[#F0D060] truncate">{isArabic ? 'تكويد القطع والميزان' : 'Piece Coding'}</div>
              <div className="text-[10px] text-neutral-400 truncate">{isArabic ? 'وزن ميزان EK-1200' : 'Serial & Weight'}</div>
            </div>
          </Link>

          <Link
            href={isArabic ? '/ar/admin/erp/accounts' : '/en/admin/erp/accounts'}
            className="flex items-center gap-3 p-3 rounded-sm bg-[#111118] border border-white/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all group"
          >
            <div className="w-8 h-8 rounded-sm bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white group-hover:text-[#F0D060] truncate">{isArabic ? 'دفتر الأستاذ المزدوج' : 'Dual Ledger'}</div>
              <div className="text-[10px] text-neutral-400 truncate">{isArabic ? 'فضة 999 ونقدية' : 'Fine Silver & Cash'}</div>
            </div>
          </Link>

          <Link
            href={isArabic ? '/ar/admin/erp/inventory' : '/en/admin/erp/inventory'}
            className="flex items-center gap-3 p-3 rounded-sm bg-[#111118] border border-white/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all group"
          >
            <div className="w-8 h-8 rounded-sm bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Boxes className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white group-hover:text-[#F0D060] truncate">{isArabic ? 'كتالوج المخزون' : 'Stock Catalog'}</div>
              <div className="text-[10px] text-neutral-400 truncate">{isArabic ? 'القطع والعيارات' : 'Pieces & Balances'}</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Real Recent Invoices Audit Table */}
      <div className="p-4 rounded-sm bg-[#0E0E14] border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#D4AF37]" />
            <span>{isArabic ? 'آخر فواتير المبيعات المسجلة في PostgreSQL Staging' : 'Recent Invoices (Staging PostgreSQL)'}</span>
          </h2>
          <span className="text-[10px] text-neutral-400">
            {isArabic ? 'سجلات حقيقية غير قابلة للتعديل' : 'Immutable Records'}
          </span>
        </div>

        {(!data?.recentInvoices || data.recentInvoices.length === 0) ? (
          <div className="p-8 text-center text-neutral-400 text-xs border border-dashed border-white/10 rounded-sm">
            <p className="mb-2">
              {isArabic 
                ? 'لا توجد فواتير مبيعات مسجلة في قاعدة بيانات Staging حالياً (تم بدء قاعدة نظيفة معتمدة).' 
                : 'No sales invoices recorded in Staging DB yet (Clean verified baseline active).'}
            </p>
            <Link
              href={isArabic ? '/ar/admin/pos' : '/en/admin/pos'}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37] hover:underline"
            >
              <span>{isArabic ? 'بدء فاتورة بيع جديدة عبر شاشة الكاشير' : 'Open POS to issue an invoice'}</span>
              <ChevronRight className={`w-3.5 h-3.5 ${isArabic ? 'rotate-180' : ''}`} />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-neutral-400 uppercase bg-white/5 border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-3">{isArabic ? 'رقم الفاتورة' : 'Invoice #'}</th>
                  <th className="py-2.5 px-3">{isArabic ? 'النوع' : 'Type'}</th>
                  <th className="py-2.5 px-3">{isArabic ? 'العميل' : 'Customer'}</th>
                  <th className="py-2.5 px-3">{isArabic ? 'عدد القطع' : 'Items'}</th>
                  <th className="py-2.5 px-3">{isArabic ? 'الإجمالي' : 'Total (EGP)'}</th>
                  <th className="py-2.5 px-3">{isArabic ? 'الدفع' : 'Payment'}</th>
                  <th className="py-2.5 px-3">{isArabic ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/5 transition-colors font-mono">
                    <td className="py-2.5 px-3 font-bold text-[#F0D060]">{inv.invoice_number}</td>
                    <td className="py-2.5 px-3 text-neutral-300 font-sans">{inv.invoice_type || 'RETAIL'}</td>
                    <td className="py-2.5 px-3 text-neutral-200 font-sans">{inv.customer_name || (isArabic ? 'عميل نقدي' : 'Cash Customer')}</td>
                    <td className="py-2.5 px-3 text-neutral-300">{inv.total_items_count}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{fmtEgp(Number(inv.final_total_egp))}</td>
                    <td className="py-2.5 px-3 text-neutral-300 font-sans">{inv.payment_method}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-sans">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
