'use client';

import React, { useState } from 'react';
import { cmsService, CMSPage, ContentBlock, BlockType } from '@/lib/services/cms';
import { CMSPageRenderer } from '@/components/cms/CMSPageRenderer';
import {
  Layout,
  Plus,
  Save,
  RotateCcw,
  Sparkles,
  Search,
  Eye,
  Layers,
  Globe,
  Trash2,
  MoveUp,
  MoveDown,
  Monitor,
  Tablet,
  Smartphone,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface CMSBuilderClientProps {
  locale?: string;
}

export function CMSBuilderClient({ locale = 'en' }: CMSBuilderClientProps) {
  const [page, setPage] = useState<CMSPage>(() => {
    return cmsService.getPageBySlug('home') || {
      id: 'cms-page-new',
      slug: 'new-page',
      title: { en: 'New CMS Page', ar: 'صفحة جديدة' },
      status: 'draft',
      seo: {
        metaTitle: { en: 'New Page | Baher Silver', ar: 'صفحة جديدة | باهر للفضة' },
        metaDescription: { en: 'Luxury 925 sterling silver jewelry.', ar: 'مجوهرات فضية فاخرة عيار 925.' },
      },
      blocks: [],
      versions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  const [activeTab, setActiveTab] = useState<'blocks' | 'seo' | 'history' | 'ai' | 'analytics' | 'preview'>('blocks');
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [aiTopicInput, setAiTopicInput] = useState('Spring Silver Collection 2026');
  const [aiGeneratedResult, setAiGeneratedResult] = useState<{ en: string; ar: string } | null>(null);

  const userRole = 'Head of Marketing & CMS Admin';

  const handleSavePage = () => {
    const saved = cmsService.savePage(page);
    setPage(saved);
    alert(locale === 'ar' ? 'تم حفظ وإصدار الصفحة بنجاح!' : 'Page and version snapshot saved successfully!');
  };

  const handleRestoreVersion = (versionId: string) => {
    const restored = cmsService.restorePageVersion(page.slug, versionId);
    if (restored) {
      setPage(restored);
      alert(locale === 'ar' ? `تم استعادة النسخة ${versionId} بنجاح!` : `Restored version ${versionId} successfully!`);
    }
  };

  const handleAddBlock = (type: BlockType) => {
    const nextIndex = page.blocks.length + 1;
    const newBlock: ContentBlock = {
      id: `blk-${type}-${nextIndex}`,
      type,
      order: nextIndex,
      title: { en: `New ${type} Section`, ar: `قسم ${type} جديد` },
      subtitle: { en: 'Subtitle description goes here', ar: 'الوصف الفرعي هنا' },
    };
    setPage((prev) => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
  };

  const handleRemoveBlock = (id: string) => {
    setPage((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
    }));
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const blocks = [...page.blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const temp = blocks[index];
    blocks[index] = blocks[targetIndex];
    blocks[targetIndex] = temp;

    blocks.forEach((b, i) => (b.order = i + 1));

    setPage((prev) => ({ ...prev, blocks }));
  };

  const handleTriggerAI = () => {
    const generated = cmsService.generateAIBilingualContentPrompt(aiTopicInput);
    setAiGeneratedResult(generated);
  };

  const handleUpdateBlockTitleEn = (blockId: string, enText: string) => {
    setPage((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId ? { ...b, title: { en: enText, ar: b.title?.ar || '' } } : b
      ),
    }));
  };

  const handleUpdateBlockTitleAr = (blockId: string, arText: string) => {
    setPage((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) =>
        b.id === blockId ? { ...b, title: { en: b.title?.en || '', ar: arText } } : b
      ),
    }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-slate-800 dark:text-slate-100 space-y-6">
      {/* CMS STUDIO HEADER WITH ROLE & VIEWPORT CONTROLS */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl flex flex-wrap items-center justify-between gap-4 text-white shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Layout className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold flex items-center gap-2">
              <span>Headless CMS & Marketing Studio</span>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase font-mono">
                {page.status}
              </span>
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Slug: /{page.slug}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                {userRole}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Viewport Switcher */}
          <div className="flex gap-1 p-1 bg-slate-800 rounded-xl border border-slate-700">
            <button
              onClick={() => setPreviewViewport('desktop')}
              className={`p-1.5 rounded-lg transition-colors ${previewViewport === 'desktop' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              title="Desktop Viewport"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPreviewViewport('tablet')}
              className={`p-1.5 rounded-lg transition-colors ${previewViewport === 'tablet' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              title="Tablet Viewport"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPreviewViewport('mobile')}
              className={`p-1.5 rounded-lg transition-colors ${previewViewport === 'mobile' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              title="Mobile Viewport"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setActiveTab(activeTab === 'preview' ? 'blocks' : 'preview')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>{activeTab === 'preview' ? 'Edit Studio' : 'Live Preview'}</span>
          </button>
          <button
            onClick={handleSavePage}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
          >
            <Save className="w-4 h-4" />
            <span>Publish & Save Snapshot</span>
          </button>
        </div>
      </div>

      {/* STUDIO NAVIGATION TABS */}
      <div className="flex gap-2 p-1 bg-slate-200 dark:bg-slate-900 rounded-2xl max-w-3xl">
        <button
          onClick={() => setActiveTab('blocks')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'blocks' ? 'bg-white dark:bg-slate-800 text-amber-500 shadow-sm' : 'text-slate-500'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Blocks ({page.blocks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('seo')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'seo' ? 'bg-white dark:bg-slate-800 text-amber-500 shadow-sm' : 'text-slate-500'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>SEO & Schemas</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history' ? 'bg-white dark:bg-slate-800 text-amber-500 shadow-sm' : 'text-slate-500'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Audit History ({page.versions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'analytics' ? 'bg-white dark:bg-slate-800 text-amber-500 shadow-sm' : 'text-slate-500'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Page Analytics</span>
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'ai' ? 'bg-white dark:bg-slate-800 text-amber-500 shadow-sm' : 'text-slate-500'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Generator</span>
        </button>
      </div>

      {/* TAB 1: CONTENT BLOCK BUILDER */}
      {activeTab === 'blocks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            {page.blocks.map((block, idx) => (
              <div
                key={block.id}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 font-bold text-xs flex items-center justify-center font-mono">
                      {block.order}
                    </span>
                    <span className="font-bold text-sm uppercase text-slate-900 dark:text-slate-100">
                      Block: [{block.type}]
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveBlock(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                    >
                      <MoveUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveBlock(idx, 'down')}
                      disabled={idx === page.blocks.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30 cursor-pointer"
                    >
                      <MoveDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveBlock(block.id)}
                      className="p-1 text-red-400 hover:text-red-600 cursor-pointer ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-amber-500" />
                      <span>Title (English)</span>
                    </label>
                    <input
                      type="text"
                      value={block.title?.en || ''}
                      onChange={(e) => handleUpdateBlockTitleEn(block.id, e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-amber-500" />
                      <span>العنوان (بالعربية)</span>
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      value={block.title?.ar || ''}
                      onChange={(e) => handleUpdateBlockTitleAr(block.id, e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-alexandria focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Plus className="w-4 h-4 text-amber-500" />
                <span>Add Reusable Content Block</span>
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {(['hero', 'banner', 'collection_highlight', 'faq', 'testimonial', 'newsletter', 'gallery', 'video'] as BlockType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleAddBlock(type)}
                    className="p-2.5 bg-slate-50 dark:bg-slate-950 hover:bg-amber-500/10 hover:border-amber-500/30 border border-slate-200 dark:border-slate-800 rounded-xl text-left font-semibold uppercase text-[11px] text-slate-300 transition-all cursor-pointer"
                  >
                    + {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SEO & OPEN GRAPH */}
      {activeTab === 'seo' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-6 shadow-sm max-w-3xl">
          <h2 className="font-extrabold text-base flex items-center gap-2 border-b pb-3 dark:border-slate-800">
            <Search className="w-5 h-5 text-amber-500" />
            <span>Search Engine & OpenGraph Metadata</span>
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-400 mb-1">Meta Title (English)</label>
              <input
                type="text"
                value={page.seo.metaTitle.en}
                onChange={(e) => setPage({ ...page, seo: { ...page.seo, metaTitle: { ...page.seo.metaTitle, en: e.target.value } } })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">Meta Description (English)</label>
              <textarea
                rows={2}
                value={page.seo.metaDescription.en}
                onChange={(e) => setPage({ ...page, seo: { ...page.seo, metaDescription: { ...page.seo.metaDescription, en: e.target.value } } })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VERSION HISTORY */}
      {activeTab === 'history' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-sm max-w-3xl">
          <h2 className="font-extrabold text-base flex items-center gap-2 border-b pb-3 dark:border-slate-800">
            <RotateCcw className="w-5 h-5 text-amber-500" />
            <span>Content Version Audit & Restoration</span>
          </h2>

          <div className="space-y-3">
            {page.versions.map((ver) => (
              <div key={ver.versionId} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="font-bold text-amber-400">{ver.versionId}</span> — by {ver.createdByName}
                  <p className="text-[11px] text-slate-500">{new Date(ver.createdAt).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => handleRestoreVersion(ver.versionId)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer"
                >
                  Restore Version
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: PAGE ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-6 shadow-sm max-w-3xl">
          <h2 className="font-extrabold text-base flex items-center gap-2 border-b pb-3 dark:border-slate-800">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <span>Real-time Page Analytics & Conversion Metrics</span>
          </h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-1">
              <span className="text-xs text-slate-500">Total Pageviews</span>
              <p className="text-2xl font-extrabold font-mono text-amber-400">142,890</p>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-1">
              <span className="text-xs text-slate-500">Checkout Conversion</span>
              <p className="text-2xl font-extrabold font-mono text-emerald-400">4.85%</p>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-1">
              <span className="text-xs text-slate-500">Avg Time on Page</span>
              <p className="text-2xl font-extrabold font-mono text-blue-400">2m 45s</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AI PROMPT GENERATOR */}
      {activeTab === 'ai' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-sm max-w-3xl">
          <h2 className="font-extrabold text-base flex items-center gap-2 border-b pb-3 dark:border-slate-800">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>AI Bilingual Content Drafter</span>
          </h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={aiTopicInput}
              onChange={(e) => setAiTopicInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs"
            />
            <button
              onClick={handleTriggerAI}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl cursor-pointer"
            >
              Generate Draft
            </button>
          </div>

          {aiGeneratedResult && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs font-mono">
              <div>
                <strong className="text-amber-400">EN Draft:</strong>
                <p className="text-slate-300 mt-1">{aiGeneratedResult.en}</p>
              </div>
              <div dir="rtl">
                <strong className="text-amber-400">مسودة عربي:</strong>
                <p className="text-slate-300 mt-1 font-alexandria">{aiGeneratedResult.ar}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: LIVE PREVIEW WITH VIEWPORT SWITCHER */}
      {activeTab === 'preview' && (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 font-mono text-center">
            Active Viewport: <strong className="text-amber-400 uppercase">{previewViewport}</strong>
          </div>
          <div
            className={`mx-auto transition-all duration-300 border-2 border-amber-500/30 rounded-3xl bg-slate-950 p-4 ${
              previewViewport === 'mobile'
                ? 'max-w-sm'
                : previewViewport === 'tablet'
                ? 'max-w-2xl'
                : 'max-w-full'
            }`}
          >
            <CMSPageRenderer page={page} locale={locale} />
          </div>
        </div>
      )}
    </div>
  );
}
