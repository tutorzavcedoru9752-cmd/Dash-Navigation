import { useState, useEffect, useContext, useRef } from 'react';
import { BookOpen, Sparkles, PlayCircle, Plus, Edit2, Trash2, Copy, Save, X, ChevronUp, ChevronDown, Settings, Library, GraduationCap, Microscope, BrainCircuit, Rocket, MessageSquare, Bookmark, Video, Link, Code, Terminal, Cloud, Database, Globe, Palette, Music, Camera, Gamepad2, UtensilsCrossed, Coffee, ShoppingCart, Plane, Car, Dumbbell, RefreshCw, Languages, Sun, Moon, Mail } from 'lucide-react';
import { fetchFaviconData, useCategories, type LinkItem } from '../hooks/useCategories';
import { motion } from 'motion/react';
import { LangContext, ThemeContext } from '../App';

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
    privacy: '隐私政策',
    terms: '服务条款',
    docs: '文档',
    help: '帮助中心',
    footer: '© 2024 导航门户。保留所有权利。',
  },
} as const;

const categoryIconMap: Record<string, React.ReactNode> = {
  'Email': <Mail className="w-5 h-5" />,
  '邮件': <Mail className="w-5 h-5" />,
  'Learning': <GraduationCap className="w-5 h-5" />,
  'AI Assistant': <BrainCircuit className="w-5 h-5" />,
  'Entertainment': <Video className="w-5 h-5" />,
  'Tools': <Settings className="w-5 h-5" />,
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

export default function Categories() {
  const { lang, setLang } = useContext(LangContext);
  const { isDark, toggleDark } = useContext(ThemeContext);
  const t = ui[lang];
  const { categories, loading, addItem, updateItem, deleteItem, deleteCategory, createCategory, migrateFavicons } = useCategories();

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [editingItem, setEditingItem] = useState<{ id: string; name: string; url: string; description: string } | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; title: string; description: string } | null>(null);
  const [formData, setFormData] = useState({ name: '', url: '', description: '' });
  const [categoryFormData, setCategoryFormData] = useState({ id: '', title: '', description: '' });
  const [isRefreshingFavicons, setIsRefreshingFavicons] = useState(false);
  const [toast, setToast] = useState<{ status: 'saving' | 'done'; msg: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const startToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ status: 'saving', msg });
  };
  const finishToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ status: 'done', msg });
    toastTimer.current = setTimeout(() => setToast(null), 1500);
  };

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

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
    if (!formData.name || !formData.url || !selectedCategory) return;
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
    await addItem(selectedCategoryId, {
      name: formData.name,
      url: formData.url,
      description: formData.description,
      icon: randomIcon,
      faviconUrl,
    });
    setFormData({ name: '', url: '', description: '' });
    setIsAddingNew(false);
    finishToast(t.toastAdded);
  };

  const handleEditItem = async () => {
    if (!editingItem || !formData.name || !formData.url) return;
    startToast(t.toastSaving);
    const faviconUrl = await fetchFaviconData(formData.url);
    await updateItem(selectedCategoryId, editingItem.id, {
      name: formData.name,
      url: formData.url,
      description: formData.description,
      faviconUrl,
    });
    setEditingItem(null);
    setFormData({ name: '', url: '', description: '' });
    finishToast(t.toastUpdated);
  };

  const handleDeleteItem = async (itemId: string) => {
    startToast(t.toastSaving);
    await deleteItem(selectedCategoryId, itemId);
    finishToast(t.toastDeleted);
  };

  const handleDeleteCategory = async () => {
    if (confirm(t.deleteCategoryConfirm(selectedCategory?.title ?? ''))) {
      startToast(t.toastSaving);
      await deleteCategory(selectedCategoryId);
      const remainingCategories = categories.filter(c => c.id !== selectedCategoryId);
      if (remainingCategories.length > 0) {
        setSelectedCategoryId(remainingCategories[0].id);
      }
      finishToast(t.toastDeleted);
    }
  };

  const startEdit = (item: LinkItem) => {
    setEditingItem(item);
    setFormData({ name: item.name, url: item.url, description: item.description });
    setIsAddingNew(false);
  };

  const startAddNew = () => {
    setIsAddingNew(true);
    setEditingItem(null);
    setFormData({ name: '', url: '', description: '' });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setIsAddingNew(false);
    setFormData({ name: '', url: '', description: '' });
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
      finishToast(t.toastCreated);
    } else {
      finishToast(t.toastUpdated);
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
          <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-5 shadow-sm flex flex-col max-h-[50vh] md:max-h-none overflow-hidden transition-colors duration-200">
            <div className="flex items-center justify-between mb-4 px-2 flex-shrink-0">
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
            <ul className="space-y-1 overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 scrollbar-thin">
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
            <hr className="my-4 border-gray-200 dark:border-zinc-700 flex-shrink-0" />
            <button
              onClick={() => setIsCreatingCategory(true)}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 border-2 border-dashed border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>{t.createCategory}</span>
            </button>
            <button
              onClick={handleRefreshFavicons}
              disabled={isRefreshingFavicons}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 mt-2 bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh all website icons"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshingFavicons ? 'animate-spin' : ''}`} />
              <span>{isRefreshingFavicons ? t.refreshing : t.refreshIcons}</span>
            </button>
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
                onClick={() => selectedCategory && startEditCategory(selectedCategory)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-3 md:p-5 flex flex-col justify-between group hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                <div>
                  <div className="flex justify-between items-start mb-2 md:mb-3">
                    <div className="w-9 h-9 md:w-12 md:h-12 rounded-lg bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 flex items-center justify-center overflow-hidden p-1.5 md:p-2 flex-shrink-0">
                      {item.faviconUrl ? (
                        <img src={item.faviconUrl} alt={`${item.name} favicon`} className="w-full h-full object-contain" />
                      ) : (
                        itemIconMap[item.icon] || <BookOpen className="w-5 h-5 text-gray-700" />
                      )}
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
              className="col-span-2 lg:col-span-3 border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-xl p-5 md:p-8 flex flex-col items-center justify-center text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-white dark:hover:bg-zinc-800 transition-all group"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center mb-2 md:mb-3 group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
                <Plus className="w-5 h-5 md:w-7 md:h-7" />
              </div>
              <span className="font-semibold text-sm md:text-lg">{t.addNewSite}</span>
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
              <label className="text-xs font-semibold text-gray-500 uppercase px-1 tracking-wide">{t.description}</label>
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
                className="px-6 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:opacity-90 transition-opacity flex items-center gap-2"
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
              <label className="text-xs font-semibold text-gray-500 uppercase px-1 tracking-wide">{t.description}</label>
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
                className="px-6 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:opacity-90 transition-opacity flex items-center gap-2"
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
              <label className="text-xs font-semibold text-gray-500 uppercase px-1 tracking-wide">{t.description}</label>
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
                className="px-6 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingItem ? t.saveChanges : t.addSite}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    )}

    {/* Operation status toast */}
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 pointer-events-none ${
      toast === null ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
    } ${
      toast?.status === 'done'
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
