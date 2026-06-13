/**
 * Markdown Viewer Enhanced - Background Service Worker
 * 负责：插件生命周期管理、消息通信、设置存储
 */

// 默认设置
const DEFAULT_SETTINGS = {
  theme: 'light',           // 主题：light / dark / auto
  codeTheme: 'default-dark-modern',  // 代码高亮主题
fontSize: 18,             // 字体大小
  lineHeight: 1.8,          // 行高
  showToc: true,            // 显示目录
  tocPosition: 'right',     // 目录位置：left / right
  panelMode: 'embed',       // 面板模式：float / embed
  contentAlign: 'center',   // 文档对齐：left / center / right
  enableMermaid: true,      // 启用 Mermaid 图表渲染
  enableMathJax: true,      // 启用数学公式渲染
  enablePlantUML: true,     // 启用 PlantUML 图表渲染
  enableGraphviz: true,     // 启用 Graphviz 图表渲染
  autoDetect: true,         // 自动检测 Markdown 文件
  maxWidth: 1200,           // 内容最大宽度(px)
  fontFamily: 'system',     // 字体：system / serif / mono
  showLineNumbers: false,   // 代码块显示行号
  language: 'zh-CN',        // 界面语言：zh-CN / en
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

// 已注入过脚本的标签页集合（避免重复注入）
const injectedTabs = new Set();

// 清理已关闭的标签页记录
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

/**
 * 为指定标签页设置 MD badge
 * 由 popup 或 content script 通过消息触发（因为没有 tabs 权限，无法在 onUpdated 中读取 tab.url）
 */
function setMarkdownBadge(tabId, isMarkdown) {
  if (isMarkdown) {
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

/**
 * 动态注入内容脚本到指定标签页
 * 用于 http/https 上的 Markdown 文件（通过用户点击 popup 中的"渲染"按钮触发）
 * 依赖 activeTab 权限（用户打开 popup 时自动获得当前标签页的临时权限）
 */
async function injectContentScripts(tabId) {
  try {
    // 先注入 CSS
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: [
        'styles/github-markdown.css',
        'styles/themes.css',
        'styles/highlight-themes.css',
        'styles/content.css',
      ],
    });

    // 再注入 JS（顺序与 manifest content_scripts 中一致）
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [
        'libs/marked.min.js',
        'libs/marked-footnote.umd.js',
        'libs/purify.min.js',
        'libs/highlight.min.js',
        'libs/hljs-protobuf.min.js',
        'libs/mermaid.min.js',
        'libs/katex.min.js',
        'libs/viz-global.js',
        'libs/emoji-map.js',
        'i18n/zh-CN.js',
        'i18n/en.js',
        'i18n/i18n.js',
        'content/content.js',
      ],
    });

    injectedTabs.add(tabId);
    console.log(`[MD Viewer BG] 已动态注入内容脚本到标签页 ${tabId}`);
    return true;
  } catch (err) {
    console.warn(`[MD Viewer BG] 动态注入失败 (tabId=${tabId}):`, err.message || String(err));
    return false;
  }
}

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

    case 'SET_BADGE':
      // 由 popup 或 content script 触发，设置标签页的 MD badge
      // content script 不知道自己的 tabId，从 sender.tab.id 获取
      const badgeTabId = message.tabId || (sender && sender.tab && sender.tab.id);
      if (badgeTabId) {
        setMarkdownBadge(badgeTabId, message.isMarkdown);
      }
      sendResponse({ success: true });
      return false;

    case 'GET_DEFAULT_SETTINGS':
      sendResponse({ settings: DEFAULT_SETTINGS });
      return false;

    case 'RESET_SETTINGS':
      chrome.storage.sync.set({ settings: DEFAULT_SETTINGS }, () => {
        sendResponse({ settings: DEFAULT_SETTINGS });
      });
      return true;

    case 'OPEN_OPTIONS':
      chrome.runtime.openOptionsPage();
      return false;

    case 'INJECT_CONTENT_SCRIPTS':
      // 由 popup 触发，利用 activeTab 权限动态注入内容脚本到当前标签页
      injectContentScripts(message.tabId).then(success => {
        sendResponse({ success });
      });
      return true; // 异步响应

    case 'CHECK_INJECTED':
      // 检查指定标签页是否已注入过脚本
      sendResponse({ injected: injectedTabs.has(message.tabId) });
      return false;

    case 'CHECK_FILE_PERMISSION':
      // 检查是否拥有 file:// 可选权限
      hasFilePermission().then(has => {
        sendResponse({ hasPermission: has });
      });
      return true;

    case 'REQUEST_FILE_PERMISSION':
      // 请求 file:// 可选权限（注意：chrome.permissions.request 需要用户手势，
      // 从 popup 调用时 popup 本身就是用户手势上下文）
      requestFilePermission().then(granted => {
        sendResponse({ granted });
      });
      return true;

    default:
      return false;
  }
});

/**
 * 检查是否拥有 file:// 主机权限
 */
async function hasFilePermission() {
  try {
    return await chrome.permissions.contains({ origins: ['file://*/*'] });
  } catch {
    return false;
  }
}

/**
 * 请求 file:// 可选主机权限（需要用户手势触发）
 */
async function requestFilePermission() {
  try {
    return await chrome.permissions.request({ origins: ['file://*/*'] });
  } catch (err) {
    console.warn('[MD Viewer BG] 请求 file:// 权限失败:', err.message || String(err));
    return false;
  }
}


console.log('[MD Viewer Enhanced] Background service worker 已启动');

// ==================== 测试导出 ====================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_SETTINGS,
    isMarkdownUrl,
    isTextContentType,
  };
}
