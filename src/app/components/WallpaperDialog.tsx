import { useContext, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Check, CheckCircle2, Diamond, Image, Loader2, Lock, Upload, X } from 'lucide-react';
import { AuthContext, LangContext, MembershipContext, ThemeContext, WallpaperContext } from '../App';
import { PreviewContext } from '../preview';
import { readUiDraft, removeUiDraft, UI_DRAFT_SCOPES, writeUiDraft } from '../lib/uiDrafts';
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

type WallpaperDialogDraft = {
  open: true;
  wallpaperId: string;
  customWallpaperPath: string | null;
  customWallpaperUrl: string | null;
  cardOpacity: number;
  updatedAt: number;
};

export default function WallpaperDialog({ open, onClose }: WallpaperDialogProps) {
  const { lang } = useContext(LangContext);
  const { isDark } = useContext(ThemeContext);
  const { summary, openUpgradeDialog } = useContext(MembershipContext);
  const { session } = useContext(AuthContext);
  const { settings, saveWallpaperSettings, uploadCustomWallpaper } = useContext(WallpaperContext);
  const { isPreview, requestLogin } = useContext(PreviewContext);
  const t = WALLPAPER_LABELS[lang];
  const isLifetime = summary.plan === 'lifetime';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedDraftOwnerRef = useRef<string | null>(null);
  const [draftWallpaperId, setDraftWallpaperId] = useState(settings.wallpaperId);
  const [draftCustomPath, setDraftCustomPath] = useState(settings.customWallpaperPath);
  const [draftCustomUrl, setDraftCustomUrl] = useState(settings.customWallpaperUrl);
  const [draftOpacity, setDraftOpacity] = useState(settings.cardOpacity);
  const [hoveredWallpaperId, setHoveredWallpaperId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: 'success' | 'error' | 'muted'; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const draftOwnerId = session?.user.id ?? 'preview';

  useEffect(() => {
    if (!open) {
      initializedDraftOwnerRef.current = null;
      setDraftReady(false);
      return;
    }
    if (initializedDraftOwnerRef.current === draftOwnerId) return;
    initializedDraftOwnerRef.current = draftOwnerId;
    const savedDraft = readUiDraft<WallpaperDialogDraft>(UI_DRAFT_SCOPES.wallpaperDialog, draftOwnerId);
    setDraftWallpaperId(savedDraft?.wallpaperId ?? settings.wallpaperId);
    setDraftCustomPath(savedDraft?.customWallpaperPath ?? settings.customWallpaperPath);
    setDraftCustomUrl(savedDraft?.customWallpaperUrl ?? settings.customWallpaperUrl);
    setDraftOpacity(savedDraft?.cardOpacity ?? settings.cardOpacity);
    setStatus(null);
    setSaving(false);
    setUploading(false);
    setDraftReady(true);
  }, [draftOwnerId, open, settings.cardOpacity, settings.customWallpaperPath, settings.customWallpaperUrl, settings.wallpaperId]);

  useEffect(() => {
    if (!open || !draftReady) return;
    writeUiDraft(UI_DRAFT_SCOPES.wallpaperDialog, draftOwnerId, {
      open: true as const,
      wallpaperId: draftWallpaperId,
      customWallpaperPath: draftCustomPath,
      customWallpaperUrl: draftCustomUrl,
      cardOpacity: draftOpacity,
    });
  }, [draftCustomPath, draftCustomUrl, draftOpacity, draftOwnerId, draftReady, draftWallpaperId, open]);

  if (!open) return null;

  const canApplyCustom = draftWallpaperId !== CUSTOM_WALLPAPER_ID || Boolean(draftCustomPath);
  const opacityPercent = Math.round(clampCardOpacity(draftOpacity) * 100);
  const opacityTrackPercent = ((opacityPercent - 25) / 65) * 100;
  const opacityTrackBackground = `linear-gradient(to right, ${isDark ? '#172554' : '#111827'} 0%, ${isDark ? '#172554' : '#111827'} ${opacityTrackPercent}%, ${isDark ? '#3f3f46' : '#e5e7eb'} ${opacityTrackPercent}%, ${isDark ? '#3f3f46' : '#e5e7eb'} 100%)`;
  const activeWallpaper = getWallpaperById(settings.wallpaperId);
  const activeWallpaperUrl = settings.wallpaperId === CUSTOM_WALLPAPER_ID ? settings.customWallpaperUrl : activeWallpaper?.src;
  const hasWallpaper = Boolean(activeWallpaperUrl && settings.wallpaperId !== DEFAULT_WALLPAPER_ID);
  const useDarkSurface = hasWallpaper && (isDark || (!isDark && activeWallpaper?.appearance?.lightSurface === 'dark'));
  const dialogOpacity = Math.min(0.9, clampCardOpacity(settings.cardOpacity) + 0.15);
  const dialogSurfaceStyle: CSSProperties | undefined = hasWallpaper
    ? {
        backgroundColor: useDarkSurface ? `rgba(24, 24, 27, ${dialogOpacity})` : `rgba(255, 255, 255, ${dialogOpacity})`,
        backdropFilter: 'blur(14px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(14px) saturate(1.2)',
      }
    : undefined;
  const customWallpaperSurfaceStyle: CSSProperties | undefined = hasWallpaper && !draftCustomUrl
    ? {
        backgroundColor: useDarkSurface ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.30)',
        backdropFilter: 'blur(8px) saturate(1.12)',
        WebkitBackdropFilter: 'blur(8px) saturate(1.12)',
      }
    : undefined;

  const handleClose = () => {
    removeUiDraft(UI_DRAFT_SCOPES.wallpaperDialog, draftOwnerId);
    onClose();
  };

  const handleLockedChoice = () => {
    handleClose();
    if (isPreview) requestLogin('membership');
    else openUpgradeDialog();
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
    removeUiDraft(UI_DRAFT_SCOPES.wallpaperDialog, draftOwnerId);
    window.setTimeout(onClose, 900);
  };

  return (
    <div className="dash-scrollbar fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 py-6 sm:items-center">
      <button
        type="button"
        aria-label="Close wallpaper dialog"
        onClick={handleClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
      />
      <section
        style={dialogSurfaceStyle}
        className={`relative h-[550px] max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border p-4 shadow-2xl dash-scrollbar sm:p-6 ${
          hasWallpaper
            ? 'border-white/35 dark:border-white/10'
            : 'border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
        }`}
      >
        <div className="mb-4 flex items-center gap-3 sm:mb-6">
          <Image className="h-5 w-5 text-gray-900 dark:text-gray-100" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.title}</h2>
        </div>

        <div className="space-y-5">
          <div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3">
              {WALLPAPERS.map((wallpaper) => {
                const locked = wallpaper.access === 'lifetime' && !isLifetime;
                const selected = draftWallpaperId === wallpaper.id;
                const imageSrc = hoveredWallpaperId === wallpaper.id && wallpaper.previewSrc ? wallpaper.previewSrc : wallpaper.src;

                return (
                  <button
                    key={wallpaper.id}
                    type="button"
                    aria-pressed={selected}
                    onMouseEnter={() => setHoveredWallpaperId(wallpaper.id)}
                    onMouseLeave={() => setHoveredWallpaperId(null)}
                    onFocus={() => setHoveredWallpaperId(wallpaper.id)}
                    onBlur={() => setHoveredWallpaperId(null)}
                    onClick={() => locked ? handleLockedChoice() : setDraftWallpaperId(selected ? DEFAULT_WALLPAPER_ID : wallpaper.id)}
                    className={`group overflow-hidden rounded-lg border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:focus-visible:ring-zinc-600 ${
                      selected
                        ? 'border-gray-900 bg-gray-50 shadow-sm dark:border-zinc-200 dark:bg-zinc-700'
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
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1.5 bg-gradient-to-t from-black/65 to-transparent p-1.5 sm:gap-3 sm:p-3">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold text-white sm:text-sm">{wallpaper.name[lang]}</p>
                        </div>
                        <span className="inline-flex h-[18px] flex-shrink-0 items-center gap-0.5 rounded-full bg-white/90 px-1.5 text-[9px] font-normal text-gray-900 sm:h-[22px] sm:gap-1 sm:px-2.5 sm:text-[10px]">
                          {locked ? <Lock className="h-3 w-3" /> : wallpaper.access === 'lifetime' ? <Diamond className="h-3 w-3" /> : null}
                          {wallpaper.access === 'lifetime' ? t.lifetime : t.free}
                        </span>
                      </div>
                      <span className={`absolute right-1.5 top-1.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border sm:right-3 sm:top-3 sm:h-5 sm:w-5 ${
                        selected ? 'border-gray-900 bg-gray-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950' : 'border-white/75 bg-white/20 text-transparent'
                      }`}>
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => isLifetime ? fileInputRef.current?.click() : handleLockedChoice()}
                className={`group flex aspect-video flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-1.5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:focus-visible:ring-zinc-600 sm:gap-2 sm:px-4 ${
                  draftWallpaperId === CUSTOM_WALLPAPER_ID
                    ? 'border-gray-900 bg-gray-50 dark:border-zinc-100 dark:bg-zinc-800'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-white dark:border-zinc-600 dark:bg-zinc-800/60 dark:hover:border-zinc-500 dark:hover:bg-zinc-800'
                }`}
                style={draftCustomUrl ? { backgroundImage: `linear-gradient(rgba(0,0,0,.32), rgba(0,0,0,.32)), url(${draftCustomUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : customWallpaperSurfaceStyle}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm transition group-hover:bg-gray-100 dark:bg-zinc-900 dark:text-zinc-200 dark:group-hover:bg-zinc-700 sm:h-11 sm:w-11">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin sm:h-5 sm:w-5" /> : isLifetime ? <Upload className="h-4 w-4 sm:h-5 sm:w-5" /> : <Lock className="h-4 w-4 sm:h-5 sm:w-5" />}
                </span>
                <span className={`text-[11px] font-semibold sm:text-sm ${draftCustomUrl ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                  {t.custom}
                </span>
                <span className={`text-[10px] sm:text-xs ${draftCustomUrl ? 'text-white/75' : 'text-gray-500 dark:text-gray-400'}`}>
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

          <div className={`box-border h-[85px] rounded-lg p-4 ${hasWallpaper ? (useDarkSurface ? 'bg-white/10' : 'bg-white/45') : 'bg-gray-100 dark:bg-zinc-800'}`}>
            <div className="mb-2.5 flex items-center justify-between">
              <label className={`text-xs font-semibold uppercase tracking-wide ${useDarkSurface ? 'text-white/75' : 'text-gray-700 dark:text-gray-300'}`}>{t.opacity}</label>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{opacityPercent}%</span>
            </div>
            <input
              type="range"
              min={25}
              max={90}
              step={1}
              value={opacityPercent}
              onChange={(event) => setDraftOpacity(clampCardOpacity(Number(event.target.value) / 100))}
              aria-label={t.opacity}
              className="h-[7px] w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-900 outline-none transition focus-visible:ring-2 focus-visible:ring-gray-300 dark:bg-zinc-700 dark:accent-blue-950 dark:focus-visible:ring-blue-700"
              style={{
                background: opacityTrackBackground,
              }}
            />
          </div>

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-300 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-600"
            >
              <X className="h-4 w-4" />
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={saving || uploading || !canApplyCustom}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-950 dark:hover:bg-blue-900 dark:focus-visible:ring-blue-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? t.applying : t.apply}
            </button>
          </div>
        </div>
      </section>
      <div className={`fixed bottom-6 right-6 z-[90] flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg transition-all duration-300 pointer-events-none ${
        status === null ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
      } ${
        status?.tone === 'error'
          ? 'border-red-100 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'
          : status?.tone === 'success'
            ? 'border-gray-200 bg-white text-green-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-green-400'
            : 'border-gray-200 bg-white text-gray-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-400'
      }`}>
        {uploading || saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        <span>{status?.message ?? ''}</span>
      </div>
    </div>
  );
}
