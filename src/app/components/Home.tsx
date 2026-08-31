import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Link as RouterLink } from 'react-router';
import { Search, Sun, BookOpen, Sparkles, PlayCircle, Library, GraduationCap, Microscope, BrainCircuit, Rocket, MessageSquare, Bookmark, Video, Cloud, CloudRain, CloudSnow, Wind, Link, Code, Terminal, Database, Settings, Globe, Palette, Music, Camera, Gamepad2, UtensilsCrossed, Coffee, ShoppingCart, Plane, Car, Dumbbell, ChevronDown, ChevronUp, X, MapPin, ExternalLink, Mail } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { LangContext, ThemeContext, WallpaperContext } from '../App';
import { motion } from 'motion/react';
import { CUSTOM_WALLPAPER_ID, DEFAULT_WALLPAPER_ID, clampCardOpacity, getWallpaperById } from '../wallpapers';

const iconMap: Record<string, React.ReactNode> = {
  'book': <Library className="w-5 h-5" />,
  'school': <GraduationCap className="w-5 h-5" />,
  'biotech': <Microscope className="w-5 h-5" />,
  'psychology': <BrainCircuit className="w-5 h-5" />,
  'relax': <Sparkles className="w-5 h-5" />,
  'robot_2': <Rocket className="w-5 h-5" />,
  'quiz': <MessageSquare className="w-5 h-5" />,
  'style': <Bookmark className="w-5 h-5" />,
  'movie': <Video className="w-5 h-5" />,
  'link': <Link className="w-5 h-5" />,
  'code': <Code className="w-5 h-5" />,
  'terminal': <Terminal className="w-5 h-5" />,
  'cloud': <Cloud className="w-5 h-5" />,
  'database': <Database className="w-5 h-5" />,
  'settings': <Settings className="w-5 h-5" />,
  'language': <Globe className="w-5 h-5" />,
  'palette': <Palette className="w-5 h-5" />,
  'music_note': <Music className="w-5 h-5" />,
  'photo_camera': <Camera className="w-5 h-5" />,
  'sports_esports': <Gamepad2 className="w-5 h-5" />,
  'restaurant': <UtensilsCrossed className="w-5 h-5" />,
  'local_cafe': <Coffee className="w-5 h-5" />,
  'shopping_cart': <ShoppingCart className="w-5 h-5" />,
  'flight': <Plane className="w-5 h-5" />,
  'directions_car': <Car className="w-5 h-5" />,
  'fitness_center': <Dumbbell className="w-5 h-5" />,
  'mail': <Mail className="w-5 h-5" />,
};

const categoryIconMap: Record<string, React.ReactNode> = {
  'Email': <Mail className="w-5 h-5" />,
  '邮箱': <Mail className="w-5 h-5" />,
  '邮件': <Mail className="w-5 h-5" />,
  'Learning': <GraduationCap className="w-5 h-5" />,
  'AI工具': <BrainCircuit className="w-5 h-5" />,
  'AI Tools': <BrainCircuit className="w-5 h-5" />,
  'AI Assistant': <BrainCircuit className="w-5 h-5" />,
  'Entertainment': <Video className="w-5 h-5" />,
  '娱乐': <Video className="w-5 h-5" />,
  'Tools': <Settings className="w-5 h-5" />,
  'Productivity': <Settings className="w-5 h-5" />,
  'Development': <Code className="w-5 h-5" />,
  'Social': <MessageSquare className="w-5 h-5" />,
  'Shopping': <ShoppingCart className="w-5 h-5" />,
  'Travel': <Plane className="w-5 h-5" />,
  'Music': <Music className="w-5 h-5" />,
  'Design': <Palette className="w-5 h-5" />,
  'Gaming': <Gamepad2 className="w-5 h-5" />,
  'Food': <UtensilsCrossed className="w-5 h-5" />,
  'Fitness': <Dumbbell className="w-5 h-5" />,
  'Photography': <Camera className="w-5 h-5" />,
  'Cloud': <Cloud className="w-5 h-5" />,
  'Database': <Database className="w-5 h-5" />,
  'Language': <Globe className="w-5 h-5" />,
  'Resources': <Library className="w-5 h-5" />,
  'Research': <Microscope className="w-5 h-5" />,
  '工具': <Settings className="w-5 h-5" />,
  '效率工具': <Settings className="w-5 h-5" />,
  '开发': <Code className="w-5 h-5" />,
  '社交': <MessageSquare className="w-5 h-5" />,
  '购物': <ShoppingCart className="w-5 h-5" />,
  '旅行': <Plane className="w-5 h-5" />,
  '音乐': <Music className="w-5 h-5" />,
  '设计': <Palette className="w-5 h-5" />,
  '游戏': <Gamepad2 className="w-5 h-5" />,
  '美食': <UtensilsCrossed className="w-5 h-5" />,
  '健身': <Dumbbell className="w-5 h-5" />,
  '摄影': <Camera className="w-5 h-5" />,
  '云服务': <Cloud className="w-5 h-5" />,
  '数据库': <Database className="w-5 h-5" />,
  '语言学习': <Globe className="w-5 h-5" />,
  '资源': <Library className="w-5 h-5" />,
  '科研': <Microscope className="w-5 h-5" />,
};

const categoryColorMap: Record<string, { bgColor: string; textColor: string }> = {
  'Learning': { bgColor: 'bg-blue-100', textColor: 'text-blue-900' },
  'AI Assistant': { bgColor: 'bg-amber-100', textColor: 'text-amber-900' },
  'Entertainment': { bgColor: 'bg-slate-200', textColor: 'text-slate-900' },
};

const preconnectedOrigins = new Set<string>();

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

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

const loadSampleImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Could not sample wallpaper.'));
  image.src = src;
});

