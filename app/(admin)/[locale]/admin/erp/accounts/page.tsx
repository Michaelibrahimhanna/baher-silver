'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import {
  Scale,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Search,
  Building2,
  RotateCcw,
  FileText,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface OpenAccountItem {
  id: string;
  organization_id: string;
  name: string;
  account_type: 'WORKSHOP' | 'SUPPLIER' | 'MERCHANT';
  phone?: string;
  currency: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  balance?: {
    cash_balance: number;
    fine_silver_999_balance_grams: number;
    currency: string;
    last_journal_entry_id?: string;
    last_updated: string;
  };
}

interface JournalEntryItem {
  id: string;
  account_id: string;
  timestamp: string;
  entry_type: string;
  currency: string;
  cash_delta: number;
  gross_weight_grams?: number;
  stone_weight_grams?: number;
  net_weight_grams?: number;
  purity?: number;
  fine_silver_999_delta: number;
  running_cash_balance: number;
  running_fine_silver_balance: number;
  actor_email: string;
  actor_role: string;
  reference_document?: string;
  notes?: string;
  reversed_entry_id?: string;
  is_reversed: boolean;
  signature?: string;
}

export default function OpenAccountsDualLedgerPage() {
  const params = useParams();
  const locale = ((params?.locale as string) || 'ar') as 'ar' | 'en';
  const isRtl = locale === 'ar';

  const [accounts, setAccounts] = React.useState<OpenAccountItem[]>([]);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string | null>(null);
  const [journalEntries, setJournalEntries] = React.useState<JournalEntryItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [journalLoading, setJournalLoading] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>('');

  // Modals
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = React.useState<boolean>(false);
  const [isPostEntryModalOpen, setIsPostEntryModalOpen] = React.useState<boolean>(false);
  const [actionLoading, setActionLoading] = React.useState<boolean>(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // New Account Form State
  const [newAccountName, setNewAccountName] = React.useState<string>('');
  const [newAccountType, setNewAccountType] = React.useState<'WORKSHOP' | 'SUPPLIER' | 'MERCHANT'>('WORKSHOP');
  const [newAccountPhone, setNewAccountPhone] = React.useState<string>('');
  const [newAccountNotes, setNewAccountNotes] = React.useState<string>('');
  const [openingCash, setOpeningCash] = React.useState<number | ''>('');
  const [openingSilver, setOpeningSilver] = React.useState<number | ''>('');

  // Post Entry Form State
  const [entryType, setEntryType] = React.useState<string>('SCRAP_DELIVERY');
  const [grossWeight, setGrossWeight] = React.useState<number | ''>('');
  const [stoneWeight, setStoneWeight] = React.useState<number | ''>(0);
  const [purity, setPurity] = React.useState<number>(925);
  const [cashAmount, setCashAmount] = React.useState<number | ''>('');
  const [referenceDoc, setReferenceDoc] = React.useState<string>('');
  const [entryNotes, setEntryNotes] = React.useState<string>('');

  // Fetch Accounts
  const fetchAccounts = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
        if (data.accounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data.accounts[0].id);
        }
      }
    } catch (e: any) {
      console.error('Failed to load accounts:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  // Fetch Journal for Selected Account
  const fetchJournal = React.useCallback(async (accId: string) => {
    try {
      setJournalLoading(true);
      const res = await fetch(`/api/accounts/${accId}/journal?limit=100`);
      const data = await res.json();
      if (data.success) {
        setJournalEntries(data.entries || []);
      }
    } catch (e: any) {
      console.error('Failed to load journal:', e);
    } finally {
      setJournalLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  React.useEffect(() => {
    if (selectedAccountId) {
      fetchJournal(selectedAccountId);
    }
  }, [selectedAccountId, fetchJournal]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // Derived Silver 999 preview for modal
  const derivedNetWeight = Math.max(0, Number(grossWeight || 0) - Number(stoneWeight || 0));
  const derivedFineSilver999 = Math.round(derivedNetWeight * (purity / 999) * 1000) / 1000;

  // Handle New Account Submission
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAccountName.trim(),
          account_type: newAccountType,
          phone: newAccountPhone.trim() || undefined,
          notes: newAccountNotes.trim() || undefined,
          openingCashBalance: openingCash ? Number(openingCash) : undefined,
          openingFineSilverGrams: openingSilver ? Number(openingSilver) : undefined
        })
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.message || data.error || 'Failed to create account.');
        return;
      }

      setSuccessMessage(isRtl ? 'تم إنشاء الحساب بنجاح' : 'Account created successfully.');
      setIsNewAccountModalOpen(false);
      setNewAccountName('');
      setNewAccountPhone('');
      setNewAccountNotes('');
      setOpeningCash('');
      setOpeningSilver('');
      await fetchAccounts();
      if (data.account?.id) {
        setSelectedAccountId(data.account.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Post Journal Entry
  const handlePostEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;

    setActionLoading(true);
    setErrorMessage(null);

    // Compute deltas based on operation
    let cashDelta: number | undefined = undefined;
    let fineSilverDelta: number | undefined = undefined;
    let netGross: number | undefined = undefined;
    let netStone: number | undefined = undefined;
    let appliedPurity: number | undefined = undefined;

    if (entryType === 'SCRAP_DELIVERY') {
      // Delivering scrap increases workshop silver balance (+999)
      netGross = Number(grossWeight || 0);
      netStone = Number(stoneWeight || 0);
      appliedPurity = purity;
      fineSilverDelta = derivedFineSilver999;
    } else if (entryType === 'GOODS_RECEIPT_LABOR') {
      // Receiving finished goods consumes silver (-999) and accrues labor debt (-Cash)
      netGross = Number(grossWeight || 0);
      netStone = Number(stoneWeight || 0);
      appliedPurity = purity;
      fineSilverDelta = -derivedFineSilver999;
      if (cashAmount) {
        cashDelta = -Math.abs(Number(cashAmount)); // Shop owes labor cash
      }
    } else if (entryType === 'CASH_PAYMENT') {
      // Paying cash to workshop settles debt (+Cash from shop perspective)
      cashDelta = Math.abs(Number(cashAmount || 0));
    } else if (entryType === 'CASH_RECEIPT') {
      cashDelta = -Math.abs(Number(cashAmount || 0));
    } else if (entryType === 'METAL_SETTLEMENT') {
      fineSilverDelta = Number(grossWeight || 0);
    }

    try {
      const res = await fetch(`/api/accounts/${selectedAccountId}/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryType,
          cashDelta,
          grossWeightGrams: netGross,
          stoneWeightGrams: netStone,
          purity: appliedPurity,
          fineSilver999Delta: fineSilverDelta,
          referenceDocument: referenceDoc.trim() || undefined,
          notes: entryNotes.trim() || undefined
        })
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.message || data.error || 'Failed to post journal entry.');
        return;
      }

      setSuccessMessage(isRtl ? 'تم تسجيل القيد بنجاح' : 'Journal entry posted successfully.');
      setIsPostEntryModalOpen(false);
      setGrossWeight('');
      setStoneWeight(0);
      setCashAmount('');
      setReferenceDoc('');
      setEntryNotes('');
      await fetchAccounts();
      await fetchJournal(selectedAccountId);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reversal
  const handleReverseEntry = async (entryId: string) => {
    if (!selectedAccountId) return;
    const confirmMsg = isRtl
      ? 'هل أنت متأكد من عكس هذا القيد؟ سيتم إنشاء قيد عكسي مطابق دون حذف القيد الأصلي.'
      : 'Are you sure you want to reverse this entry? An append-only compensating reversal will be posted.';

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/accounts/${selectedAccountId}/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryType: 'REVERSAL',
          reversedEntryId: entryId,
          notes: 'User-initiated compensatory reversal'
        })
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.message || data.error || 'Failed to reverse entry.');
        return;
      }

      await fetchAccounts();
      await fetchJournal(selectedAccountId);
    } catch (err: any) {
      alert(err.message || 'Network error.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.phone && a.phone.includes(searchQuery))
  );

  // Aggregate Metrics
  const totalCashBalance = accounts.reduce((sum, a) => sum + (a.balance?.cash_balance || 0), 0);
  const totalSilverBalance = accounts.reduce(
    (sum, a) => sum + (a.balance?.fine_silver_999_balance_grams || 0),
    0
  );

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="flex flex-col min-h-screen bg-[#0A0B0E] text-slate-100 p-6 lg:p-8 gap-6"
    >
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                {isRtl ? 'حسابات الورش والموردين المفتوحة' : 'Open Accounts Dual Ledger'}
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono">
                  Dual Ledger 999
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {isRtl
                  ? 'دفتر أستاذ مزدوج غير قابل للتعديل: النقدية (جنيه) وفضة نقية عيار 999 (جرام) مع قيود عكسية ذرية'
                  : 'Immutable dual ledger: Cash (EGP) and 999 fine silver (grams) with atomic append-only reversals'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchAccounts();
              if (selectedAccountId) fetchJournal(selectedAccountId);
            }}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsNewAccountModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>{isRtl ? 'حساب ورشة / مورد جديد' : 'New Account'}</span>
          </button>
          <button
            onClick={() => setIsPostEntryModalOpen(true)}
            disabled={!selectedAccountId}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/10 disabled:opacity-50 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{isRtl ? 'تسجيل حركة مزدوجة' : 'Post Journal Movement'}</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isRtl ? 'إجمالي الورش النشطة' : 'Active Workshops'}</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-3">
            {accounts.length}{' '}
            <span className="text-xs font-normal text-slate-400">
              {isRtl ? 'حساب' : 'accounts'}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isRtl ? 'صافي رصيد النقدية' : 'Net Cash Position'}</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                totalCashBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {totalCashBalance.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">EGP</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {totalCashBalance >= 0
              ? isRtl
                ? 'مستحقات للمحل لدى الورش'
                : 'Workshops owe cash to shop'
              : isRtl
              ? 'مستحقات للورش على المحل (مصنعيات)'
              : 'Shop owes labor cash to workshops'}
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isRtl ? 'رصيد الفضة الصافية 999' : 'Fine Silver 999 Balance'}</span>
            <Scale className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                totalSilverBalance >= 0 ? 'text-sky-400' : 'text-rose-400'
              }`}
            >
              {totalSilverBalance.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">{isRtl ? 'جرام صافي' : 'grams pure'}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {isRtl ? 'فضة نقية 999 طرف الورش والتصنيع' : 'Net pure 999 silver held at workshops'}
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isRtl ? 'حالة الدفتر والأمان' : 'Ledger Integrity'}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-300">
              {isRtl ? 'دفتر تدقيق محصن (Append-Only)' : 'Append-Only Verified'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {isRtl ? 'منع التعديل والحذف وتوقيع HMAC' : 'Zero in-place updates & unique reversals'}
          </p>
        </div>
      </div>

      {/* Main Grid: Accounts List (4 cols) & Live Dual Journal (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Accounts Master List */}
        <div className="lg:col-span-4 bg-slate-900/50 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? 'بحث في أسماء الورش...' : 'Search workshops...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-3 rtl:pl-3 rtl:pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-800/60">
            {filteredAccounts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {isRtl ? 'لا توجد حسابات مطابقة' : 'No accounts found'}
              </div>
            ) : (
              filteredAccounts.map((account) => {
                const isSelected = account.id === selectedAccountId;
                const cash = account.balance?.cash_balance || 0;
                const silver = account.balance?.fine_silver_999_balance_grams || 0;

                return (
                  <div
                    key={account.id}
                    onClick={() => setSelectedAccountId(account.id)}
                    className={`p-4 cursor-pointer transition flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-amber-500/10 border-l-4 border-amber-500 rtl:border-l-0 rtl:border-r-4'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white flex items-center gap-2">
                        {account.name}
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded font-mono">
                          {account.account_type}
                        </span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 rtl:rotate-180" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
                      <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                        <span className="text-[9px] text-slate-400 block font-sans">
                          {isRtl ? 'النقدية' : 'Cash (EGP)'}
                        </span>
                        <span
                          className={`font-bold ${
                            cash >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {cash.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                        <span className="text-[9px] text-slate-400 block font-sans">
                          {isRtl ? 'فضة 999' : 'Silver 999'}
                        </span>
                        <span
                          className={`font-bold ${
                            silver >= 0 ? 'text-sky-400' : 'text-rose-400'
                          }`}
                        >
                          {silver.toFixed(2)} g
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Live Dual Journal Feed */}
        <div className="lg:col-span-8 bg-slate-900/50 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
          {selectedAccount ? (
            <>
              {/* Account Selected Header */}
              <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{selectedAccount.name}</h2>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                      {selectedAccount.id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {selectedAccount.phone && `${selectedAccount.phone} • `}
                    {selectedAccount.notes ||
                      (isRtl ? 'حساب جاري لعمليات التصنيع' : 'Ongoing manufacturing account')}
                  </p>
                </div>

                {/* Live Running Balances for this account */}
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="text-right rtl:text-left bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">
                      {isRtl ? 'الرصيد النقدي الحالي' : 'Current Cash Balance'}
                    </span>
                    <span
                      className={`text-base font-bold ${
                        (selectedAccount.balance?.cash_balance || 0) >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {(selectedAccount.balance?.cash_balance || 0).toLocaleString()} EGP
                    </span>
                  </div>
                  <div className="text-right rtl:text-left bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-sans">
                      {isRtl ? 'رصيد الفضة 999 الحالي' : 'Current 999 Silver Balance'}
                    </span>
                    <span
                      className={`text-base font-bold ${
                        (selectedAccount.balance?.fine_silver_999_balance_grams || 0) >= 0
                          ? 'text-sky-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {(selectedAccount.balance?.fine_silver_999_balance_grams || 0).toFixed(2)} g
                    </span>
                  </div>
                </div>
              </div>

              {/* Journal Entries Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="py-3 px-4">{isRtl ? 'التاريخ والوقت' : 'Timestamp'}</th>
                      <th className="py-3 px-4">{isRtl ? 'نوع الحركة' : 'Operation'}</th>
                      <th className="py-3 px-4">{isRtl ? 'البيان والتفاصيل' : 'Details'}</th>
                      <th className="py-3 px-4">{isRtl ? 'حركة النقدية' : 'Cash \u0394'}</th>
                      <th className="py-3 px-4">{isRtl ? 'حركة فضة 999' : 'Silver 999 \u0394'}</th>
                      <th className="py-3 px-4">{isRtl ? 'الرصيد التراكمي' : 'Running'}</th>
                      <th className="py-3 px-4 text-center">{isRtl ? 'إجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {journalLoading ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
                          {isRtl ? 'جاري تحميل الحركات...' : 'Loading movements...'}
                        </td>
                      </tr>
                    ) : journalEntries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                          {isRtl ? 'لا توجد حركات مسجلة في هذا الدفتر' : 'No journal entries yet.'}
                        </td>
                      </tr>
                    ) : (
                      journalEntries.map((entry) => {
                        const isReversalEntry = entry.entry_type === 'REVERSAL';
                        return (
                          <tr
                            key={entry.id}
                            className={`hover:bg-slate-800/30 transition ${
                              entry.is_reversed || isReversalEntry ? 'opacity-70 bg-rose-950/10' : ''
                            }`}
                          >
                            {/* Timestamp */}
                            <td className="py-3 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                              {new Date(entry.timestamp).toLocaleString(locale)}
                              <span className="block text-[9px] text-slate-600 font-mono">
                                {entry.id.slice(0, 14)}...
                              </span>
                            </td>

                            {/* Operation Badge */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                                  entry.entry_type === 'SCRAP_DELIVERY'
                                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                    : entry.entry_type === 'GOODS_RECEIPT_LABOR'
                                    ? 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                                    : entry.entry_type === 'CASH_PAYMENT'
                                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                    : entry.entry_type === 'REVERSAL'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {entry.entry_type}
                              </span>
                              {entry.is_reversed && (
                                <span className="block text-[9px] text-rose-400 mt-0.5">
                                  {isRtl ? 'تم عكسه' : 'Reversed'}
                                </span>
                              )}
                            </td>

                            {/* Details & Specs */}
                            <td className="py-3 px-4 text-[11px] font-sans">
                              {entry.gross_weight_grams ? (
                                <div className="text-slate-300 font-mono">
                                  {entry.gross_weight_grams}g &bull; Cal. {entry.purity || 925}
                                  {entry.stone_weight_grams ? ` (Stones: -${entry.stone_weight_grams}g)` : ''}
                                </div>
                              ) : null}
                              {entry.reference_document && (
                                <span className="text-[10px] text-slate-400 block">
                                  Doc: {entry.reference_document}
                                </span>
                              )}
                              {entry.reversed_entry_id && (
                                <span className="text-[10px] text-rose-300 font-mono block">
                                  Rev of: {entry.reversed_entry_id.slice(0, 12)}
                                </span>
                              )}
                              {entry.notes && (
                                <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                                  {entry.notes}
                                </span>
                              )}
                            </td>

                            {/* Cash Delta */}
                            <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                              {entry.cash_delta !== 0 ? (
                                <span
                                  className={
                                    entry.cash_delta > 0 ? 'text-emerald-400' : 'text-rose-400'
                                  }
                                >
                                  {entry.cash_delta > 0 ? '+' : ''}
                                  {entry.cash_delta.toLocaleString()} EGP
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>

                            {/* Fine Silver 999 Delta */}
                            <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                              {entry.fine_silver_999_delta !== 0 ? (
                                <span
                                  className={
                                    entry.fine_silver_999_delta > 0
                                      ? 'text-sky-400'
                                      : 'text-rose-400'
                                  }
                                >
                                  {entry.fine_silver_999_delta > 0 ? '+' : ''}
                                  {entry.fine_silver_999_delta.toFixed(2)} g
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>

                            {/* Running Balance */}
                            <td className="py-3 px-4 text-[11px] whitespace-nowrap text-slate-300">
                              <div className="font-bold">
                                {entry.running_cash_balance.toLocaleString()} EGP
                              </div>
                              <div className="text-slate-400">
                                {entry.running_fine_silver_balance.toFixed(2)} g 999
                              </div>
                            </td>

                            {/* Reversal Action */}
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              {!entry.is_reversed && !isReversalEntry ? (
                                <button
                                  type="button"
                                  onClick={() => handleReverseEntry(entry.id)}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-sans font-semibold transition"
                                >
                                  <RotateCcw className="w-3 h-3 inline mr-1 rtl:mr-0 rtl:ml-1" />
                                  {isRtl ? 'عكس القيد' : 'Reverse'}
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-600 font-sans">
                                  &mdash;
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-16 text-center text-slate-500 text-xs">
              {isRtl ? 'يرجى اختيار ورشة أو مورد من القائمة' : 'Please select an account from the left list'}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Create New Workshop / Supplier Account */}
      {isNewAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                {isRtl ? 'إنشاء حساب ورشة / مورد جديد' : 'New Workshop / Merchant Account'}
              </h3>
              <button
                onClick={() => setIsNewAccountModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {isRtl ? 'اسم الورشة أو التاجر *' : 'Account Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder={isRtl ? 'مثال: ورشة الأمانة - الحسين' : 'e.g. Al-Amana Workshop'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {isRtl ? 'نوع الحساب' : 'Account Type'}
                </label>
                <select
                  value={newAccountType}
                  onChange={(e: any) => setNewAccountType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="WORKSHOP">{isRtl ? 'ورشة تصنيع (Workshop)' : 'Workshop'}</option>
                  <option value="SUPPLIER">{isRtl ? 'مورد فضة وخامات (Supplier)' : 'Supplier'}</option>
                  <option value="MERCHANT">{isRtl ? 'تاجر جملة (Merchant)' : 'Merchant'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {isRtl ? 'رقم الهاتف / واتساب' : 'Phone Number'}
                </label>
                <input
                  type="text"
                  value={newAccountPhone}
                  onChange={(e) => setNewAccountPhone(e.target.value)}
                  placeholder="010xxxxxxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">
                    {isRtl ? 'رصيد نقدي افتتاحي (EGP)' : 'Opening Cash (EGP)'}
                  </label>
                  <input
                    type="number"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">
                    {isRtl ? 'رصيد فضة 999 افتتاحي (g)' : 'Opening 999 Silver (g)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingSilver}
                    onChange={(e) => setOpeningSilver(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewAccountModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition"
                >
                  {actionLoading ? '...' : isRtl ? 'حفظ الحساب' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Post Journal Entry */}
      {isPostEntryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-400" />
                  {isRtl ? 'تسجيل حركة مزدوجة في دفتر الأستاذ' : 'Post Dual Ledger Movement'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isRtl ? 'الحساب المستهدف:' : 'Target Account:'}{' '}
                  <span className="text-white font-bold">{selectedAccount?.name}</span>
                </p>
              </div>
              <button
                onClick={() => setIsPostEntryModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePostEntry} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {isRtl ? 'نوع العملية *' : 'Operation Type *'}
                </label>
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-amber-500 font-semibold"
                >
                  <option value="SCRAP_DELIVERY">
                    {isRtl
                      ? 'تسليم كسر للورشة (+فضة 999 للمحل)'
                      : 'Scrap Delivery (+Pure 999 Silver to shop credit)'}
                  </option>
                  <option value="GOODS_RECEIPT_LABOR">
                    {isRtl
                      ? 'استلام بضاعة مصنعة (-فضة 999، -نقدية مصنعية)'
                      : 'Goods Receipt & Labor (-Pure 999, Accrue Labor Cost)'}
                  </option>
                  <option value="CASH_PAYMENT">
                    {isRtl
                      ? 'سداد نقدي للورشة (+نقدية تسوية مصنعية)'
                      : 'Cash Payment to Workshop (+Settle Cash Debt)'}
                  </option>
                  <option value="CASH_RECEIPT">
                    {isRtl ? 'استلام نقدي (-نقدية)' : 'Cash Receipt (-Cash)'}
                  </option>
                  <option value="METAL_SETTLEMENT">
                    {isRtl ? 'تسوية سبائك فضة نقية 999' : 'Pure 999 Metal Settlement'}
                  </option>
                </select>
              </div>

              {/* Silver Inputs (for Scrap / Goods) */}
              {(entryType === 'SCRAP_DELIVERY' ||
                entryType === 'GOODS_RECEIPT_LABOR' ||
                entryType === 'METAL_SETTLEMENT') && (
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                    <span>{isRtl ? 'بيانات وزن وعيار الفضة' : 'Silver & Purity Specification'}</span>
                    <span className="text-amber-400 font-mono">
                      {derivedFineSilver999.toFixed(2)} g (999 Pure)
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">
                        {isRtl ? 'الوزن القائم (g)' : 'Gross Weight (g)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={grossWeight}
                        onChange={(e) =>
                          setGrossWeight(e.target.value ? Number(e.target.value) : '')
                        }
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">
                        {isRtl ? 'وزن الفصوص (g)' : 'Stones (g)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={stoneWeight}
                        onChange={(e) =>
                          setStoneWeight(e.target.value ? Number(e.target.value) : 0)
                        }
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-1">
                        {isRtl ? 'العيار (Purity)' : 'Purity'}
                      </label>
                      <select
                        value={purity}
                        onChange={(e) => setPurity(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2 text-white font-mono"
                      >
                        <option value={999}>999 (Pure / سبيكة)</option>
                        <option value={925}>925 (Sterling / استرليني)</option>
                        <option value={900}>900 (Coin / عملات)</option>
                        <option value={800}>800 (Egyptian 80 / عيار 80)</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono">
                    Formula: (Gross {grossWeight || 0}g - Stones {stoneWeight || 0}g) &times; ({purity} / 999) ={' '}
                    <span className="text-sky-300 font-bold">{derivedFineSilver999.toFixed(2)} g 999</span>
                  </div>
                </div>
              )}

              {/* Cash Inputs (for Labor / Payments) */}
              {(entryType === 'GOODS_RECEIPT_LABOR' ||
                entryType === 'CASH_PAYMENT' ||
                entryType === 'CASH_RECEIPT') && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {entryType === 'GOODS_RECEIPT_LABOR'
                      ? isRtl
                        ? 'قيمة المصنعية المستحقة للورشة (EGP)'
                        : 'Labor Cost (EGP)'
                      : isRtl
                      ? 'المبلغ النقدي المسدد (EGP)'
                      : 'Cash Amount (EGP)'}
                  </label>
                  <input
                    type="number"
                    required
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">
                    {isRtl ? 'رقم الإذن / الفاتورة' : 'Doc / Invoice Ref'}
                  </label>
                  <input
                    type="text"
                    value={referenceDoc}
                    onChange={(e) => setReferenceDoc(e.target.value)}
                    placeholder="INV-2026-xxx"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">
                    {isRtl ? 'ملاحظات' : 'Notes'}
                  </label>
                  <input
                    type="text"
                    value={entryNotes}
                    onChange={(e) => setEntryNotes(e.target.value)}
                    placeholder={isRtl ? 'تفاصيل إضافية' : 'Additional details'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-white"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPostEntryModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition"
                >
                  {actionLoading ? '...' : isRtl ? 'ترحيل القيد' : 'Post Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
