import { useState, useEffect, useContext, useRef } from 'react';
import { BookOpen, Sparkles, Plus, Edit2, Trash2, Copy, Save, X, ChevronUp, ChevronDown, Settings, Library, GraduationCap, Microscope, BrainCircuit, Rocket, MessageSquare, Bookmark, Video, Link, Code, Terminal, Cloud, Database, Globe, Palette, Music, Camera, Gamepad2, UtensilsCrossed, Coffee, ShoppingCart, Plane, Car, Dumbbell, RefreshCw, Languages, Sun, Moon, Mail, Share2, Download, Check, KeyRound, Clock3, UserRound } from 'lucide-react';
import { fetchFaviconData, useCategories, type LinkItem, type NavShare } from '../hooks/useCategories';
import { motion } from 'motion/react';
import { FREE_CATEGORY_LIMIT, FREE_LINK_LIMIT, LangContext, MembershipContext, ThemeContext } from '../App';

const ui = {
  en: {
    navigation: 'Navigation',
    refreshIcons: 'Refresh Icons',
    refreshing: 'Refreshing...',
    createCategory: 'Create Category',
    editCategoryTitle: 'Edit Category',
    deleteCategoryConfirm: (t: string) => `Are you sure you want to delete "${t}"?`,
    deleteItemConfirm: (n: string) => `Delete "${n}"?`,
    editCategoryLabel: 'Edit category',
    deleteCategoryLabel: 'Delete category',
    addNewSite: 'Add new site',
    addNewSiteTo: (t: string) => `Add new site to ${t}`,
    configureHint: 'Configure title, description and URL',
    createNewCategory: 'Create New Category',
    categoryId: 'Category ID',
    categoryIdPlaceholder: 'e.g., productivity',
    categoryTitle: 'Category Title',
    categoryTitlePlaceholder: 'e.g., Productivity',
    category: 'Category',
    description: 'Description',
    descriptionPlaceholder: 'Brief description of the category',
    cancel: 'Cancel',
    saveChanges: 'Save Changes',
    addSite: 'Add Site',
    editSite: 'Edit Site',
    siteTitle: 'Site Title',
    siteTitlePlaceholder: 'e.g., Khan Academy',
    destinationUrl: 'Destination URL',
    descriptionSitePlaceholder: 'Brief description of the site',
    copyLink: 'Copy link',
    toastCopied: 'Copied',
    toastSaving: 'Saving…',
    toastAdded: 'Added',
    toastUpdated: 'Updated',
    toastDeleted: 'Deleted',
    toastCreated: 'Created',
    toastRefreshed: 'Icons refreshed',
    toastReordered: 'Saved',
    importLinks: 'Import links',
    shareCategoryLabel: 'Share category links',
    shareCategory: 'Share Category',
    shareHint: 'Select sites from this category and create a share code that expires in 3 days.',
    shareCode: 'Share Code',
    shareExpires: 'Expires',
    generateCode: 'Generate Code',
    selectAtLeastOne: 'Select at least one site',
    loadShareCode: 'Load share code',
    importShare: 'Import Shared Links',
    shareCodePlaceholder: 'Enter share code',
    importTo: 'Import to',
    existingCategory: 'Existing category',
    newCategory: 'New category',
    importSelected: 'Import selected',
    noShareFound: 'No valid share code found.',
    toastShareCreated: 'Share code created',
    toastShareCopied: 'Share code copied',
    toastShareLoaded: 'Share loaded',
    toastImported: 'Links imported',
    toastDuplicatesRemoved: (count: number) => `${count} duplicate ${count === 1 ? 'link was' : 'links were'} removed`,
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    docs: 'Documentation',
    help: 'Help Center',
    footer: '© 2024 Portal Navigation. All rights reserved.',
  },
  zh: {
    navigation: '导航',
    refreshIcons: '刷新图标',
    refreshing: '刷新中...',
    createCategory: '创建分类',
    editCategoryTitle: '编辑分类',
    deleteCategoryConfirm: (t: string) => `确定要删除分类 "${t}" 吗？`,
    deleteItemConfirm: (n: string) => `确定要删除 "${n}" 吗？`,
    editCategoryLabel: '编辑分类',
    deleteCategoryLabel: '删除分类',
    addNewSite: '添加新网站',
    addNewSiteTo: (t: string) => `向 ${t} 添加新网站`,
    configureHint: '配置标题、描述和链接',
    createNewCategory: '创建新分类',
    categoryId: '分类 ID',
    categoryIdPlaceholder: '例如：productivity',
    categoryTitle: '分类名称',
    categoryTitlePlaceholder: '例如：效率工具',
    category: '分类',
    description: '描述',
    descriptionPlaceholder: '分类的简短描述',
    cancel: '取消',
    saveChanges: '保存更改',
    addSite: '添加网站',
    editSite: '编辑网站',
    siteTitle: '网站名称',
    siteTitlePlaceholder: '例如：可汗学院',
    destinationUrl: '目标链接',
    descriptionSitePlaceholder: '网站的简短描述',
    copyLink: '复制链接',
    toastCopied: '已复制',
    toastSaving: '修改中…',
    toastAdded: '已添加',
    toastUpdated: '已更新',
    toastDeleted: '已删除',
    toastCreated: '已创建',
    toastRefreshed: '图标已刷新',
    toastReordered: '已保存',
    importLinks: '导入网址',
    shareCategoryLabel: '分享分类网址',
    shareCategory: '分享分类',
    shareHint: '选择这个分类下的网址，生成一个 3 天后过期的分享码。',
    shareCode: '分享码',
    shareExpires: '有效期至',
    generateCode: '生成分享码',
    selectAtLeastOne: '请至少选择一个网站',
    loadShareCode: '读取分享码',
    importShare: '导入分享的网址',
    shareCodePlaceholder: '输入分享码',
    importTo: '导入到',
    existingCategory: '已有分类',
    newCategory: '新建分类',
    importSelected: '导入选中网址',
    noShareFound: '没有找到有效的分享码。',
    toastShareCreated: '分享码已生成',
    toastShareCopied: '分享码已复制',
    toastShareLoaded: '分享内容已读取',
    toastImported: '网址已导入',
    toastDuplicatesRemoved: (count: number) => `已移除 ${count} 个重复网址`,
    privacy: '隐私政策',
    terms: '服务条款',
    docs: '文档',
    help: '帮助中心',
    footer: '© 2024 导航门户。保留所有权利。',
  },
} as const;

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

