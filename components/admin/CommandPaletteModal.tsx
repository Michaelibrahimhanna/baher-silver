'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { X, Command } from 'lucide-react';
import { CommandPaletteService } from '@/lib/services/commandPaletteService';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAiChat?: () => void;
  onOpenThemeBuilder?: () => void;
}

export function CommandPaletteModal({
  isOpen,
  onClose,
  onOpenAiChat,
  onOpenThemeBuilder,
}: CommandPaletteModalProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  // Initialize Default System Actions
  React.useEffect(() => {
    CommandPaletteService.registerAction({
      id: 'act-new-product',
      title: 'إنشاء منتج فضة جديد (Create New Product)',
      category: 'Catalog',
      perform: () => router.push('/admin/catalog/products/new'),
    });
    CommandPaletteService.registerAction({
      id: 'act-view-orders',
      title: 'عرض قائمة الطلبات والمعاملات (View Orders)',
      category: 'Navigation',
      perform: () => router.push('/admin/orders'),
    });
    CommandPaletteService.registerAction({
      id: 'act-settings',
      title: 'فتح محرك الإعدادات المركزي (Central Settings Engine)',
      category: 'Navigation',
      perform: () => router.push('/admin/settings'),
    });
    CommandPaletteService.registerAction({
      id: 'act-theme',
      title: 'تخصيص المظهر وتغيير الثيم (Theme Builder)',
      category: 'Theme',
      perform: () => onOpenThemeBuilder?.(),
    });
    CommandPaletteService.registerAction({
      id: 'act-ai-chat',
      title: 'تحدث مع مساعد الذكاء الاصطناعي Baher Brain AI',
      category: 'AI Brain',
      perform: () => onOpenAiChat?.(),
    });
  }, [router, onOpenAiChat, onOpenThemeBuilder]);

  const filteredActions = CommandPaletteService.searchActions(query);

  // Keyboard navigation & Shortcuts (Ctrl+K / Cmd+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open palette
        }
      }

      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredActions.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % (filteredActions.length || 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].perform();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredActions, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 pt-20 backdrop-blur-md">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4 bg-black/40">
          <Command className="h-5 w-5 text-amber-400" />
          <input
            type="text"
            autoFocus
            placeholder="اكتب أمراً أو ابحث سريعاُ (Type a command or search)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          />
          <span className="rounded-lg bg-white/10 px-2 py-1 font-mono text-[10px] text-slate-400">
            Esc
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              لا توجد أوامر مطابقة لـ &quot;{query}&quot;
            </div>
          ) : (
            filteredActions.map((action, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    action.perform();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-right text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : 'bg-black/30 text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                      isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-amber-300'
                    }`}>
                      {action.category}
                    </span>
                    <span>{action.title}</span>
                  </div>

                  {action.shortcut && (
                    <span className="font-mono text-[10px] opacity-70">
                      {action.shortcut}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
