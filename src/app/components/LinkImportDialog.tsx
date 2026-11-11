import { useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Check, CircleHelp, Download, Loader2, Plus, X } from 'lucide-react';
import { LangContext, ThemeContext } from '../App';
import { MAX_BOOKMARK_FILE_BYTES, MAX_BOOKMARKS, parseBookmarkHtml, type BrowserBookmark } from '../lib/bookmarks';

type Props = {
  surfaceStyle?: CSSProperties;
  surfaceClass: string;
  fieldClass: string;
  labelClass: string;
  primaryClass: string;
  darkSurface: boolean;
  uploadSurfaceStyle?: CSSProperties;
  uploadCardClass: string;
  uploadIconClass: string;
  uploadCaptionClass: string;
  onClose: () => void;
  onReadShareCode: (code: string) => Promise<boolean>;
  onReadBookmarks: (rows: BrowserBookmark[], fileName: string) => void;
  onImport: (keepOpen: boolean) => Promise<boolean>;
  selectedCount: number;
  children: ReactNode;
  notice?: ReactNode;
  pagination?: ReactNode;
};

export default function LinkImportDialog(props: Props) {
  const { lang } = useContext(LangContext);
  const { isDark } = useContext(ThemeContext);
  const zh = lang === 'zh';
  const [source, setSource] = useState<'share' | 'bookmarks' | null>(null);
  const [shareCode, setShareCode] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [completedBatch, setCompletedBatch] = useState(false);
  const [error, setError] = useState('');
  const panel = useRef<HTMLElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  const helpButton = useRef<HTMLButtonElement>(null);
  const operation = useRef(false);
  const mounted = useRef(true);
  const primaryText = props.darkSurface ? 'text-white' : 'text-gray-900 dark:text-gray-100';
  const mutedText = props.darkSurface ? 'text-white/80' : 'text-gray-700 dark:text-gray-300';
  const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed';

  useEffect(() => {
    mounted.current = true;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      mounted.current = false;
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const target = source ? panel.current : panel.current?.querySelector<HTMLInputElement>('#link-import-code');
      target?.focus();
      panel.current?.querySelector('[data-import-body]')?.scrollTo({ top: 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [source]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (helpDialog.current?.open) return;
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== panel.current) return;
      if (event.key === 'Escape' && !busy) { event.preventDefault(); props.onClose(); }
      if (event.key !== 'Tab') return;
      const controls = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]') ?? []).filter(el => el.tabIndex >= 0 && el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (!panel.current?.contains(document.activeElement) || document.activeElement === panel.current) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, props.onClose]);

  const chooseFile = (next?: File) => {
    if (!next || busy) return;
    setError('');
    if (!/\.html?$/i.test(next.name)) { setError(zh ? '请选择 HTML 书签文件。' : 'Choose an HTML bookmarks file.'); return; }
    if (next.size > MAX_BOOKMARK_FILE_BYTES) { setError(zh ? '文件不能超过 5 MB。' : 'File limit is 5 MB.'); return; }
    setFile(next);
    setShareCode('');
  };

  const advance = async () => {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError('');
    try {
      if (source) {
        if (await props.onImport(source === 'bookmarks')) {
          if (mounted.current && source === 'bookmarks') setCompletedBatch(true);
        }
      } else if (file) {
        const result = parseBookmarkHtml(await file.text());
        if (!mounted.current) return;
        if (!result.bookmarks.length) throw new Error('EMPTY_BOOKMARKS');
        props.onReadBookmarks(result.bookmarks, file.name);
        setSource('bookmarks');
      } else if (shareCode.trim()) {
        const found = await props.onReadShareCode(shareCode.trim());
        if (!mounted.current) return;
        if (found) setSource('share');
        else setError(zh ? '未找到有效分享，请检查分享码或确认是否已过期。' : 'Share not found. Check the code and whether it has expired.');
      }
    } catch (cause) {
      if (!mounted.current) return;
      const message = cause instanceof Error ? cause.message : '';
      setError(message === 'TOO_MANY_BOOKMARKS'
        ? (zh ? `最多解析 ${MAX_BOOKMARKS} 个书签，请分文件导入。` : `Up to ${MAX_BOOKMARKS} bookmarks per file.`)
        : message === 'EMPTY_BOOKMARKS'
          ? (zh ? '文件中没有可导入的 HTTP / HTTPS 网站。' : 'No valid HTTP / HTTPS bookmarks found.')
          : (zh ? '操作失败，请检查网络后重试。' : 'Something went wrong. Check your connection and try again.'));
    } finally {
      operation.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const close = () => { if (!busy) props.onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" tabIndex={-1} aria-label={zh ? '关闭导入窗口' : 'Close import dialog'} disabled={busy} onClick={close} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="link-import-title" aria-busy={busy} style={{ ...props.surfaceStyle, colorScheme: props.darkSurface || isDark ? 'dark' : 'light' }} className={`relative flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-2xl border shadow-2xl outline-none ${source ? 'h-[min(90dvh,52rem)]' : ''} ${props.surfaceClass} ${primaryText}`}>
        <header className="flex shrink-0 items-center gap-2 p-4 sm:p-6">
          <Download className="h-5 w-5 shrink-0" />
          <h2 id="link-import-title" className="text-lg font-semibold">{zh ? '导入网址' : 'Import links'}</h2>
        </header>
        <div data-import-body className={`dash-scrollbar min-h-0 overflow-y-auto px-4 sm:px-6 ${source ? 'flex-1' : ''}`}>
          {!source ? <form id="link-import-form" onSubmit={event => { event.preventDefault(); void advance(); }} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="link-import-code" className={`block px-1 text-xs font-semibold uppercase tracking-wide ${props.labelClass}`}>{zh ? '分享码' : 'Share code'}</label>
              <input id="link-import-code" type="text" value={shareCode} maxLength={100} disabled={busy} onChange={event => { setShareCode(event.target.value.toUpperCase()); setFile(null); setError(''); }} placeholder={zh ? '输入分享码' : 'Enter a share code'} autoComplete="off" spellCheck={false} className={props.fieldClass} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <span id="link-import-file-label" className={`px-1 text-xs font-semibold uppercase tracking-wide ${props.labelClass}`}>{zh ? '浏览器收藏夹' : 'Browser bookmarks'}</span>
                    <button ref={helpButton} type="button" disabled={busy} aria-haspopup="dialog" aria-label={zh ? '如何导出书签' : 'How to export bookmarks'} onClick={() => helpDialog.current?.showModal()} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <CircleHelp aria-hidden="true" className="h-4 w-4" />
                    </button>
                  <dialog ref={helpDialog} aria-labelledby="bookmark-help-title" aria-describedby="bookmark-help-description" onClose={() => helpButton.current?.focus()} onClick={event => {
                    const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect();
                    if (event.target === event.currentTarget && (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom)) event.currentTarget.close();
                  }} className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-5 text-foreground shadow-xl backdrop:bg-black/50 sm:p-6">
                    <div className="space-y-4">
                    <h2 id="bookmark-help-title" className="text-lg font-semibold">{zh ? '如何导出书签' : 'How to export bookmarks'}</h2>
                    <p id="bookmark-help-description" className="text-sm text-muted-foreground">{zh ? '在电脑上的浏览器中导出 HTML 文件，再回到这里上传。' : 'Export an HTML file from your desktop browser, then upload it here.'}</p>
                    <dl className="space-y-3 text-sm leading-relaxed">
                      <div><dt className="font-semibold">Chrome</dt><dd className="text-muted-foreground">{zh ? '菜单 ⋮ → 书签和清单 → 书签管理器 → 菜单 ⋮ → 导出书签' : 'Menu ⋮ → Bookmarks and lists → Bookmark Manager → Menu ⋮ → Export bookmarks'}</dd></div>
                      <div><dt className="font-semibold">Edge</dt><dd className="text-muted-foreground">{zh ? '打开 edge://favorites → 菜单 … → 导出收藏夹' : 'Open edge://favorites → Menu … → Export favorites'}</dd></div>
                      <div><dt className="font-semibold">Firefox</dt><dd className="text-muted-foreground">{zh ? '书签 → 管理书签 → 导入和备份 → 导出书签到 HTML' : 'Bookmarks → Manage bookmarks → Import and Backup → Export Bookmarks to HTML'}</dd></div>
                    </dl>
                    <div className="flex justify-end"><button type="button" onClick={() => helpDialog.current?.close()} className={`${buttonClass} bg-primary text-primary-foreground hover:opacity-90`}>{zh ? '知道了' : 'Got it'}</button></div>
                    </div>
                  </dialog>
              </div>
              <input ref={fileInput} type="file" aria-labelledby="link-import-file-label" accept=".html,.htm,text/html" className="sr-only" tabIndex={-1} onChange={event => { const next = event.target.files?.[0]; event.target.value = ''; chooseFile(next); }} />
              <button id="link-import-file" type="button" disabled={busy} style={props.uploadSurfaceStyle} onClick={() => fileInput.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }} className={`group flex min-h-32 w-full min-w-0 flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-36 ${props.uploadCardClass}`}>
                <span className={`mb-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors md:h-11 md:w-11 ${props.uploadIconClass}`}>{file ? <Check aria-hidden="true" className="h-5 w-5 md:h-6 md:w-6" /> : <Plus aria-hidden="true" className="h-5 w-5 md:h-6 md:w-6" />}</span>
                <span className="max-w-full break-all text-sm font-semibold md:text-base">{file?.name || (zh ? '上传书签文件' : 'Upload bookmarks file')}</span>
                <span className={`mt-0.5 text-xs md:mt-1 md:text-sm ${props.uploadCaptionClass}`}>HTML · {zh ? '最大 5 MB' : 'Up to 5 MB'}</span>
              </button>
            </div>
          </form> : <fieldset disabled={busy} className="min-w-0">{props.children}</fieldset>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        </div>
        <footer className={`shrink-0 px-4 py-3 sm:px-6 sm:py-4 ${source ? 'border-t border-border' : ''}`}>
          {source && props.pagination && <fieldset disabled={busy} className="min-w-0">{props.pagination}</fieldset>}
          {props.notice && <div className="mb-3">{props.notice}</div>}
          <div className={completedBatch ? 'grid grid-cols-3 gap-2 sm:flex sm:justify-end sm:gap-3' : 'flex flex-wrap justify-end gap-3'}>
            <button type="button" disabled={busy} onClick={close} className={`${buttonClass} max-sm:px-2 hover:bg-accent/50 ${mutedText}`}><X className="hidden h-4 w-4 shrink-0 sm:block" />{zh ? '取消' : 'Cancel'}</button>
            <button type="button" disabled={busy || (source ? !props.selectedCount : !file && !shareCode.trim())} onClick={() => void advance()} className={`${buttonClass} max-sm:px-2 ${completedBatch ? `border border-border hover:bg-accent/50 ${mutedText}` : props.primaryClass}`}>
              {busy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Download className="hidden h-4 w-4 shrink-0 sm:block" />}
              {busy ? (zh ? '正在处理…' : 'Working…') : completedBatch ? (zh ? '继续导入' : 'Continue importing') : source ? (zh ? `确认导入 ${props.selectedCount} 个网址` : `Import ${props.selectedCount} sites`) : (zh ? '导入网址' : 'Import sites')}
            </button>
            {completedBatch && <button type="button" disabled={busy} onClick={close} className={`${buttonClass} max-sm:px-2 ${props.primaryClass}`}><Check className="hidden h-4 w-4 shrink-0 sm:block" />{zh ? '完成导入' : 'Finish importing'}</button>}
          </div>
        </footer>
      </section>
    </div>
  );
}
