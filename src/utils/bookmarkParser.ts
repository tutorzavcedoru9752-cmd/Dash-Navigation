import { Bookmark } from '../context/BookmarkContext';

export interface ParsedCategory {
  title: string;
  items: Omit<Bookmark, 'id'>[];
}

export function parseBookmarkFile(html: string): ParsedCategory[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const dts = doc.querySelectorAll('DT');
  
  const parsedCategories: ParsedCategory[] = [];
  
  dts.forEach(dt => {
    const h3 = dt.querySelector('H3');
    if (h3) {
      const title = h3.textContent || 'Imported';
      const dl = dt.querySelector('DL');
      if (dl) {
        const links = dl.querySelectorAll('A');
        const items: Omit<Bookmark, 'id'>[] = [];
        links.forEach(a => {
          items.push({
            name: a.textContent || 'Unknown Site',
            url: a.getAttribute('href') || '',
            desc: a.textContent || '',
            iconName: 'Link2'
          });
        });
        if (items.length > 0) {
          parsedCategories.push({ title, items });
        }
      }
    }
  });

  // If no folders found, just grab all links
  if (parsedCategories.length === 0) {
    const links = doc.querySelectorAll('a');
    const items: Omit<Bookmark, 'id'>[] = [];
    links.forEach(a => {
      items.push({
        name: a.textContent || 'Unknown Site',
        url: a.getAttribute('href') || '',
        desc: a.textContent || '',
        iconName: 'Link2'
      });
    });
    if (items.length > 0) {
      parsedCategories.push({ title: 'Imported Bookmarks', items });
    }
  }

  return parsedCategories;
}
