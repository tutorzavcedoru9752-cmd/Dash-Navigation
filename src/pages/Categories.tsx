import { Plus, Edit, Trash2, Edit3, Link as LinkIcon, Download, ChevronUp, ChevronDown, Laptop, Copy, Check, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import React, { useState, useRef } from 'react';
import { useBookmarks } from '../context/BookmarkContext';
import { IconResolver } from '../components/IconResolver';
import { getFaviconUrl } from '../utils/getFavicon';
import { parseBookmarkFile, ParsedCategory } from '../utils/bookmarkParser';

export function Categories() {
  const { 
    categories, 
    removeBookmark, 
    addMultipleBookmarks, 
    addBookmark, 
    updateBookmark, 
    addCategory, 
    updateCategory, 
    removeCategory, 
    reorderCategories, 
    deviceId,
    switchDeviceId,
    resetDeviceId,
    isLoading 
  } = useBookmarks();
  const [activeTab, setActiveTab] = useState(categories[0]?.id || '');
  const activeCategory = categories.find(c => c.id === activeTab) || categories[0];

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<ParsedCategory[] | null>(null);
  const [targetCategory, setTargetCategory] = useState<string>(categories[0]?.id || '');
  const [importError, setImportError] = useState<string | null>(null);

  // Device Sync modal state
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [targetSyncId, setTargetSyncId] = useState('');
  const [copied, setCopied] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Edit / Add Bookmark state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentBookmark, setCurrentBookmark] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', url: '', desc: '' });

  // Edit / Add Category state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<any>(null);
  const [categoryForm, setCategoryForm] = useState({ title: '', iconName: 'Folder' });

  // Reset active tab if it's missing (e.g. after loading)
  if (!activeCategory && categories.length > 0) {
    setActiveTab(categories[0].id);
  }

  if (isLoading) {
    return (
      <main className="w-full max-w-container-max-width mx-auto px-6 py-section-gap flex-grow flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-on-surface-variant text-sm font-medium">Loading your categories...</p>
        </div>
      </main>
    );
  }

  const handleEditCategory = (category: any) => {
    setCurrentCategory(category);
    setCategoryForm({ title: category.title, iconName: category.iconName || 'Folder' });
    setIsCategoryModalOpen(true);
  };

  const handleCreateCategory = () => {
    setCurrentCategory(null);
    setCategoryForm({ title: '', iconName: 'Folder' });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentCategory) {
      updateCategory(currentCategory.id, categoryForm);
    } else {
      addCategory(categoryForm.title, categoryForm.iconName);
    }
    setIsCategoryModalOpen(false);
  };

  // Delete Category state
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const confirmDeleteCategory = () => {
    if (categoryToDelete) {
      removeCategory(categoryToDelete);
      if (activeTab === categoryToDelete) {
        const nextCat = categories.find(c => c.id !== categoryToDelete);
        setActiveTab(nextCat?.id || '');
      }
      setCategoryToDelete(null);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleEditClick = (bookmark: any) => {
    setCurrentBookmark(bookmark);
    setEditForm({ name: bookmark.name, url: bookmark.url, desc: bookmark.desc });
    setIsEditModalOpen(true);
  };

  const handleAddClick = () => {
    setCurrentBookmark(null);
    setEditForm({ name: '', url: '', desc: '' });
    setIsEditModalOpen(true);
  };

  const handleSaveBookmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentBookmark) {
      updateBookmark(activeCategory.id, currentBookmark.id, editForm);
    } else {
      addBookmark(activeCategory.id, editForm);
    }
    setIsEditModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const html = event.target?.result as string;
      const parsed = parseBookmarkFile(html);
      if (parsed.length > 0) {
        setImportData(parsed);
      } else {
        setImportError("No bookmarks found in file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  const confirmImport = () => {
    if (!importData || !targetCategory) return;
    // Flatten all items from parsed categories
    const allItems = importData.flatMap(cat => cat.items);
    addMultipleBookmarks(targetCategory, allItems);
    setImportData(null);
  };

  return (
    <main className="w-full max-w-container-max-width mx-auto px-6 py-section-gap flex-grow relative">
      <div className="flex flex-col md:flex-row gap-grid-gutter items-start">
        
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-card-padding shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
            <h2 className="text-h2 mb-4 px-2">Navigation</h2>
            <ul className="space-y-1">
              {categories.map((item, idx) => (
                <li key={item.id} className="group relative">
                  <button 
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors",
                      activeTab === item.id 
                        ? "bg-secondary-container text-on-secondary-fixed font-medium" 
                        : "hover:bg-surface-container-low text-on-surface-variant"
                    )}
                  >
                    <IconResolver name={item.iconName} className="w-5 h-5" />
                    <span className="text-label-sm truncate pr-6">{item.title}</span>
                  </button>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex flex-col -space-y-1 transition-opacity">
                     <button disabled={idx === 0} onClick={(e) => { e.stopPropagation(); reorderCategories(idx, idx - 1); }} className="text-on-surface-variant hover:text-primary disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                     <button disabled={idx === categories.length - 1} onClick={(e) => { e.stopPropagation(); reorderCategories(idx, idx + 1); }} className="text-on-surface-variant hover:text-primary disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
            <hr className="my-4 border-outline-variant/20" />
            <div className="space-y-2">
              <button 
                onClick={handleCreateCategory}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-dashed border-outline-variant text-on-surface-variant rounded-lg hover:bg-surface-container hover:border-outline transition-all active:scale-95 group"
              >
                <Plus className="w-4 h-4 group-hover:text-primary transition-colors" />
                <span className="text-label-sm group-hover:text-primary transition-colors">Create Category</span>
              </button>
              
              <button 
                onClick={handleImportClick}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-outline-variant/50 text-on-surface-variant rounded-lg hover:bg-surface-container hover:text-primary transition-all active:scale-95 group"
              >
                <Download className="w-4 h-4 group-hover:text-primary transition-colors" />
                <span className="text-label-sm group-hover:text-primary transition-colors">Import Bookmarks</span>
              </button>

              <button 
                onClick={() => {
                  setTargetSyncId('');
                  setSyncStatus(null);
                  setIsSyncModalOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-outline-variant/50 text-on-surface-variant rounded-lg hover:bg-surface-container hover:text-primary transition-all active:scale-95 group"
                title="跨 VPN / 多设备同步"
              >
                <Laptop className="w-4 h-4 group-hover:text-primary transition-colors" />
                <span className="text-label-sm group-hover:text-primary transition-colors">Device Sync / 设备同步</span>
              </button>

              <input 
                type="file" 
                accept=".html" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
              />
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <section className="flex-grow w-full">
          {activeCategory && (
            <>
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-h1 text-on-surface">{activeCategory.title}</h1>
                  <p className="text-on-surface-variant text-label-sm mt-1">{activeCategory.items.length} bookmarks</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                     onClick={() => handleEditCategory(activeCategory)}
                     className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors" 
                     title="Edit Category"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button 
                     onClick={() => setCategoryToDelete(activeCategory.id)}
                     className="p-2 text-error hover:bg-error-container/20 rounded-lg transition-colors" 
                     title="Delete Category"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Grid Layout for Links */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-grid-gutter">
                {activeCategory.items.map(item => (
                  <div key={item.id} className="card-hover bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-card-padding flex flex-col justify-between group">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm border border-outline-variant/30 flex items-center justify-center text-primary-container overflow-hidden">
                          <img 
                            src={getFaviconUrl(item.url)} 
                            alt="" 
                            className="w-6 h-6 object-contain" 
                            onError={(e) => { e.currentTarget.src = getFaviconUrl('https://example.com'); }}
                          />
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                          <button 
                            onClick={() => handleEditClick(item)}
                            className="p-1.5 hover:bg-surface-container-high rounded-md transition-colors text-on-surface-variant"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => removeBookmark(activeCategory.id, item.id)}
                            className="p-1.5 hover:bg-error-container text-error rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-h2 mb-1">{item.name}</h3>
                      <p className="text-on-surface-variant text-sm leading-relaxed mb-4 line-clamp-2">{item.desc}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] font-semibold text-outline bg-surface-container-low px-2 py-0.5 rounded uppercase tracking-wider truncate max-w-full">
                        {(() => {
                           try { return new URL(item.url).hostname; }
                           catch(e) { return item.url || 'UNKNOWN'; }
                        })()}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Add New Link Placeholder */}
                <button 
                  onClick={handleAddClick}
                  className="lg:col-span-2 border-2 border-dashed border-outline-variant/60 rounded-xl p-8 flex flex-col items-center justify-center text-on-surface-variant hover:border-primary-fixed-dim hover:bg-surface-container-lowest transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-3 group-hover:bg-primary-fixed group-hover:text-on-primary-fixed transition-colors">
                    <LinkIcon className="w-6 h-6" />
                  </div>
                  <span className="text-h2 group-hover:text-primary transition-colors">Add new site to {activeCategory.title}</span>
                  <span className="text-label-sm text-outline mt-1 font-normal">Configure title, description and URL</span>
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Import Modal */}
      {importData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl p-card-padding w-full max-w-md shadow-lg flex flex-col">
            <h2 className="text-h2 text-on-surface mb-2">Import Bookmarks</h2>
            <p className="text-body-md text-on-surface-variant mb-6">
              Found {importData.reduce((acc, cat) => acc + cat.items.length, 0)} bookmarks.
              Select a category to import them to:
            </p>
            
            <select 
              className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all mb-6"
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
            >
              <option value="" disabled>Select category...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setImportData(null)}
                className="px-6 py-2.5 rounded-lg text-label-sm text-on-surface hover:bg-surface-container transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={confirmImport}
                disabled={!targetCategory}
                className="px-6 py-2.5 rounded-lg text-label-sm bg-primary text-on-primary hover:opacity-90 disabled:opacity-50 transition-opacity font-medium active:scale-95 shadow-sm"
              >
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Bookmark Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl p-card-padding w-full max-w-lg shadow-lg flex flex-col">
            <h2 className="text-h2 text-on-surface mb-6">
              {currentBookmark ? 'Edit Bookmark' : 'Add Bookmark'}
            </h2>
            
            <form className="space-y-5" onSubmit={handleSaveBookmark}>
              <div className="grid grid-cols-1 gap-5">
                <div className="space-y-1.5">
                  <label className="text-label-xs text-outline uppercase tracking-wider px-1">Site Title</label>
                  <input 
                    type="text" 
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Google Scholar"
                    className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-label-xs text-outline uppercase tracking-wider px-1">Destination URL</label>
                  <input 
                    type="url" 
                    required
                    value={editForm.url}
                    onChange={(e) => setEditForm(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com"
                    className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-label-xs text-outline uppercase tracking-wider px-1">Description</label>
                <textarea 
                  rows={2}
                  value={editForm.desc}
                  onChange={(e) => setEditForm(prev => ({ ...prev, desc: e.target.value }))}
                  placeholder="Optional description"
                  className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all resize-y min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2.5 rounded-lg text-label-sm text-on-surface hover:bg-surface-container transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 rounded-lg text-label-sm bg-primary text-on-primary hover:opacity-90 transition-opacity font-medium active:scale-95 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit/Add Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl p-card-padding w-full max-w-sm shadow-lg flex flex-col">
            <h2 className="text-h2 text-on-surface mb-6">
              {currentCategory ? 'Edit Category' : 'Add Category'}
            </h2>
            
            <form className="space-y-5" onSubmit={handleSaveCategory}>
              <div className="space-y-1.5">
                <label className="text-label-xs text-outline uppercase tracking-wider px-1">Category Title</label>
                <input 
                  type="text" 
                  required
                  value={categoryForm.title}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Work"
                  className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-label-xs text-outline uppercase tracking-wider px-1">Icon Name (Lucide)</label>
                <input 
                  type="text" 
                  value={categoryForm.iconName}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, iconName: e.target.value }))}
                  placeholder="Folder, Briefcase..."
                  className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-6 py-2.5 rounded-lg text-label-sm text-on-surface hover:bg-surface-container transition-colors font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 rounded-lg text-label-sm bg-primary text-on-primary hover:opacity-90 transition-opacity font-medium active:scale-95 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Import Error Modal */}
      {importError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl p-card-padding w-full max-w-sm shadow-lg flex flex-col">
            <h2 className="text-h2 text-on-surface mb-2">Import Error</h2>
            <p className="text-body-md text-on-surface-variant mb-6">
              {importError}
            </p>
            <div className="flex justify-end">
              <button 
                onClick={() => setImportError(null)}
                className="px-6 py-2.5 rounded-lg text-label-sm bg-primary text-on-primary hover:opacity-90 transition-opacity font-medium active:scale-95 shadow-sm"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl p-card-padding w-full max-w-sm shadow-lg flex flex-col">
            <h2 className="text-h2 text-on-surface mb-2">Delete Category</h2>
            <p className="text-body-md text-on-surface-variant mb-6">
              Are you sure you want to delete this category? All bookmarks inside will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setCategoryToDelete(null)}
                className="px-6 py-2.5 rounded-lg text-label-sm text-on-surface hover:bg-surface-container transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteCategory}
                className="px-6 py-2.5 rounded-lg text-label-sm bg-error text-on-error hover:opacity-90 transition-opacity font-medium active:scale-95 shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device Sync & ID Modal */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-surface border border-outline-variant rounded-2xl p-card-padding w-full max-w-md shadow-xl flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-primary" />
                <h2 className="text-h2 text-on-surface">设备识别与同步</h2>
              </div>
              <button 
                onClick={() => setIsSyncModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface text-sm p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-body-sm text-on-surface-variant mb-5 leading-relaxed">
              已启用<strong className="text-on-surface font-semibold">“设备专属 ID”</strong>机制。无论您切换任何 VPN 节点、更换家庭/公司 WiFi，均不会丢失自定义书签。
            </p>

            <div className="space-y-4">
              {/* Current Device ID */}
              <div className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-label-xs text-outline uppercase font-semibold tracking-wider">当前电脑/设备 ID</span>
                  <button 
                    onClick={() => {
                      if (confirm("确定要重置当前设备 ID 吗？这将为您生成全新独立的导航配置。")) {
                        resetDeviceId();
                        setSyncStatus("已生成全新设备 ID");
                      }
                    }}
                    className="text-label-xs text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors"
                    title="重置为全新设备 ID"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>重置 ID</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    readOnly
                    value={deviceId}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs font-mono text-on-surface select-all focus:outline-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(deviceId);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="px-3 py-2 bg-primary text-on-primary rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 hover:opacity-90 active:scale-95 transition-all shadow-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? '已复制' : '复制'}</span>
                  </button>
                </div>
              </div>

              {/* Cross-Device Sync */}
              <div className="bg-surface-container-low border border-outline-variant/50 rounded-xl p-3.5 space-y-2.5">
                <span className="text-label-xs text-outline uppercase font-semibold tracking-wider">多设备同步 / 导入已有 ID</span>
                <p className="text-xs text-on-surface-variant">
                  若需要在其他电脑或手机上同步当前分类与书签，请在下方填入目标设备 ID：
                </p>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={targetSyncId}
                    onChange={(e) => setTargetSyncId(e.target.value)}
                    placeholder="粘贴其他设备的 ID (UUID)"
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-xs font-mono text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button 
                    onClick={async () => {
                      if (!targetSyncId.trim()) return;
                      const ok = await switchDeviceId(targetSyncId.trim());
                      if (ok) {
                        setSyncStatus("同步成功！已载入对应设备书签数据。");
                      } else {
                        setSyncStatus("同步完成（已绑定该 ID）。");
                      }
                    }}
                    className="px-3.5 py-2 bg-surface-container-highest hover:bg-primary hover:text-on-primary text-on-surface rounded-lg text-xs font-medium shrink-0 transition-colors active:scale-95"
                  >
                    同步绑定
                  </button>
                </div>
                {syncStatus && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{syncStatus}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-5">
              <button 
                onClick={() => setIsSyncModalOpen(false)}
                className="px-6 py-2 rounded-lg text-label-sm bg-primary text-on-primary hover:opacity-90 font-medium active:scale-95 transition-all shadow-sm"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
