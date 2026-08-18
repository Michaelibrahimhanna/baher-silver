'use client';

import * as React from 'react';
import { UploadCloud, CheckCircle2, X, ImageIcon, FileType, HardDrive, Loader2 } from 'lucide-react';

export interface UploadedMedia {
  id: string;
  file: File;
  previewUrl: string; // Transient preview URL or durable URL
  durableUrl?: string; // Permanent Data URI or storage URL for form state & persistence
  tempBlobUrl?: string; // In-memory temporary blob URL for instant initial rendering
  filename: string;
  type: string;
  sizeBytes: number;
  sizeFormatted: string;
  width?: number;
  height?: number;
  addedAt: string;
  isIngesting?: boolean;
}

interface Props {
  primaryImage: string;
  mediaUrls: string[];
  onPrimaryImageChange?: (url: string) => void;
  onMediaUrlsChange?: (urls: string[]) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Converts a selected File into a durable product source asset.
 * Tries server-side /api/upload first, with automatic client FileReader Data URL fallback.
 */
export async function uploadToDurableAsset(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.url) {
        return data.url;
      }
    }
  } catch {
    // Network or server fallback
  }

  // Client-side fallback to durable Data URL
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('FileReader did not return a string'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
    reader.readAsDataURL(file);
  });
}

export function MediaPlaceholderTab({ primaryImage, mediaUrls, onPrimaryImageChange, onMediaUrlsChange }: Props) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadedMedia, setUploadedMedia] = React.useState<UploadedMedia[]>([]);
  const [dragActive, setDragActive] = React.useState(false);
  const [selectedPreview, setSelectedPreview] = React.useState<UploadedMedia | null>(null);

  // Safely cleanup only temporary blob URLs on unmount without touching durable URLs
  React.useEffect(() => {
    return () => {
      uploadedMedia.forEach((m) => {
        if (m.tempBlobUrl && m.tempBlobUrl.startsWith('blob:')) {
          URL.revokeObjectURL(m.tempBlobUrl);
        }
      });
    };
  }, [uploadedMedia]);

  const processFiles = React.useCallback(
    async (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      // 1. Create immediate temporary preview items with transient blob URLs
      const initialMediaItems: UploadedMedia[] = imageFiles.map((file) => {
        const tempBlob = URL.createObjectURL(file);
        return {
          id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          previewUrl: tempBlob,
          tempBlobUrl: tempBlob,
          filename: file.name,
          type: file.type,
          sizeBytes: file.size,
          sizeFormatted: formatFileSize(file.size),
          addedAt: new Date().toISOString(),
          isIngesting: true,
        };
      });

      // Load image dimensions from temp blob
      initialMediaItems.forEach((m) => {
        const img = new Image();
        img.onload = () => {
          setUploadedMedia((prev) =>
            prev.map((item) =>
              item.id === m.id ? { ...item, width: img.naturalWidth, height: img.naturalHeight } : item
            )
          );
        };
        img.src = m.previewUrl;
      });

      setUploadedMedia((prev) => [...prev, ...initialMediaItems]);

      // 2. Perform durable upload/ingestion for each file
      for (let i = 0; i < initialMediaItems.length; i++) {
        const item = initialMediaItems[i];
        try {
          const durableUrl = await uploadToDurableAsset(item.file);

          // Revoke temporary blob URL safely after durable ingestion completes
          if (item.tempBlobUrl && item.tempBlobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(item.tempBlobUrl);
          }

          setUploadedMedia((prev) =>
            prev.map((m) =>
              m.id === item.id
                ? {
                    ...m,
                    durableUrl,
                    previewUrl: durableUrl,
                    tempBlobUrl: undefined,
                    isIngesting: false,
                  }
                : m
            )
          );

          // Update primary image if needed with durable URL
          if (i === 0 && primaryImage.includes('unsplash.com') && onPrimaryImageChange) {
            onPrimaryImageChange(durableUrl);
          }

          // Append durable URL to mediaUrls in parent state
          if (onMediaUrlsChange) {
            onMediaUrlsChange([...mediaUrls, durableUrl]);
          }
        } catch (err) {
          console.error(`Failed to ingest durable asset for ${item.filename}:`, err);
          setUploadedMedia((prev) =>
            prev.map((m) => (m.id === item.id ? { ...m, isIngesting: false } : m))
          );
        }
      }
    },
    [primaryImage, mediaUrls, onPrimaryImageChange, onMediaUrlsChange]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDropzoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveMedia = (id: string) => {
    setUploadedMedia((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target?.tempBlobUrl && target.tempBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.tempBlobUrl);
      }
      return prev.filter((m) => m.id !== id);
    });
    if (selectedPreview?.id === id) setSelectedPreview(null);
  };

  const handleSetAsPrimary = (media: UploadedMedia) => {
    const targetUrl = media.durableUrl || media.previewUrl;
    if (onPrimaryImageChange && targetUrl) {
      onPrimaryImageChange(targetUrl);
    }
  };

  const allDisplayMedia = [
    ...(primaryImage && !primaryImage.includes('unsplash.com')
      ? [{ type: 'existing', url: primaryImage, label: 'الغلاف الرئيسي' }]
      : []),
    ...mediaUrls
      .filter((u) => u !== primaryImage && !uploadedMedia.some((m) => (m.durableUrl || m.previewUrl) === u))
      .map((url, i) => ({ type: 'existing', url, label: `صورة #${i + 2}` })),
  ];

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md">
      {/* Active Header */}
      <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-emerald-300">محرك ميديا المنتج الحقيقي (Product Media Engine — Active)</h4>
            <p className="text-[11px] text-emerald-200/80">
              رفع وتثبيت صور المنتج الحقيقية بأصول مستدامة. يدعم JPG, PNG, WebP, AVIF.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
          ACTIVE
        </span>
      </div>

      {/* Existing Persistent Images Grid */}
      {allDisplayMedia.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-300">الصور المستدامة الحالية في المنتج (Current Persistent Images):</h4>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {allDisplayMedia.map((item, i) => (
              <div key={i} className="relative group aspect-square rounded-xl border-2 border-white/10 overflow-hidden bg-slate-900 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.label} className="h-full w-full object-cover" />
                <span className="absolute bottom-2 right-2 text-[10px] text-slate-300 bg-black/70 px-1.5 py-0.5 rounded font-mono">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Dropzone — Real File Picker */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-300">رفع صور حقيقية جديدة (Upload Real Product Images):</h4>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          id="media-file-input"
        />

        <div
          onClick={handleDropzoneClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
            dragActive
              ? 'border-amber-400 bg-amber-500/10 scale-[0.99]'
              : 'border-white/20 bg-slate-900/40 hover:border-amber-500/40 hover:bg-white/5'
          }`}
        >
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl mb-3 border transition-colors ${
              dragActive
                ? 'bg-amber-500/30 text-amber-300 border-amber-500/50'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}
          >
            <UploadCloud className="h-7 w-7" />
          </div>

          <h4 className="text-sm font-bold text-white mb-1">
            انقر لاختيار الصور من جهازك أو اسحبها وأسقطها هنا
          </h4>
          <p className="text-xs text-slate-400 max-w-md">
            يدعم JPG, PNG, WebP, AVIF — تحويل مباشر إلى أصول مستدامة دائمة
          </p>
        </div>
      </div>

      {/* Uploaded Images Grid with Metadata & Ingestion Status */}
      {uploadedMedia.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-300">
            الصور المختارة ({uploadedMedia.length}):
          </h4>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {uploadedMedia.map((media) => (
              <div
                key={media.id}
                className="group relative rounded-xl border border-white/10 bg-slate-900 overflow-hidden shadow-lg hover:border-amber-500/40 transition-all"
              >
                {/* Preview Image */}
                <div
                  className="aspect-square cursor-pointer overflow-hidden relative"
                  onClick={() => setSelectedPreview(media)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={media.previewUrl}
                    alt={media.filename}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />

                  {media.isIngesting && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 backdrop-blur-xs">
                      <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                      <span className="text-[10px] text-amber-300 font-mono">جاري التثبيت...</span>
                    </div>
                  )}
                </div>

                {/* Metadata Bar */}
                <div className="p-2.5 space-y-1.5 border-t border-white/5">
                  <div className="flex items-center gap-1.5 text-[10px] text-white font-mono truncate" title={media.filename}>
                    <ImageIcon className="h-3 w-3 text-amber-400 flex-shrink-0" />
                    <span className="truncate">{media.filename}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <FileType className="h-2.5 w-2.5" />
                      {media.type.replace('image/', '').toUpperCase()}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="h-2.5 w-2.5" />
                      {media.sizeFormatted}
                    </span>
                    {media.width && media.height && (
                      <span>{media.width}×{media.height}</span>
                    )}
                  </div>
                </div>

                {/* Actions Overlay */}
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetAsPrimary(media);
                    }}
                    title="تعيين كصورة رئيسية"
                    className="p-1.5 bg-emerald-500/90 text-white rounded-lg text-[9px] font-bold hover:bg-emerald-400 transition-colors shadow"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMedia(media.id);
                    }}
                    title="إزالة"
                    className="p-1.5 bg-rose-500/90 text-white rounded-lg hover:bg-rose-400 transition-colors shadow"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      {selectedPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedPreview(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/20 bg-slate-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedPreview(null)}
              className="absolute top-3 right-3 z-10 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPreview.previewUrl}
              alt={selectedPreview.filename}
              className="max-w-full max-h-[70vh] object-contain mx-auto"
            />

            {/* Metadata Footer */}
            <div className="p-4 border-t border-white/10 space-y-1">
              <div className="text-sm font-bold text-white font-mono">{selectedPreview.filename}</div>
              <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                <span>النوع: <span className="text-white">{selectedPreview.type}</span></span>
                <span>الحجم: <span className="text-white">{selectedPreview.sizeFormatted}</span></span>
                {selectedPreview.width && selectedPreview.height && (
                  <span>الأبعاد: <span className="text-white">{selectedPreview.width}×{selectedPreview.height}px</span></span>
                )}
                <span>وقت الإضافة: <span className="text-white">{new Date(selectedPreview.addedAt).toLocaleTimeString('ar-EG')}</span></span>
                <span>حالة التثبيت: <span className="text-emerald-400 font-semibold">{selectedPreview.durableUrl ? 'أصل مستدام دائم (Durable Asset)' : 'جاري التثبيت...'}</span></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
