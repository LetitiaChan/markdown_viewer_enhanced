/**
 * Markdown Viewer Enhanced - Background Service Worker
 * 负责：插件生命周期管理、消息通信、设置存储
 */

// 默认设置
const DEFAULT_SETTINGS = {
  theme: 'light',           // 主题：light / dark / auto
  codeTheme: 'default-light-modern',  // 代码高亮主题
  fontSize: 16,             // 字体大小
  lineHeight: 1.6,          // 行高
  showToc: true,            // 显示目录
  tocPosition: 'right',     // 目录位置：left / right
  enableMermaid: true,      // 启用 Mermaid 图表渲染
  enableMathJax: true,      // 启用数学公式渲染
  autoDetect: true,         // 自动检测 Markdown 文件
  maxWidth: 1000,           // 内容最大宽度(px)
  fontFamily: 'system',     // 字体：system / serif / mono
  showLineNumbers: false,   // 代码块显示行号
};

// 插件安装时初始化设置
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({ settings: DEFAULT_SETTINGS }, () => {
      console.log('[MD Viewer] 插件已安装，默认设置已保存');
    });
  } else if (details.reason === 'update') {
    // 更新时合并新设置项（保留用户已有设置）
    chrome.storage.sync.get('settings', (data) => {
      const currentSettings = data.settings || {};
      const mergedSettings = { ...DEFAULT_SETTINGS, ...currentSettings };
      chrome.storage.sync.set({ settings: mergedSettings }, () => {
        console.log('[MD Viewer] 插件已更新，设置已合并');
      });
    });
  }
});

// Markdown 文件扩展名匹配
const MD_EXTENSIONS = /\.(md|mdc|markdown|mkd|mdown|mdtxt|mdtext)(\?.*)?$/i;

/**
 * 检测 URL 是否为 Markdown 文件
 */
function isMarkdownUrl(url) {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return MD_EXTENSIONS.test(pathname);
  } catch {
    return MD_EXTENSIONS.test(url);
  }
}

/**
 * 检测内容类型是否为纯文本（可能是 Markdown）
 */
function isTextContentType(contentType) {
  if (!contentType) return false;
  return contentType.includes('text/plain') ||
         contentType.includes('text/markdown') ||
         contentType.includes('text/x-markdown');
}

// 监听标签页更新，动态更新图标状态
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (isMarkdownUrl(tab.url)) {
      // 设置图标为激活状态
      chrome.action.setIcon({
        tabId: tabId,
        path: {
          16: 'icons/icon16.png',
          48: 'icons/icon48.png',
          128: 'icons/icon128.png'
        }
      });
      chrome.action.setBadgeText({ tabId: tabId, text: 'MD' });
      chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: '#4CAF50' });
    } else {
      chrome.action.setBadgeText({ tabId: tabId, text: '' });
    }
  }
});

// 监听来自 content script 和 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_SETTINGS':
      chrome.storage.sync.get('settings', (data) => {
        sendResponse({ settings: data.settings || DEFAULT_SETTINGS });
      });
      return true; // 异步响应

    case 'SAVE_SETTINGS':
      chrome.storage.sync.set({ settings: message.settings }, () => {
        // 通知所有标签页更新设置
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            chrome.tabs.sendMessage(tab.id, {
              type: 'SETTINGS_UPDATED',
              settings: message.settings
            }).catch(() => {
              // 忽略无法通信的标签页
            });
          });
        });
        sendResponse({ success: true });
      });
      return true;

    case 'IS_MARKDOWN':
      sendResponse({ isMarkdown: isMarkdownUrl(message.url) });
      return false;

    case 'GET_DEFAULT_SETTINGS':
      sendResponse({ settings: DEFAULT_SETTINGS });
      return false;

    case 'RESET_SETTINGS':
      chrome.storage.sync.set({ settings: DEFAULT_SETTINGS }, () => {
        sendResponse({ settings: DEFAULT_SETTINGS });
      });
      return true;

    default:
      return false;
  }
});

console.log('[MD Viewer Enhanced] Background service worker 已启动');
