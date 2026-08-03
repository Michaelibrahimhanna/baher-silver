'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, ListTodo, Wrench } from 'lucide-react';
import { AISmartTaskSuggestion } from '@/types/aiProductMachine';

interface AiSmartTaskSuggestionsPanelProps {
  tasks: AISmartTaskSuggestion[];
  onTaskResolved: (taskId: string) => void;
}

export function AiSmartTaskSuggestionsPanel({
  tasks,
  onTaskResolved,
}: AiSmartTaskSuggestionsPanelProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center text-xs font-bold text-emerald-300 flex items-center justify-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        <span>لا توجد مهام أو تنبيهات معلقة — مكتمل الجودة بنسبة 100%!</span>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-amber-500/30 bg-slate-950 p-6 space-y-4 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <ListTodo className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              مهام ومقترحات المعالجة الذكية الآلية (AI Smart Tasks Engine)
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-500/30">
                {tasks.length} Pending Tasks
              </span>
            </h3>
            <p className="text-xs text-slate-400">يقوم المشغل الذكي بتوليد المهام تلقائياً لمعالجة الثغرات والتفاصيل المفقودة.</p>
          </div>
        </div>
      </div>

      {/* Task List Stream */}
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-center justify-between rounded-2xl border p-4 text-xs transition-all ${
              task.severity === 'high'
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                : task.severity === 'medium'
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${task.severity === 'high' ? 'text-rose-400' : 'text-amber-400'}`} />
              <div>
                <span className="font-bold text-white block">{task.title_ar}</span>
                <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{task.code} • Field: {task.field}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onTaskResolved(task.id)}
              className="flex items-center gap-1 rounded-xl border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white hover:bg-black/60 transition-all"
            >
              <Wrench className="h-3.5 w-3.5 text-amber-400" />
              تمت المعالجة (Resolve)
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
