'use client';

import * as React from 'react';
import { Upload, FolderArchive, Sparkles, Wand2 } from 'lucide-react';
import { IntakeFileType } from '@/types/aiProductMachine';

interface AiProductImportWizardProps {
  onStartAnalysis: (batchName: string, files: { name: string; size: number; type: IntakeFileType; url?: string }[]) => void;
}

export function AiProductImportWizard({ onStartAnalysis }: AiProductImportWizardProps) {
  const [batchName, setBatchName] = React.useState('شحنة خان الخليلي للفضيات عيار 925');
  const [batchSize, setBatchSize] = React.useState<number>(10);
  const [selectedFiles, setSelectedFiles] = React.useState<{ name: string; size: number; type: IntakeFileType; url?: string }[]>([
    { name: 'pharaoh-ring-1.jpg', size: 2450000, type: 'image', url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e' },
    { name: 'khan-el-khalili-manifest.csv', size: 45000, type: 'csv' },
  ]);

  const handleSimulateAddFiles = () => {
    setSelectedFiles((prev) => [
      ...prev,
      { name: `ring-variant-${Date.now().toString().slice(-4)}.jpg`, size: 1800000, type: 'image', url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e' },
    ]);
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950 p-8 space-y-6 shadow-2xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Wand2 className="h-7 w-7" />
          </div>
          <div>
            <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
              SMART IMPORT WIZARD • MULTI-FORMAT FILE ORGANIZER
            </span>
            <h2 className="text-xl font-bold text-white mt-1">معالج استيراد وتكشيف منتجات الفضة الذكي</h2>
          </div>
        </div>

        {/* Start Analysis Trigger Button */}
        <button
          type="button"
          onClick={() => onStartAnalysis(batchName, selectedFiles)}
          className="flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 text-xs font-extrabold text-black hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
        >
          <Sparkles className="h-4 w-4" />
          بدء التحليل وإسناد المهام للمشغل الذكي (Start AI Operator Analysis)
        </button>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="space-y-1.5 md:col-span-2">
          <label className="block font-bold text-slate-300">اسم الدفعة الشحن التجارية (Batch Name):</label>
          <input
            type="text"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block font-bold text-slate-300">حجم الدفعة المخطط (Batch Size Limit):</label>
          <select
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2.5 text-xs text-white"
          >
            <option value={10}>10 منتجات (Standard)</option>
            <option value={50}>50 منتج (Medium Batch)</option>
            <option value={100}>100 منتج (Large Shipment)</option>
            <option value={500}>500 منتج (Factory Mass)</option>
            <option value={1000}>1000 منتج (Bulk Import)</option>
          </select>
        </div>
      </div>

      {/* Dropzone Container */}
      <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/20 bg-black/40 p-10 text-center space-y-4 hover:border-amber-500/50 transition-colors">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Upload className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">اسحب وأسقط الملفات والمجلدات هنا أو قم بالتحديد</h3>
          <p className="text-xs text-slate-400 mt-1">
            يدعم صور المنتجات (JPG, PNG), حزم ZIP, كشوفات الكتالوجات (PDF), وملفات البيانات (Excel, CSV)
          </p>
        </div>

        <button
          type="button"
          onClick={handleSimulateAddFiles}
          className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20"
        >
          <FolderArchive className="h-4 w-4 text-amber-400" />
          إضافة صورة أو كشف آخر للدفعة
        </button>
      </div>

      {/* File List Stream */}
      <div className="space-y-2">
        <span className="block text-xs font-bold text-slate-300">الملفات المحددة في طابور الاستيراد ({selectedFiles.length}):</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {selectedFiles.map((f, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900 p-2.5 text-xs">
              <span className="font-mono text-slate-200 truncate max-w-[200px]">{f.name}</span>
              <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/30 uppercase">
                {f.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
