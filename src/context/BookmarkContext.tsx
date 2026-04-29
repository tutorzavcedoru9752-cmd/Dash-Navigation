import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Bookmark {
  id: string;
  name: string;
  url: string;
  desc: string;
  iconName?: string;
}

export interface Category {
  id: string;
  title: string;
  iconName: string;
  items: Bookmark[];
}

const defaultCategories: Category[] = [
  {
    id: 'learning',
    title: 'Learning',
    iconName: 'Book',
    items: [
      { id: '1', name: '知网', desc: 'Academic Repository', url: 'https://www.cnki.net', iconName: 'Book' },
      { id: '2', name: 'Google Scholar', desc: 'Research Search', url: 'https://scholar.google.com', iconName: 'GraduationCap' },
      { id: '3', name: 'ResearchGate', desc: 'Scientific Network', url: 'https://www.researchgate.net', iconName: 'Microscope' }
    ]
  },
  {
    id: 'ai',
    title: 'AI Assistant',
    iconName: 'Sparkles',
    items: [
      { id: '4', name: 'DeepSeek', desc: 'Deep Learning Model', url: 'https://www.deepseek.com', iconName: 'BrainCircuit' },
      { id: '5', name: 'Gemini', desc: 'Multimodal AI', url: 'https://gemini.google.com', iconName: 'Sparkles' },
      { id: '6', name: 'ChatGPT', desc: 'OpenAI Assistant', url: 'https://chat.openai.com', iconName: 'Bot' }
    ]
  },
  {
    id: 'entertainment',
    title: 'Entertainment',
    iconName: 'Film',
    items: [
      { id: '7', name: '知乎', desc: 'Q&A Community', url: 'https://www.zhihu.com', iconName: 'MessageCircleQuestion' },
      { id: '8', name: '小红书', desc: 'Lifestyle Sharing', url: 'https://www.xiaohongshu.com', iconName: 'Images' },
      { id: '9', name: 'Bilibili', desc: 'Video Content', url: 'https://www.bilibili.com', iconName: 'Film' }
    ]
  },
  {
    id: 'productivity',
    title: 'Productivity',
    iconName: 'Briefcase',
    items: []
  }
];

interface BookmarkContextType {
  categories: Category[];
  addBookmark: (categoryId: string, bookmark: Omit<Bookmark, 'id'>) => void;
  removeBookmark: (categoryId: string, bookmarkId: string) => void;
  updateBookmark: (categoryId: string, bookmarkId: string, data: Partial<Bookmark>) => void;
  addCategory: (title: string, iconName?: string) => void;
  addMultipleBookmarks: (categoryId: string, bookmarks: Omit<Bookmark, 'id'>[]) => void;
  removeCategory: (id: string) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  reorderCategories: (startIndex: number, endIndex: number) => void;
  userIp: string | null;
  isLoading: boolean;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

export function BookmarkProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [userIp, setUserIp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Sync state to backend
  const syncToBackend = async (newCategories: Category[]) => {
    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: newCategories })
      });
    } catch (e) {
      console.error("Failed to sync to backend:", e);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
           throw new Error(`Failed to fetch JSON: status ${res.status}`);
        }
        
        const data = await res.json();
        
        if (data.ip) setUserIp(data.ip);
        
        if (data.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
        } else {
          // Check local storage fallback if backend has no data yet
          const saved = localStorage.getItem('dash_categories');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              setCategories(parsed);
              // Optimistically sync stored categories to their IP on first connection
              if (!data.error) syncToBackend(parsed);
            } catch (e) {
              setCategories(defaultCategories);
            }
          } else {
            setCategories(defaultCategories);
          }
        }
      } catch (err) {
        console.error("Failed to fetch initial categories:", err);
        // Fallback to local storage
        const saved = localStorage.getItem('dash_categories');
        if (saved) {
          try {
            setCategories(JSON.parse(saved));
          } catch (e) {}
        }
      } finally {
        setIsLoading(false);
        setHasInitialized(true);
      }
    };
    
    fetchCategories();
  }, []);

  // Update backend and local storage whenever categories change
  useEffect(() => {
    if (hasInitialized) {
      localStorage.setItem('dash_categories', JSON.stringify(categories));
      syncToBackend(categories);
    }
  }, [categories, hasInitialized]);

  const addBookmark = (categoryId: string, bookmark: Omit<Bookmark, 'id'>) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return { ...cat, items: [...cat.items, { ...bookmark, id: crypto.randomUUID() }] };
      }
      return cat;
    }));
  };

  const addMultipleBookmarks = (categoryId: string, bookmarks: Omit<Bookmark, 'id'>[]) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return { 
          ...cat, 
          items: [
            ...cat.items, 
            ...bookmarks.map(b => ({ ...b, id: crypto.randomUUID() }))
          ] 
        };
      }
      return cat;
    }));
  };

  const removeBookmark = (categoryId: string, bookmarkId: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return { ...cat, items: cat.items.filter(item => item.id !== bookmarkId) };
      }
      return cat;
    }));
  };

  const updateBookmark = (categoryId: string, bookmarkId: string, data: Partial<Bookmark>) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id === categoryId) {
        return { 
          ...cat, 
          items: cat.items.map(item => item.id === bookmarkId ? { ...item, ...data } : item) 
        };
      }
      return cat;
    }));
  };

  const addCategory = (title: string, iconName: string = 'Folder') => {
    setCategories(prev => [...prev, { id: crypto.randomUUID(), title, iconName, items: [] }]);
  };

  const removeCategory = (id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
  };

  const updateCategory = (id: string, data: Partial<Category>) => {
    setCategories(prev => prev.map(cat => cat.id === id ? { ...cat, ...data } : cat));
  };

  const reorderCategories = (startIndex: number, endIndex: number) => {
    setCategories(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  return (
    <BookmarkContext.Provider value={{
      categories,
      addBookmark,
      removeBookmark,
      updateBookmark,
      addCategory,
      addMultipleBookmarks,
      removeCategory,
      updateCategory,
      reorderCategories,
      userIp,
      isLoading
    }}>
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarkContext);
  if (context === undefined) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
}