const itemIconMap: Record<string, React.ReactNode> = {
  'book': <Library className="w-6 h-6" />,
  'school': <GraduationCap className="w-6 h-6" />,
  'biotech': <Microscope className="w-6 h-6" />,
  'psychology': <BrainCircuit className="w-6 h-6" />,
  'relax': <Sparkles className="w-6 h-6" />,
  'robot_2': <Rocket className="w-6 h-6" />,
  'quiz': <MessageSquare className="w-6 h-6" />,
  'style': <Bookmark className="w-6 h-6" />,
  'movie': <Video className="w-6 h-6" />,
  'mail': <Mail className="w-6 h-6" />,
  'link': <Link className="w-6 h-6" />,
  'code': <Code className="w-6 h-6" />,
  'terminal': <Terminal className="w-6 h-6" />,
  'cloud': <Cloud className="w-6 h-6" />,
  'database': <Database className="w-6 h-6" />,
  'settings': <Settings className="w-6 h-6" />,
  'language': <Globe className="w-6 h-6" />,
  'palette': <Palette className="w-6 h-6" />,
  'music_note': <Music className="w-6 h-6" />,
  'photo_camera': <Camera className="w-6 h-6" />,
  'sports_esports': <Gamepad2 className="w-6 h-6" />,
  'restaurant': <UtensilsCrossed className="w-6 h-6" />,
  'local_cafe': <Coffee className="w-6 h-6" />,
  'shopping_cart': <ShoppingCart className="w-6 h-6" />,
  'flight': <Plane className="w-6 h-6" />,
  'directions_car': <Car className="w-6 h-6" />,
  'fitness_center': <Dumbbell className="w-6 h-6" />,
};

const primaryButtonClass = 'rounded-lg bg-gray-900 text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-950 dark:text-white dark:hover:bg-blue-900 dark:focus-visible:ring-blue-700';
const selectControlClass = 'w-full appearance-none rounded-lg border-none bg-gray-100 py-3 pl-3 pr-11 text-base text-gray-900 outline-none ring-1 ring-transparent transition focus:ring-2 focus:ring-gray-300 dark:bg-zinc-700 dark:text-gray-100 dark:focus:ring-zinc-600';

function SiteFavicon({ item }: { item: Pick<LinkItem, 'name' | 'icon' | 'faviconUrl'> }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [item.faviconUrl]);

  if (item.faviconUrl && !failed) {
    return (
      <img
        src={item.faviconUrl}
        alt={`${item.name} favicon`}
        className="h-full w-full object-contain"
        loading="lazy"
        decoding="async"
        fetchpriority="low"
        onError={() => setFailed(true)}
      />
    );
  }

  return itemIconMap[item.icon] || <BookOpen className="h-5 w-5 text-gray-700 dark:text-gray-300" />;
}

function ShareAuthor({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  return (
    <div className="flex flex-shrink-0 items-center gap-2 text-right">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-gray-900 dark:text-gray-100">{name}</p>
      </div>
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-white dark:bg-blue-950">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserRound className="h-4 w-4" />
        )}
      </div>
    </div>
  );
}

