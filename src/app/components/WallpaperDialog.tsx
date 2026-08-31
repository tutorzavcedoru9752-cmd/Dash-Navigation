import { useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Diamond, Image, Loader2, Lock, Upload, X } from 'lucide-react';
import { LangContext, MembershipContext, ThemeContext, WallpaperContext } from '../App';
import {
  CUSTOM_WALLPAPER_ID,
  DEFAULT_CARD_OPACITY,
  DEFAULT_WALLPAPER_ID,
  WALLPAPERS,
  clampCardOpacity,
  getWallpaperById,
} from '../wallpapers';

const WALLPAPER_LABELS = {
  en: {
    title: 'Set wallpaper',
    wallpapers: 'Wallpapers',
    free: 'Free',
    lifetime: 'Lifetime',
    custom: 'Custom wallpaper',
    upload: 'Upload image',
    locked: 'Lifetime only',
    opacity: 'Card opacity',
    cancel: 'Cancel',
    apply: 'Apply wallpaper',
    applying: 'Applying...',
    saved: 'Wallpaper applied.',
    error: 'Could not save wallpaper. Please try again.',
    uploadError: 'Upload failed. Please try another image.',
    uploading: 'Uploading...',
  },
  zh: {
    title: '设置壁纸',
    wallpapers: '壁纸',
    free: '免费',
    lifetime: '终身会员',
    custom: '自定义壁纸',
    upload: '上传图片',
    locked: '会员专享',
    opacity: '卡片不透明度',
    cancel: '取消',
    apply: '应用壁纸',
    applying: '应用中...',
    saved: '壁纸已应用。',
    error: '壁纸保存失败，请重试。',
    uploadError: '上传失败，请换一张图片。',
    uploading: '上传中...',
  },
};

type WallpaperDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function WallpaperDialog({ open, onClose }: WallpaperDialogProps) {
  const { lang } = useContext(LangContext);
  const { isDark } = useContext(ThemeContext);
  const { summary, openUpgradeDialog } = useContext(MembershipContext);
  const { settings, saveWallpaperSettings, uploadCustomWallpaper } = useContext(WallpaperContext);
  const t = WALLPAPER_LABELS[lang];
  const isLifetime = summary.plan === 'lifetime';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draftWallpaperId, setDraftWallpaperId] = useState(settings.wallpaperId);
  const [draftCustomPath, setDraftCustomPath] = useState(settings.customWallpaperPath);
  const [draftCustomUrl, setDraftCustomUrl] = useState(settings.customWallpaperUrl);
  const [draftOpacity, setDraftOpacity] = useState(settings.cardOpacity);
  const [hoveredWallpaperId, setHoveredWallpaperId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: 'success' | 'error' | 'muted'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraftWallpaperId(settings.wallpaperId);
    setDraftCustomPath(settings.customWallpaperPath);
    setDraftCustomUrl(settings.customWallpaperUrl);
    setDraftOpacity(settings.cardOpacity);
    setStatus(null);
    setSaving(false);
    setUploading(false);
  }, [open, settings]);

  if (!open) return null;

  const selectedWallpaper = getWallpaperById(draftWallpaperId);
  const canApplyCustom = draftWallpaperId !== CUSTOM_WALLPAPER_ID || Boolean(draftCustomPath);
  const opacityPercent = Math.round(clampCardOpacity(draftOpacity) * 100);
  const opacityTrackPercent = ((opacityPercent - 45) / 45) * 100;
  const opacityTrackBackground = `linear-gradient(to right, ${isDark ? '#172554' : '#111827'} 0%, ${isDark ? '#172554' : '#111827'} ${opacityTrackPercent}%, ${isDark ? '#3f3f46' : '#e5e7eb'} ${opacityTrackPercent}%, ${isDark ? '#3f3f46' : '#e5e7eb'} 100%)`;

  const handleLockedChoice = () => {
    onClose();
    openUpgradeDialog();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isLifetime) {
      handleLockedChoice();
      return;
    }

    setUploading(true);
    setStatus({ tone: 'muted', message: t.uploading });
    const result = await uploadCustomWallpaper(file);
    setUploading(false);
    if (result.error || !result.path || !result.url) {
      setStatus({ tone: 'error', message: result.error || t.uploadError });
      return;
    }
    setDraftWallpaperId(CUSTOM_WALLPAPER_ID);
    setDraftCustomPath(result.path);
    setDraftCustomUrl(result.url);
    setStatus(null);
  };

  const handleApply = async () => {
    if (saving || !canApplyCustom) return;
    const wallpaperId = draftWallpaperId || DEFAULT_WALLPAPER_ID;
    const wallpaper = getWallpaperById(wallpaperId);
    if ((wallpaper?.access === 'lifetime' || wallpaperId === CUSTOM_WALLPAPER_ID) && !isLifetime) {
      handleLockedChoice();
      return;
    }

    setSaving(true);
    const result = await saveWallpaperSettings({
      wallpaperId,
      customWallpaperPath: wallpaperId === CUSTOM_WALLPAPER_ID ? draftCustomPath : null,
      customWallpaperUrl: wallpaperId === CUSTOM_WALLPAPER_ID ? draftCustomUrl : null,
      cardOpacity: draftOpacity,
    });
    setSaving(false);
    if (result.error) {
      setStatus({ tone: 'error', message: t.error });
      return;
    }
    setStatus({ tone: 'success', message: t.saved });
    window.setTimeout(onClose, 450);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 py-6 sm:items-center">
      <button
        type="button"
        aria-label="Close wallpaper dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
      />
      <section className="relative max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image className="h-5 w-5 text-gray-900 dark:text-gray-100" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-100 dark:focus-visible:ring-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t.wallpapers}</p>
              {selectedWallpaper && (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{selectedWallpaper.name[lang]}</span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {WALLPAPERS.map((wallpaper) => {
                const locked = wallpaper.access === 'lifetime' && !isLifetime;
                const selected = draftWallpaperId === wallpaper.id;
                const imageSrc = hoveredWallpaperId === wallpaper.id && wallpaper.previewSrc ? wallpaper.previewSrc : wallpaper.src;

                return (
                  <button
                    key={wallpaper.id}
                    type="button"
                    onMouseEnter={() => setHoveredWallpaperId(wallpaper.id)}
                    onMouseLeave={() => setHoveredWallpaperId(null)}
                    onFocus={() => setHoveredWallpaperId(wallpaper.id)}
                    onBlur={() => setHoveredWallpaperId(null)}
                    onClick={() => locked ? handleLockedChoice() : setDraftWallpaperId(wallpaper.id)}
                    className={`group overflow-hidden rounded-lg border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:focus-visible:ring-zinc-600 ${
                      selected
                        ? 'border-gray-900 shadow-md dark:border-zinc-100'
                        : 'border-gray-200 hover:border-gray-300 dark:border-zinc-700 dark:hover:border-zinc-500'
                    }`}
                  >
                    <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-zinc-800">
                      <img
                        src={imageSrc}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/65 to-transparent p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{wallpaper.name[lang]}</p>
                          <p className="truncate text-xs text-white/75">{wallpaper.description[lang]}</p>
                        </div>
                        <span className="inline-flex h-6 flex-shrink-0 items-center gap-1 rounded-full bg-white/90 px-2 text-[11px] font-semibold text-gray-900">
                          {locked ? <Lock className="h-3 w-3" /> : wallpaper.access === 'lifetime' ? <Diamond className="h-3 w-3" /> : null}
                          {wallpaper.access === 'lifetime' ? t.lifetime : t.free}
                        </span>
                      </div>
                      {selected && (
                        <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-950">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => isLifetime ? fileInputRef.current?.click() : handleLockedChoice()}
                className={`group flex aspect-video flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:focus-visible:ring-zinc-600 ${
                  draftWallpaperId === CUSTOM_WALLPAPER_ID
                    ? 'border-gray-900 bg-gray-50 dark:border-zinc-100 dark:bg-zinc-800'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-white dark:border-zinc-600 dark:bg-zinc-800/60 dark:hover:border-zinc-500 dark:hover:bg-zinc-800'
                }`}
                style={draftCustomUrl ? { backgroundImage: `linear-gradient(rgba(0,0,0,.32), rgba(0,0,0,.32)), url(${draftCustomUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm transition group-hover:bg-gray-100 dark:bg-zinc-900 dark:text-zinc-200 dark:group-hover:bg-zinc-700">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : isLifetime ? <Upload className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                </span>
                <span className={`text-sm font-semibold ${draftCustomUrl ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                  {t.custom}
                </span>
                <span className={`text-xs ${draftCustomUrl ? 'text-white/75' : 'text-gray-500 dark:text-gray-400'}`}>
                  {isLifetime ? t.upload : t.locked}
                </span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="rounded-lg bg-gray-100 p-4 dark:bg-zinc-800">
            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t.opacity}</label>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{opacityPercent}%</span>
            </div>
            <input
              type="range"
              min={45}
              max={90}
              step={1}
              value={opacityPercent}
              onChange={(event) => setDraftOpacity(clampCardOpacity(Number(event.target.value) / 100))}
              aria-label={t.opacity}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-900 outline-none transition focus-visible:ring-2 focus-visible:ring-gray-300 dark:bg-zinc-700 dark:accent-blue-950 dark:focus-visible:ring-blue-700"
              style={{
                background: opacityTrackBackground,
              }}
            />
          </div>

          {status && (
            <p className={`rounded-lg px-3 py-2 text-sm ${
              status.tone === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                : status.tone === 'error'
                  ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300'
            }`}>
              {status.message}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-300 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-600"
            >
              <X className="h-4 w-4" />
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={saving || uploading || !canApplyCustom}
              className="flex h-10 items-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-950 dark:hover:bg-blue-900 dark:focus-visible:ring-blue-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? t.applying : t.apply}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
