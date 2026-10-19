import { useContext, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import * as Popover from '@radix-ui/react-popover';
import { ArrowRight, Check } from 'lucide-react';
import { LangContext, ThemeContext, WallpaperContext } from '../App';
import { DEFAULT_WALLPAPER_ID, clampCardOpacity, getWallpaperById } from '../wallpapers';

const steps = [
  { target: 'add-site', zh: '点击这里添加新的网站。', en: 'Click here to add a new website.' },
  { target: 'import-links', zh: '也可以从浏览器里导入你收藏的网站。', en: 'You can also import websites saved in your browser.' },
  { target: 'wallpaper', zh: '在这里挑选心仪的壁纸~', en: 'Choose a wallpaper you love here.' },
  { target: 'share-category', zh: '向朋友分享你的宝藏网站。', en: 'Share your favorite websites with friends.' },
] as const;

export default function OnboardingPopover({ step, onNext, onDismiss }: { step: number; onNext: () => void; onDismiss: () => void }) {
  const { lang } = useContext(LangContext);
  const { isDark } = useContext(ThemeContext);
  const { settings } = useContext(WallpaperContext);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [narrow, setNarrow] = useState(window.innerWidth < 768);
  const anchorRef = useRef<HTMLElement | null>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const zh = lang === 'zh';
  const content = steps[step][zh ? 'zh' : 'en'];
  const wallpaper = getWallpaperById(settings.wallpaperId);
  const hasWallpaper = settings.wallpaperId !== DEFAULT_WALLPAPER_ID;
  const darkSurface = isDark || wallpaper?.appearance?.lightSurface === 'dark';
  const opacity = hasWallpaper ? Math.max(0.72, Math.min(0.9, clampCardOpacity(settings.cardOpacity) + 0.15)) : 1;

  useLayoutEffect(() => {
    let current: HTMLElement | null = null;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (current?.isConnected) setRect(current.getBoundingClientRect());
        setNarrow(window.innerWidth < 768);
      });
    };
    const resize = new ResizeObserver(measure);
    const find = () => {
      const target = document.querySelector<HTMLElement>(`[data-onboarding="${steps[step].target}"]`);
      if (!target || target === current || !target.getClientRects().length) return;
      resize.disconnect();
      current = target;
      anchorRef.current = target;
      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
      setAnchor(target);
      setRect(target.getBoundingClientRect());
      resize.observe(target);
      measure();
    };
    setAnchor(null);
    setRect(null);
    find();
    const mutation = new MutationObserver(find);
    mutation.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, [step]);

  if (!anchor || !rect) return null;
  const side = narrow ? 'bottom' : step === 0 ? 'top' : step === 1 ? 'right' : step === 2 ? 'left' : 'bottom';
  return <>
    {createPortal(<div aria-hidden="true" className="pointer-events-none fixed z-[100] rounded-xl border-2 border-ring" style={{ left: Math.max(4, rect.left - 4), top: Math.max(4, rect.top - 4), width: Math.min(rect.width + 8, window.innerWidth - 8), height: rect.height + 8, boxShadow: '0 0 0 9999px var(--onboarding-overlay)' }} />, document.body)}
    <Popover.Root open modal>
      <Popover.Anchor virtualRef={anchorRef} />
      <Popover.Portal>
        <Popover.Content
          role="dialog" aria-modal="true" aria-labelledby="onboarding-title" data-onboarding-panel
          side={side} sideOffset={14} align="center" collisionPadding={16} avoidCollisions
          onInteractOutside={event => event.preventDefault()}
          onEscapeKeyDown={event => { event.preventDefault(); onDismiss(); }}
          onOpenAutoFocus={event => { event.preventDefault(); nextButton.current?.focus(); }}
          onCloseAutoFocus={event => event.preventDefault()}
          className={`dash-tour-panel z-[110] w-80 max-w-[calc(100vw-2rem)] rounded-xl border p-4 shadow-xl outline-none ${darkSurface ? 'dark' : ''}`}
          // Match existing glass dialogs: inline filters survive production CSS prefix optimization.
          style={{ '--onboarding-opacity': opacity, backdropFilter: 'blur(18px) saturate(1.2)', WebkitBackdropFilter: 'blur(18px) saturate(1.2)' } as CSSProperties}
        >
          <h2 id="onboarding-title" className="text-base font-semibold leading-7">{content}</h2>
          <div className="mt-5 flex items-center justify-between gap-4">
            <span className="text-xs tabular-nums text-muted-foreground" aria-label={zh ? `第 ${step + 1} 步，共 4 步` : `Step ${step + 1} of 4`}>{step + 1} / 4</span>
            <button ref={nextButton} type="button" onClick={onNext} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-blue-950 dark:hover:bg-blue-900">{step === 3 ? (zh ? '开始体验' : 'Get started') : (zh ? '下一步' : 'Next')}{step === 3 ? <Check aria-hidden="true" className="h-4 w-4" /> : <ArrowRight aria-hidden="true" className="h-4 w-4" />}</button>
          </div>
          <Popover.Arrow width={16} height={8} className="dash-tour-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  </>;
}