const averageImageRegion = (data: Uint8ClampedArray, width: number, fromX: number, toX: number): RgbColor => {
  let r = 0;
  let g = 0;
  let b = 0;
  let weightTotal = 0;

  for (let y = 0; y < width; y += 1) {
    for (let x = fromX; x < toX; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3] / 255;
      if (alpha < 0.1) continue;

      const pr = data[index];
      const pg = data[index + 1];
      const pb = data[index + 2];
      const max = Math.max(pr, pg, pb);
      const min = Math.min(pr, pg, pb);
      const weight = alpha * (1 + (max - min) / 255);
      r += pr * weight;
      g += pg * weight;
      b += pb * weight;
      weightTotal += weight;
    }
  }

  if (weightTotal === 0) return { r: 31, g: 41, b: 55 };
  return { r: r / weightTotal, g: g / weightTotal, b: b / weightTotal };
};

const sampleWallpaperLook = async (src: string, isDark: boolean) => {
  const image = await loadSampleImage(src);
  const size = 72;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not sample wallpaper.');

  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, (size - drawWidth) / 2, (size - drawHeight) / 2, drawWidth, drawHeight);

  const pixels = context.getImageData(0, 0, size, size).data;
  const left = averageImageRegion(pixels, size, 0, size / 2);
  const right = averageImageRegion(pixels, size, size / 2, size);
  const side = averageImageRegion(pixels, size, 0, Math.max(12, Math.round(size * 0.22)));
  const colorScale = isDark ? 0.54 : 1;
  const alpha = isDark ? 0.86 : 0.78;

  return {
    gradient: `linear-gradient(90deg, ${toRgba({ r: left.r * colorScale, g: left.g * colorScale, b: left.b * colorScale }, alpha)}, ${toRgba({ r: right.r * colorScale, g: right.g * colorScale, b: right.b * colorScale }, alpha)})`,
    sideNavTone: relativeLuminance(side) < 0.46 ? 'light' : 'dark',
  } as const;
};

const addResourceHint = (rel: 'dns-prefetch' | 'preconnect', href: string) => {
  if (document.head.querySelector(`link[rel="${rel}"][href="${href}"]`)) return;

  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (rel === 'preconnect') link.crossOrigin = '';
  document.head.appendChild(link);
};

