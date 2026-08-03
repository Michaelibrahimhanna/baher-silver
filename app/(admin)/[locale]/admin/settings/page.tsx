'use client';

import * as React from 'react';
import { 
  Globe, 
  DollarSign, 
  Truck, 
  QrCode, 
  Search, 
  Save, 
  CheckCircle2, 
  RefreshCw
} from 'lucide-react';
import { settingsEngine } from '@/lib/services/settingsEngine';
import type { BaherSilverSettings } from '@/types/settings';

export default function CentralSettingsPage() {
  const [settings, setSettings] = React.useState<BaherSilverSettings>(settingsEngine.getSettings());
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  const [activeTab, setActiveTab] = React.useState<'general' | 'tax' | 'shipping' | 'qr' | 'seo'>('general');

  const handleUpdate = (section: keyof BaherSilverSettings, key: string, val: unknown) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: val,
      },
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      settingsEngine.updateSettings(settings);
      setIsSaving(false);
      setSaveMessage('تم حفظ كافة إعدادات المنظومة المركزية بنجاح وتطبيقها على كامل النظام!');
      setTimeout(() => setSaveMessage(null), 4000);
    }, 500);
  };

  return (
    <div className="space-y-6 pb-20 text-right animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <span className="text-[10px] tracking-[0.3em] uppercase text-amber-400 font-bold">
            CENTRAL BUSINESS ENGINE • CONFIGURATION HUB
          </span>
          <h1 className="text-3xl font-serif text-white tracking-tight mt-1">
            محرك الإعدادات المركزي (Central Settings Engine)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            إدارة كافة إعدادات العملة، الضرائب، الشحن، موجّه الـ QR، الـ SEO والهوية التجارية بدون أكواد مجمدة.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-extrabold text-black hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
        >
          {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ الإعدادات (Save Settings)
        </button>
      </div>

      {saveMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-white/10 pb-2 scrollbar-none">
        {[
          { id: 'general', label: 'العامة والهوية التجارية', icon: Globe },
          { id: 'tax', label: 'العملة والضرائب وتسعير الفضة', icon: DollarSign },
          { id: 'shipping', label: 'الشحن والتوصيل', icon: Truck },
          { id: 'qr', label: 'موجّه الـ QR الديناميكي', icon: QrCode },
          { id: 'seo', label: 'إعدادات SEO الافتراضية', icon: Search },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-black/30 text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: General Settings */}
      {activeTab === 'general' && (
        <div className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md">
          <h3 className="text-base font-bold text-white border-b border-white/10 pb-3">إعدادات الهوية واللغة والعملة</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">اسم المتجر بالعربية *</label>
              <input
                type="text"
                value={settings.general.storeNameAr}
                onChange={(e) => handleUpdate('general', 'storeNameAr', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Store Name (English) *</label>
              <input
                type="text"
                value={settings.general.storeNameEn}
                onChange={(e) => handleUpdate('general', 'storeNameEn', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white text-left font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">العملة الرئيسية للنظام (Primary Currency):</label>
              <select
                value={settings.general.primaryCurrency}
                onChange={(e) => handleUpdate('general', 'primaryCurrency', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-bold text-amber-400"
              >
                <option value="EGP">جنيه مصري (EGP)</option>
                <option value="USD">دولار أمريكي (USD)</option>
                <option value="EUR">يورو (EUR)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">اللغة الافتراضية (Default Language):</label>
              <select
                value={settings.general.defaultLanguage}
                onChange={(e) => handleUpdate('general', 'defaultLanguage', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
              >
                <option value="ar">العربية (Arabic)</option>
                <option value="en">English (الإنجليزية)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Tax & Silver Pricing */}
      {activeTab === 'tax' && (
        <div className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md">
          <h3 className="text-base font-bold text-white border-b border-white/10 pb-3">إعدادات قيمة الضريبة وتحديث بورصة الفضة</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">نسبة ضريبة القيمة المضافة Standard VAT (%) *</label>
              <input
                type="number"
                value={settings.tax.standardVatPercent}
                onChange={(e) => handleUpdate('tax', 'standardVatPercent', Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">هامش الربح الافتراضي لبورصة الفضة (%) *</label>
              <input
                type="number"
                value={settings.tax.silverSpotMarkupPercent}
                onChange={(e) => handleUpdate('tax', 'silverSpotMarkupPercent', Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Shipping */}
      {activeTab === 'shipping' && (
        <div className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md">
          <h3 className="text-base font-bold text-white border-b border-white/10 pb-3">إعدادات شركات الشحن والحد الأدنى للشحن المجاني</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">شركة الشحن الافتراضية (Default Carrier):</label>
              <select
                value={settings.shipping.defaultCarrier}
                onChange={(e) => handleUpdate('shipping', 'defaultCarrier', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
              >
                <option value="bosta">Bosta (بوسطة مصر)</option>
                <option value="aramex">Aramex (أرامكس)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">حد الشحن المجاني بالجنيه (Free Shipping Threshold EGP):</label>
              <input
                type="number"
                value={settings.shipping.freeShippingThresholdEgp}
                onChange={(e) => handleUpdate('shipping', 'freeShippingThresholdEgp', Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: QR Router Settings */}
      {activeTab === 'qr' && (
        <div className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md">
          <h3 className="text-base font-bold text-white border-b border-white/10 pb-3">إعدادات موجّه الـ QR الديناميكي الشامل</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">الوجهة الافتراضية لرموز العملاء (Default Destination):</label>
              <select
                value={settings.qrRouter.defaultDestination}
                onChange={(e) => handleUpdate('qrRouter', 'defaultDestination', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-amber-400 font-bold"
              >
                <option value="product">صفحة المنتج (Product Page)</option>
                <option value="warranty">شهادة الضمان الفضي (Warranty)</option>
                <option value="authentication">توثيق أصالة الفضة (Authentication)</option>
                <option value="repair">مركز الصيانة والتلميع (Repair)</option>
                <option value="certificate">شهادة النقاء (Certificate)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">رابط النطاق الأساسي للـ QR (Base Router URL):</label>
              <input
                type="text"
                value={settings.qrRouter.baseUrl}
                onChange={(e) => handleUpdate('qrRouter', 'baseUrl', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white font-mono text-left"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: SEO Defaults */}
      {activeTab === 'seo' && (
        <div className="space-y-5 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md">
          <h3 className="text-base font-bold text-white border-b border-white/10 pb-3">إعدادات الـ SEO الافتراضية على مستوى المتجر</h3>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">عنوان SEO الافتراضي بالعربية:</label>
              <input
                type="text"
                value={settings.seo.defaultMetaTitleAr}
                onChange={(e) => handleUpdate('seo', 'defaultMetaTitleAr', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">وصف SEO الافتراضي بالعربية:</label>
              <textarea
                rows={3}
                value={settings.seo.defaultMetaDescriptionAr}
                onChange={(e) => handleUpdate('seo', 'defaultMetaDescriptionAr', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
