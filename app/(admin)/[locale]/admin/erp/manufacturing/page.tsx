'use client';

import * as React from 'react';
import { Button } from '@/components/admin/ui';
import { CrudLayout } from '@/components/admin/crud/CrudLayout';
import {
  Factory,
  Flame,
  Activity,
  Layers,
  Scale,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface OrderTelemetry {
  id: string;
  order_code: string;
  product_name: string;
  sku: string;
  planned_quantity: number;
  completed_quantity: number;
  scrapped_quantity: number;
  status: string;
  current_stage_code: string;
  current_sequence_no: number;
  active_wip_quantity: number;
  active_wip_weight_grams: number;
  total_scrap_weight_grams: number;
  qc_status: string;
  mass_balance_status: string;
  target_date: string;
  created_at: string;
}

export default function ManufacturingConsolePage() {
  const [orders, setOrders] = React.useState<OrderTelemetry[]>([]);
  const [kpis, setKpis] = React.useState({
    total_orders: 0,
    active_in_execution: 0,
    total_wip_pieces: 0,
    total_scrap_grams: 0
  });
  const [statusFilter, setStatusFilter] = React.useState('ALL');
  const [priorityFilter, setPriorityFilter] = React.useState('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [userRole, setUserRole] = React.useState('admin');

  const displayedOrders = React.useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.trim().toLowerCase();
    return orders.filter(
      (ord) =>
        (ord.order_code || '').toLowerCase().includes(q) ||
        (ord.product_name || '').toLowerCase().includes(q) ||
        (ord.sku || '').toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  // Interactive Scrap Recording Modal State
  const [selectedOrderForScrap, setSelectedOrderForScrap] = React.useState<OrderTelemetry | null>(null);
  const [scrapType, setScrapType] = React.useState('FILINGS');
  const [scrapWeight, setScrapWeight] = React.useState('');
  const [isSubmittingScrap, setIsSubmittingScrap] = React.useState(false);
  const [scrapSuccessMessage, setScrapSuccessMessage] = React.useState('');

  const fetchConsoleData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/mfg/orders/console?status=${statusFilter}`, {
        headers: { 'x-user-role': userRole }
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.data || []);
        setKpis(data.kpis || {
          total_orders: 0,
          active_in_execution: 0,
          total_wip_pieces: 0,
          total_scrap_grams: 0
        });
      }
    } catch (err) {
      console.error('Failed to load manufacturing console data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, userRole]);

  React.useEffect(() => {
    fetchConsoleData();
  }, [fetchConsoleData]);

  const handleRecordScrap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForScrap || !scrapWeight) return;
    setIsSubmittingScrap(true);
    try {
      const res = await fetch(`/api/mfg/orders/${selectedOrderForScrap.id}/scrap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify({
          stage_code: selectedOrderForScrap.current_stage_code,
          scrap_type: scrapType,
          weight_grams: parseFloat(scrapWeight),
          reason: 'MANUAL_CONSOLE_ENTRY'
        })
      });
      const result = await res.json();
      if (result.success) {
        setScrapSuccessMessage('تم تسجيل العادم واحتساب الفضة النقية بنجاح.');
        setTimeout(() => {
          setSelectedOrderForScrap(null);
          setScrapSuccessMessage('');
          setScrapWeight('');
          fetchConsoleData();
        }, 1200);
      } else {
        alert(result.error || 'فشل في تسجيل العادم');
      }
    } catch {
      alert('خطأ في الاتصال بالخادم');
    } finally {
      setIsSubmittingScrap(false);
    }
  };

  const stagesList = [
    { code: 'CASTING', name: 'سباكة 10' },
    { code: 'CLEANING', name: 'كحت 20' },
    { code: 'SETTING', name: 'تركيب 30' },
    { code: 'POLISHING', name: 'صقل 40' },
    { code: 'RHODIUM', name: 'طلاء 50' },
    { code: 'HALLMARK', name: 'دمغة 60' },
    { code: 'QC', name: 'جودة 70' },
    { code: 'PACKAGING', name: 'تغليف 80' }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"><Activity className="w-3 h-3 animate-pulse" /> قيد التشغيل</span>;
      case 'READY_FOR_EXECUTION':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><Clock className="w-3 h-3" /> جاهز للبدء</span>;
      case 'COMPLETED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" /> مكتمل بالمخزن</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"><AlertCircle className="w-3 h-3" /> ملغي</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  return (
    <CrudLayout
      title="ورشة تصنيع الفضة — لوحة التحكم والتشغيل"
      description="متابعة أوامر الشغل، حركة القطع النصف مصنعة (WIP)، ميزان الفضة، وضبط الجودة الفورية."
      headerActions={
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            className="gap-2 text-xs"
            onClick={() => setStatusFilter(statusFilter)}
          >
            <RotateCcw className="w-3.5 h-3.5" /> تحديث البيانات
          </Button>
          <Link href="/admin/erp/materials">
            <Button variant="primary" className="gap-2 text-xs">
              <Factory className="w-3.5 h-3.5" /> مخزون المواد الخام
            </Button>
          </Link>
        </div>
      }
    >
      {/* 1. TOP TELEMETRY KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#12141a] border border-white/10 p-5 rounded-2xl shadow-xl flex flex-col items-start">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-xs font-medium text-slate-400">إجمالي أوامر التشغيل</span>
            <Factory className="w-5 h-5 text-blue-400 opacity-80" />
          </div>
          <span className="text-3xl font-bold font-mono text-white mb-1">{kpis.total_orders}</span>
          <span className="text-[11px] text-slate-500">أمر تشغيل مسجل بالورشة</span>
        </div>

        <div className="bg-[#12141a] border border-white/10 p-5 rounded-2xl shadow-xl flex flex-col items-start">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-xs font-medium text-slate-400">أوامر قيد التنفيذ النشط</span>
            <Flame className="w-5 h-5 text-amber-400 opacity-80" />
          </div>
          <span className="text-3xl font-bold font-mono text-amber-300 mb-1">{kpis.active_in_execution}</span>
          <span className="text-[11px] text-slate-500">في مراحل السباكة والتجميع</span>
        </div>

        <div className="bg-[#12141a] border border-white/10 p-5 rounded-2xl shadow-xl flex flex-col items-start">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-xs font-medium text-slate-400">قطع قيد التصنيع (WIP)</span>
            <Layers className="w-5 h-5 text-emerald-400 opacity-80" />
          </div>
          <span className="text-3xl font-bold font-mono text-emerald-300 mb-1">{kpis.total_wip_pieces}</span>
          <span className="text-[11px] text-slate-500">قطعة بين محطات العمل الـ 8</span>
        </div>

        <div className="bg-[#12141a] border border-white/10 p-5 rounded-2xl shadow-xl flex flex-col items-start">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-xs font-medium text-slate-400">عوادم الفضة المجمعة</span>
            <Scale className="w-5 h-5 text-purple-400 opacity-80" />
          </div>
          <span className="text-3xl font-bold font-mono text-purple-300 mb-1">{kpis.total_scrap_grams}g</span>
          <span className="text-[11px] text-slate-500">شجر سباكة وبرادة تلميع</span>
        </div>
      </div>

      {/* 2. FILTER TABS & SECURITY ROLE BANNER */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          {['ALL', 'IN_PROGRESS', 'READY_FOR_EXECUTION', 'COMPLETED', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === tab
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              {tab === 'ALL' && 'الكل'}
              {tab === 'IN_PROGRESS' && 'قيد التنفيذ'}
              {tab === 'READY_FOR_EXECUTION' && 'جاهز للتنفيذ'}
              {tab === 'COMPLETED' && 'مكتمل'}
              {tab === 'CANCELLED' && 'ملغي'}
            </button>
          ))}
        </div>

        {/* Real-time Order Search Field */}
        <div className="flex-1 max-w-xs relative">
          <input
            type="text"
            data-testid="mfg-search-input"
            placeholder="بحث بكود الأمر، المنتج، أو SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/40 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              title="مسح البحث"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
          <span>صلاحية العرض:</span>
          <span className="font-semibold text-amber-300 uppercase">{userRole}</span>
        </div>
      </div>

      {/* 3. ORDERS EXECUTION CONSOLE TABLE */}
      <div className="bg-[#12141a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-white/5 text-slate-400 uppercase font-mono text-[11px] border-b border-white/10">
              <tr>
                <th className="px-5 py-3.5">كود الأمر / الموديل</th>
                <th className="px-5 py-3.5">الكميات (مخطط / منفذ)</th>
                <th className="px-5 py-3.5">المرحلة الحالية</th>
                <th className="px-5 py-3.5">قطع WIP نشطة</th>
                <th className="px-5 py-3.5">ميزان الفضة / العادم</th>
                <th className="px-5 py-3.5">الجودة (QC)</th>
                <th className="px-5 py-3.5">الحالة</th>
                <th className="px-5 py-3.5 text-center">إجراءات الورشة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <Activity className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                    جاري تحميل بيانات تشغيل الورشة...
                  </td>
                </tr>
              ) : displayedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    {searchQuery ? 'لا توجد أوامر تشغيل مطابقة لمعايير البحث.' : 'لا توجد أوامر تشغيل مطابقة للفلتر المحدد.'}
                  </td>
                </tr>
              ) : (
                displayedOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white font-mono text-sm">{ord.order_code}</div>
                      <div className="text-[11px] text-slate-400">{ord.product_name}</div>
                      <div className="text-[10px] font-mono text-amber-400/80">{ord.sku}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-white font-mono font-semibold">
                        {ord.completed_quantity} / {ord.planned_quantity}
                      </div>
                      {ord.scrapped_quantity > 0 && (
                        <div className="text-[10px] text-rose-400 font-mono">
                          تالف: {ord.scrapped_quantity} قطعة
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-white/5 border border-white/10 text-slate-200">
                        {ord.current_stage_code} (seq {ord.current_sequence_no})
                      </span>
                    </td>

                    <td className="px-5 py-4 font-mono">
                      <div className="text-emerald-300 font-medium">{ord.active_wip_quantity} قطعة</div>
                      <div className="text-[10px] text-slate-400">{ord.active_wip_weight_grams}g</div>
                    </td>

                    <td className="px-5 py-4 font-mono">
                      <div className="text-purple-300">{ord.total_scrap_weight_grams}g عادم</div>
                      <div className="text-[10px]">
                        {ord.mass_balance_status === 'BALANCED' ? (
                          <span className="text-emerald-400">موزون (≤ 0.5g)</span>
                        ) : ord.mass_balance_status === 'VARIANCE_BLOCKED' ? (
                          <span className="text-rose-400 font-bold">فارق وزن محظور</span>
                        ) : (
                          <span className="text-slate-500">غير مقيم</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {ord.qc_status === 'PASSED' ? (
                        <span className="text-emerald-400 font-medium">معتمد 100%</span>
                      ) : ord.qc_status === 'REWORK_REQUIRED' ? (
                        <span className="text-amber-400 font-medium">تحت الإصلاح</span>
                      ) : (
                        <span className="text-slate-500">لم يبدأ</span>
                      )}
                    </td>

                    <td className="px-5 py-4">{getStatusBadge(ord.status)}</td>

                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedOrderForScrap(ord)}
                          disabled={userRole === 'guest' || userRole === 'restricted_guest'}
                          className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-lg border border-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={userRole === 'guest' ? 'يتطلب صلاحية فني ورشة' : 'تسجيل عادم فوري'}
                        >
                          عادم فوري
                        </button>
                        <Link
                          href={`/api/mfg/orders/${ord.id}/mass-balance`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20"
                        >
                          الميزان <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL DIALOG: RECORD WORKSHOP SCRAP */}
      {selectedOrderForScrap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#12141a] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl text-right">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-400" />
              تسجيل عادم ورشة فوري للأمر {selectedOrderForScrap.order_code}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              سيتم احتساب الفضة النقية المستردة بنسبة كفاءة تكرير 95% وتحديث سجل الميزان.
            </p>

            {scrapSuccessMessage ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {scrapSuccessMessage}
              </div>
            ) : (
              <form onSubmit={handleRecordScrap} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">نوع العادم:</label>
                  <select
                    value={scrapType}
                    onChange={(e) => setScrapType(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400/50"
                  >
                    <option value="FILINGS">برادة منشار وطاولات (FILINGS)</option>
                    <option value="CASTING_SPRUE">شجر ومصبات سباكة (CASTING_SPRUE)</option>
                    <option value="POLISH_DUST">غبار تلميع وصنفرة (POLISH_DUST)</option>
                    <option value="REJECTED_PIECE">قطعة معيبة غير قابلة للإصلاح (REJECTED_PIECE)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">الوزن بالجرام (Scale Weight):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="مثال: 12.50"
                    value={scrapWeight}
                    onChange={(e) => setScrapWeight(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400/50"
                  />
                  {scrapWeight && !isNaN(parseFloat(scrapWeight)) && (
                    <div className="mt-1 text-[11px] text-purple-300 font-mono">
                      الفضة النقية التقديرية المقيدة: {(parseFloat(scrapWeight) * 0.925 * 0.95).toFixed(4)}g
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForScrap(null)}
                    disabled={isSubmittingScrap}
                    className="px-4 py-2 rounded-xl text-xs bg-white/5 text-slate-400 hover:text-white"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingScrap || !scrapWeight}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingScrap ? (
                      <>
                        <Activity className="w-3.5 h-3.5 animate-spin" /> جاري الحفظ...
                      </>
                    ) : (
                      'تأكيد وحفظ العادم'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </CrudLayout>
  );
}
