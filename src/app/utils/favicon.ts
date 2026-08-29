export function getFaviconUrl(websiteUrl: string): string {
  try {
    const url = new URL(websiteUrl);
    const domain = url.hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch (error) {
    console.error('Invalid URL for favicon extraction:', error);
    return '';
  }
}
