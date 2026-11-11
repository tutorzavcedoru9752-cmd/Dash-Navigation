import type { Category, LinkItem } from '../hooks/useCategories';

export const MAX_BOOKMARK_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_BOOKMARKS = 5000;
export const MAX_BOOKMARK_IMPORT = 500;
const MAX_FAVICON_DATA_LENGTH = 16 * 1024;
const FAVICON_LOOKUP_CONCURRENCY = 12;
const FAVICON_LOOKUP_TIMEOUT_MS = 12_000;

export type BrowserBookmark = {
  id: string;
  name: string;
  url: string;
  folder: string;
  faviconUrl?: string;
};

function bookmarkFaviconData(value: string | null): string | undefined {
  if (!value || value.length > MAX_FAVICON_DATA_LENGTH) return;
  // Browser exports may contain remote ICON_URI attributes. Only use embedded raster images.
  const rasterDataUrl = /^data:image\/(?:png|jpeg|gif|webp|x-icon|vnd\.microsoft\.icon);base64,(?:[a-z0-9+/]{4})*(?:[a-z0-9+/]{2}==|[a-z0-9+/]{3}=)?$/i;
  if (rasterDataUrl.test(value) && !value.endsWith(',')) return value;
}

function bookmarkFaviconHost(value: string): string {
  if (!bookmarkUrlKey(value)) return '';
  const host = new URL(value).hostname.replace(/\.$/, '');
  // Keep URLs, IP addresses and common local names out of remote icon lookups.
  const publicName = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]+)$/;
  const localName = /(?:^|\.)(?:localhost|local|localdomain|internal|intranet|lan|home|corp|onion|invalid|test|example)$/;
  return publicName.test(host) && !localName.test(host) ? host : '';
}

export async function resolveBookmarkFavicons(
  links: LinkItem[],
  fetchFaviconData: (url: string, signal: AbortSignal) => Promise<string>,
): Promise<LinkItem[]> {
  const hostsByLink = links.map(link => link.faviconUrl ? '' : bookmarkFaviconHost(link.url));
  const hosts = [...new Set(hostsByLink.filter(Boolean))];
  if (hosts.length === 0) return links;

  const icons = new Map<string, string>();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FAVICON_LOOKUP_TIMEOUT_MS);
  let nextHost = 0;
  try {
    await Promise.all(Array.from({ length: Math.min(hosts.length, FAVICON_LOOKUP_CONCURRENCY) }, async () => {
      while (nextHost < hosts.length && !controller.signal.aborted) {
        const host = hosts[nextHost++];
        const result = await fetchFaviconData(`https://${host}`, controller.signal);
        const icon = bookmarkFaviconData(result);
        if (icon) icons.set(host, icon);
      }
    }));
  } finally {
    clearTimeout(timeout);
  }
  return links.map((link, index) => {
    const faviconUrl = icons.get(hostsByLink[index]);
    return faviconUrl ? { ...link, faviconUrl } : link;
  });
}

export const bookmarkUrlKey = (value: string): string => {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    return url.href.replace(/\/$/, '');
  } catch { return ''; }
};

export function parseBookmarkHtml(html: string): { bookmarks: BrowserBookmark[]; skipped: number } {
  // A detached template keeps scripts, images and iframes inert. Never attach its contents.
  const template = document.createElement('template');
  template.innerHTML = html;
  const anchors = template.content.querySelectorAll('a[href]');
  if (anchors.length > MAX_BOOKMARKS) throw new Error('TOO_MANY_BOOKMARKS');
  const bookmarks: BrowserBookmark[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const [index, anchor] of Array.from(anchors).entries()) {
    const rawUrl = anchor.getAttribute('href')?.trim() ?? '';
    const key = bookmarkUrlKey(rawUrl);
    if (!key || rawUrl.length > 2048) { skipped += 1; continue; }
    const folders: string[] = [];
    let parent = anchor.parentElement;
    while (parent) {
      if (parent.tagName === 'DL') {
        const sibling = parent.previousElementSibling;
        const heading = sibling?.tagName === 'H3' ? sibling
          : parent.parentElement?.tagName === 'DT'
            ? Array.from(parent.parentElement.children).find(child => child.tagName === 'H3')
            : undefined;
        const title = heading?.textContent?.trim();
        if (title) folders.unshift(title.slice(0, 120));
      }
      parent = parent.parentElement;
    }
    const folder = folders.join(' / ');
    const identity = JSON.stringify([folder, key]);
    if (seen.has(identity)) { skipped += 1; continue; }
    seen.add(identity);
    const url = new URL(rawUrl);
    bookmarks.push({
      id: `bookmark-${index}`,
      name: (anchor.textContent?.trim() || url.hostname).slice(0, 120),
      url: url.href,
      folder,
      faviconUrl: bookmarkFaviconData(anchor.getAttribute('icon')),
    });
  }
  return { bookmarks, skipped };
}

export type BookmarkAssignment = BrowserBookmark & { categoryId: string };

export function planBookmarkImport(rows: BookmarkAssignment[], categories: Category[]) {
  const seen = new Set(categories.flatMap(category => category.items.map(item => JSON.stringify([category.id, bookmarkUrlKey(item.url)]))));
  const validCategories = new Set(categories.map(category => category.id));
  const ready: BookmarkAssignment[] = [];
  let duplicates = 0;
  let unassigned = 0;
  for (const row of rows) {
    if (!validCategories.has(row.categoryId)) { unassigned += 1; continue; }
    const urlKey = bookmarkUrlKey(row.url);
    if (!urlKey) continue;
    const key = JSON.stringify([row.categoryId, urlKey]);
    if (seen.has(key)) { duplicates += 1; continue; }
    seen.add(key);
    ready.push(row);
  }
  return { ready, duplicates, unassigned };
}
