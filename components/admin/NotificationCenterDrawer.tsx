'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { X, Bell, CheckCheck, Trash2, ShoppingCart, CreditCard, AlertTriangle, Sparkles, ShieldCheck, Truck } from 'lucide-react';
import { enterpriseNotificationStore, EnterpriseNotificationItem } from '@/lib/services/enterpriseNotificationStore';

interface NotificationCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenterDrawer({ isOpen, onClose }: NotificationCenterDrawerProps) {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<EnterpriseNotificationItem[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setNotifications([...enterpriseNotificationStore.getNotifications()]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    enterpriseNotificationStore.markAllAsRead();
    setNotifications([...enterpriseNotificationStore.getNotifications()]);
  };

  const handleClearAll = () => {
    enterpriseNotificationStore.clearAll();
    setNotifications([]);
  };

  const getCategoryIcon = (category: EnterpriseNotificationItem['category']) => {
    switch (category) {
      case 'orders': return <ShoppingCart className="h-4 w-4 text-cyan-400" />;
      case 'payments': return <CreditCard className="h-4 w-4 text-emerald-400" />;
      case 'stock_alert': return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case 'ai_suggestion': return <Sparkles className="h-4 w-4 text-purple-400" />;
      case 'approval': return <ShieldCheck className="h-4 w-4 text-blue-400" />;
      case 'supplier': return <Truck className="h-4 w-4 text-pink-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-slate-950 text-white shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-5">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">مركز الإشعارات الحية (Enterprise Notifications)</h3>
              <p className="text-xs text-slate-400">تحديثات فورية للطلبات، المدفوعات، التخزين والذكاء الاصطناعي</p>
            </div>
          </div>

          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-3 bg-slate-900/50">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:underline"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            تحديد الكل كقروء
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" />
            مسح الكل
          </button>
        </div>

        {/* Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-slate-500">
              <Bell className="h-10 w-10 text-slate-700 mb-2" />
              <p className="text-xs">لا توجد إشعارات جديدة حالياً.</p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  enterpriseNotificationStore.markAsRead(item.id);
                  if (item.action_url) router.push(item.action_url);
                  onClose();
                }}
                className={`flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-4 transition-all ${
                  item.read
                    ? 'border-white/5 bg-black/20 text-slate-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-white shadow-md shadow-amber-500/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(item.category)}
                    <span className="text-xs font-bold text-white">{item.title_ar}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(item.timestamp).toLocaleTimeString('ar-EG')}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{item.message_ar}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
