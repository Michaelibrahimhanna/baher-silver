'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { X, Sparkles, Send, Bot, User, CheckCircle2 } from 'lucide-react';
import { BaherBrainAiService, AIChatMessage } from '@/lib/services/baherBrainAi';

interface BaherBrainChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BaherBrainChatDrawer({ isOpen, onClose }: BaherBrainChatDrawerProps) {
  const router = useRouter();
  const [input, setInput] = React.useState('');
  const [messages, setMessages] = React.useState<AIChatMessage[]>([
    {
      id: 'init-msg',
      sender: 'assistant',
      text_ar: 'مرحباً بك! أنا مساعد Baher Brain الذكي المنفذ للأوامر. يمكنك إعطائي أي أمر باللغة العربية أو الإنجليزية.',
      text_en: 'Welcome! I am your Baher Brain Conversational AI Assistant ready to execute commands.',
      timestamp: new Date().toLocaleTimeString('ar-EG'),
    },
  ]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text_ar: input,
      text_en: input,
      timestamp: new Date().toLocaleTimeString('ar-EG'),
    };

    const aiMsg = BaherBrainAiService.processUserCommand(input, 'ar');
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput('');

    if (aiMsg.executedAction && aiMsg.executedAction.payload?.url) {
      setTimeout(() => {
        router.push(aiMsg.executedAction?.payload?.url as string);
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-slate-950 text-white shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                Baher Brain AI Assistant
                <Sparkles className="h-4 w-4 text-amber-400" />
              </h3>
              <p className="text-xs text-slate-400">مساعد الإدارة الذكي بالأوامر النصية الصوتية والطبيعية</p>
            </div>
          </div>

          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Suggestion Prompt Chips */}
        <div className="flex overflow-x-auto gap-2 p-3 border-b border-white/10 bg-slate-900/50 scrollbar-none text-xs">
          {[
            'عرض قائمة الطلبات الحالية',
            'إنشاء منتج فضة جديد',
            'تعديل العملة إلى USD',
            'حساب أرباح خاتم الفضة',
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => { setInput(chip); }}
              className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold text-amber-300 whitespace-nowrap hover:bg-amber-500/20"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 text-xs ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                msg.sender === 'user'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {msg.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div className={`max-w-[80%] rounded-2xl p-3.5 space-y-1 ${
                msg.sender === 'user'
                  ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-100'
                  : 'bg-black/40 border border-white/10 text-slate-200'
              }`}>
                <p className="leading-relaxed">{msg.text_ar}</p>
                {msg.executedAction && (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 pt-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>تم تنفيذ الإجراء آلياً</span>
                  </div>
                )}
                <span className="block text-[9px] text-slate-500 text-left font-mono">{msg.timestamp}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <div className="border-t border-white/10 p-4 bg-black/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="اكتب أمراً لمساعد الذكاء الاصطناعي..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-black hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
