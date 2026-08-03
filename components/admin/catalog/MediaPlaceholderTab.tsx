'use client';

import * as React from 'react';
import { UploadCloud, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface Props {
  primaryImage: string;
  mediaUrls: string[];
}

export function MediaPlaceholderTab({ primaryImage, mediaUrls }: Props) {
  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md">
      {/* Notice Header */}
      <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-amber-300">منظومة ميديا الفضة (Media Engine Scheduled for Final Sprint)</h4>
            <p className="text-[11px] text-amber-200/80">
              تم تجهيز عقد البيانات وواجهة التصفح فقط. سيتم ربط محرك الرفع التلقائي، Supabase Storage، وشبكة CDN في السبرينت النهائي للمشروع.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-amber-500/20 px-3 py-1 text-[10px] font-bold text-amber-400 border border-amber-500/30">
          Placeholder Mode
        </span>
      </div>

      {/* Contract Preview Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-300">معاينة عقد الصور التجريبية (Mock Images Grid):</h4>
        
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="relative group aspect-square rounded-xl border-2 border-emerald-500/50 overflow-hidden bg-slate-900 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={primaryImage || 'https://images.unsplash.com/photo-1605100804763-247f6612d543?q=80&w=800'} alt="Cover" className="h-full w-full object-cover" />
            <span className="absolute top-2 right-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-black flex items-center gap-1 shadow">
              <CheckCircle2 className="h-2.5 w-2.5" />
              الغلاف الرئيسي
            </span>
          </div>

          {(mediaUrls.length > 0 ? mediaUrls : [
            'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800',
            'https://images.unsplash.com/photo-1611591475140-be3e6e87c087?q=80&w=800'
          ]).map((url, i) => (
            <div key={i} className="relative group aspect-square rounded-xl border border-white/10 overflow-hidden bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Gallery item ${i + 1}`} className="h-full w-full object-cover" />
              <span className="absolute bottom-2 right-2 text-[10px] text-slate-400 bg-black/60 px-1.5 py-0.5 rounded font-mono">
                Slot #{i + 2}
              </span>
            </div>
          ))}

          {/* Upload Dropzone Disabled Mock */}
          <div className="aspect-square rounded-xl border-2 border-dashed border-white/10 bg-slate-900/40 p-4 flex flex-col items-center justify-center text-center space-y-2 cursor-not-allowed opacity-60">
            <UploadCloud className="h-6 w-6 text-slate-500" />
            <div className="text-[11px] font-bold text-slate-400">سحب وإسقاط الصور</div>
            <div className="text-[9px] text-slate-500">سيتم تفعيله بالربط المباشر في السبرينت النهائي</div>
          </div>
        </div>
      </div>
    </div>
  );
}
