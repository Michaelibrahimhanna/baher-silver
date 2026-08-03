'use client';

import * as React from 'react';
import { Heart, Lock, Sparkles, Video, Mic } from 'lucide-react';

export function BaherMemoriesPanel() {
  return (
    <div className="relative rounded-2xl border border-pink-500/20 bg-gradient-to-b from-pink-950/20 via-black to-black p-8 text-center space-y-6 overflow-hidden">
      {/* Locked Badge Overlay */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full bg-pink-500/10 px-3 py-1 text-xs font-bold text-pink-400 border border-pink-500/30">
        <Lock className="h-3.5 w-3.5" />
        Coming in Future Sprint
      </div>

      <div className="mx-auto h-16 w-16 rounded-2xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-lg shadow-pink-500/10">
        <Heart className="h-8 w-8 animate-pulse" />
      </div>

      <div className="max-w-md mx-auto space-y-2">
        <h3 className="text-xl font-bold text-white tracking-tight">نظام ذكريات باهر (Baher Memories System)</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          منظومة حصرية تتيح للعملاء إرفاق رسائل صوتية، فيديوهات إهداء، ونقوش ليزر مخصصة تربط قطعة الفضة بالذكرى عبر الـ Customer QR Code.
        </p>
      </div>

      {/* Feature Architecture Mock Cards */}
      <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto sm:grid-cols-3 opacity-60">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 text-center space-y-1">
          <Mic className="h-5 w-5 mx-auto text-pink-400" />
          <div className="text-xs font-bold text-white">رسائل صوتية (Voice Note)</div>
          <div className="text-[10px] text-slate-500">تسجيل صوتي مخصص</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 text-center space-y-1">
          <Video className="h-5 w-5 mx-auto text-purple-400" />
          <div className="text-xs font-bold text-white">فيديو إهداء (Gift Reel)</div>
          <div className="text-[10px] text-slate-500">فيديو محمي بكلمة سر</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 text-center space-y-1">
          <Sparkles className="h-5 w-5 mx-auto text-amber-400" />
          <div className="text-xs font-bold text-white">نقش ليزر (Laser Engraving)</div>
          <div className="text-[10px] text-slate-500">حفر اسم/تاريخ على الفضة</div>
        </div>
      </div>

      <div className="text-xs text-slate-500 pt-2 border-t border-white/5">
        تم إعداد الهيكلية المعمارية وقواعد البيانات مسبقاً، وسيتم تفعيل البرمجية بالكامل في السبرينت المخصص لها.
      </div>
    </div>
  );
}
