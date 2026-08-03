'use client';

import * as React from 'react';
import { X, Palette, CheckCircle2 } from 'lucide-react';
import { themeEngine, ThemeConfig, PRESET_THEMES } from '@/lib/services/themeEngine';

interface ThemeBuilderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeBuilderDrawer({ isOpen, onClose }: ThemeBuilderDrawerProps) {
  const [theme, setTheme] = React.useState<ThemeConfig>(themeEngine.getTheme());
  const [savedMessage, setSavedMessage] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: ThemeConfig) => {
    setTheme(preset);
    themeEngine.applyTheme(preset);
    setSavedMessage(`تم تطبيق ثيم [${preset.name_ar}] بنجاح!`);
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const handleColorChange = (field: keyof ThemeConfig, val: string) => {
    const updated = { ...theme, [field]: val };
    setTheme(updated);
    themeEngine.applyTheme(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-slate-950 text-white shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-5">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">مخصّص المظهر والثيمات (Theme Builder)</h3>
              <p className="text-xs text-slate-400">تعديل الألوان، الخطوط، والحواف بدون الحاجة لكتابة كود</p>
            </div>
          </div>

          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {savedMessage && (
          <div className="m-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>{savedMessage}</span>
          </div>
        )}

        {/* Content Controls */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Preset Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-amber-300">أنماط الثيمات الجاهزة (Presets):</label>
            <div className="space-y-2">
              {PRESET_THEMES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-xs font-semibold transition-all ${
                    theme.id === preset.id
                      ? 'border-amber-500 bg-amber-500/20 text-white shadow-md'
                      : 'border-white/10 bg-black/30 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full border border-white/20"
                      style={{ backgroundColor: preset.primaryColor }}
                    />
                    <span>{preset.name_ar}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{preset.mode.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Customization */}
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
            <h4 className="text-xs font-bold text-white border-b border-white/10 pb-2">تخصيص الألوان الرئيسية</h4>

            <div className="space-y-2">
              <label className="block text-xs text-slate-400">اللون الرئيسي (Primary Accent Color):</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                />
                <span className="font-mono text-xs text-amber-400">{theme.primaryColor}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-slate-400">اللون الثانوي (Secondary Color):</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={theme.secondaryColor}
                  onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                />
                <span className="font-mono text-xs text-cyan-400">{theme.secondaryColor}</span>
              </div>
            </div>
          </div>

          {/* Typography & Radius */}
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
            <h4 className="text-xs font-bold text-white border-b border-white/10 pb-2">الخطوط والحواف (Typography & Radius)</h4>

            <div className="space-y-2">
              <label className="block text-xs text-slate-400">نوع الخط الأساسي (Font Family):</label>
              <select
                value={theme.fontFamily}
                onChange={(e) => handleColorChange('fontFamily', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
              >
                <option value="Cairo">Cairo (خط القاهرة الملكي)</option>
                <option value="Tajawal">Tajawal (تجوال العريض)</option>
                <option value="Inter">Inter (Modern Clean)</option>
                <option value="Outfit">Outfit (Geometric Minimalist)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-slate-400">تدوير الحواف (Border Radius):</label>
              <select
                value={theme.borderRadius}
                onChange={(e) => handleColorChange('borderRadius', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
              >
                <option value="0px">Sharp Cut (0px)</option>
                <option value="8px">Rounded Standard (8px)</option>
                <option value="16px">Extra Rounded (16px)</option>
                <option value="24px">Pill Curved (24px)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
