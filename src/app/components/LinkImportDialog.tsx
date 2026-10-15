import { useContext, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, Bookmark, Download, FileUp, KeyRound, Loader2, Plus, Search, X } from 'lucide-react';
import { FREE_CATEGORY_LIMIT, FREE_LINK_LIMIT, LangContext, MembershipContext, ThemeContext } from '../App';
import { PreviewContext } from '../preview';
import { useCategories, type LinkImportGroup } from '../hooks/useCategories';
import { MAX_BOOKMARK_FILE_BYTES, MAX_BOOKMARK_IMPORT, MAX_BOOKMARKS, parseBookmarkHtml, planBookmarkImport, type BrowserBookmark } from '../lib/bookmarks';

type Props = {
  defaultCategoryId: string;
  surfaceStyle?: CSSProperties;
  surfaceClass: string;
  fieldClass: string;
  labelClass: string;
  itemClass: string;
  primaryClass: string;
  darkSurface: boolean;
  onClose: () => void;
  onShare: () => void;
  onImported: (categoryId: string, count: number) => void;
};

export default function LinkImportDialog(props: Props) {
  const { lang } = useContext(LangContext);
  const { isDark } = useContext(ThemeContext);
  const zh = lang === 'zh';
  const { isPreview, requestLogin } = useContext(PreviewContext);
  const { summary, refreshMembership, openUpgradeDialog } = useContext(MembershipContext);
  const { categories, createCategory, importLinkGroups, refreshCategories } = useCategories();
  const [mode, setMode] = useState<'choice' | 'bookmarks'>('choice');
  const [bookmarks, setBookmarks] = useState<BrowserBookmark[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState('');
  const [skipped, setSkipped] = useState(0);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [folderPage, setFolderPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const operation = useRef(false);
  const readVersion = useRef(0);
  const primaryText = props.darkSurface ? 'text-white' : 'text-gray-900 dark:text-gray-100';
  const mutedText = props.darkSurface ? 'text-white/80' : 'text-gray-700 dark:text-gray-300';
  const controlClass = `${props.fieldClass} w-full min-w-0 rounded-lg p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring transition`;
  const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed';
  const locked = busy || reading;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      readVersion.current += 1;
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('button, input')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [mode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== panel.current) return;
      if (event.key === 'Escape' && !locked) { event.preventDefault(); props.onClose(); }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, a[href]') ?? []).filter(el => el.tabIndex >= 0 && el.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (!panel.current?.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [locked, props.onClose]);

  const assignments = bookmarks.filter(row => selected.has(row.id)).map(row => ({ ...row, categoryId: targets[row.id] ?? '' }));
  const plan = planBookmarkImport(assignments, categories);
  const groups = useMemo(() => {
    const byFolder = new Map<string, BrowserBookmark[]>();
    for (const row of bookmarks) {
      const folderRows = byFolder.get(row.folder) ?? [];
      folderRows.push(row);
      byFolder.set(row.folder, folderRows);
    }
    return [...byFolder.entries()];
  }, [bookmarks]);
  const filtered = bookmarks.filter(row => `${row.name} ${row.url} ${row.folder}`.toLocaleLowerCase().includes(filter.toLocaleLowerCase()));
  const pageSize = 40;
  const visible = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const remaining = summary.plan === 'free' ? Math.max(0, FREE_LINK_LIMIT - summary.linkCount) : Infinity;
  const overQuota = plan.ready.length > remaining;
  const tooMany = plan.ready.length > MAX_BOOKMARK_IMPORT;
  const selectedInView = filtered.filter(row => selected.has(row.id)).length;

  const chooseFile = async (file?: File) => {
    if (!file || locked) return;
    setError('');
    if (!/\.html?$/i.test(file.name)) { setError(zh ? '请选择浏览器导出的 HTML 书签文件。' : 'Choose an exported HTML bookmarks file.'); return; }
    if (file.size > MAX_BOOKMARK_FILE_BYTES) { setError(zh ? '文件不能超过 5 MB。请分文件导入。' : 'File limit is 5 MB. Split larger exports.'); return; }
    const version = ++readVersion.current;
    setReading(true);
    try {
      const result = parseBookmarkHtml(await file.text());
      if (version !== readVersion.current) return;
      if (!result.bookmarks.length) throw new Error('EMPTY_BOOKMARKS');
      const nextTargets: Record<string, string> = {};
      for (const row of result.bookmarks) {
        const folderName = row.folder.split(' / ').at(-1)?.toLocaleLowerCase();
        const matched = categories.find(category => category.title.toLocaleLowerCase() === folderName);
        nextTargets[row.id] = matched?.id || props.defaultCategoryId || categories[0]?.id || '';
      }
      setBookmarks(result.bookmarks);
      setTargets(nextTargets);
      setSelected(new Set(result.bookmarks.map(row => row.id)));
      setFileName(file.name);
      setSkipped(result.skipped);
      setFilter('');
      setPage(0);
      setFolderPage(0);
    } catch (cause) {
      if (version !== readVersion.current) return;
      setError(cause instanceof Error && cause.message === 'TOO_MANY_BOOKMARKS'
        ? (zh ? `最多解析 ${MAX_BOOKMARKS} 个书签，请分文件导入。` : `Up to ${MAX_BOOKMARKS} bookmarks per file.`)
        : (zh ? '文件中没有可导入的 HTTP / HTTPS 网站，请从浏览器书签管理器重新导出 HTML。' : 'No valid HTTP / HTTPS bookmarks found. Export HTML from your browser bookmarks manager.'));
    } finally { if (version === readVersion.current) setReading(false); }
  };

  const setFolderTarget = (folder: string, categoryId: string) => {
    setTargets(current => ({ ...current, ...Object.fromEntries(bookmarks.filter(row => row.folder === folder).map(row => [row.id, categoryId])) }));
  };

  const addCategory = async () => {
    if (!newTitle.trim() || operation.current) return;
    if (isPreview) { requestLogin('import'); return; }
    if (summary.plan === 'free' && categories.length >= FREE_CATEGORY_LIMIT) { openUpgradeDialog(); return; }
    operation.current = true;
    setBusy(true);
    setError('');
    try {
      const created = await createCategory({ id: `bookmarks-${crypto.randomUUID()}`, title: newTitle.trim().slice(0, 120), description: '', order: categories.length });
      if (!created) { setError(zh ? '分类创建失败，请重试。' : 'Could not create category. Try again.'); return; }
      setTargets(current => Object.fromEntries(bookmarks.map(row => [row.id, current[row.id] || created.id])));
      setNewTitle('');
      setNewCategoryOpen(false);
      await refreshMembership();
    } finally { operation.current = false; setBusy(false); }
  };

  const importBookmarks = async () => {
    if (operation.current || reading) return;
    if (isPreview) { requestLogin('import'); return; }
    if (!plan.ready.length || plan.unassigned || overQuota || tooMany || summary.loading) return;
    operation.current = true;
    setBusy(true);
    setError('');
    try {
      const byCategory = new Map<string, LinkImportGroup>();
      for (const row of plan.ready) {
        const group = byCategory.get(row.categoryId) ?? { categoryId: row.categoryId, links: [] };
        group.links.push({ id: row.id, name: row.name, url: row.url, description: '', icon: 'link' });
        byCategory.set(row.categoryId, group);
      }
      const ok = await importLinkGroups([...byCategory.values()]);
      if (!ok) {
        await refreshCategories();
        setError(zh ? '未能确认导入结果，已重新同步分类。请检查网络和会员额度后重试，已存在的网址会自动跳过。' : 'Could not confirm the import. Categories have been re-synced. Check your connection and account limits, then retry; existing sites will be skipped.');
        return;
      }
      await refreshMembership();
      props.onImported(plan.ready[0].categoryId, plan.ready.length);
    } catch {
      setError(zh ? '导入失败，请重试。' : 'Import failed. Try again.');
    } finally { operation.current = false; setBusy(false); }
  };

  const close = () => { if (!locked) props.onClose(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" tabIndex={-1} aria-label={zh ? '关闭导入窗口' : 'Close import dialog'} disabled={locked} onClick={close} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <section ref={panel} role="dialog" aria-modal="true" aria-labelledby="link-import-title" aria-busy={locked} style={{ ...props.surfaceStyle, colorScheme: props.darkSurface || isDark ? 'dark' : 'light' }} className={`relative flex max-h-[90vh] w-full flex-col rounded-2xl border shadow-2xl ${mode === 'choice' ? 'max-w-lg' : 'max-w-4xl'} ${props.surfaceClass} ${primaryText}`}>
        <header className="flex shrink-0 items-center gap-2 px-6 pt-6 pb-4">
          {mode === 'bookmarks' ? <button type="button" className={buttonClass} disabled={locked} aria-label={zh ? '返回导入方式' : 'Back to import options'} onClick={() => setMode('choice')}><ArrowLeft className="h-4 w-4" /></button> : <Download className="h-5 w-5" />}
          <h2 id="link-import-title" className="min-w-0 flex-1 text-lg font-semibold">{mode === 'choice' ? (zh ? '导入网址' : 'Import links') : (zh ? '从浏览器收藏夹导入' : 'Import browser bookmarks')}</h2>
          <button type="button" disabled={locked} onClick={close} className={buttonClass} aria-label={zh ? '关闭' : 'Close'}><X className="h-4 w-4" /></button>
        </header>
        <div className="dash-scrollbar min-h-0 overflow-y-auto px-6 pb-6">
          {mode === 'choice' ? <div className="grid gap-3">
            <button type="button" onClick={props.onShare} className={`flex items-center gap-3 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${props.itemClass}`}><KeyRound className="h-5 w-5 shrink-0" /><span><span className="block text-base font-semibold">{zh ? '分享码导入' : 'Import with a share code'}</span><span className={`mt-1 block text-sm ${mutedText}`}>{zh ? '输入 Dash 分享码，选择网址和目标分类。' : 'Enter a Dash share code, then choose sites and a category.'}</span></span></button>
            <button type="button" onClick={() => setMode('bookmarks')} className={`flex items-center gap-3 rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${props.itemClass}`}><Bookmark className="h-5 w-5 shrink-0" /><span><span className="block text-base font-semibold">{zh ? '浏览器收藏夹导入' : 'Import browser bookmarks'}</span><span className={`mt-1 block text-sm ${mutedText}`}>{zh ? '上传书签 HTML，按文件夹分配分类并批量导入。' : 'Upload bookmarks HTML, assign folders to categories, and import.'}</span></span></button>
          </div> : <div className="space-y-5">
            <details className={`rounded-lg border p-3 text-sm ${props.itemClass}`} open={!bookmarks.length}>
              <summary className="cursor-pointer font-medium">{zh ? '如何从浏览器导出收藏夹？' : 'How do I export browser bookmarks?'}</summary>
              <ul className={`mt-2 list-disc space-y-1 pl-5 ${mutedText}`}>
                <li>{zh ? 'Chrome：书签管理器 → 右上角 ⋮ → 导出书签。' : 'Chrome: Bookmark manager → ⋮ menu → Export bookmarks.'}</li>
                <li>{zh ? 'Edge：收藏夹 → ⋯ → 导出收藏夹。' : 'Edge: Favorites → ⋯ → Export favorites.'}</li>
                <li>{zh ? 'Firefox：管理书签 → 导入和备份 → 导出书签到 HTML。' : 'Firefox: Manage bookmarks → Import and Backup → Export Bookmarks to HTML.'}</li>
              </ul>
              <p className={`mt-2 ${mutedText}`}>{zh ? '网页无法直接读取浏览器收藏夹。文件只在本地解析，确认后仅保存选中的网站；支持 HTTP / HTTPS，最大 5 MB。' : 'Web pages cannot read browser bookmarks directly. The file is parsed locally; only selected sites are saved after confirmation. HTTP / HTTPS only, up to 5 MB.'}</p>
            </details>
            <input ref={fileInput} type="file" accept=".html,.htm,text/html" className="sr-only" tabIndex={-1} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void chooseFile(file); }} />
            <button type="button" disabled={locked} onClick={() => fileInput.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void chooseFile(event.dataTransfer.files[0]); }} className={`flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed p-5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${props.itemClass}`}>
              {reading ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> : <FileUp className="h-5 w-5 shrink-0" />}<span className="min-w-0"><span className="block text-sm font-medium">{reading ? (zh ? '正在读取…' : 'Reading…') : fileName ? (zh ? '更换书签文件' : 'Choose another file') : (zh ? '选择或拖入书签 HTML 文件' : 'Choose or drop bookmarks HTML')}</span>{fileName && <span className={`mt-1 block break-all text-xs ${mutedText}`}>{fileName}</span>}</span>
            </button>
            {bookmarks.length > 0 && <>
              <p className={`text-sm ${mutedText}`}>{zh ? `找到 ${bookmarks.length} 个网站，已跳过 ${skipped} 项无效或同文件夹重复网址。` : `${bookmarks.length} sites found; ${skipped} invalid or same-folder duplicates skipped.`}</p>
              <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">{zh ? '分配到 Dash 分类' : 'Assign Dash categories'}</h3><button type="button" disabled={locked} onClick={() => setNewCategoryOpen(value => !value)} className={`${buttonClass} ${props.itemClass}`}><Plus className="h-4 w-4" />{zh ? '新建分类' : 'New category'}</button></div>
              {newCategoryOpen && <div className="flex flex-col gap-2 sm:flex-row"><input aria-label={zh ? '新分类名称' : 'New category name'} value={newTitle} maxLength={120} disabled={locked} onChange={event => setNewTitle(event.target.value)} placeholder={zh ? '新分类名称' : 'New category name'} className={controlClass} /><button type="button" disabled={locked || !newTitle.trim()} onClick={() => void addCategory()} className={`${buttonClass} shrink-0 ${props.primaryClass}`}>{zh ? '创建分类' : 'Create category'}</button></div>}
              {!categories.length && <p className={`text-sm ${mutedText}`}>{zh ? '请先创建一个分类，再为书签分配目标分类。' : 'Create a category first, then assign your bookmarks.'}</p>}
              <div className="dash-scrollbar grid max-h-56 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">{groups.slice(folderPage * pageSize, (folderPage + 1) * pageSize).map(([folder, folderRows]) => {
                const values = new Set(folderRows.map(row => targets[row.id] ?? ''));
                return <label key={folder} className="block min-w-0 space-y-1.5"><span className={`block break-words px-1 text-xs font-semibold tracking-wide ${props.labelClass}`}>{folder || (zh ? '未分类书签' : 'Unfiled bookmarks')} <span className="font-normal">({folderRows.length})</span></span><select aria-label={`${zh ? '文件夹分类：' : 'Folder category: '}${folder || (zh ? '未分类书签' : 'Unfiled bookmarks')}`} disabled={locked} value={values.size === 1 ? [...values][0] : '__mixed__'} onChange={event => setFolderTarget(folder, event.target.value)} className={controlClass}><option value="" disabled>{zh ? '选择分类' : 'Choose category'}</option><option value="__mixed__" disabled>{zh ? '多个分类（已单独调整）' : 'Mixed categories'}</option>{categories.map(category => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label>;
              })}</div>
              {groups.length > pageSize && <div className="flex items-center justify-between gap-2 text-sm"><button type="button" disabled={locked || folderPage === 0} onClick={() => setFolderPage(value => value - 1)} className={buttonClass}>{zh ? '上一组文件夹' : 'Previous folders'}</button><span>{folderPage + 1} / {Math.ceil(groups.length / pageSize)}</span><button type="button" disabled={locked || (folderPage + 1) * pageSize >= groups.length} onClick={() => setFolderPage(value => value + 1)} className={buttonClass}>{zh ? '下一组文件夹' : 'Next folders'}</button></div>}
              <label className={`flex items-center gap-2 ${controlClass}`}><Search className="h-4 w-4 shrink-0" /><input aria-label={zh ? '筛选书签' : 'Filter bookmarks'} value={filter} disabled={locked} onChange={event => { setFilter(event.target.value); setPage(0); }} placeholder={zh ? '搜索名称、网址或原文件夹' : 'Search names, URLs, or folders'} className="w-full min-w-0 bg-transparent text-base outline-none" /></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={locked || !filtered.length} checked={filtered.length > 0 && selectedInView === filtered.length} onChange={event => { const checked = event.target.checked; setSelected(current => { const next = new Set(current); for (const row of filtered) checked ? next.add(row.id) : next.delete(row.id); return next; }); }} className="h-4 w-4 accent-primary" />{zh ? `全选筛选结果 (${selectedInView}/${filtered.length})` : `Select filtered (${selectedInView}/${filtered.length})`}</label>
              <div className="dash-scrollbar max-h-72 space-y-2 overflow-y-auto pr-1">{visible.map(row => <div key={row.id} className={`rounded-lg border p-3 ${props.itemClass}`}><div className="flex min-w-0 items-start gap-3"><input type="checkbox" aria-label={`${zh ? '选择 ' : 'Select '}${row.name}`} checked={selected.has(row.id)} disabled={locked} onChange={event => { const checked = event.target.checked; setSelected(current => { const next = new Set(current); checked ? next.add(row.id) : next.delete(row.id); return next; }); }} className="mt-1 h-4 w-4 shrink-0 accent-primary" /><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{row.name}</p><p className={`mt-1 break-all text-xs ${mutedText}`}>{row.url}</p></div></div><label className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3"><span className={`shrink-0 text-xs ${props.labelClass}`}>{zh ? '目标分类' : 'Target category'}</span><select aria-label={`${zh ? '网站分类：' : 'Site category: '}${row.name}`} disabled={locked} value={targets[row.id] ?? ''} onChange={event => setTargets(current => ({ ...current, [row.id]: event.target.value }))} className={`${controlClass} sm:flex-1`}><option value="" disabled>{zh ? '选择分类' : 'Choose category'}</option>{categories.map(category => <option key={category.id} value={category.id}>{category.title}</option>)}</select></label></div>)}{!filtered.length && <p className={`py-4 text-center text-sm ${mutedText}`}>{zh ? '没有匹配的书签。' : 'No matching bookmarks.'}</p>}</div>
              {filtered.length > pageSize && <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><button type="button" disabled={locked || page === 0} onClick={() => setPage(value => value - 1)} className={buttonClass}>{zh ? '上一页' : 'Previous'}</button><span>{page + 1} / {Math.ceil(filtered.length / pageSize)}</span><button type="button" disabled={locked || (page + 1) * pageSize >= filtered.length} onClick={() => setPage(value => value + 1)} className={buttonClass}>{zh ? '下一页' : 'Next'}</button></div>}
            </>}
          </div>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        </div>
        {mode === 'bookmarks' && <footer className="shrink-0 space-y-3 border-t border-border px-6 py-4">
          <p role="status" aria-live="polite" className={`text-sm ${mutedText}`}>{zh ? `已选 ${selected.size} 项 · 将导入 ${plan.ready.length} 项 · 跳过 ${plan.duplicates} 项重复网址` : `${selected.size} selected · ${plan.ready.length} to import · ${plan.duplicates} duplicates skipped`}{summary.plan === 'free' && (zh ? ` · 剩余额度 ${remaining}` : ` · ${remaining} slots available`)}</p>
          {plan.unassigned > 0 && <p className="text-sm text-destructive">{zh ? `还有 ${plan.unassigned} 个选中网站未分配分类。` : `${plan.unassigned} selected sites need a category.`}</p>}
          {tooMany && <p className="text-sm text-destructive">{zh ? `每次最多导入 ${MAX_BOOKMARK_IMPORT} 个网址，请分批勾选。` : `Select up to ${MAX_BOOKMARK_IMPORT} sites per import.`}</p>}
          {overQuota && <div className="flex flex-wrap items-center gap-2 text-sm"><span className="text-destructive">{zh ? '超过免费额度，请减少选择或升级会员。' : 'Free limit exceeded. Select fewer sites or upgrade.'}</span><button type="button" disabled={locked} className="underline focus-visible:ring-2 focus-visible:ring-ring" onClick={() => isPreview ? requestLogin('import') : openUpgradeDialog()}>{zh ? '升级会员' : 'Upgrade'}</button></div>}
          <div className="flex flex-wrap justify-end gap-3"><button type="button" disabled={locked} onClick={close} className={`${buttonClass} ${mutedText}`}><X className="h-4 w-4" />{zh ? '取消' : 'Cancel'}</button><button type="button" disabled={locked || !plan.ready.length || !!plan.unassigned || overQuota || tooMany || summary.loading} onClick={() => void importBookmarks()} className={`${buttonClass} ${props.primaryClass}`}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{busy ? (zh ? '正在保存…' : 'Saving…') : (zh ? `确认导入 ${plan.ready.length} 个网址` : `Import ${plan.ready.length} sites`)}</button></div>
        </footer>}
      </section>
    </div>
  );
}