function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: Array<{ id: string; title: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = categories.find((category) => category.id === value);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        className={`${selectControlClass} flex items-center justify-between text-left`}
      >
        <span className="truncate">{selected?.title ?? categories[0]?.title ?? ''}</span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-500 transition-transform dark:text-gray-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="relative z-[70] mt-2 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          {categories.map((category) => {
            const selectedOption = category.id === value;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  onChange(category.id);
                  setOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-base transition-colors ${
                  selectedOption
                    ? 'bg-gray-100 text-gray-900 dark:bg-zinc-700 dark:text-gray-100'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-zinc-700'
                }`}
              >
                {category.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Categories() {
  const { lang, setLang } = useContext(LangContext);
  const { isDark, toggleDark } = useContext(ThemeContext);
  const t = ui[lang];
  const {
    categories,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    deleteCategory,
    createCategory,
    createShare,
    getShare,
    deleteShare,
    importSharedLinks,
    migrateFavicons,
  } = useCategories();
  const { summary, refreshMembership, openUpgradeDialog } = useContext(MembershipContext);

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [editingItem, setEditingItem] = useState<{ id: string; name: string; url: string; description: string; categoryId: string } | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; title: string; description: string } | null>(null);
  const [formData, setFormData] = useState({ name: '', url: '', description: '', categoryId: '' });
  const [categoryFormData, setCategoryFormData] = useState({ id: '', title: '', description: '' });
  const [isRefreshingFavicons, setIsRefreshingFavicons] = useState(false);
  const [toast, setToast] = useState<{ status: 'saving' | 'done' | 'error'; msg: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [isSharingCategory, setIsSharingCategory] = useState(false);
  const [shareSelectedIds, setShareSelectedIds] = useState<Set<string>>(new Set());
  const [shareResult, setShareResult] = useState<{ code: string; expiresAt: string; sharerName: string; sharerAvatarUrl?: string } | null>(null);
  const [isGeneratingShare, setIsGeneratingShare] = useState(false);
  const [isImportingShare, setIsImportingShare] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [loadedShare, setLoadedShare] = useState<NavShare | null>(null);
  const [importSelectedIds, setImportSelectedIds] = useState<Set<string>>(new Set());
  const [importTargetMode, setImportTargetMode] = useState<'existing' | 'new'>('existing');
  const [importCategoryId, setImportCategoryId] = useState('');
  const [importNewCategory, setImportNewCategory] = useState({ id: '', title: '', description: '' });
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const hasReachedCategoryLimit = summary.plan === 'free' && summary.categoryCount >= FREE_CATEGORY_LIMIT;
  const hasReachedLinkLimit = summary.plan === 'free' && summary.linkCount >= FREE_LINK_LIMIT;

  const hostnameFor = (url: string) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  const normalizeUrlForCompare = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return '';

    try {
      const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
      const path = parsed.pathname.replace(/\/+$/, '');
      return `${host}${path}${parsed.search}`.toLowerCase();
    } catch {
      return trimmed.replace(/\/+$/, '').toLowerCase();
    }
  };

  const createCategoryIdFromTitle = (title: string) => {
    const base = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `shared-${Date.now().toString(36)}`;
    let nextId = base;
    let suffix = 2;

    while (categories.some((category) => category.id === nextId)) {
      nextId = `${base}-${suffix}`;
      suffix += 1;
    }

    return nextId;
  };

  const toggleSetValue = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  };

  const startToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ status: 'saving', msg });
  };
  const finishToast = (msg: string, status: 'done' | 'error' = 'done') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ status, msg });
    toastTimer.current = setTimeout(() => setToast(null), 1500);
  };

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
    if (categories.length > 0 && !importCategoryId) {
      setImportCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId, importCategoryId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-card]')) {
        setActiveCardId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAddItem = async () => {
    const targetCategoryId = formData.categoryId || selectedCategoryId;
    const targetCategory = categories.find((category) => category.id === targetCategoryId);
    if (!formData.name || !formData.url || !targetCategory) return;
    const iconOptions = [
      'book', 'school', 'biotech', 'psychology', 'relax', 'robot_2',
      'quiz', 'style', 'movie', 'link', 'code', 'terminal', 'cloud',
      'database', 'settings', 'language', 'palette', 'music_note',
      'photo_camera', 'sports_esports', 'restaurant', 'local_cafe',
      'shopping_cart', 'flight', 'directions_car', 'fitness_center'
    ];
    const randomIcon = iconOptions[Math.floor(Math.random() * iconOptions.length)];
    startToast(t.toastSaving);
    const faviconUrl = await fetchFaviconData(formData.url);
    const added = await addItem(targetCategoryId, {
      name: formData.name,
      url: formData.url,
      description: formData.description,
      icon: randomIcon,
      faviconUrl,
    });
    if (!added) {
      finishToast(hasReachedLinkLimit ? '免费用户最多可保存 30 个网站，请升级会员后继续添加。' : (error ?? t.toastUpdated), 'error');
      if (hasReachedLinkLimit) openUpgradeDialog();
      return;
    }
    setSelectedCategoryId(targetCategoryId);
    setFormData({ name: '', url: '', description: '', categoryId: targetCategoryId });
    setIsAddingNew(false);
    await refreshMembership();
    finishToast(t.toastAdded);
  };

  const handleEditItem = async () => {
    if (!editingItem || !formData.name || !formData.url) return;
    const targetCategoryId = formData.categoryId || editingItem.categoryId;
    startToast(t.toastSaving);
    const faviconUrl = await fetchFaviconData(formData.url);
    await updateItem(editingItem.categoryId, editingItem.id, {
      name: formData.name,
      url: formData.url,
      description: formData.description,
      faviconUrl,
      categoryId: targetCategoryId,
    });
    setEditingItem(null);
    setSelectedCategoryId(targetCategoryId);
    setFormData({ name: '', url: '', description: '', categoryId: targetCategoryId });
    finishToast(t.toastUpdated);
  };

  const handleDeleteItem = async (itemId: string) => {
    startToast(t.toastSaving);
      await deleteItem(selectedCategoryId, itemId);
      await refreshMembership();
      finishToast(t.toastDeleted);
  };

  const handleDeleteCategory = async () => {
    if (confirm(t.deleteCategoryConfirm(selectedCategory?.title ?? ''))) {
      startToast(t.toastSaving);
      await deleteCategory(selectedCategoryId);
      await refreshMembership();
      const remainingCategories = categories.filter(c => c.id !== selectedCategoryId);
      if (remainingCategories.length > 0) {
        setSelectedCategoryId(remainingCategories[0].id);
      }
      finishToast(t.toastDeleted);
    }
  };

  const startEdit = (item: LinkItem) => {
    setEditingItem({ ...item, categoryId: selectedCategoryId });
    setFormData({ name: item.name, url: item.url, description: item.description, categoryId: selectedCategoryId });
    setIsAddingNew(false);
  };

  const startAddNew = () => {
    if (hasReachedLinkLimit) {
      openUpgradeDialog();
      return;
    }
    setIsAddingNew(true);
    setEditingItem(null);
    setFormData({ name: '', url: '', description: '', categoryId: selectedCategoryId });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setIsAddingNew(false);
    setFormData({ name: '', url: '', description: '', categoryId: selectedCategoryId });
  };

  const handleCreateCategory = async () => {
    if (!categoryFormData.id || !categoryFormData.title) return;
    startToast(t.toastSaving);
    const result = await createCategory({
      id: categoryFormData.id,
      title: categoryFormData.title,
      description: categoryFormData.description,
      order: categories.length,
    });

    if (result) {
      setCategoryFormData({ id: '', title: '', description: '' });
      setIsCreatingCategory(false);
      setSelectedCategoryId(result.id);
      await refreshMembership();
      finishToast(t.toastCreated);
    } else {
      finishToast(hasReachedCategoryLimit ? '免费用户最多可创建 5 个分类，请升级会员后继续创建。' : (error ?? t.toastUpdated), 'error');
      if (hasReachedCategoryLimit) openUpgradeDialog();
    }
  };

  const cancelCreateCategory = () => {
    setIsCreatingCategory(false);
    setCategoryFormData({ id: '', title: '', description: '' });
  };

  const startEditCategory = (category: any) => {
    setEditingCategory({
      id: category.id,
      title: category.title,
      description: category.description,
    });
    setCategoryFormData({
      id: category.id,
      title: category.title,
      description: category.description,
    });
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !categoryFormData.title) return;
    startToast(t.toastSaving);
    const currentCategory = categories.find(c => c.id === editingCategory.id);
    const result = await createCategory({
      id: editingCategory.id,
      title: categoryFormData.title,
      description: categoryFormData.description,
      order: currentCategory?.order ?? 999,
      items: currentCategory?.items || [],
    });

    if (result) {
      setEditingCategory(null);
      setCategoryFormData({ id: '', title: '', description: '' });
      await refreshMembership();
      finishToast(t.toastUpdated);
    }
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({ id: '', title: '', description: '' });
  };

  const handleRefreshFavicons = async () => {
    setIsRefreshingFavicons(true);
    await migrateFavicons();
    setIsRefreshingFavicons(false);
    finishToast(t.toastRefreshed);
  };

  const openShareModal = () => {
    if (!selectedCategory) return;
    setShareSelectedIds(new Set(selectedCategory.items.map((item) => item.id)));
    setShareResult(null);
    setIsSharingCategory(true);
  };

  const handleCreateShareCode = async () => {
    if (!selectedCategory || shareSelectedIds.size === 0) return;
    setIsGeneratingShare(true);
    startToast(t.toastSaving);
    const result = await createShare(selectedCategory, Array.from(shareSelectedIds));
    setIsGeneratingShare(false);

    if (result) {
      setShareResult(result);
      finishToast(t.toastShareCreated);
    } else {
      finishToast(t.selectAtLeastOne);
    }
  };

  const closeShareModal = async (keepShareCode = false) => {
    const codeToDelete = !keepShareCode ? shareResult?.code : undefined;
    setIsSharingCategory(false);
    setShareResult(null);
    setShareSelectedIds(new Set());

    if (codeToDelete) {
      await deleteShare(codeToDelete);
    }
  };

  const handleCopyShareCode = async () => {
    if (!shareResult) return;
    try {
      await navigator.clipboard.writeText(shareResult.code);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareResult.code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    finishToast(t.toastShareCopied);
    await closeShareModal(true);
  };

  const openImportModal = () => {
    setImportCode('');
    setLoadedShare(null);
    setImportSelectedIds(new Set());
    setImportTargetMode('existing');
    setImportCategoryId(selectedCategoryId || categories[0]?.id || '');
    setImportNewCategory({ id: '', title: '', description: '' });
    setIsImportingShare(true);
  };

  const handleLoadShareCode = async () => {
    const share = await getShare(importCode);
    if (!share) {
      finishToast(t.noShareFound);
      return;
    }

    const seenShareUrls = new Set<string>();
    let duplicateCount = 0;
    const uniqueLinks = share.links.filter((item) => {
      const key = normalizeUrlForCompare(item.url);
      if (!key || seenShareUrls.has(key)) {
        duplicateCount += 1;
        return false;
      }
      seenShareUrls.add(key);
      return true;
    });
    const dedupedShare = { ...share, links: uniqueLinks };

    setLoadedShare(dedupedShare);
    setImportSelectedIds(new Set(uniqueLinks.map((item) => item.id)));
    setImportNewCategory({
      id: createCategoryIdFromTitle(share.categoryTitle),
      title: share.categoryTitle,
      description: share.categoryDescription,
    });
    finishToast(duplicateCount > 0 ? t.toastDuplicatesRemoved(duplicateCount) : t.toastShareLoaded);
  };

  const handleImportSharedLinks = async () => {
    if (!loadedShare || importSelectedIds.size === 0) return;

    let targetCategoryId = importCategoryId;
    if (importTargetMode === 'new') {
      const title = importNewCategory.title.trim() || loadedShare.categoryTitle;
      targetCategoryId = importNewCategory.id.trim() || createCategoryIdFromTitle(title);
      const created = await createCategory({
        id: targetCategoryId,
        title,
        description: importNewCategory.description,
        order: categories.length,
      });
      if (!created) {
        if (hasReachedCategoryLimit) openUpgradeDialog();
        return;
      }
      await refreshMembership();
    }

    const selectedLinks = loadedShare.links.filter((item) => importSelectedIds.has(item.id));
    const targetCategory = categories.find((category) => category.id === targetCategoryId);
    const existingUrls = new Set((targetCategory?.items ?? []).map((item) => normalizeUrlForCompare(item.url)));
    let duplicateCount = 0;
    const links = selectedLinks.filter((item) => {
      const key = normalizeUrlForCompare(item.url);
      if (!key || existingUrls.has(key)) {
        duplicateCount += 1;
        return false;
      }
      existingUrls.add(key);
      return true;
    });

    if (links.length === 0) {
      finishToast(duplicateCount > 0 ? t.toastDuplicatesRemoved(duplicateCount) : t.selectAtLeastOne, 'error');
      return;
    }

    startToast(t.toastSaving);
    const imported = await importSharedLinks(targetCategoryId, links);
    if (imported) {
      setSelectedCategoryId(targetCategoryId);
      setIsImportingShare(false);
      await refreshMembership();
      finishToast(duplicateCount > 0 ? t.toastDuplicatesRemoved(duplicateCount) : t.toastImported);
    } else if (hasReachedLinkLimit) {
      finishToast('免费用户最多可保存 30 个网站，请升级会员后继续添加。', 'error');
      openUpgradeDialog();
    }
  };

  const handleImportPrimaryAction = async () => {
    if (!loadedShare) {
      await handleLoadShareCode();
      return;
    }

    await handleImportSharedLinks();
  };

  const handleDeleteCategoryFromList = async (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (confirm(t.deleteCategoryConfirm(category?.title ?? ''))) {
      startToast(t.toastSaving);
      await deleteCategory(categoryId);
      if (selectedCategoryId === categoryId && categories.length > 1) {
        const remainingCategories = categories.filter(c => c.id !== categoryId);
        setSelectedCategoryId(remainingCategories[0].id);
      }
      finishToast(t.toastDeleted);
    }
  };

  const withReorderFeedback = async (fn: () => Promise<void>) => {
    startToast(t.toastSaving);
    await fn();
    finishToast(t.toastReordered);
  };

  const moveCategoryUp = async (index: number) => {
    if (index === 0) return;
    const newCategories = [...categories];
    [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]];
    for (let i = 0; i < newCategories.length; i++) {
      await createCategory({
        id: newCategories[i].id,
        title: newCategories[i].title,
        description: newCategories[i].description,
        items: newCategories[i].items,
        order: i,
      });
    }
  };

  const moveCategoryDown = async (index: number) => {
    if (index === categories.length - 1) return;
    const newCategories = [...categories];
    [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];
    for (let i = 0; i < newCategories.length; i++) {
      await createCategory({
        id: newCategories[i].id,
        title: newCategories[i].title,
        description: newCategories[i].description,
        items: newCategories[i].items,
        order: i,
      });
    }
  };


  return (
    <>
      <main className="flex-grow max-w-[1200px] mx-auto px-6 lg:px-20 py-8 w-full">
        <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Sidebar Navigation */}
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full md:w-64 flex-shrink-0"
        >
          <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-4 md:p-5 shadow-sm flex flex-col max-h-[48vh] md:max-h-none overflow-hidden transition-colors duration-200">
            <div className="flex items-center justify-between mb-3 px-0 md:px-2 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.navigation}</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
                  title={lang === 'en' ? '切换为中文' : 'Switch to English'}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md px-1.5 py-1 transition-colors"
                >
                  <span>{lang === 'en' ? '中' : 'EN'}</span>
                </button>
                <button
                  onClick={toggleDark}
                  title={isDark ? (lang === 'en' ? 'Light mode' : '浅色模式') : (lang === 'en' ? 'Dark mode' : '深色模式')}
                  className="flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md p-1 transition-colors"
                >
                  {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <ul className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 scrollbar-thin">
              {categories.map((category, index) => (
                <li key={category.id} className="group relative">
                  <button
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors text-sm font-medium ${
                      selectedCategoryId === category.id
                        ? 'bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-gray-100'
                        : 'hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {categoryIconMap[category.title] || <BookOpen className="w-5 h-5" />}
                    <span className="flex-1">{category.title}</span>
                  </button>
                  <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 transition-opacity ${selectedCategoryId === category.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button
                      onClick={() => withReorderFeedback(() => moveCategoryUp(index))}
                      disabled={index === 0 || toast?.status === 'saving'}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => withReorderFeedback(() => moveCategoryDown(index))}
                      disabled={index === categories.length - 1 || toast?.status === 'saving'}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>


                  </div>
                </li>
              ))}
            </ul>
            <hr className="my-3 md:my-4 border-gray-200 dark:border-zinc-700 flex-shrink-0" />
            <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
              <button
                onClick={() => {
                  if (hasReachedCategoryLimit) {
                    openUpgradeDialog();
                    return;
                  }
                  setIsCreatingCategory(true);
                }}
                className="flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 px-2 text-xs font-medium text-gray-600 transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-zinc-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:bg-zinc-700 md:w-full md:gap-2 md:px-4 md:text-sm"
              >
                <Plus className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{t.createCategory}</span>
              </button>
              <button
                onClick={handleRefreshFavicons}
                disabled={isRefreshingFavicons}
                className="flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-gray-100 px-2 text-xs font-medium text-gray-700 transition-all hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-600 md:w-full md:gap-2 md:px-4 md:text-sm"
                title="Refresh all website icons"
              >
                <RefreshCw className={`h-4 w-4 flex-shrink-0 ${isRefreshingFavicons ? 'animate-spin' : ''}`} />
                <span className="truncate">{isRefreshingFavicons ? t.refreshing : t.refreshIcons}</span>
              </button>
              <button
                onClick={openImportModal}
                className="flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-gray-100 px-2 text-xs font-medium text-gray-700 transition-all hover:bg-gray-200 dark:bg-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-600 md:w-full md:gap-2 md:px-4 md:text-sm"
              >
                <Download className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{t.importLinks}</span>
              </button>
            </div>
          </div>
        </motion.aside>

        {/* Content Area */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          className="flex-grow"
        >
          {/* Header Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex justify-between items-center mb-6"
          >
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{selectedCategory?.title}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{selectedCategory?.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openShareModal}
                disabled={!selectedCategory || selectedCategory.items.length === 0}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-zinc-800"
                title={t.shareCategoryLabel}
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => selectedCategory && startEditCategory(selectedCategory)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-zinc-800"
                title={t.editCategoryLabel}
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleDeleteCategory}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title={t.deleteCategoryLabel}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 md:gap-4">
            {selectedCategory?.items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.05, duration: 0.3 }}
                whileHover={{ scale: 1.02, y: -3 }}
                whileTap={{ scale: 0.98 }}
                data-card
                onClick={() => setActiveCardId(item.id)}
                className="min-h-[136px] md:min-h-[164px] bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 md:p-5 flex flex-col justify-between group hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                <div>
                  <div className="flex justify-between items-start mb-2 md:mb-3">
                    <div className="w-9 h-9 md:w-12 md:h-12 rounded-lg bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 flex items-center justify-center overflow-hidden p-1.5 md:p-2 flex-shrink-0">
                      <SiteFavicon item={item} />
                    </div>
                    <div className={`flex gap-0.5 transition-opacity ${activeCardId === item.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(t.deleteItemConfirm(item.name))) {
                            handleDeleteItem(item.id);
                          }
                        }}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md transition-colors text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-sm md:text-lg font-semibold mb-1 truncate text-gray-900 dark:text-gray-100" title={item.name}>{item.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm leading-relaxed mb-2 md:mb-4 line-clamp-2" title={item.description}>{item.description}</p>
                </div>
                <div className="flex items-center justify-between mt-1 md:mt-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded uppercase tracking-wide truncate max-w-[70%]" title={new URL(item.url).hostname}>
                    {new URL(item.url).hostname}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const textarea = document.createElement('textarea');
                      textarea.value = item.url;
                      textarea.style.position = 'fixed';
                      textarea.style.opacity = '0';
                      document.body.appendChild(textarea);
                      textarea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textarea);
                      finishToast(t.toastCopied);
                    }}
                    className="hover:bg-gray-100 dark:hover:bg-zinc-700 p-1 rounded transition-colors flex-shrink-0"
                    title={t.copyLink}
                  >
                    <Copy className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Add New Link Placeholder — always visible */}
            <button
              onClick={startAddNew}
              className="col-span-2 min-h-[136px] border-2 border-dashed border-gray-300 p-4 text-gray-600 transition-all hover:border-gray-400 hover:bg-white dark:border-zinc-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:bg-zinc-800 lg:col-span-3 md:min-h-[164px] rounded-xl flex flex-col items-center justify-center group"
            >
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center mb-2 group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
                <Plus className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="font-semibold text-sm md:text-base">{t.addNewSite}</span>
              <span className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1 hidden sm:block">{t.configureHint}</span>
            </button>
          </div>

          {/* Edit Category Form */}


        </motion.section>
      </div>
    </main>

    {/* Create Category Modal */}
    {isCreatingCategory && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={cancelCreateCategory}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center gap-2 mb-6">
            <Plus className="w-5 h-5 text-gray-900 dark:text-gray-100" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.createNewCategory}</h2>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateCategory(); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-1 tracking-wide">{t.categoryId}</label>
                <input
                  className="w-full bg-gray-100 dark:bg-zinc-700 border-none rounded-lg p-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-gray-300 dark:focus:ring-zinc-600 transition-all"
                  type="text"
                  value={categoryFormData.id}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, id: e.target.value })}
                  placeholder={t.categoryIdPlaceholder}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-1 tracking-wide">{t.categoryTitle}</label>
                <input
                  className="w-full bg-gray-100 dark:bg-zinc-700 border-none rounded-lg p-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-gray-300 dark:focus:ring-zinc-600 transition-all"
                  type="text"
                  value={categoryFormData.title}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, title: e.target.value })}
                  placeholder={t.categoryTitlePlaceholder}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-1 tracking-wide">{t.description}</label>
              <textarea
                className="w-full bg-gray-100 dark:bg-zinc-700 border-none rounded-lg p-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-gray-300 dark:focus:ring-zinc-600 transition-all"
                rows={2}
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                placeholder={t.descriptionPlaceholder}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={cancelCreateCategory}
                className="px-6 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {t.cancel}
              </button>
              <button
                type="submit"
                className={`px-6 py-2 text-sm font-medium flex items-center gap-2 ${primaryButtonClass}`}
              >
                <Save className="w-4 h-4" />
                {t.createCategory}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    )}

    {/* Edit Category Modal */}
    {editingCategory && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={cancelEditCategory}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-gray-900 dark:text-gray-100" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.editCategoryTitle}</h2>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleUpdateCategory(); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-1 tracking-wide">{t.categoryId}</label>
                <input
                  className="w-full bg-gray-200 dark:bg-zinc-700 border-none rounded-lg p-3 text-base text-gray-500 dark:text-gray-500 cursor-not-allowed"
                  type="text"
                  value={categoryFormData.id}
                  disabled
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-1 tracking-wide">{t.categoryTitle}</label>
                <input
                  className="w-full bg-gray-100 dark:bg-zinc-700 border-none rounded-lg p-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-gray-300 dark:focus:ring-zinc-600 transition-all"
                  type="text"
                  value={categoryFormData.title}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, title: e.target.value })}
                  placeholder={t.categoryTitlePlaceholder}
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-1 tracking-wide">{t.description}</label>
              <textarea
                className="w-full bg-gray-100 dark:bg-zinc-700 border-none rounded-lg p-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-gray-300 dark:focus:ring-zinc-600 transition-all"
                rows={2}
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                placeholder={t.descriptionPlaceholder}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={cancelEditCategory}
                className="px-6 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {t.cancel}
              </button>
              <button
                type="submit"
                className={`px-6 py-2 text-sm font-medium flex items-center gap-2 ${primaryButtonClass}`}
              >
                <Save className="w-4 h-4" />
                {t.saveChanges}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    )}

    {/* Add / Edit Site Modal */}
    {(isAddingNew || editingItem) && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={cancelEdit}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center gap-2 mb-6">
            {editingItem ? <Edit2 className="w-5 h-5 text-gray-900 dark:text-gray-100" /> : <Plus className="w-5 h-5 text-gray-900 dark:text-gray-100" />}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{editingItem ? t.editSite : t.addNewSite}</h2>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); editingItem ? handleEditItem() : handleAddItem(); }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-1 tracking-wide">{t.siteTitle}</label>
                <input
                  className="w-full bg-gray-100 dark:bg-zinc-700 border-none rounded-lg p-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-gray-300 dark:focus:ring-zinc-600 transition-all"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t.siteTitlePlaceholder}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-1 tracking-wide">{t.destinationUrl}</label>
                <input
                  className="w-full bg-gray-100 dark:bg-zinc-700 border-none rounded-lg p-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-gray-300 dark:focus:ring-zinc-600 transition-all"
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-1 tracking-wide">{t.category}</label>
              <CategorySelect
                categories={categories}
                value={formData.categoryId || selectedCategoryId}
                onChange={(categoryId) => setFormData({ ...formData, categoryId })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase px-1 tracking-wide">{t.description}</label>
              <textarea
                className="w-full bg-gray-100 dark:bg-zinc-700 border-none rounded-lg p-3 text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-gray-300 dark:focus:ring-zinc-600 transition-all"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t.descriptionSitePlaceholder}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-6 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {t.cancel}
              </button>
              <button
                type="submit"
                className={`px-6 py-2 text-sm font-medium flex items-center gap-2 ${primaryButtonClass}`}
              >
                <Save className="w-4 h-4" />
                {editingItem ? t.saveChanges : t.addSite}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    )}

    {/* Share Category Modal */}
    {isSharingCategory && selectedCategory && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => { void closeShareModal(); }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="mb-6 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-gray-900 dark:text-gray-100" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.shareCategory}</h2>
          </div>

          {!shareResult && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {selectedCategory.items.map((item) => {
                const selected = shareSelectedIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setShareSelectedIds((current) => toggleSetValue(current, item.id))}
                    className={`flex min-h-[88px] items-center gap-3 rounded-lg border py-3 pl-3 pr-3.5 text-left transition ${
                      selected
                        ? 'border-gray-900 bg-gray-50 shadow-sm dark:border-zinc-200 dark:bg-zinc-700'
                        : 'border-gray-200 bg-white hover:border-gray-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-500'
                    }`}
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white p-2 dark:border-zinc-600 dark:bg-zinc-700">
                      <SiteFavicon item={item} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{item.name}</p>
                      <p className="truncate text-xs tracking-wide text-gray-500 dark:text-gray-400">{item.description || hostnameFor(item.url)}</p>
                    </div>
                    <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                      selected ? 'border-gray-900 bg-gray-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950' : 'border-gray-300 dark:border-zinc-500'
                    }`}>
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {shareResult && (
            <div className="mt-5 rounded-lg bg-gray-100 p-4 dark:bg-zinc-700">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t.shareCode}</p>
                  <p className="mt-1 font-mono text-2xl font-semibold tracking-widest text-gray-900 dark:text-gray-100">{shareResult.code}</p>
                </div>
                <ShareAuthor name={shareResult.sharerName} avatarUrl={shareResult.sharerAvatarUrl} />
              </div>
              <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Clock3 className="h-3.5 w-3.5" />
                {t.shareExpires}: {new Date(shareResult.expiresAt).toLocaleString()}
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => { void closeShareModal(); }}
              className="px-5 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={shareResult ? handleCopyShareCode : handleCreateShareCode}
              disabled={!shareResult && (shareSelectedIds.size === 0 || isGeneratingShare)}
              className={`px-5 py-2 text-sm font-medium flex items-center gap-2 ${primaryButtonClass}`}
            >
              {shareResult ? <Copy className="w-4 h-4" /> : isGeneratingShare ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {shareResult ? t.copyLink : shareSelectedIds.size === 0 ? t.selectAtLeastOne : t.generateCode}
            </button>
          </div>
        </motion.div>
      </div>
    )}

    {/* Import Shared Links Modal */}
    {isImportingShare && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsImportingShare(false)}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-gray-900 dark:text-gray-100" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.importShare}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsImportingShare(false)}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-zinc-700 dark:hover:text-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!loadedShare && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={importCode}
                onChange={(e) => setImportCode(e.target.value.toUpperCase())}
                placeholder={t.shareCodePlaceholder}
                className="min-w-0 flex-1 rounded-lg bg-gray-100 px-3 py-2.5 text-base text-gray-900 outline-none ring-1 ring-transparent transition focus:ring-gray-300 dark:bg-zinc-700 dark:text-gray-100 dark:focus:ring-zinc-600"
              />
            </div>
          )}

          {loadedShare && (
            <div className="mt-5 space-y-5">
              <div className="flex items-start justify-between gap-4 rounded-lg bg-gray-100 p-4 dark:bg-zinc-700">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{loadedShare.categoryTitle}</p>
                  {loadedShare.categoryDescription && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{loadedShare.categoryDescription}</p>
                  )}
                </div>
                <ShareAuthor name={loadedShare.sharerName} avatarUrl={loadedShare.sharerAvatarUrl} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {loadedShare.links.map((item) => {
                  const selected = importSelectedIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setImportSelectedIds((current) => toggleSetValue(current, item.id))}
                      className={`flex min-h-[88px] items-center gap-3 rounded-lg border py-3 pl-3 pr-3.5 text-left transition ${
                        selected
                          ? 'border-gray-900 bg-gray-50 shadow-sm dark:border-zinc-200 dark:bg-zinc-700'
                          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-500'
                      }`}
                    >
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white p-2 dark:border-zinc-600 dark:bg-zinc-700">
                        <SiteFavicon item={item} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{item.name}</p>
                        <p className="truncate text-xs tracking-wide text-gray-500 dark:text-gray-400">{item.description || hostnameFor(item.url)}</p>
                      </div>
                      <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                        selected ? 'border-gray-900 bg-gray-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950' : 'border-gray-300 dark:border-zinc-500'
                      }`}>
                        {selected && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t.importTo}</p>
                <div className="flex items-center gap-5 border-b border-gray-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setImportTargetMode('existing')}
                    className={`pb-2 text-sm font-medium transition-colors ${
                      importTargetMode === 'existing'
                        ? 'border-b-2 border-gray-900 text-gray-900 dark:border-zinc-100 dark:text-gray-100'
                        : 'border-b-2 border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                    }`}
                  >
                    {t.existingCategory}
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportTargetMode('new')}
                    className={`pb-2 text-sm font-medium transition-colors ${
                      importTargetMode === 'new'
                        ? 'border-b-2 border-gray-900 text-gray-900 dark:border-zinc-100 dark:text-gray-100'
                        : 'border-b-2 border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                    }`}
                  >
                    {t.newCategory}
                  </button>
                </div>

                {importTargetMode === 'existing' && (
                  <div className="min-w-0 sm:max-w-sm">
                    <CategorySelect
                      categories={categories}
                      value={importCategoryId}
                      onChange={setImportCategoryId}
                    />
                  </div>
                )}

                {importTargetMode === 'new' && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t.categoryId}</span>
                      <input
                        value={importNewCategory.id}
                        onChange={(e) => setImportNewCategory({ ...importNewCategory, id: e.target.value })}
                        placeholder={t.categoryIdPlaceholder}
                        className="mt-1.5 w-full rounded-lg bg-gray-100 p-3 text-base text-gray-900 outline-none focus:ring-2 focus:ring-gray-300 dark:bg-zinc-700 dark:text-gray-100 dark:focus:ring-zinc-600"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t.categoryTitle}</span>
                      <input
                        value={importNewCategory.title}
                        onChange={(e) => setImportNewCategory({ ...importNewCategory, title: e.target.value })}
                        placeholder={t.categoryTitlePlaceholder}
                        className="mt-1.5 w-full rounded-lg bg-gray-100 p-3 text-base text-gray-900 outline-none focus:ring-2 focus:ring-gray-300 dark:bg-zinc-700 dark:text-gray-100 dark:focus:ring-zinc-600"
                      />
                    </label>
                    <label className="block md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t.description}</span>
                      <textarea
                        value={importNewCategory.description}
                        onChange={(e) => setImportNewCategory({ ...importNewCategory, description: e.target.value })}
                        placeholder={t.descriptionPlaceholder}
                        rows={2}
                        className="mt-1.5 w-full rounded-lg bg-gray-100 p-3 text-base text-gray-900 outline-none focus:ring-2 focus:ring-gray-300 dark:bg-zinc-700 dark:text-gray-100 dark:focus:ring-zinc-600"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsImportingShare(false)}
              className="px-5 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleImportPrimaryAction}
              disabled={!loadedShare ? !importCode.trim() : importSelectedIds.size === 0}
              className={`px-5 py-2 text-sm font-medium flex items-center gap-2 ${primaryButtonClass}`}
            >
              {loadedShare ? <Download className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
              {loadedShare ? t.importSelected : t.loadShareCode}
            </button>
          </div>
        </motion.div>
      </div>
    )}

    {/* Operation status toast */}
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 pointer-events-none ${
      toast === null ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
    } ${
      toast?.status === 'error'
        ? 'bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-300'
        : toast?.status === 'done'
        ? 'bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-green-600 dark:text-green-400'
        : 'bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-gray-400'
    }`}>
      {toast?.status === 'saving' ? (
        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      <span>{toast?.msg ?? ''}</span>
    </div>

    {/* 页脚 */}
    <footer className="bg-gray-100 dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800 mt-auto transition-colors duration-200">
      <div className="max-w-[1200px] mx-auto px-8 py-12 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
        <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-widest">{t.footer}</p>
        <div className="flex items-center gap-8">
          <a href="#" className="text-xs text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors uppercase tracking-widest">{t.privacy}</a>
          <a href="#" className="text-xs text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors uppercase tracking-widest">{t.terms}</a>
          <a href="#" className="text-xs text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors uppercase tracking-widest">{t.docs}</a>
          <a href="#" className="text-xs text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors uppercase tracking-widest">{t.help}</a>
        </div>
      </div>
    </footer>
  </>
  );
}
