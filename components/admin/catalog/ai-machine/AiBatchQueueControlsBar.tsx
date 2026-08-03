'use client';

import * as React from 'react';
import { Pause, Play, RotateCcw, XCircle, Layers } from 'lucide-react';
import { ProductIntakeJob } from '@/types/aiProductMachine';
import { aiBatchQueueManager } from '@/lib/services/aiBatchQueueManager';

interface AiBatchQueueControlsBarProps {
  job: ProductIntakeJob;
  onJobUpdate: (updatedJob: ProductIntakeJob) => void;
}

export function AiBatchQueueControlsBar({ job, onJobUpdate }: AiBatchQueueControlsBarProps) {
  const handlePause = () => {
    aiBatchQueueManager.pauseJob(job.id);
    const updated = aiBatchQueueManager.getJob(job.id);
    if (updated) onJobUpdate({ ...updated });
  };

  const handleResume = () => {
    aiBatchQueueManager.resumeJob(job.id);
    const updated = aiBatchQueueManager.getJob(job.id);
    if (updated) onJobUpdate({ ...updated });
  };

  const handleRetry = () => {
    aiBatchQueueManager.retryJob(job.id);
    const updated = aiBatchQueueManager.getJob(job.id);
    if (updated) onJobUpdate({ ...updated });
  };

  const handleCancel = () => {
    aiBatchQueueManager.cancelJob(job.id);
    const updated = aiBatchQueueManager.getJob(job.id);
    if (updated) onJobUpdate({ ...updated });
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">{job.batchName}</span>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/30">
              {job.batchSize} قطعة (Items)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">الحالة: {job.status.toUpperCase()}</p>
        </div>
      </div>

      {/* Progress Bar & Actions */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex flex-col gap-1 w-36 text-left">
          <span className="text-[10px] text-slate-400 font-mono font-bold">{job.progressPercent}% Completed</span>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${job.progressPercent}%` }} />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {job.status === 'processing' && (
            <button
              type="button"
              onClick={handlePause}
              className="flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20"
            >
              <Pause className="h-3.5 w-3.5" />
              إيقاف مؤقت (Pause)
            </button>
          )}

          {job.status === 'paused' && (
            <button
              type="button"
              onClick={handleResume}
              className="flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
            >
              <Play className="h-3.5 w-3.5" />
              استئناف (Resume)
            </button>
          )}

          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            إعادة المحاولة (Retry)
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20"
          >
            <XCircle className="h-3.5 w-3.5" />
            إلغاء (Cancel)
          </button>
        </div>
      </div>
    </div>
  );
}
