'use client';

import React from 'react';
import Link from 'next/link';
import { ContentBlock } from '@/lib/services/cms';
import { Sparkles, HelpCircle, ArrowRight, Play, Mail, CheckCircle2 } from 'lucide-react';

interface CMSBlockRendererProps {
  block: ContentBlock;
  locale?: string;
}

export function CMSBlockRenderer({ block, locale = 'en' }: CMSBlockRendererProps) {
  const isAr = locale === 'ar';

  switch (block.type) {
    case 'hero':
      return (
        <section className="relative overflow-hidden bg-slate-950 text-white py-20 px-6 rounded-3xl my-6 border border-slate-800 shadow-2xl">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold text-xs uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              <span>{isAr ? 'مجموعة باهر الفاخرة' : 'BAHER SILVER LUXURY'}</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white">
              {block.title ? (isAr ? block.title.ar : block.title.en) : ''}
            </h1>
            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
              {block.subtitle ? (isAr ? block.subtitle.ar : block.subtitle.en) : ''}
            </p>
            {block.buttonText && block.buttonLink && (
              <div>
                <Link
                  href={`/${locale}${block.buttonLink}`}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-sm rounded-2xl shadow-xl transition-all cursor-pointer"
                >
                  <span>{isAr ? block.buttonText.ar : block.buttonText.en}</span>
                  <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                </Link>
              </div>
            )}
          </div>
        </section>
      );

    case 'faq':
      return (
        <section className="py-12 px-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl my-6 shadow-sm">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-3 justify-center text-center">
              <HelpCircle className="w-6 h-6 text-amber-500" />
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {block.title ? (isAr ? block.title.ar : block.title.en) : 'FAQs'}
              </h2>
            </div>
            <div className="space-y-4">
              {block.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2"
                >
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{item.question ? (isAr ? item.question.ar : item.question.en) : ''}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-6">
                    {item.answer ? (isAr ? item.answer.ar : item.answer.en) : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    case 'video':
      return (
        <section className="py-12 px-6 bg-slate-950 text-white rounded-3xl my-6 border border-slate-800 shadow-xl text-center space-y-4">
          <h2 className="text-2xl font-extrabold">
            {block.title ? (isAr ? block.title.ar : block.title.en) : 'Craftsmanship Showcase'}
          </h2>
          <div className="relative w-full max-w-4xl mx-auto h-64 sm:h-96 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 overflow-hidden group cursor-pointer">
            <div className="w-16 h-16 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
              <Play className="w-8 h-8 fill-slate-950 translate-x-0.5" />
            </div>
          </div>
        </section>
      );

    case 'newsletter':
      return (
        <section className="py-12 px-6 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl my-6 text-center space-y-4">
          <Mail className="w-8 h-8 text-amber-500 mx-auto" />
          <h2 className="text-2xl font-extrabold text-white">
            {block.title ? (isAr ? block.title.ar : block.title.en) : 'Join Our VIP Newsletter'}
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {block.subtitle ? (isAr ? block.subtitle.ar : block.subtitle.en) : 'Subscribe to receive exclusive offers and drops.'}
          </p>
          <div className="max-w-md mx-auto flex gap-2">
            <input
              type="email"
              placeholder="alex@example.com"
              className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer">
              {isAr ? 'اشتراك' : 'Subscribe'}
            </button>
          </div>
        </section>
      );

    default:
      return (
        <section className="py-8 px-6 bg-slate-100 dark:bg-slate-900 rounded-2xl my-4 text-xs font-mono text-slate-500">
          CMS Block: [{block.type}] - {block.title ? (isAr ? block.title.ar : block.title.en) : 'Untitled'}
        </section>
      );
  }
}
