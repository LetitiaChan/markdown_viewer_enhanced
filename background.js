/**
 * Markdown Viewer Enhanced - Background Service Worker
 * 负责：插件生命周期管理、消息通信、设置存储
 */

// 默认设置
const DEFAULT_SETTINGS = {
  theme: 'light',           // 主题：light / dark / auto
  codeTheme: 'default-dark-modern',  // 代码高亮主题
  fontSize: 16,             // 字体大小
  lineHeight: 1.6,          // 行高
  showToc: true,            // 显示目录
  tocPosition: 'right',     // 目录位置：left / right
  enableMermaid: true,      // 启用 Mermaid 图表渲染
  enableMathJax: true,      // 启用数学公式渲染
  autoDetect: true,         // 自动检测 Markdown 文件
  maxWidth: 1200,           // 内容最大宽度(px)
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

    case 'FETCH_DIRECTORY':
      fetchDirectoryViaTab(message.url).then(items => {
        console.log('[MD Viewer BG] 目录获取完成，文件数:', items.length);
        sendResponse({ items });
      });
      return true; // 异步响应

    default:
      return false;
  }
});

/**
 * 通过临时 tab + chrome.scripting.executeScript 获取 file:// 目录列表
 * 1. 创建一个不可见的 tab 打开目录 URL
 * 2. 在该 tab 中注入脚本提取文件列表
 * 3. 关闭 tab 并返回结果
 */
async function fetchDirectoryViaTab(dirUrl) {
  let tabId = null;
  try {
    console.log('[MD Viewer BG] 开始获取目录:', dirUrl);

    // 创建不活跃的 tab（不会获取焦点）
    const tab = await chrome.tabs.create({
      url: dirUrl,
      active: false,
    });
    tabId = tab.id;
    console.log('[MD Viewer BG] 临时 tab 已创建, id:', tabId, ', status:', tab.status);

    // 等待 tab 加载完成
    if (tab.status !== 'complete') {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(listener);
          reject(new Error('Tab 加载超时 (8s)'));
        }, 8000);

        function listener(updatedTabId, changeInfo) {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            clearTimeout(timeout);
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        }
        chrome.tabs.onUpdated.addListener(listener);
      });
    }

    // 等待一小段时间确保 DOM 完全渲染
    await new Promise(r => setTimeout(r, 300));

    console.log('[MD Viewer BG] Tab 加载完成，注入脚本提取目录...');

    // 在 tab 中注入脚本提取文件列表
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractDirectoryItems,
      args: [dirUrl],
    });

    console.log('[MD Viewer BG] 脚本执行结果:', JSON.stringify(results?.[0]?.result?.length || 0), '个条目');

    const items = (results && results[0] && results[0].result) ? results[0].result : [];

    // 关闭临时 tab
    await chrome.tabs.remove(tabId);
    tabId = null;

    return items;
  } catch (err) {
    console.error('[MD Viewer BG] fetchDirectoryViaTab 错误:', err.message || String(err));
    // 确保清理 tab
    if (tabId) {
      try { await chrome.tabs.remove(tabId); } catch (_) { /* ignore */ }
    }
    return []; // 返回空数组而非抛出异常，避免 sendResponse 失败
  }
}

/**
 * 注入到目录 tab 中执行的函数——提取文件/目录列表
 * 注意：此函数在目录页面的上下文中运行，不能引用外部变量
 */
function extractDirectoryItems(baseUrl) {
  const items = [];

  // 调试：输出页面基本信息
  console.log('[MD Viewer Inject] 页面 URL:', location.href);
  console.log('[MD Viewer Inject] 页面 title:', document.title);
  console.log('[MD Viewer Inject] body children:', document.body ? document.body.children.length : 'no body');
  console.log('[MD Viewer Inject] body innerHTML 前200字符:', document.body ? document.body.innerHTML.substring(0, 200) : 'no body');

  // Chrome 的 file:// 目录页面结构：
  // <body>
  //   <div id="parentDirLink">...</div> (可选)
  //   <h1 id="header">...</h1>
  //   <table>
  //     <thead><tr><th>Name</th><th>Size</th><th>Date Modified</th></tr></thead>
  //     <tbody id="tbody">
  //       <tr><td data-value="..."><a class="icon ...">filename</a></td>...</tr>
  //     </tbody>
  //   </table>
  // </body>

  // 策略 1：Chrome 风格 - tbody#tbody 或 table 内的 tbody
  const rows = document.querySelectorAll(
    '#tbody tr, #table tbody tr, table tbody tr, table tr'
  );
  console.log('[MD Viewer Inject] 找到 tr 行数:', rows.length);

  if (rows.length > 0) {
    rows.forEach(row => {
      const link = row.querySelector('a');
      if (!link) return;
      const name = link.textContent.trim();
      if (!name || name === '.' || name === '..' || name === 'Name') return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('?')) return;

      // Chrome 目录页面中 dir 结尾有 /，且 a 元素有 class="icon dir"
      const isDir = name.endsWith('/') || link.classList.contains('dir');
      const displayName = name.endsWith('/') ? name.slice(0, -1) : name;

      try {
        items.push({
          name: displayName,
          isDir,
          url: new URL(href, baseUrl).href,
          size: '',
          date: '',
        });
      } catch (e) { /* URL 解析失败 */ }
    });
  }

  // 策略 2：备用 - 所有 <a> 链接
  if (items.length === 0) {
    const links = document.querySelectorAll('a');
    console.log('[MD Viewer Inject] 备用方案，找到链接数:', links.length);

    links.forEach(link => {
      const name = link.textContent.trim();
      if (!name || name === '.' || name === '..' || name === 'Parent Directory' ||
          name === 'Name' || name === 'Size' || name === 'Date Modified') return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('?') || href.startsWith('#')) return;

      const isDir = name.endsWith('/') || link.classList.contains('dir');
      const displayName = name.endsWith('/') ? name.slice(0, -1) : name;

      try {
        items.push({
          name: displayName,
          isDir,
          url: new URL(href, baseUrl).href,
          size: '',
          date: '',
        });
      } catch (e) { /* URL 解析失败 */ }
    });
  }

  console.log('[MD Viewer Inject] 提取到文件数:', items.length);
  return items;
}

console.log('[MD Viewer Enhanced] Background service worker 已启动');
