'use client';

import * as React from 'react';
import { Upload, FileSpreadsheet, Image as ImageIcon, Archive, Sparkles } from 'lucide-react';
import { IntakeFileType } from '@/types/aiProductMachine';

interface AiIntakeQueueDropzoneProps {
  onBatchCreated: (batchName: string, files: { name: string; size: number; type: IntakeFileType; url?: string }[]) => void;
}

export function AiIntakeQueueDropzone({ onBatchCreated }: AiIntakeQueueDropzoneProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [selectedBatchSize, setSelectedBatchSize] = React.useState<number>(10);
  const [batchName, setBatchName] = React.useState('دفعة منتجات فضية جديدة - New Silver Batch');

  const handleSimulateDrop = (fileType: IntakeFileType) => {
    const mockFiles = Array.from({ length: selectedBatchSize }).map((_, idx) => ({
      name: `silver-product-${fileType}-${idx + 1}.${fileType === 'excel' ? 'xlsx' : fileType === 'image' ? 'jpg' : fileType}`,
      size: Math.floor(100000 + Math.random() * 2000000),
      type: fileType,
      url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e',
    }));

    onBatchCreated(batchName, mockFiles);
  };

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-slate-950 p-6 text-right shadow-2xl backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Upload className="h-5 w-5 text-amber-400" />
            طابور الرفع ورفع الدفعات المجمع (AI Product Intake Queue)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            قم بسحب وإسقاط الصور، ملفات ZIP، مستندات PDF، أو كشوفات Excel/CSV لمعالجتها آلياً
          </p>
        </div>

        {/* Batch Size Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">حجم الدفعة المستهدفة:</span>
          {[10, 50, 100, 500].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setSelectedBatchSize(size)}
              className={`rounded-xl px-3 py-1 font-bold transition-all border ${
                selectedBatchSize === size
                  ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-black/40 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              {size} قطعة
            </button>
          ))}
        </div>
      </div>

      {/* Batch Name Input */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-300">عنوان الدفعة أو الشحنة (Batch Title) *</label>
        <input
          type="text"
          value={batchName}
          onChange={(e) => setBatchName(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
        />
      </div>

      {/* Dropzone Area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleSimulateDrop('image'); }}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
          dragActive
            ? 'border-amber-400 bg-amber-500/10 scale-[0.99]'
            : 'border-white/15 bg-black/40 hover:border-amber-500/40 hover:bg-white/5'
        }`}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 mb-3 border border-amber-500/30">
          <Sparkles className="h-7 w-7 animate-pulse" />
        </div>

        <h4 className="text-sm font-bold text-white mb-1">
          اسحب الملفات أو الدفعات هنا أو اختر نوع الملف للرفع الفوري
        </h4>
        <p className="text-xs text-slate-400 max-w-md mb-6">
          يدعم صور المنتجات عالية الجودة، الأرشيفات المضغوطة ZIP، ومستندات كشوف الصاغة PDF/Excel/CSV
        </p>

        {/* Quick Upload Buttons for formats */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => handleSimulateDrop('image')}
            className="flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/30 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-all"
          >
            <ImageIcon className="h-4 w-4 text-amber-400" />
            رفع صور المنتجات (Images)
          </button>
          <button
            type="button"
            onClick={() => handleSimulateDrop('zip')}
            className="flex items-center gap-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 transition-all"
          >
            <Archive className="h-4 w-4 text-cyan-400" />
            أرشيف ZIP مجمع ({selectedBatchSize} قطعة)
          </button>
          <button
            type="button"
            onClick={() => handleSimulateDrop('csv')}
            className="flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            كشف Excel/CSV (OCR Specs)
          </button>
        </div>
      </div>
    </div>
  );
}
