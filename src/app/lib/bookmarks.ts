import type { Category } from '../hooks/useCategories';

export const MAX_BOOKMARK_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_BOOKMARKS = 5000;
export const MAX_BOOKMARK_IMPORT = 500;

export type BrowserBookmark = {
  id: string;
  name: string;
  url: string;
  folder: string;
};

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
    bookmarks.push({ id: `bookmark-${index}`, name: (anchor.textContent?.trim() || url.hostname).slice(0, 120), url: url.href, folder });
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
