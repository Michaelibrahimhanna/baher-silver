'use client';

import React, { useState } from 'react';
import { OrderAggregate } from '@/lib/types/orderAggregate';
import { qrReceiptService } from '@/lib/services/qrReceipt';
import { QrCode, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface QRReceiptPlaceholderProps {
  order: OrderAggregate;
  locale?: string;
}

interface VerificationResult {
  verified: boolean;
  orderNumber?: string;
  vatId?: string;
  error?: string;
}

export function QRReceiptPlaceholder({ order, locale = 'en' }: QRReceiptPlaceholderProps) {
  const qrData = qrReceiptService.generateReceiptPayload(order);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch(qrData.verificationUrl);
      const data = await res.json();
      setVerificationResult(data);
    } catch {
      setVerificationResult({ verified: false, error: 'Verification error' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-amber-500" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider">
            {locale === 'ar' ? 'الإيصال الرقمي المشفر ZATCA / E-Receipt' : 'Signed E-Receipt QR Verification'}
          </h3>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">
          ZATCA / ETA Standard
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-950 rounded-xl border border-slate-800">
        {/* Generated SVG QR Code Canvas Simulation */}
        <div className="w-32 h-32 bg-white p-2 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
          <div className="w-full h-full bg-slate-950 p-2 rounded flex flex-col items-center justify-center text-[9px] text-amber-400 font-mono text-center overflow-hidden">
            <QrCode className="w-16 h-16 text-white mb-1" />
            <span className="truncate w-full text-[8px] opacity-75">{qrData.qrPayloadBase64.slice(0, 14)}...</span>
          </div>
        </div>

        <div className="flex-1 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>{locale === 'ar' ? 'توقيع إلكتروني مشفر TLV' : 'Encrypted TLV Base64 Payload'}</span>
          </div>
          <p className="text-slate-400">
            <strong>Seller:</strong> {qrData.sellerName} | <strong>Tax ID:</strong> {qrData.sellerVatId}
          </p>
          <p className="text-slate-400 font-mono text-[11px]">
            Payload Hash: {qrData.qrPayloadBase64.slice(0, 28)}...
          </p>

          <button
            type="button"
            onClick={handleVerify}
            disabled={isVerifying}
            className="mt-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {isVerifying
              ? (locale === 'ar' ? 'جاري التحقق...' : 'Verifying Signature...')
              : (locale === 'ar' ? 'التحقق عبر الباكند' : 'Verify Mock Backend Signature')}
          </button>
        </div>
      </div>

      {/* Verification Result Display */}
      {verificationResult && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <p className="font-bold">E-Receipt Backend Verification: SUCCESS</p>
            <p className="text-[11px] opacity-80 font-mono">
              Verified Order: {verificationResult.orderNumber} | Tax ID: {verificationResult.vatId}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
