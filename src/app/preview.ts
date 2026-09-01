import { createContext } from 'react';
import type { Category } from './hooks/useCategories';

export const PREVIEW_LANGUAGE_KEY = 'dash-preview-language';
export const PREVIEW_THEME_KEY = 'dash-preview-theme';
export const PREVIEW_WALLPAPER_KEY = 'dash-preview-wallpaper';
export const PREVIEW_OPACITY_KEY = 'dash-preview-card-opacity';
export const PREVIEW_WALLPAPER_ID = 'free-forest';
export const PREVIEW_CARD_OPACITY = 0.35;

const item = (id: string, name: string, url: string, description: string, icon = 'link') => ({
  id,
  name,
  url,
  description,
  icon,
  faviconUrl: `https://icons.duckduckgo.com/ip3/${new URL(url).hostname}.ico`,
});

export const PREVIEW_CATEGORIES: Category[] = [
  {
    id: 'preview-ai', title: 'AI 工具', description: '常用 AI 助手与内容创作工具。', order: 0,
    items: [
      item('preview-chatgpt', 'ChatGPT', 'https://chatgpt.com', '写作、编程与灵感整理。', 'robot_2'),
      item('preview-doubao', '豆包', 'https://www.doubao.com', '字节跳动推出的 AI 助手。', 'psychology'),
      item('preview-deepseek', 'DeepSeek', 'https://chat.deepseek.com', '深度求索 AI 助手。', 'psychology'),
      item('preview-claude', 'Claude', 'https://claude.ai', 'Anthropic 推出的 AI 助手。', 'robot_2'),
    ],
  },
  {
    id: 'preview-design', title: '设计灵感', description: '设计协作、素材与灵感社区。', order: 1,
    items: [
      item('preview-figma', 'Figma', 'https://www.figma.com', '在线界面设计与协作。', 'palette'),
      item('preview-canva', 'Canva', 'https://www.canva.com', '在线平面设计与模板工具。', 'palette'),
      item('preview-zcool', '站酷', 'https://www.zcool.com.cn', '中文设计创意社区。', 'style'),
      item('preview-unsplash', 'Unsplash', 'https://unsplash.com', '高质量免费图片素材。', 'camera'),
    ],
  },
  {
    id: 'preview-productivity', title: '效率办公', description: '笔记、开发、云盘与团队协作。', order: 2,
    items: [
      item('preview-notion', 'Notion', 'https://www.notion.so', '笔记、知识库与项目管理。', 'bookmark'),
      item('preview-github', 'GitHub', 'https://github.com', '代码托管与协作平台。', 'code'),
      item('preview-baidu-drive', '百度网盘', 'https://pan.baidu.com', '文件存储与分享。', 'cloud'),
      item('preview-feishu', '飞书', 'https://www.feishu.cn', '团队沟通与协同办公。', 'message'),
    ],
  },
  {
    id: 'preview-content', title: '内容社区', description: '社区、问答与视频内容平台。', order: 3,
    items: [
      item('preview-xiaohongshu', '小红书', 'https://www.xiaohongshu.com', '生活方式与内容社区。', 'style'),
      item('preview-zhihu', '知乎', 'https://www.zhihu.com', '中文问答与知识社区。', 'quiz'),
      item('preview-bilibili', '哔哩哔哩', 'https://www.bilibili.com', '视频、番剧与创作社区。', 'movie'),
      item('preview-youtube', 'YouTube', 'https://www.youtube.com', '全球视频分享平台。', 'video'),
      item('preview-reddit', 'Reddit', 'https://www.reddit.com', '兴趣主题讨论社区。', 'message'),
    ],
  },
  {
    id: 'preview-email', title: '常用邮箱', description: '常用邮箱服务入口。', order: 4,
    items: [
      item('preview-qq-mail', 'QQ 邮箱', 'https://mail.qq.com', '腾讯 QQ 邮箱。', 'mail'),
      item('preview-163-mail', '163 邮箱', 'https://mail.163.com', '网易 163 邮箱。', 'mail'),
      item('preview-gmail', 'Gmail', 'https://mail.google.com', 'Google 邮箱服务。', 'mail'),
    ],
  },
];

export type PreviewLoginAction = 'save' | 'membership' | 'account' | 'import';

export const PreviewContext = createContext<{
  isPreview: boolean;
  requestLogin: (action?: PreviewLoginAction) => void;
}>({ isPreview: false, requestLogin: () => {} });