const preconnectTo = (websiteUrl: string) => {
  try {
    const url = new URL(websiteUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    const dnsHref = `//${url.hostname}`;
    const origin = url.origin;
    if (!preconnectedOrigins.has(dnsHref)) {
      addResourceHint('dns-prefetch', dnsHref);
      preconnectedOrigins.add(dnsHref);
    }
    if (url.protocol === 'https:' && !preconnectedOrigins.has(origin)) {
      addResourceHint('preconnect', origin);
      preconnectedOrigins.add(origin);
    }
  } catch {
    // Invalid URLs are rejected by the editor before they reach the home page.
  }
};

function FaviconImage({ src, alt, fallback }: { src?: string; alt: string; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      fetchpriority="low"
      onError={() => setFailed(true)}
      className="w-full h-full object-contain"
    />
  );
}

// FAB constants at module level to avoid stale closure issues
const FAB_SIZE = 44;
const FAB_MARGIN = 16;
const COLLAPSED_CATEGORIES_KEY = 'dash-collapsed-categories';
type SearchEngine = 'google' | 'baidu' | 'bing';

const normalizeSearchEngine = (value: string | null): SearchEngine =>
  value === 'baidu' || value === 'bing' ? value : 'google';

interface WeatherData {
  temperature: number;
  weatherCode: number;
  city: string;
  cityEn: string;
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 3500): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json() as T;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export default function Home() {
  const { lang } = useContext(LangContext);
  const { isDark } = useContext(ThemeContext);
  const { settings: wallpaperSettings } = useContext(WallpaperContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchEngine, setSearchEngine] = useState<SearchEngine>(() => {
    try { return normalizeSearchEngine(localStorage.getItem('searchEngine')); } catch { return 'google'; }
  });
  const [engineOpen, setEngineOpen] = useState(false);
  const engineDropdownRef = useRef<HTMLDivElement>(null);
  const { categories, loading } = useCategories();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_CATEGORIES_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? new Set(parsed.filter((id): id is string => typeof id === 'string')) : new Set();
    } catch {
      return new Set();
    }
  });
  const [siteSearchOpen, setSiteSearchOpen] = useState(false);
  const [siteSearchQuery, setSiteSearchQuery] = useState('');
  const [highlightedSiteId, setHighlightedSiteId] = useState<string | null>(null);
  const [hoveredCatIdx, setHoveredCatIdx] = useState<number | null>(null);
  const [activeCatIdx, setActiveCatIdx] = useState<number | null>(null);
  const [sampledWallpaperLook, setSampledWallpaperLook] = useState<{ gradient: string; sideNavTone: 'light' | 'dark' } | null>(null);
  const siteSearchInputRef = useRef<HTMLInputElement>(null);

  // Draggable FAB state
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [navHeight, setNavHeight] = useState(64);
  const dragOffset = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);
  const builtInWallpaper = getWallpaperById(wallpaperSettings.wallpaperId);
  const wallpaperUrl = wallpaperSettings.wallpaperId === CUSTOM_WALLPAPER_ID
    ? wallpaperSettings.customWallpaperUrl
    : builtInWallpaper?.src;
  const hasWallpaper = Boolean(wallpaperUrl && wallpaperSettings.wallpaperId !== DEFAULT_WALLPAPER_ID);
  const useLightCategoryForeground = hasWallpaper && !isDark && builtInWallpaper?.appearance?.lightCategoryForeground === 'light';
  const useLightSideNav = hasWallpaper && !isDark && builtInWallpaper?.appearance?.lightSideNav === 'light';
  const useDarkGlassSurface = isDark || (!isDark && builtInWallpaper?.appearance?.lightSurface === 'dark');
  const darkOverlayMode = builtInWallpaper?.appearance?.darkOverlay ?? 'default';
  const showDarkWallpaperOverlay = isDark && darkOverlayMode !== 'none';
  const cardOpacity = clampCardOpacity(wallpaperSettings.cardOpacity);
  const categoryWallpaperTextClass = useLightCategoryForeground ? 'text-white drop-shadow-sm' : 'text-gray-950 drop-shadow-sm dark:text-white';
  const wallpaperPrimaryTextClass = useDarkGlassSurface ? 'text-white drop-shadow-sm' : 'text-gray-950 drop-shadow-sm dark:text-white';
  const wallpaperSecondaryTextClass = useDarkGlassSurface ? 'text-white/75 drop-shadow-sm' : 'text-gray-700 dark:text-zinc-200';
  const wallpaperControlTextClass = useDarkGlassSurface ? 'text-white' : 'text-gray-950 dark:text-white';
  const siteSearchTextClass = hasWallpaper && useDarkGlassSurface ? 'text-white' : 'text-gray-950 dark:text-gray-100';
  const siteSearchMutedTextClass = hasWallpaper && useDarkGlassSurface ? 'text-white/70' : 'text-gray-600 dark:text-gray-400';
  const siteSearchFaintTextClass = hasWallpaper && useDarkGlassSurface ? 'text-white/55' : 'text-gray-500 dark:text-gray-400';
  const siteSearchHoverClass = hasWallpaper
    ? (useDarkGlassSurface ? 'hover:bg-white/10' : 'hover:bg-white/35')
    : 'hover:bg-gray-50 dark:hover:bg-zinc-700';
  const siteSearchDividerClass = hasWallpaper && useDarkGlassSurface ? 'border-white/10' : 'border-gray-200/80 dark:border-zinc-700';
  const bannerGradient = hasWallpaper && builtInWallpaper?.bannerGradient
    ? (isDark ? builtInWallpaper.bannerGradient.dark : builtInWallpaper.bannerGradient.light)
    : sampledWallpaperLook?.gradient;
  const sideNavTone = hasWallpaper
    ? (sampledWallpaperLook?.sideNavTone ?? (useLightSideNav || isDark ? 'light' : 'dark'))
    : 'dark';
  const sideNavTextClass = sideNavTone === 'light' ? 'text-white drop-shadow-sm' : 'text-gray-900';
  const sideNavMarkerClass = sideNavTone === 'light' ? 'bg-white' : 'bg-gray-900';
  const glassSurfaceStyle = hasWallpaper
    ? {
        backgroundColor: useDarkGlassSurface ? `rgba(24, 24, 27, ${cardOpacity})` : `rgba(255, 255, 255, ${cardOpacity})`,
        backdropFilter: 'blur(14px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(14px) saturate(1.2)',
      }
    : undefined;

  useEffect(() => {
    const nav = document.querySelector('nav');
    if (nav) setNavHeight(nav.offsetHeight);
  }, []);

  useEffect(() => {
    if (!hasWallpaper || !wallpaperUrl) {
      setSampledWallpaperLook(null);
      return;
    }

    let cancelled = false;
    sampleWallpaperLook(wallpaperUrl, isDark)
      .then((look) => {
        if (!cancelled) setSampledWallpaperLook(look);
      })
      .catch(() => {
        if (!cancelled) setSampledWallpaperLook(null);
      });

    return () => {
      cancelled = true;
    };
  }, [hasWallpaper, isDark, wallpaperUrl]);

  const minY = navHeight + FAB_MARGIN;

  const clampToViewport = useCallback((pos: { x: number; y: number }) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const nav = document.querySelector('nav');
    const topBound = (nav?.offsetHeight ?? 64) + FAB_MARGIN;
    return {
      x: Math.max(FAB_MARGIN, Math.min(w - FAB_SIZE - FAB_MARGIN, pos.x)),
      y: Math.max(topBound, Math.min(h - FAB_SIZE - FAB_MARGIN, pos.y)),
    };
  }, []);

  const snapToEdge = useCallback((pos: { x: number; y: number }, minTop: number) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const snapX = pos.x + FAB_SIZE / 2 < w / 2
      ? FAB_MARGIN
      : w - FAB_SIZE - FAB_MARGIN;
    const snapY = Math.max(minTop, Math.min(h - FAB_SIZE - FAB_MARGIN, pos.y));
    return { x: snapX, y: snapY };
  }, []);

  useEffect(() => {
    const defaultPos = { x: window.innerWidth - FAB_SIZE - FAB_MARGIN, y: window.innerHeight - FAB_SIZE - 32 };
    let initial: { x: number; y: number } = defaultPos;
    try {
      const saved = localStorage.getItem('fab-pos');
      if (saved) {
        const parsed = JSON.parse(saved) as { x: number; y: number };
        initial = parsed;
      }
    } catch {
      // ignore malformed storage value
    }
    // Clamp to current viewport on first paint
    setBtnPos(clampToViewport(initial));

    // Re-snap whenever the viewport resizes (rotation, resize, keyboard appearing)
    const onResize = () => {
      setBtnPos(prev => prev ? clampToViewport(prev) : clampToViewport(defaultPos));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      didDrag.current = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setBtnPos(clampToViewport({
        x: clientX - dragOffset.current.x,
        y: clientY - dragOffset.current.y,
      }));
    };
    const onUp = () => {
      setIsDragging(false);
      if (didDrag.current) {
        setIsSnapping(true);
        setBtnPos(prev => {
          if (!prev) return prev;
          const snapped = snapToEdge(prev, minY);
          try { localStorage.setItem('fab-pos', JSON.stringify(snapped)); } catch {}
          return snapped;
        });
        setTimeout(() => setIsSnapping(false), 320);
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDragging, snapToEdge, minY]);

  const handleFabPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    didDrag.current = false;
    const pos = btnPos ?? { x: window.innerWidth - FAB_SIZE - FAB_MARGIN, y: window.innerHeight - FAB_SIZE - 32 };
    // prevent drag starting if cursor is in navbar zone
    if ('clientY' in e && e.clientY < minY) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = { x: clientX - pos.x, y: clientY - pos.y };
    setIsDragging(true);
  };

  const handleFabClick = () => {
    if (!didDrag.current) setSiteSearchOpen(true);
  };

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_CATEGORIES_KEY, JSON.stringify(Array.from(collapsedCategories)));
    } catch {
      // ignore storage failures
    }
  }, [collapsedCategories]);

  const fuzzyMatch = (query: string, text: string): boolean => {
    if (!query) return true;
    const q = query.toLowerCase();
    const t = text.toLowerCase();
    if (t.includes(q)) return true;
    // character-order fuzzy match
    let qi = 0;
    for (let i = 0; i < t.length && qi < q.length; i++) {
      if (t[i] === q[qi]) qi++;
    }
    return qi === q.length;
  };

  const allSites = categories.flatMap(cat =>
    cat.items.map(item => ({ ...item, categoryTitle: cat.title, categoryId: cat.id }))
  );

  const filteredSites = siteSearchQuery.trim()
    ? allSites.filter(site =>
        fuzzyMatch(siteSearchQuery, site.name) ||
        fuzzyMatch(siteSearchQuery, site.description || '') ||
        fuzzyMatch(siteSearchQuery, site.url || '')
      )
    : [];

  const scrollToSite = useCallback((siteId: string, categoryId: string) => {
    setSiteSearchOpen(false);
    setSiteSearchQuery('');
    // Expand the category if collapsed
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      next.delete(categoryId);
      return next;
    });
    setTimeout(() => {
      const el = document.getElementById(`site-${siteId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedSiteId(siteId);
        setTimeout(() => setHighlightedSiteId(null), 2000);
      }
    }, 100);
  }, []);

  useEffect(() => {
    if (siteSearchOpen) {
      setTimeout(() => siteSearchInputRef.current?.focus(), 50);
    }
  }, [siteSearchOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSiteSearchOpen(false); setEngineOpen(false); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSiteSearchOpen(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (engineDropdownRef.current && !engineDropdownRef.current.contains(e.target as Node)) {
        setEngineOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (categories.length === 0) return;
    const threshold = window.innerHeight * 0.5;
    const update = () => {
      let activeIdx: number | null = null;
      for (let i = 0; i < categories.length; i++) {
        const el = document.getElementById(`category-${categories[i].id}`);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= threshold) activeIdx = i;
      }
      setActiveCatIdx(activeIdx);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [categories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const url = searchEngine === 'google'
        ? `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`
        : searchEngine === 'baidu'
          ? `https://www.baidu.com/s?wd=${encodeURIComponent(searchQuery)}`
          : `https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`;
      window.open(url, '_blank');
    }
  };

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const getCurrentDate = () => {
    const now = new Date();
    if (lang === 'en') {
      return now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
    }
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekday = weekdays[now.getDay()];
    return `${year}年${month}月${day}日 ${weekday}`;
  };

  const getWeatherIcon = (code: number) => {
    // WMO Weather interpretation codes
    if (code === 0) return <Sun className="w-4 h-4" />;
    if (code <= 3) return <Cloud className="w-4 h-4" />;
    if (code <= 67) return <CloudRain className="w-4 h-4" />;
    if (code <= 77) return <CloudSnow className="w-4 h-4" />;
    return <Wind className="w-4 h-4" />;
  };

  const getWeatherDescription = (code: number) => {
    if (lang === 'en') {
      if (code === 0) return 'Clear';
      if (code <= 3) return 'Cloudy';
      if (code <= 67) return 'Rain';
      if (code <= 77) return 'Snow';
      return 'Windy';
    }
    if (code === 0) return '晴朗';
    if (code <= 3) return '多云';
    if (code <= 67) return '雨';
    if (code <= 77) return '雪';
    return '多风';
  };

  const getCityName = async (lat: number, lon: number, language: string) => {
    try {
      const data = await fetchJsonWithTimeout<{ address?: { city?: string; county?: string; state?: string } }>(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=${language}`,
        3000
      );
      return data.address?.city || data.address?.county || data.address?.state || (language === 'zh' ? '未知位置' : 'Unknown');
    } catch (error) {
      console.error('Error fetching city name:', error);
      return language === 'zh' ? '未知位置' : 'Unknown';
    }
  };

  useEffect(() => {
    const fetchWeatherByCoords = async (latitude: number, longitude: number) => {
      try {
        const weatherData = await fetchJsonWithTimeout<{
          current_weather: { temperature: number; weathercode: number };
        }>(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`,
          3000
        );

        const [cityZh, cityEn] = await Promise.all([
          getCityName(latitude, longitude, 'zh'),
          getCityName(latitude, longitude, 'en'),
        ]);

        setWeather({
          temperature: Math.round(weatherData.current_weather.temperature),
          weatherCode: weatherData.current_weather.weathercode,
          city: cityZh,
          cityEn,
        });
        setLoadingWeather(false);
      } catch (error) {
        console.error('Error fetching weather data:', error);
        setLoadingWeather(false);
      }
    };

    const fetchWeatherByIP = async () => {
      try {
        let latitude, longitude;

        try {
          const ipData = await fetchJsonWithTimeout<{ latitude?: number; longitude?: number }>('https://ipapi.co/json/', 2500);
          latitude = ipData.latitude;
          longitude = ipData.longitude;
        } catch {
          try {
            const ipData = await fetchJsonWithTimeout<{ lat?: number; lon?: number }>('http://ip-api.com/json/', 2500);
            latitude = ipData.lat;
            longitude = ipData.lon;
          } catch {
            latitude = 39.9042;
            longitude = 116.4074;
          }
        }

        if (latitude && longitude) {
          await fetchWeatherByCoords(latitude, longitude);
        } else {
          await fetchWeatherByCoords(39.9042, 116.4074);
        }
      } catch (error) {
        console.log('Using default location (Beijing)');
        await fetchWeatherByCoords(39.9042, 116.4074);
      }
    };

    const fetchWeather = async () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await fetchWeatherByCoords(latitude, longitude);
          },
          async (error) => {
            console.log('Using IP-based location for weather');
            await fetchWeatherByIP();
          },
          {
            timeout: 5000,
            maximumAge: 0
          }
        );
      } else {
        console.log('Using IP-based location for weather');
        await fetchWeatherByIP();
      }
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let idleHandle: number | undefined;
    const timeoutHandle = window.setTimeout(() => {
      if (idleWindow.requestIdleCallback) {
        idleHandle = idleWindow.requestIdleCallback(fetchWeather, { timeout: 2500 });
      } else {
        void fetchWeather();
      }
    }, 2500);

    return () => {
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
      window.clearTimeout(timeoutHandle);
    };
  }, []);

  return (
    <>
      {hasWallpaper && (
        <>
          <div
            className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-300"
            style={{ backgroundImage: `url(${wallpaperUrl})` }}
          />
          {showDarkWallpaperOverlay && (
            <div className={`pointer-events-none fixed inset-0 z-0 transition-colors duration-300 ${
              darkOverlayMode === 'subtle' ? 'bg-black/25' : 'bg-black/60'
            }`} />
          )}
        </>
      )}
      {/* 主要内容 */}
      <main className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-20 py-8">
        {/* 搜索区域 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto mb-10 flex flex-col items-center"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className={`flex items-center gap-3 mb-4 text-sm font-light ${
              hasWallpaper ? 'text-gray-800 drop-shadow-sm dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <span>{getCurrentDate()}</span>
            {loadingWeather ? (
              <span>{lang === 'en' ? 'Loading...' : '加载中...'}</span>
            ) : weather ? (
              <>
                <span>{lang === 'en' ? weather.cityEn : weather.city}</span>
                {getWeatherIcon(weather.weatherCode)}
                <span>{weather.temperature}°C</span>
                <span>{getWeatherDescription(weather.weatherCode)}</span>
              </>
            ) : (
              <>
                <span>{lang === 'en' ? 'Beijing' : '北京'}</span>
                <Sun className="w-4 h-4" />
                <span>22°C</span>
                <span>{lang === 'en' ? 'Sunny' : '晴朗'}</span>
              </>
            )}
          </motion.div>
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
            onSubmit={handleSearch}
            className="relative group w-full"
          >
            <Search
              strokeWidth={2.25}
              className={`pointer-events-none absolute left-4 top-1/2 z-10 h-[22px] w-[22px] -translate-y-1/2 transition-colors ${
                hasWallpaper ? '' : 'group-focus-within:text-gray-900 dark:group-focus-within:text-gray-100'
              } ${
                hasWallpaper ? (useDarkGlassSurface ? 'text-white drop-shadow-sm' : 'text-gray-700') : 'text-gray-500 dark:text-gray-400'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                searchEngine === 'google'
                  ? 'Search with Google...'
                  : searchEngine === 'baidu'
                    ? (lang === 'en' ? 'Search with Baidu...' : '百度一下...')
                    : (lang === 'en' ? 'Search with Bing...' : '用必应搜索...')
              }
              style={glassSurfaceStyle}
              className={`w-full pl-11 pr-14 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/10 dark:focus:ring-gray-100/10 focus:border-gray-900 dark:focus:border-gray-400 focus:shadow-md transition-all duration-300 shadow-sm text-base ${
                hasWallpaper
                  ? `${useDarkGlassSurface ? 'text-white placeholder:text-white/75' : 'text-gray-950 placeholder:text-gray-600'} border-white/55 shadow-lg dark:border-white/10`
                  : 'bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500'
              }`}
            />
            {/* Search engine selector */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <div className={`w-px h-5 ${hasWallpaper ? (useDarkGlassSurface ? 'bg-white/30' : 'bg-gray-900/30 dark:bg-white/30') : 'bg-gray-200 dark:bg-zinc-600'}`} />
              <div className="relative" ref={engineDropdownRef}>
                <button
                  type="button"
                  onClick={() => setEngineOpen(o => !o)}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                    hasWallpaper
                      ? `${useDarkGlassSurface ? 'text-white/85 hover:bg-white/10' : 'text-gray-900 hover:bg-white/20 dark:text-gray-100 dark:hover:bg-white/10'}`
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700'
                  }`}
                  title={searchEngine === 'google' ? 'Google Search' : searchEngine === 'baidu' ? '百度搜索' : 'Bing Search'}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${engineOpen ? 'rotate-180' : ''}`} />
                </button>
                {engineOpen && (
                  <div className="absolute right-0 top-full mt-2 w-28 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden z-50">
                    {(['google', 'baidu', 'bing'] as const).map(engine => (
                      <button
                        key={engine}
                        type="button"
                        onClick={() => { setSearchEngine(engine); setEngineOpen(false); try { localStorage.setItem('searchEngine', engine); } catch {} }}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                          searchEngine === engine
                            ? 'bg-gray-100 dark:bg-zinc-700 text-gray-900 dark:text-gray-100'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {engine === 'google' ? 'Google' : engine === 'baidu' ? '百度' : (lang === 'zh' ? '必应' : 'Bing')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.form>
        </motion.div>

        {/* 分类区域 */}
        <section className="space-y-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">Loading...</div>
            </div>
          ) : (
            categories.map((category, categoryIndex) => {
              const colors = categoryColorMap[category.title] || { bgColor: 'bg-gray-100', textColor: 'text-gray-900' };
              const categoryIcon = categoryIconMap[category.title] || <BookOpen className="w-5 h-5" />;

              return (
                <motion.div
                  key={category.id}
                  id={`category-${category.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + categoryIndex * 0.1, duration: 0.5, ease: "easeOut" }}
                  className="space-y-4 scroll-mt-16"
                >
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + categoryIndex * 0.1, duration: 0.4 }}
                    className={`flex items-center gap-3 border-b pb-2 ${
                      hasWallpaper ? 'border-white/45 dark:border-white/10' : 'border-gray-300 dark:border-zinc-700'
                    }`}
                  >
                    <div className="-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1">
                      <div className={hasWallpaper ? categoryWallpaperTextClass : 'text-gray-900 dark:text-gray-100'}>{categoryIcon}</div>
                      <h2 className={`text-lg font-semibold flex-1 ${hasWallpaper ? categoryWallpaperTextClass : 'text-gray-900 dark:text-gray-100'}`}>{category.title}</h2>
                    </div>
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className={`p-1 rounded-md transition-colors ${
                        hasWallpaper ? `${useLightCategoryForeground ? 'text-white hover:bg-white/10' : 'text-gray-900 hover:bg-white/40 dark:text-white dark:hover:bg-white/10'}` : 'hover:bg-gray-100 dark:hover:bg-zinc-800'
                      }`}
                      aria-label={collapsedCategories.has(category.id) ? "Expand category" : "Collapse category"}
                    >
                      {collapsedCategories.has(category.id) ? (
                        <ChevronDown className={`w-5 h-5 ${hasWallpaper ? '' : 'text-gray-600 dark:text-gray-400'}`} />
                      ) : (
                        <ChevronUp className={`w-5 h-5 ${hasWallpaper ? '' : 'text-gray-600 dark:text-gray-400'}`} />
                      )}
                    </button>
                  </motion.div>
                  {!collapsedCategories.has(category.id) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {category.items.map((item, itemIndex) => (
                      <motion.a
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + categoryIndex * 0.1 + itemIndex * 0.05, duration: 0.3 }}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        key={item.id}
                        id={`site-${item.id}`}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onPointerEnter={() => preconnectTo(item.url)}
                        onFocus={() => preconnectTo(item.url)}
                        onTouchStart={() => preconnectTo(item.url)}
                        style={glassSurfaceStyle}
                        className={`h-20 p-4 rounded-lg border hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex items-center gap-3 ${
                          hasWallpaper ? '' : 'bg-white shadow-sm dark:bg-zinc-800'
                        } ${
                          highlightedSiteId === item.id
                            ? 'border-blue-400 ring-2 ring-blue-300 shadow-blue-100 dark:border-sky-300 dark:bg-sky-400/10 dark:ring-sky-400/35 dark:shadow-sky-950/30'
                            : hasWallpaper
                              ? 'border-white/45 shadow-[0_8px_24px_rgba(15,23,42,0.10)] hover:border-white/70 dark:border-white/10 dark:shadow-[0_6px_18px_rgba(0,0,0,0.18)] dark:hover:border-white/20'
                              : 'bg-white dark:bg-zinc-800 border-transparent dark:border-zinc-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 overflow-hidden p-2 ${
                          hasWallpaper
                            ? 'border-white/55 bg-white/70 shadow-sm dark:border-white/10 dark:bg-white/10'
                            : 'bg-white dark:bg-zinc-700 border-gray-200 dark:border-zinc-600'
                        }`}>
                          <FaviconImage
                            src={item.faviconUrl}
                            alt={`${item.name} favicon`}
                            fallback={iconMap[item.icon] || <Library className="w-6 h-6 text-gray-700 dark:text-gray-300" />}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-base font-semibold leading-[22px] truncate ${hasWallpaper ? wallpaperPrimaryTextClass : 'text-gray-900 dark:text-gray-100'}`} title={item.name}>{item.name}</p>
                          <p className={`text-xs tracking-wide truncate ${hasWallpaper ? wallpaperSecondaryTextClass : 'text-gray-500 dark:text-gray-400'}`} title={item.description}>{item.description}</p>
                        </div>
                      </motion.a>
                    ))}
                  </div>
                  )}
                </motion.div>
              );
            })
          )}

          {/* 底部横幅 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
            className="mt-8 rounded-2xl overflow-hidden relative h-[300px] flex items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-gradient-to-r from-amber-900 to-gray-700 dark:from-slate-800 dark:to-slate-700"
              style={bannerGradient ? { background: bannerGradient } : undefined}
            ></div>
            <div className="relative z-10 text-center space-y-4 px-6">
              <h1 className="text-4xl font-bold text-white tracking-tight">{lang === 'en' ? 'Focus on what matters.' : '专注于真正重要的事。'}</h1>
              <p className="text-lg text-white/80 max-w-lg mx-auto">{lang === 'en' ? 'Your digital launchpad for a focused and organized day across the web.' : '你的数字导航台，让每一天都井然有序、高效专注。'}</p>
            </div>
          </motion.div>
        </section>
      </main>

      {/* 悬浮搜索按钮（可拖动） */}
      {btnPos && (
        <button
          onMouseDown={handleFabPointerDown}
          onTouchStart={handleFabPointerDown}
          onClick={handleFabClick}
          style={{
            left: btnPos.x,
            top: btnPos.y,
            width: FAB_SIZE,
            height: FAB_SIZE,
            transition: isSnapping ? 'left 0.28s cubic-bezier(0.34,1.56,0.64,1), top 0.28s cubic-bezier(0.34,1.56,0.64,1)' : undefined,
            borderWidth: hasWallpaper ? 0.5 : undefined,
            ...(glassSurfaceStyle ?? {}),
          }}
          className={`fixed z-40 rounded-full shadow-lg flex items-center justify-center select-none transition-colors ${
            hasWallpaper ? 'border border-white/45 dark:border-white/10' : 'bg-gray-900 dark:bg-blue-950'
          } ${
            isDragging
              ? 'cursor-grabbing shadow-2xl scale-105'
              : hasWallpaper
                ? 'cursor-grab active:scale-95 hover:border-white/70 dark:hover:border-white/20'
                : 'cursor-grab hover:bg-gray-700 active:scale-95 dark:hover:bg-blue-900'
          } ${
            hasWallpaper ? wallpaperControlTextClass : 'text-white'
          }`}
          aria-label={lang === 'en' ? 'Search sites' : '搜索网站'}
          title={lang === 'en' ? 'Search sites (⌘K)' : '搜索网站 (⌘K)'}
        >
          <Search className="w-4 h-4" />
        </button>
      )}

      {/* 搜索悬浮层 */}
      {siteSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSiteSearchOpen(false); }}
        >
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSiteSearchOpen(false)}
          />

          {/* 搜索面板 */}
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={glassSurfaceStyle}
            className={`relative z-10 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border ${
              hasWallpaper
                ? 'border-white/45 dark:border-white/10'
                : 'border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
            }`}
          >
            {/* 搜索输入框 */}
            <div className={`flex items-center gap-3 border-b px-4 py-4 ${siteSearchDividerClass}`}>
              <Search className={`w-5 h-5 flex-shrink-0 ${hasWallpaper ? wallpaperControlTextClass : 'text-gray-400 dark:text-gray-500'}`} />
              <input
                ref={siteSearchInputRef}
                type="text"
                value={siteSearchQuery}
                onChange={(e) => setSiteSearchQuery(e.target.value)}
                placeholder={lang === 'en' ? 'Search saved sites...' : '搜索已添加的网站...'}
                className={`flex-1 bg-transparent text-base outline-none placeholder:text-gray-500 dark:placeholder:text-gray-500 ${
                  hasWallpaper && useDarkGlassSurface ? 'text-white placeholder:text-white/65' : 'text-gray-950 placeholder:text-gray-600 dark:text-gray-100'
                }`}
              />
              <div className="flex items-center gap-2">
                <kbd className={`hidden items-center rounded border px-1.5 py-0.5 text-xs sm:inline-flex ${
                  hasWallpaper && useDarkGlassSurface
                    ? 'border-white/15 bg-white/10 text-white/70'
                    : 'border-gray-200 bg-gray-100 text-gray-600 dark:border-zinc-600 dark:bg-zinc-700 dark:text-gray-300'
                }`}>ESC</kbd>
                <button
                  onClick={() => setSiteSearchOpen(false)}
                  className={`rounded p-1 transition-colors ${hasWallpaper ? `${siteSearchFaintTextClass} ${siteSearchHoverClass}` : 'text-gray-500 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 搜索结果 */}
            <div className="max-h-[60vh] overflow-y-auto">
              {siteSearchQuery.trim() === '' ? (
                <div className={`px-4 py-10 text-center text-sm ${siteSearchFaintTextClass}`}>
                  {lang === 'en' ? 'Type to search by name, description, or URL' : '输入关键词搜索网站名称、描述或地址'}
                </div>
              ) : filteredSites.length === 0 ? (
                <div className={`px-4 py-10 text-center text-sm ${siteSearchFaintTextClass}`}>
                  {lang === 'en' ? 'No matching sites found' : '未找到匹配的网站'}
                </div>
              ) : (
                <ul className="py-2">
                  {filteredSites.map(site => (
                    <li key={site.id} className="px-2">
                      <div className={`relative flex items-center gap-3 rounded-xl px-3 py-3 transition-colors group ${siteSearchHoverClass}`}>
                        {/* 图标 */}
                        <div className="w-9 h-9 rounded-lg bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 flex items-center justify-center flex-shrink-0 overflow-hidden p-1.5">
                          <FaviconImage
                            src={site.faviconUrl}
                            alt=""
                            fallback={<Library className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                          />
                        </div>

                        {/* 信息 */}
                        <div className="flex-1 min-w-0">
                          <p className={`truncate text-sm font-semibold ${siteSearchTextClass}`}>{site.name}</p>
                          <p className={`truncate text-xs ${siteSearchFaintTextClass}`}>{site.categoryTitle}</p>
                        </div>

                        {/* 操作按钮 — relative z-10 确保在行级 <a> overlay 之上 */}
                        <div className="relative z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); scrollToSite(site.id, site.categoryId); }}
                            className={`rounded-lg p-1.5 transition-colors ${siteSearchFaintTextClass} ${siteSearchHoverClass}`}
                            title={lang === 'en' ? 'Scroll to on page' : '定位到页面位置'}
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                          <a
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onPointerEnter={() => preconnectTo(site.url)}
                            onFocus={() => preconnectTo(site.url)}
                            onTouchStart={() => preconnectTo(site.url)}
                            onClick={(e) => { e.stopPropagation(); setSiteSearchOpen(false); setSiteSearchQuery(''); }}
                            className={`rounded-lg p-1.5 transition-colors ${siteSearchFaintTextClass} ${siteSearchHoverClass}`}
                            title={lang === 'en' ? 'Open site' : '打开网站'}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>

                        {/* 默认点击整行打开网站 */}
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onPointerEnter={() => preconnectTo(site.url)}
                          onFocus={() => preconnectTo(site.url)}
                          onTouchStart={() => preconnectTo(site.url)}
                          onClick={() => { setSiteSearchOpen(false); setSiteSearchQuery(''); }}
                          className="absolute inset-0"
                          aria-label={lang === 'en' ? `Open ${site.name}` : `打开 ${site.name}`}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 底部提示 */}
            {filteredSites.length > 0 && (
              <div className={`flex items-center gap-4 border-t px-4 py-2.5 text-xs ${siteSearchDividerClass} ${siteSearchMutedTextClass}`}>
                <span><kbd className={`rounded border px-1 py-0.5 ${hasWallpaper && useDarkGlassSurface ? 'border-white/15 bg-white/10' : 'border-gray-200 bg-gray-100 dark:border-zinc-600 dark:bg-zinc-700'}`}>↵</kbd> {lang === 'en' ? 'Open' : '打开'}</span>
                <span><MapPin className="w-3 h-3 inline mr-1" />{lang === 'en' ? 'Scroll to' : '定位到页面'}</span>
                <span className="ml-auto">{filteredSites.length} {lang === 'en' ? 'results' : '个结果'}</span>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* 页脚 */}
      <footer className={`relative z-10 mt-auto border-t transition-colors duration-200 ${
        hasWallpaper
          ? 'border-transparent bg-transparent'
          : 'border-gray-200 bg-gray-100 dark:border-zinc-800 dark:bg-zinc-900'
      }`}>
        <div className="max-w-[1200px] mx-auto px-8 py-12 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className={`text-xs uppercase tracking-widest ${hasWallpaper ? sideNavTextClass : 'text-gray-600 dark:text-gray-400'}`}>© 2024 Minimalist Dash. Designed for focus.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <RouterLink to="/docs" className={`text-xs transition-colors uppercase tracking-widest ${hasWallpaper ? `${sideNavTextClass} opacity-80 hover:opacity-100` : 'text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>Documentation</RouterLink>
            <a href="https://github.com/tutorzavcedoru9752-cmd/Dash-Navigation" target="_blank" rel="noreferrer" className={`text-xs transition-colors uppercase tracking-widest ${hasWallpaper ? `${sideNavTextClass} opacity-80 hover:opacity-100` : 'text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>GitHub</a>
            <RouterLink to="/privacy" className={`text-xs transition-colors uppercase tracking-widest ${hasWallpaper ? `${sideNavTextClass} opacity-80 hover:opacity-100` : 'text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}>Privacy Policy</RouterLink>
          </div>
        </div>
      </footer>

      {/* Left category quick-nav */}
      {!loading && categories.length > 0 && (
        <div
          className="fixed left-0 top-1/2 -translate-y-1/2 z-20 hidden lg:flex flex-col gap-1.5 pl-4 pr-[50px] py-10 select-none"
          onMouseEnter={() => setHoveredCatIdx(prev => (prev !== null && prev >= 0) ? prev : -1)}
          onMouseLeave={() => setHoveredCatIdx(null)}
        >
          {categories.filter(() => categories.length > 3).map((category, idx) => {
            const hasSpecific = hoveredCatIdx !== null && hoveredCatIdx >= 0;
            const dist = hasSpecific ? Math.abs(idx - hoveredCatIdx!) : Infinity;
            const intensity = hasSpecific ? Math.exp(-dist * 0.75) : 0;
            const isHovered = hoveredCatIdx === idx;
            const isActive = activeCatIdx === idx;
            const opacity = hoveredCatIdx === null
              ? (isActive ? 0.48 : 0.22)
              : hoveredCatIdx === -1 ? 0.45
              : 0.12 + intensity * 0.88;

            return (
              <button
                key={category.id}
                onMouseEnter={() => setHoveredCatIdx(idx)}
                onClick={() => {
                  setCollapsedCategories(prev => {
                    const next = new Set(prev);
                    next.delete(category.id);
                    return next;
                  });
                  setTimeout(() => {
                    document.getElementById(`category-${category.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 50);
                }}
                className="text-left focus:outline-none"
                style={{
                  opacity,
                  transition: 'opacity 0.22s ease, transform 0.22s ease',
                  transform: `translateX(${isHovered ? 4 : 0}px)`,
                }}
              >
                <div className={`flex items-center gap-2 rounded-md px-2 py-1 -mx-2 transition-all duration-200 ${
                  isHovered
                    ? hasWallpaper && sideNavTone === 'dark' ? 'bg-black/5 backdrop-blur-sm' : 'bg-white/10 backdrop-blur-sm dark:bg-zinc-900/10'
                    : ''
                }`}>
                  <span
                    className={`block flex-shrink-0 rounded-full ${hasWallpaper ? sideNavMarkerClass : 'bg-gray-800 dark:bg-gray-200'}`}
                    style={{
                      width: isHovered ? '16px' : `${6 + intensity * 6}px`,
                      height: '2px',
                      opacity: 1,
                      transition: 'width 0.22s ease',
                    }}
                  />
                  <span
                    className={`${hasWallpaper ? sideNavTextClass : 'text-gray-800 dark:text-gray-100'} whitespace-nowrap overflow-hidden`}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: isHovered ? 500 : 400,
                      maxWidth: isHovered ? '120px' : '0px',
                      opacity: isHovered ? 1 : 0,
                      transition: 'max-width 0.22s ease, opacity 0.18s ease',
                    }}
                  >
                    {category.title}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
