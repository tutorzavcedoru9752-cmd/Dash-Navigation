export function getFaviconUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
  } catch (e) {
    return 'https://www.google.com/s2/favicons?domain=example.com&sz=128';
  }
}
