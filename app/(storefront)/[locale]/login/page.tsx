'use client';

import * as React from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { Shield, Lock, Mail, ArrowRight, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const isAr = locale === 'ar';

  const redirectUrl = searchParams.get('redirect') || `/${locale}/admin`;

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || (isAr ? 'بيانات الدخول غير صحيحة' : 'Invalid email or password'));
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 300);
    } catch (err: any) {
      setError(err.message || (isAr ? 'حدث خطأ أثناء تسجيل الدخول' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: string) => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Quick login failed');
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 200);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#070707] text-[#EDEDED] p-4 relative overflow-hidden"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-white/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 mb-4 shadow-2xl">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-serif tracking-wide text-white">
            {isAr ? 'بوابة باهر سيلفر الآمنة' : 'Baher Silver Enterprise Portal'}
          </h1>
          <p className="text-xs text-white/50 mt-1.5 tracking-wider uppercase font-mono">
            {isAr ? 'الوصول الموحد للأنظمة والحوكمة' : 'Unified Identity & RBAC Access Gateway'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0D0D0D]/90 border border-white/10 rounded-2xl p-7 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{isAr ? 'تم التحقق بنجاح، جاري التحويل...' : 'Authenticated successfully, redirecting...'}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                {isAr ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 -translate-y-1/2 left-3.5 rtl:left-auto rtl:right-3.5 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@bahersilver.com"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-10 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-all font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                {isAr ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2 left-3.5 rtl:left-auto rtl:right-3.5 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-10 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-all font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full mt-2 py-3 bg-white text-black hover:bg-white/90 rounded-xl text-sm font-medium transition-all shadow-lg hover:shadow-white/10 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>{isAr ? 'جاري التحقق...' : 'Authenticating...'}</span>
              ) : (
                <>
                  <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </>
              )}
            </button>
          </form>

          {/* Quick Persona Access for Testing / Dev */}
          <div className="mt-6 pt-5 border-t border-white/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-white/40">
                {isAr ? 'أدوار النظام المعتمدة (Quick Switch)' : 'Authorized Enterprise Personas'}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-white/30" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                disabled={loading}
                className="px-3 py-2 text-left rtl:text-right rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-all text-xs text-white/80 flex flex-col"
              >
                <span className="font-medium text-white">Owner / Admin</span>
                <span className="text-[10px] text-white/40 font-mono">admin@bahersilver.com</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('storemanager')}
                disabled={loading}
                className="px-3 py-2 text-left rtl:text-right rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-all text-xs text-white/80 flex flex-col"
              >
                <span className="font-medium text-white">Store Manager</span>
                <span className="text-[10px] text-white/40 font-mono">storemanager@bahersilver.com</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('cashier')}
                disabled={loading}
                className="px-3 py-2 text-left rtl:text-right rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-all text-xs text-white/80 flex flex-col"
              >
                <span className="font-medium text-white">Cashier</span>
                <span className="text-[10px] text-white/40 font-mono">cashier@bahersilver.com</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('viewer')}
                disabled={loading}
                className="px-3 py-2 text-left rtl:text-right rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-all text-xs text-white/80 flex flex-col"
              >
                <span className="font-medium text-white">Viewer (Auditor)</span>
                <span className="text-[10px] text-white/40 font-mono">viewer@bahersilver.com</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-[11px] text-white/30 font-mono">
          <span>{isAr ? 'نظام باهر سيلفر المحمي بمحرك MIP للحوكمة' : 'Protected by MIP Cryptographic Governance'}</span>
        </div>
      </div>
    </div>
  );
}
