'use client';

/**
 * 📷 Mobile Barcode Scanner Component for Baher Silver Portal POS
 *
 * Provides camera-based barcode scanning using standard browser APIs:
 *   1. Zero external npm dependencies.
 *   2. HTML5 MediaDevices camera access (environment / rear camera prioritized).
 *   3. High-performance native BarcodeDetector API when available in modern browsers.
 *   4. Instant manual barcode entry fallback for legacy browsers or camera permission denial.
 *   5. Robust track teardown, debounced detection, and visual scanline overlay.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  X,
  Scan,
  AlertCircle,
  Keyboard,
  RefreshCw,
  CheckCircle2,
  CameraOff
} from 'lucide-react';

export interface MobileBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export function MobileBarcodeScanner({
  isOpen,
  onClose,
  onScan,
  title = 'Mobile Barcode Scanner'
}: MobileBarcodeScannerProps): React.ReactElement | null {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [barcodeDetectorSupported, setBarcodeDetectorSupported] = useState<boolean>(false);
  const [manualBarcode, setManualBarcode] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState<string | null>(null);

  // Stop camera tracks cleanly
  const stopCameraStream = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setErrorMessage(null);
    setLastDetectedBarcode(null);

    if (typeof navigator === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      setHasCameraPermission(false);
      setErrorMessage('Camera access is not supported by this browser environment. Please use manual barcode entry.');
      return;
    }

    try {
      // Prioritize rear environment-facing camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      setHasCameraPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {
          // Autoplay policy or already playing
        });
        setIsScanning(true);
      }
    } catch (err: any) {
      console.warn('Camera stream request error:', err);
      setHasCameraPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera permission was denied. Please allow camera access in browser settings or enter barcode manually.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera device detected on this hardware. Use manual barcode input.');
      } else {
        setErrorMessage(err.message || 'Unable to open camera stream. Use manual barcode input.');
      }
    }
  }, []);

  // Initialize BarcodeDetector loop if supported
  useEffect(() => {
    const isSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    setBarcodeDetectorSupported(isSupported);

    if (!isOpen) {
      stopCameraStream();
      return;
    }

    startCamera();

    return () => {
      stopCameraStream();
    };
  }, [isOpen, startCamera, stopCameraStream]);

  // Continuous frame detection using BarcodeDetector API
  useEffect(() => {
    if (!isOpen || !isScanning || !barcodeDetectorSupported) return;

    let active = true;
    let detector: any = null;

    try {
      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      detector = new BarcodeDetectorClass({
        formats: ['code_128', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e']
      });
    } catch (err) {
      console.warn('BarcodeDetector initialization warning:', err);
      return;
    }

    const scanFrame = async () => {
      if (!active || !videoRef.current) return;

      const video = videoRef.current;
      if (video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue?.trim();
            const now = Date.now();

            // 1500ms debounce
            if (rawValue && now - lastScannedTimeRef.current > 1500) {
              lastScannedTimeRef.current = now;
              setLastDetectedBarcode(rawValue);

              // Visual feedback before executing scan callback
              setTimeout(() => {
                onScan(rawValue);
                onClose();
              }, 400);
              return;
            }
          }
        } catch {
          // Ignore individual frame detection errors
        }
      }

      if (active) {
        scanLoopRef.current = requestAnimationFrame(scanFrame);
      }
    };

    scanLoopRef.current = requestAnimationFrame(scanFrame);

    return () => {
      active = false;
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
        scanLoopRef.current = null;
      }
    };
  }, [isOpen, isScanning, barcodeDetectorSupported, onScan, onClose]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualBarcode.trim();
    if (!trimmed) return;
    onScan(trimmed);
    setManualBarcode('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#12131F] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
          </div>
          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title="Close scanner"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Viewport / Scanner Frame */}
        <div className="relative w-full aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
          {hasCameraPermission ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Aiming Reticle & Animated Scanline */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-3/4 h-2/3 border-2 border-amber-500/60 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  {/* Corner Guides */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-400" />

                  {/* Laser Scan Animation */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_#f59e0b] animate-pulse" />
                </div>
              </div>

              {/* Detected Success Indicator */}
              {lastDetectedBarcode && (
                <div className="absolute inset-0 bg-emerald-950/80 flex flex-col items-center justify-center gap-2 animate-fade-in">
                  <CheckCircle2 size={42} className="text-emerald-400 animate-bounce" />
                  <div className="text-xs font-mono font-bold text-emerald-300">
                    {lastDetectedBarcode}
                  </div>
                  <span className="text-[10px] text-white/70">Product barcode detected!</span>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 text-center flex flex-col items-center justify-center gap-3 text-white/60">
              <CameraOff size={36} className="text-amber-400/80" />
              <div className="text-xs font-medium text-white/80">
                {errorMessage || 'Camera inactive or unavailable'}
              </div>
              <button
                onClick={startCamera}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all"
              >
                <RefreshCw size={13} />
                Try Camera Again
              </button>
            </div>
          )}
        </div>

        {/* Status / Instructions Bar */}
        <div className="px-5 py-3 border-b border-white/8 bg-white/[0.01] flex items-center justify-between text-[11px] font-mono text-white/60">
          <div className="flex items-center gap-1.5">
            <Scan size={13} className="text-amber-400" />
            <span>
              {barcodeDetectorSupported
                ? 'Native Barcode Detector Active'
                : 'Camera active (Use manual fallback or optical)'}
            </span>
          </div>
          {isScanning && (
            <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE
            </span>
          )}
        </div>

        {/* Manual Barcode Fallback Input */}
        <div className="p-5 flex flex-col gap-2 bg-[#0e0f18]">
          <label className="text-[11px] font-semibold text-white/70 flex items-center gap-1.5">
            <Keyboard size={13} className="text-amber-400" />
            Manual Barcode Input / Scanner Fallback:
          </label>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. BC925001 or SKU..."
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              className="flex-1 bg-black/50 border border-white/10 focus:border-amber-500 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-white/30 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={!manualBarcode.trim()}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition-colors shadow-md"
            >
              Scan
            </button>
          </form>
          <p className="text-[10px] text-white/40">
            Hold product barcode in front of camera or enter the code directly.
          </p>
        </div>
      </div>
    </div>
  );
}
