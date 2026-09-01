export type WallpaperContrastSample = {
  gradient: string;
  searchLuminance: number;
  weatherLuminance: number;
  homeCategoryLuminance: number;
  sideNavLuminance: number;
  footerLuminance: number;
  categoryHeaderLuminance: number;
};

type RgbColor = { r: number; g: number; b: number };

const clampByte = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
const toRgba = (color: RgbColor, alpha: number) =>
  `rgba(${clampByte(color.r)}, ${clampByte(color.g)}, ${clampByte(color.b)}, ${alpha})`;

const relativeLuminance = ({ r, g, b }: RgbColor) => {
  const convert = (value: number) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b);
};

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Could not sample wallpaper.'));
  image.src = src;
});

const averageRegion = (
  data: Uint8ClampedArray,
  width: number,
  fromX: number,
  toX: number,
  fromY: number,
  toY: number,
): RgbColor => {
  let r = 0;
  let g = 0;
  let b = 0;
  let weightTotal = 0;

  for (let y = fromY; y < toY; y += 1) {
    for (let x = fromX; x < toX; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3] / 255;
      if (alpha < 0.1) continue;
      const pr = data[index];
      const pg = data[index + 1];
      const pb = data[index + 2];
      const weight = alpha * (1 + (Math.max(pr, pg, pb) - Math.min(pr, pg, pb)) / 255);
      r += pr * weight;
      g += pg * weight;
      b += pb * weight;
      weightTotal += weight;
    }
  }

  return weightTotal === 0
    ? { r: 31, g: 41, b: 55 }
    : { r: r / weightTotal, g: g / weightTotal, b: b / weightTotal };
};

export const sampleWallpaperContrast = async (src: string, isDark: boolean): Promise<WallpaperContrastSample> => {
  const image = await loadImage(src);
  const width = 120;
  const height = 72;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not sample wallpaper.');

  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  const pixels = context.getImageData(0, 0, width, height).data;
  const sample = (x1: number, x2: number, y1: number, y2: number) => relativeLuminance(averageRegion(
    pixels,
    width,
    Math.round(width * x1),
    Math.round(width * x2),
    Math.round(height * y1),
    Math.round(height * y2),
  ));
  const left = averageRegion(pixels, width, 0, width / 2, 0, height);
  const right = averageRegion(pixels, width, width / 2, width, 0, height);
  const colorScale = isDark ? 0.54 : 1;
  const alpha = isDark ? 0.86 : 0.78;

  return {
    gradient: `linear-gradient(90deg, ${toRgba({ r: left.r * colorScale, g: left.g * colorScale, b: left.b * colorScale }, alpha)}, ${toRgba({ r: right.r * colorScale, g: right.g * colorScale, b: right.b * colorScale }, alpha)})`,
    searchLuminance: sample(0.14, 0.86, 0.12, 0.3),
    weatherLuminance: sample(0.3, 0.7, 0.06, 0.17),
    homeCategoryLuminance: sample(0.05, 0.24, 0.27, 0.76),
    sideNavLuminance: sample(0, 0.08, 0.27, 0.76),
    footerLuminance: sample(0, 1, 0.88, 1),
    categoryHeaderLuminance: sample(0.28, 0.76, 0.07, 0.2),
  };
};

export const toneForWallpaperLuminance = (
  luminance: number | undefined,
  isDark: boolean,
  showDarkOverlay: boolean,
  fallback: 'light' | 'dark',
): 'light' | 'dark' => {
  if (luminance == null) return fallback;
  const adjusted = isDark
    ? luminance * (showDarkOverlay ? 0.4 : 1)
    : luminance * 0.65 + 0.35;
  return adjusted < 0.46 ? 'light' : 'dark';
};
