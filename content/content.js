/**
 * Markdown Viewer Enhanced - Content Script
 * 核心渲染引擎：负责 Markdown 解析、Mermaid 图表渲染、代码高亮、目录导航等
 */

(function () {
  'use strict';

  // 防止重复初始化
  if (window.__MD_VIEWER_ENHANCED_LOADED__) return;
  window.__MD_VIEWER_ENHANCED_LOADED__ = true;

  // ==================== 常量定义 ====================
  const MD_EXTENSIONS = /\.(md|mdc|markdown|mkd|mdown|mdtxt|mdtext)([?#].*)?$/i;
  const MERMAID_REGEX = /^```mermaid\s*\n([\s\S]*?)```/gm;

  // KaTeX CDN 地址
  const KATEX_VERSION = '0.16.11';
  const KATEX_CDN_BASE = `https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist`;

  // 数学公式占位符（用于在 marked 解析前保护公式不被破坏）
  const MATH_PLACEHOLDER_PREFIX = '%%MATH_BLOCK_';
  const MATH_PLACEHOLDER_SUFFIX = '%%';
  let mathExpressions = []; // 存储提取出的数学公式

  // 默认设置（与 background.js 保持一致）
  const DEFAULT_SETTINGS = {
    theme: 'light',
    codeTheme: 'default-light-modern',
    fontSize: 16,
    lineHeight: 1.6,
    showToc: true,
    tocPosition: 'right',
    enableMermaid: true,
    enableMathJax: true,
    autoDetect: true,
    maxWidth: 1000,
    fontFamily: 'system',
    showLineNumbers: false,
  };

  let currentSettings = { ...DEFAULT_SETTINGS };
  let tocItems = [];
  let isRendered = false;

  // ==================== 工具函数 ====================

  /**
   * 检测当前页面是否为 Markdown 文件
   */
  function isMarkdownFile() {
    const url = window.location.href;
    // 文件协议下检查扩展名
    if (url.startsWith('file://')) {
      return MD_EXTENSIONS.test(url);
    }
    // HTTP(S) 下检查扩展名和 Content-Type
    if (MD_EXTENSIONS.test(url)) return true;
    // 检查 Content-Type（部分服务器返回 text/plain）
    const contentType = document.contentType;
    if (contentType && (contentType.includes('text/markdown') || contentType.includes('text/x-markdown'))) {
      return true;
    }
    return false;
  }

  /**
   * 获取页面原始文本内容
   */
  function getRawContent() {
    // 尝试从 <pre> 标签获取（浏览器默认对纯文本文件的渲染）
    const preElement = document.querySelector('pre');
    if (preElement) {
      return preElement.textContent;
    }
    // 直接获取 body 文本
    return document.body.innerText || document.body.textContent || '';
  }

  /**
   * 生成唯一 ID
   */
  function generateId(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'heading';
  }

  /**
   * 防抖函数
   */
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ==================== 数学公式处理 ====================

  /**
   * 预处理 Markdown 文本中的数学公式
   * 在 marked 解析之前，将 $$ ... $$ 和 $ ... $ 替换为占位符
   * 避免 marked 将公式中的特殊字符（如 _, *, \ 等）错误解析
   */
  function preprocessMath(markdown) {
    mathExpressions = [];
    let result = markdown;

    // 1. 先处理代码块 —— 提取并保护代码块内容，避免误匹配代码中的 $
    const codeBlocks = [];
    result = result.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
      const index = codeBlocks.length;
      codeBlocks.push(match);
      return `%%CODE_BLOCK_${index}%%`;
    });

    // 2. 处理块级公式 $$ ... $$（可以跨行）
    result = result.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
      const index = mathExpressions.length;
      mathExpressions.push({ formula: formula.trim(), displayMode: true });
      return `\n\n${MATH_PLACEHOLDER_PREFIX}${index}${MATH_PLACEHOLDER_SUFFIX}\n\n`;
    });

    // 3. 处理行内公式 $ ... $（不跨行，且 $ 前后不能紧跟数字以避免误匹配货币符号）
    result = result.replace(/(?<!\$|\\)\$(?!\$)(.+?)(?<!\$|\\)\$(?!\$)/g, (match, formula) => {
      // 排除看起来像货币金额的情况（如 $100）
      if (/^\d/.test(formula.trim()) && /\d$/.test(formula.trim()) && !/[\\{}^_]/.test(formula)) {
        return match;
      }
      const index = mathExpressions.length;
      mathExpressions.push({ formula: formula.trim(), displayMode: false });
      return `${MATH_PLACEHOLDER_PREFIX}${index}${MATH_PLACEHOLDER_SUFFIX}`;
    });

    // 4. 恢复代码块
    result = result.replace(/%%CODE_BLOCK_(\d+)%%/g, (match, index) => {
      return codeBlocks[parseInt(index)];
    });

    return result;
  }

  /**
   * 加载 KaTeX CSS 样式（包括字体）
   * KaTeX JS 已通过 manifest.json 注入，直接可用
   * CSS 从 CDN 加载以确保字体文件正确引用
   */
  let katexCSSLoaded = false;
  function loadKaTeXCSS() {
    return new Promise((resolve, reject) => {
      // 检查 KaTeX JS 是否可用
      if (typeof katex === 'undefined') {
        console.error('[MD Viewer] KaTeX JS 未加载，数学公式渲染不可用');
        reject(new Error('KaTeX JS 未加载'));
        return;
      }

      // CSS 已加载则跳过
      if (katexCSSLoaded) {
        resolve();
        return;
      }

      // 从 CDN 加载 KaTeX CSS（包含字体引用）
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `${KATEX_CDN_BASE}/katex.min.css`;
      link.crossOrigin = 'anonymous';
      link.onload = () => {
        katexCSSLoaded = true;
        console.log('[MD Viewer] KaTeX CSS 加载成功');
        resolve();
      };
      link.onerror = () => {
        console.warn('[MD Viewer] KaTeX CDN CSS 加载失败，使用本地 CSS（字体可能缺失）');
        // 回退：使用本地 CSS（字体可能无法显示，但公式结构仍然正确）
        const localLink = document.createElement('link');
        localLink.rel = 'stylesheet';
        localLink.href = chrome.runtime.getURL('libs/katex.min.css');
        document.head.appendChild(localLink);
        katexCSSLoaded = true;
        resolve();
      };
      document.head.appendChild(link);
    });
  }

  /**
   * 渲染页面中的数学公式占位符
   * 将占位符替换为 KaTeX 渲染后的 HTML
   */
  async function renderMathFormulas() {
    if (!currentSettings.enableMathJax || mathExpressions.length === 0) return;

    try {
      await loadKaTeXCSS();
    } catch (err) {
      console.error('[MD Viewer] 无法加载 KaTeX，数学公式渲染已跳过');
      return;
    }

    const contentEl = document.getElementById('md-content');
    if (!contentEl) return;

    // 遍历所有文本节点，查找并替换数学公式占位符
    const walker = document.createTreeWalker(
      contentEl,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent.includes(MATH_PLACEHOLDER_PREFIX)) {
        textNodes.push(node);
      }
    }

    // 使用正则匹配占位符
    const placeholderRegex = new RegExp(
      MATH_PLACEHOLDER_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
      '(\\d+)' +
      MATH_PLACEHOLDER_SUFFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'g'
    );

    for (const textNode of textNodes) {
      const text = textNode.textContent;
      const parts = [];
      let lastIndex = 0;
      let match;

      placeholderRegex.lastIndex = 0;
      while ((match = placeholderRegex.exec(text)) !== null) {
        // 占位符前的文本
        if (match.index > lastIndex) {
          parts.push(document.createTextNode(text.slice(lastIndex, match.index)));
        }

        const exprIndex = parseInt(match[1]);
        const expr = mathExpressions[exprIndex];

        if (expr) {
          try {
            const span = document.createElement(expr.displayMode ? 'div' : 'span');
            span.className = expr.displayMode ? 'katex-display' : 'katex-inline';
            katex.render(expr.formula, span, {
              displayMode: expr.displayMode,
              throwOnError: false,
              trust: true,
              strict: false,
            });
            parts.push(span);
          } catch (err) {
            console.warn(`[MD Viewer] 数学公式渲染失败: ${expr.formula}`, err);
            const errorSpan = document.createElement('span');
            errorSpan.className = 'katex-error';
            errorSpan.textContent = expr.displayMode ? `$$${expr.formula}$$` : `$${expr.formula}$`;
            errorSpan.title = `渲染失败: ${err.message}`;
            parts.push(errorSpan);
          }
        } else {
          parts.push(document.createTextNode(match[0]));
        }

        lastIndex = match.index + match[0].length;
      }

      // 占位符后的剩余文本
      if (lastIndex < text.length) {
        parts.push(document.createTextNode(text.slice(lastIndex)));
      }

      // 替换原始文本节点
      if (parts.length > 0) {
        const fragment = document.createDocumentFragment();
        parts.forEach(p => fragment.appendChild(p));
        textNode.parentNode.replaceChild(fragment, textNode);
      }
    }

    console.log(`[MD Viewer] 数学公式渲染完成，共 ${mathExpressions.length} 个公式`);
  }

  // ==================== Marked 配置 ====================

  /**
   * 配置 marked 解析器
   */
  function configureMarked() {
    if (typeof marked === 'undefined') {
      console.error('[MD Viewer] marked 库未加载');
      return;
    }

    const renderer = new marked.Renderer();
    let headingIndex = 0;

    // 自定义标题渲染 - 收集目录信息
    renderer.heading = function (data) {
      const depth = data.depth;
      const text = data.text;
      const id = generateId(text) + '-' + headingIndex++;
      tocItems.push({ id, text, depth });
      return `<h${depth} id="${id}" class="md-heading">
        <a class="md-anchor" href="#${id}">#</a>
        ${text}
      </h${depth}>`;
    };

    // 自定义代码块渲染 - 支持 Mermaid
    renderer.code = function (data) {
      const code = data.text;
      const lang = (data.lang || '').toLowerCase();

      // Mermaid 代码块特殊处理
      if (lang === 'mermaid' && currentSettings.enableMermaid) {
        // 使用 base64 编码存储原始 mermaid 代码，避免 HTML 转义破坏 mermaid 语法（如 <br/> 等）
        const base64Code = btoa(unescape(encodeURIComponent(code)));
        return `<div class="mermaid-container">
          <div class="mermaid" data-source="${base64Code}"></div>
          <button class="mermaid-copy-btn" title="复制 Mermaid 源码">📋</button>
          <pre class="mermaid-source" style="display:none"><code>${escapeHtml(code)}</code></pre>
        </div>`;
      }

      // 行号类名：根据设置决定是否添加 show-line-numbers
      const lineNumClass = currentSettings.showLineNumbers ? ' show-line-numbers' : '';

      /**
       * 将高亮后的 HTML 代码按行包裹 <span class="code-line">
       * 以支持 CSS counter 行号显示
       */
      function wrapLines(highlightedCode) {
        // 按换行符拆分，保留 HTML 标签完整性
        const lines = highlightedCode.split('\n');
        // 去除最后一行的空行（通常代码末尾有一个换行）
        if (lines.length > 0 && lines[lines.length - 1] === '') {
          lines.pop();
        }
        return lines.map(line => `<span class="code-line">${line}</span>`).join('\n');
      }

      // 普通代码块 - 使用 highlight.js
      // 注意：使用 <div> 而非 <pre> 作为 .code-block 容器，
      // 因为 <pre> 内不允许嵌套 <div>（code-header），浏览器会自动修复 DOM 结构导致样式失效
      if (lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang)) {
        try {
          const highlighted = hljs.highlight(code, { language: lang }).value;
          return `<div class="code-block${lineNumClass}"><div class="code-header"><span class="code-lang">${lang}</span><button class="code-copy-btn" title="复制代码">📋 复制</button></div><pre><code class="hljs language-${lang}">${wrapLines(highlighted)}</code></pre></div>`;
        } catch (e) {
          // 高亮失败，使用默认渲染
        }
      }

      // 尝试自动检测语言
      if (typeof hljs !== 'undefined') {
        try {
          const highlighted = hljs.highlightAuto(code).value;
          return `<div class="code-block${lineNumClass}"><div class="code-header"><span class="code-lang">${lang || 'code'}</span><button class="code-copy-btn" title="复制代码">📋 复制</button></div><pre><code class="hljs">${wrapLines(highlighted)}</code></pre></div>`;
        } catch (e) {
          // 忽略
        }
      }

      return `<div class="code-block${lineNumClass}"><div class="code-header"><span class="code-lang">${lang || 'code'}</span><button class="code-copy-btn" title="复制代码">📋 复制</button></div><pre><code>${wrapLines(escapeHtml(code))}</code></pre></div>`;
    };

    // 自定义链接渲染 - 外部链接新窗口打开
    renderer.link = function (data) {
      const href = data.href;
      const title = data.title;
      let text = data.text;
      const titleAttr = title ? ` title="${title}"` : '';
      const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
      const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';

      // 处理链接内嵌套图片的情况，如 [![alt](img-url)](link-url)
      // marked 新版本中 data.tokens 包含已解析的子 token，data.text 是未渲染的原始文本
      if (data.tokens && data.tokens.length > 0) {
        const firstToken = data.tokens[0];
        if (firstToken.type === 'image') {
          const imgTitle = firstToken.title ? ` title="${firstToken.title}"` : '';
          text = `<img src="${firstToken.href}" alt="${firstToken.text}"${imgTitle} loading="lazy" class="md-image" />`;
        }
      }

      return `<a href="${href}"${titleAttr}${targetAttr}>${text}</a>`;
    };

    // 自定义图片渲染 - 支持懒加载和点击放大
    // 注意：使用 <span> 而非 <figure> 包裹，因为 marked 会将行内图片放在 <p> 中，
    // <figure> 是块级元素不能嵌套在 <p> 中，会导致浏览器自动修复 DOM 结构而产生渲染异常
    renderer.image = function (data) {
      const href = data.href;
      const title = data.title;
      const text = data.text;
      const titleAttr = title ? ` title="${title}"` : '';
      return `<span class="md-image-container">
        <img src="${href}" alt="${text}"${titleAttr} loading="lazy" class="md-image" />
        ${text ? `<span class="md-image-caption">${text}</span>` : ''}
      </span>`;
    };

    // 自定义表格渲染 - 添加容器支持横向滚动
    // 注意：cell.text 是未经行内渲染的原始文本，必须通过 cell.tokens 渲染行内元素
    renderer.table = function (data) {
      const header = data.header;
      const body = data.rows;
      let headerHtml = '<thead><tr>';
      header.forEach(cell => {
        const align = cell.align ? ` style="text-align:${cell.align}"` : '';
        const content = cell.tokens ? this.parser.parseInline(cell.tokens) : cell.text;
        headerHtml += `<th${align}>${content}</th>`;
      });
      headerHtml += '</tr></thead>';

      let bodyHtml = '<tbody>';
      body.forEach(row => {
        bodyHtml += '<tr>';
        row.forEach(cell => {
          const align = cell.align ? ` style="text-align:${cell.align}"` : '';
          const content = cell.tokens ? this.parser.parseInline(cell.tokens) : cell.text;
          bodyHtml += `<td${align}>${content}</td>`;
        });
        bodyHtml += '</tr>';
      });
      bodyHtml += '</tbody>';

      return `<div class="table-wrapper"><table>${headerHtml}${bodyHtml}</table></div>`;
    };

    // 自定义引用块渲染 - 支持 GitHub 风格告警/高亮块
    // 语法格式：> [!NOTE] 或 > [!TIP] 等
    renderer.blockquote = function (data) {
      // marked v15 中 data.text 是未渲染的原始文本，
      // 必须通过 this.parser.parse(data.tokens) 递归渲染子 token（包括嵌套 blockquote）
      let inner = '';
      if (data.tokens) {
        inner = this.parser.parse(data.tokens);
      } else if (typeof data.text === 'string') {
        inner = data.text;
      }

      // 定义支持的告警类型及其图标/标题
      const alertTypes = {
        NOTE:      { icon: 'ℹ️', title: '注意',  class: 'note' },
        TIP:       { icon: '💡', title: '提示',  class: 'tip' },
        IMPORTANT: { icon: '❗', title: '重要',  class: 'important' },
        WARNING:   { icon: '⚠️', title: '警告',  class: 'warning' },
        CAUTION:   { icon: '🔴', title: '注意',  class: 'caution' },
      };

      // 尝试匹配 [!TYPE] 语法（在渲染后的 HTML 中匹配）
      // marked 渲染后 [!NOTE] 会变成 <p>[!NOTE]... 或直接是文本
      const alertRegex = /^\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;
      const match = inner.match(alertRegex);

      if (match) {
        const typeName = match[1].toUpperCase();
        const alertInfo = alertTypes[typeName];
        // 去掉 [!TYPE] 标记，保留后续内容
        const content = inner.replace(alertRegex, '<p>');
        return `<div class="markdown-alert markdown-alert-${alertInfo.class}">
          <p class="markdown-alert-title">${alertInfo.icon} ${alertInfo.title}</p>
          ${content}
        </div>`;
      }

      // 也支持不带类型的空白高亮块 > [!BLANK] 或简单的 > **标题** 样式
      const blankRegex = /^\s*<p>\s*\[!BLANK\]\s*/i;
      const blankMatch = inner.match(blankRegex);
      if (blankMatch) {
        const content = inner.replace(blankRegex, '<p>');
        return `<div class="markdown-alert markdown-alert-blank">
          ${content}
        </div>`;
      }

      // 普通引用块
      return `<blockquote>${inner}</blockquote>`;
    };

    // 自定义复选框（增强版）
    // 注意：marked v15 中 data.text 是未经行内渲染的原始文本，
    // 必须通过 this.parser.parse(data.tokens) 渲染行内元素（链接、粗体等）
    // 不能用 parseInline，因为 tokens 中可能包含嵌套列表等 block-level token
    renderer.listitem = function (data) {
      let text = this.parser.parse(data.tokens);
      // parse() 会给文本节点包裹 <p> 标签，对于非 loose 列表需要去掉
      if (!data.loose) {
        text = text.replace(/<p>([\s\S]*?)<\/p>\n?/g, '$1');
      }
      if (data.task) {
        const checkedClass = data.checked ? ' checked' : '';
        const checkedAttr = data.checked ? ' checked' : '';
        const checkIcon = data.checked
          ? '<svg class="task-check-icon" viewBox="0 0 16 16" width="14" height="14"><path fill="currentColor" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>'
          : '';
        return `<li class="task-list-item${checkedClass}">` +
          `<span class="task-checkbox${checkedClass}">` +
          `<input type="checkbox"${checkedAttr} disabled />` +
          `${checkIcon}` +
          `</span>` +
          `<span class="task-text">${text}</span>` +
          `</li>`;
      }
      return `<li>${text}</li>`;
    };

    marked.setOptions({
      renderer: renderer,
      gfm: true,
      breaks: true,
      pedantic: false,
      smartLists: true,
      smartypants: false,
    });

    // 注册脚注扩展（marked-footnote）
    if (typeof markedFootnote !== 'undefined') {
      marked.use(markedFootnote({
        prefixId: 'footnote-',
        description: 'Footnotes',
      }));
      console.log('[MD Viewer] 脚注扩展已注册');
    } else {
      console.warn('[MD Viewer] marked-footnote 未加载，脚注功能不可用');
    }

    // 注册定义列表扩展
    // 语法：Term\n:   Definition（PHP Markdown Extra 风格）
    marked.use({
      extensions: [{
        name: 'deflist',
        level: 'block',
        start(src) {
          // 查找可能的定义列表起始位置：非空行后跟 ": " 定义行
          const match = src.match(/^[^\n]+\n(?=:[  \t])/m);
          return match ? match.index : undefined;
        },
        tokenizer(src) {
          // 匹配完整的定义列表块：
          // Term1\n:   Definition1\n\nTerm2\n:   Definition2\n...
          const rule = /^(?:[^\n]+\n(?::[  \t]+[^\n]+(?:\n|$))+(?:\n|$)?)+/;
          const match = rule.exec(src);
          if (match) {
            const raw = match[0];
            const items = [];
            // 按定义项分组：每个 term 后面跟一个或多个 ": definition" 行
            const parts = raw.split(/\n(?=[^\n:])/).filter(Boolean);
            for (const part of parts) {
              const lines = part.split('\n').filter(Boolean);
              if (lines.length >= 1) {
                const dt = lines[0].trim();
                const dds = [];
                for (let i = 1; i < lines.length; i++) {
                  const ddMatch = lines[i].match(/^:[  \t]+(.*)/);
                  if (ddMatch) {
                    dds.push(ddMatch[1].trim());
                  }
                }
                if (dds.length > 0) {
                  items.push({ dt, dds });
                }
              }
            }
            if (items.length > 0) {
              return {
                type: 'deflist',
                raw: raw,
                items: items,
              };
            }
          }
        },
        renderer(token) {
          let html = '<dl>\n';
          for (const item of token.items) {
            html += `<dt>${item.dt}</dt>\n`;
            for (const dd of item.dds) {
              html += `<dd>${dd}</dd>\n`;
            }
          }
          html += '</dl>\n';
          return html;
        },
      }],
    });
    console.log('[MD Viewer] 定义列表扩展已注册');
  }

  /**
   * HTML 转义
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ==================== 页面构建 ====================

  /**
   * 构建渲染后的页面结构
   */
  function buildPage(htmlContent) {
    // 保留 content scripts 注入的样式表（<link> 和 <style> 标签），清除其他 head 内容
    const existingStyles = Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style'));
    document.head.innerHTML = '';
    existingStyles.forEach(style => document.head.appendChild(style));
    document.body.innerHTML = '';
    document.body.className = '';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.backgroundColor = 'transparent';

    // 设置页面标题
    const fileName = decodeURIComponent(
      window.location.pathname.split('/').pop() || 'Markdown'
    );
    document.title = fileName + ' - Markdown Viewer Enhanced';

    // 设置 meta 标签
    const meta = document.createElement('meta');
    meta.charset = 'UTF-8';
    document.head.appendChild(meta);

    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1.0';
    document.head.appendChild(viewport);

    // 构建页面 DOM 结构
    document.body.innerHTML = `
      <div id="md-viewer-app" class="md-viewer-app theme-${currentSettings.theme}">
        <!-- 顶部工具栏 -->
        <div id="md-toolbar" class="md-toolbar">
          <div class="md-toolbar-left">
            <span class="md-toolbar-title" title="${fileName}">📄 ${fileName}</span>
          </div>
          <div class="md-toolbar-right">
            <button id="btn-toggle-toc" class="md-toolbar-btn" title="切换目录">📑 目录</button>
            <button id="btn-toggle-theme" class="md-toolbar-btn" title="切换主题">🌓 主题</button>
            <button id="btn-toggle-raw" class="md-toolbar-btn" title="查看源码">📝 源码</button>
            <button id="btn-scroll-top" class="md-toolbar-btn" title="回到顶部">⬆️ 顶部</button>
            <button id="btn-refresh" class="md-toolbar-btn" title="刷新">🔃 刷新</button>
          </div>
        </div>

        <div class="md-main-container">
          <!-- 目录侧边栏 -->
          <aside id="md-toc-sidebar" class="md-toc-sidebar toc-${currentSettings.tocPosition} ${currentSettings.showToc ? 'visible' : 'hidden'}">
            <div class="md-toc-header">
              <span>📋 目录</span>
              <button id="btn-close-toc" class="md-toc-close" title="关闭目录">✕</button>
            </div>
            <nav id="md-toc-nav" class="md-toc-nav"></nav>
          </aside>

          <!-- 主内容区域 -->
          <main id="md-content" class="md-content markdown-viewer-enhanced" style="max-width:${currentSettings.maxWidth}px; font-size:${currentSettings.fontSize}px; line-height:${currentSettings.lineHeight}; --code-font-size:${currentSettings.codeFontSize || 14}px;">
            ${htmlContent}
          </main>

          <!-- 源码面板（默认隐藏） -->
          <pre id="md-raw-content" class="md-raw-content" style="display:none;"></pre>
        </div>

        <!-- 回到顶部浮动按钮 -->
        <button id="btn-float-top" class="md-float-top" style="display:none;" title="回到顶部">⬆️</button>

        <!-- 图片预览遮罩 -->
        <div id="md-image-overlay" class="md-image-overlay" style="display:none;">
          <img id="md-image-preview" class="md-image-preview" />
          <button class="md-image-close">✕ 关闭</button>
        </div>

        <!-- Mermaid 图表预览遮罩 -->
        <div id="md-mermaid-overlay" class="md-mermaid-overlay" style="display:none;">
          <div class="md-mermaid-zoom-bar">
            <button class="md-mermaid-zoom-btn" id="btn-mermaid-zoom-out" title="缩小">➖</button>
            <span class="md-mermaid-zoom-level" id="md-mermaid-zoom-level">100%</span>
            <button class="md-mermaid-zoom-btn" id="btn-mermaid-zoom-in" title="放大">➕</button>
            <button class="md-mermaid-zoom-btn" id="btn-mermaid-zoom-reset" title="重置">↺ 重置</button>
            <button class="md-mermaid-zoom-btn" id="btn-mermaid-zoom-fit" title="适应窗口">⊡ 适应</button>
          </div>
          <div id="md-mermaid-preview" class="md-mermaid-preview">
            <div id="md-mermaid-canvas" class="md-mermaid-canvas"></div>
          </div>
          <button class="md-mermaid-close">✕ 关闭</button>
        </div>
      </div>
    `;

    // 保存原始 Markdown 源码
    const rawContent = document.getElementById('md-raw-content');
    if (rawContent) {
      rawContent.textContent = window.__MD_RAW_SOURCE__ || '';
    }
  }

  // ==================== 目录（TOC）====================

  /**
   * 生成目录导航
   */
  function buildToc() {
    const tocNav = document.getElementById('md-toc-nav');
    if (!tocNav || tocItems.length === 0) return;

    let tocHtml = '<ul class="md-toc-list">';
    const minDepth = Math.min(...tocItems.map(item => item.depth));

    tocItems.forEach((item, index) => {
      const indent = item.depth - minDepth;
      tocHtml += `<li class="md-toc-item toc-level-${indent}" style="padding-left:${indent * 16}px;">
        <a href="#${item.id}" class="md-toc-link" data-index="${index}" title="${item.text}">
          ${item.text}
        </a>
      </li>`;
    });
    tocHtml += '</ul>';
    tocNav.innerHTML = tocHtml;
  }

  /**
   * 高亮当前可见章节对应的目录项
   */
  function updateTocHighlight() {
    const headings = document.querySelectorAll('.md-heading');
    const tocLinks = document.querySelectorAll('.md-toc-link');
    if (headings.length === 0 || tocLinks.length === 0) return;

    let currentIndex = 0;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const offset = 100;

    headings.forEach((heading, index) => {
      if (heading.offsetTop - offset <= scrollTop) {
        currentIndex = index;
      }
    });

    tocLinks.forEach(link => link.classList.remove('active'));
    if (tocLinks[currentIndex]) {
      tocLinks[currentIndex].classList.add('active');
      // 滚动目录使当前项可见
      tocLinks[currentIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  // ==================== Mermaid 渲染 ====================

  /**
   * 初始化并渲染所有 Mermaid 图表
   */
  async function renderMermaidDiagrams() {
    if (!currentSettings.enableMermaid || typeof mermaid === 'undefined') return;

    try {
      // 配置 Mermaid
      mermaid.initialize({
        startOnLoad: false,
        theme: currentSettings.theme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
          curve: 'basis',
        },
        sequence: {
          useMaxWidth: false,
          diagramMarginX: 8,
          diagramMarginY: 8,
        },
        gantt: {
          useMaxWidth: false,
        },
        themeVariables: currentSettings.theme === 'dark' ? {
          darkMode: true,
          background: '#1e1e1e',
          primaryColor: '#4fc3f7',
          primaryTextColor: '#e0e0e0',
          lineColor: '#666',
        } : {},
      });

      const mermaidElements = document.querySelectorAll('.mermaid');
      for (let i = 0; i < mermaidElements.length; i++) {
        const element = mermaidElements[i];
        // 优先从 data-source 属性读取 base64 编码的原始代码，避免 HTML 转义导致 mermaid 解析失败
        const base64Source = element.getAttribute('data-source');
        let code;
        if (base64Source) {
          try {
            code = decodeURIComponent(escape(atob(base64Source)));
          } catch (e) {
            code = element.textContent.trim();
          }
        } else {
          code = element.textContent.trim();
        }
        if (!code) continue;

        try {
          const id = `mermaid-diagram-${i}`;
          const { svg } = await mermaid.render(id, code);
          element.innerHTML = svg;
          element.classList.add('mermaid-rendered');
          // 使 Mermaid SVG 图表自适应容器宽度
          // useMaxWidth=false 时 Mermaid 会给 SVG 固定的 width/height 属性（如 width="852"）
          // 需要将其转为 viewBox 以支持缩放，然后用 CSS 控制显示尺寸
          const svgEl = element.querySelector('svg');
          if (svgEl) {
            const rawW = parseFloat(svgEl.getAttribute('width')) || svgEl.getBoundingClientRect().width;
            const rawH = parseFloat(svgEl.getAttribute('height')) || svgEl.getBoundingClientRect().height;
            // 确保 viewBox 存在
            if (!svgEl.getAttribute('viewBox') && rawW && rawH) {
              svgEl.setAttribute('viewBox', `0 0 ${rawW} ${rawH}`);
            }
            // 移除固定的内联 style 和宽高属性，改为自适应缩放
            svgEl.removeAttribute('style');
            svgEl.removeAttribute('width');
            svgEl.removeAttribute('height');
            // 确保 preserveAspectRatio 使图表等比缩放居中
            svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');

            // 根据图表宽高比智能设置显示尺寸
            const containerW = element.closest('.mermaid-container')?.clientWidth - 32 || 800;
            const aspect = rawW / rawH; // 宽高比

            if (aspect > 2.5) {
              // 非常宽的横向图表（如甘特图）：以容器宽度为基准，按比例计算高度
              // 但设置一个较大的最小高度，确保内容清晰可读
              const calcH = Math.max(containerW / aspect, 300);
              svgEl.style.width = '100%';
              svgEl.style.height = calcH + 'px';
              svgEl.style.maxWidth = '100%';
            } else if (aspect > 1.5) {
              // 中等宽度的横向图表：宽度 100%，设置合理最小高度
              const calcH = Math.max(containerW / aspect, 250);
              svgEl.style.width = '100%';
              svgEl.style.height = calcH + 'px';
              svgEl.style.maxWidth = '100%';
            } else {
              // 较方正或纵向的图表（流程图等）：宽度 100%，高度自动
              svgEl.style.width = '100%';
              svgEl.style.height = 'auto';
              svgEl.style.maxWidth = '100%';
              // 对于较小的图表，设置最小高度
              if (rawH > 100) {
                svgEl.style.minHeight = Math.min(rawH, 600) + 'px';
              }
            }
          }
        } catch (err) {
          console.warn(`[MD Viewer] Mermaid 图表 #${i} 渲染失败:`, err);
          element.innerHTML = `<div class="mermaid-error">
            <p>⚠️ Mermaid 图表渲染失败</p>
            <pre>${escapeHtml(code)}</pre>
            <p class="error-message">${escapeHtml(err.message || '未知错误')}</p>
          </div>`;
        }
      }
    } catch (err) {
      console.error('[MD Viewer] Mermaid 初始化失败:', err);
    }
  }

  // ==================== 事件绑定 ====================

  /**
   * 绑定页面交互事件
   */
  function bindEvents() {
    // 目录开关
    const btnToggleToc = document.getElementById('btn-toggle-toc');
    const tocSidebar = document.getElementById('md-toc-sidebar');
    if (btnToggleToc && tocSidebar) {
      btnToggleToc.addEventListener('click', () => {
        tocSidebar.classList.toggle('visible');
        tocSidebar.classList.toggle('hidden');
      });
    }

    // 关闭目录
    const btnCloseToc = document.getElementById('btn-close-toc');
    if (btnCloseToc && tocSidebar) {
      btnCloseToc.addEventListener('click', () => {
        tocSidebar.classList.remove('visible');
        tocSidebar.classList.add('hidden');
      });
    }

    // 目录点击平滑滚动
    const tocNav = document.getElementById('md-toc-nav');
    if (tocNav) {
      tocNav.addEventListener('click', (e) => {
        const link = e.target.closest('.md-toc-link');
        if (link) {
          e.preventDefault();
          const targetId = link.getAttribute('href').slice(1);
          const target = document.getElementById(targetId);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // 更新 URL hash
            history.replaceState(null, '', '#' + targetId);
          }
        }
      });
    }

    // 主题切换
    const btnToggleTheme = document.getElementById('btn-toggle-theme');
    if (btnToggleTheme) {
      btnToggleTheme.addEventListener('click', () => {
        const app = document.getElementById('md-viewer-app');
        if (!app) return;
        const themes = ['light', 'dark'];
        const currentIndex = themes.indexOf(currentSettings.theme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        currentSettings.theme = nextTheme;
        app.className = `md-viewer-app theme-${nextTheme}`;
        // 保存设置
        saveSettings();
        // 重新渲染 Mermaid（主题变化需要重新渲染）
        reRenderMermaid();
      });
    }

    // 查看源码切换
    const btnToggleRaw = document.getElementById('btn-toggle-raw');
    const mdContent = document.getElementById('md-content');
    const rawContent = document.getElementById('md-raw-content');
    if (btnToggleRaw && mdContent && rawContent) {
      btnToggleRaw.addEventListener('click', () => {
        const isShowingRaw = rawContent.style.display !== 'none';
        if (isShowingRaw) {
          rawContent.style.display = 'none';
          mdContent.style.display = 'block';
          btnToggleRaw.textContent = '📝 源码';
        } else {
          rawContent.style.display = 'block';
          mdContent.style.display = 'none';
          btnToggleRaw.textContent = '📄 预览';
        }
      });
    }

    // 回到顶部
    const btnScrollTop = document.getElementById('btn-scroll-top');
    const btnFloatTop = document.getElementById('btn-float-top');
    const scrollTopHandler = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    if (btnScrollTop) btnScrollTop.addEventListener('click', scrollTopHandler);
    if (btnFloatTop) btnFloatTop.addEventListener('click', scrollTopHandler);

    // 滚动事件 - 显示/隐藏浮动按钮 + 目录高亮
    window.addEventListener('scroll', debounce(() => {
      // 浮动回到顶部按钮
      if (btnFloatTop) {
        btnFloatTop.style.display = window.scrollY > 300 ? 'block' : 'none';
      }
      // 目录高亮
      updateTocHighlight();
    }, 100));

    // 刷新
    const btnRefresh = document.getElementById('btn-refresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        location.reload();
      });
    }

    // 代码复制按钮
    document.addEventListener('click', (e) => {
      // 代码块复制
      if (e.target.classList.contains('code-copy-btn')) {
        const codeBlock = e.target.closest('.code-block');
        if (codeBlock) {
          const code = codeBlock.querySelector('code');
          if (code) {
            copyToClipboard(code.textContent);
            e.target.textContent = '✅ 已复制';
            setTimeout(() => { e.target.textContent = '📋 复制'; }, 2000);
          }
        }
      }
      // Mermaid 源码复制
      if (e.target.classList.contains('mermaid-copy-btn')) {
        const container = e.target.closest('.mermaid-container');
        if (container) {
          const source = container.querySelector('.mermaid-source code');
          if (source) {
            copyToClipboard(source.textContent);
            e.target.textContent = '✅';
            setTimeout(() => { e.target.textContent = '📋'; }, 2000);
          }
        }
      }
    });

    // 图片点击放大
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('md-image')) {
        const overlay = document.getElementById('md-image-overlay');
        const preview = document.getElementById('md-image-preview');
        if (overlay && preview) {
          preview.src = e.target.src;
          overlay.style.display = 'flex';
        }
      }
    });

    // 关闭图片预览
    const imageOverlay = document.getElementById('md-image-overlay');
    if (imageOverlay) {
      imageOverlay.addEventListener('click', (e) => {
        if (e.target === imageOverlay || e.target.classList.contains('md-image-close')) {
          imageOverlay.style.display = 'none';
        }
      });
    }

    // ==================== Mermaid 弹窗缩放/拖拽 ====================
    const mermaidZoomState = {
      scale: 1,
      translateX: 0,
      translateY: 0,
      isDragging: false,
      startX: 0,
      startY: 0,
      lastTranslateX: 0,
      lastTranslateY: 0,
      minScale: 0.1,
      maxScale: 10,
      scaleStep: 0.15,
    };

    function updateMermaidTransform() {
      const canvas = document.getElementById('md-mermaid-canvas');
      if (canvas) {
        canvas.style.transform = `translate(${mermaidZoomState.translateX}px, ${mermaidZoomState.translateY}px) scale(${mermaidZoomState.scale})`;
      }
      const zoomLevel = document.getElementById('md-mermaid-zoom-level');
      if (zoomLevel) {
        zoomLevel.textContent = `${Math.round(mermaidZoomState.scale * 100)}%`;
      }
    }

    function resetMermaidZoom() {
      mermaidZoomState.scale = 1;
      mermaidZoomState.translateX = 0;
      mermaidZoomState.translateY = 0;
      updateMermaidTransform();
    }

    function fitMermaidToWindow() {
      const canvas = document.getElementById('md-mermaid-canvas');
      const preview = document.getElementById('md-mermaid-preview');
      if (!canvas || !preview) return;
      const svg = canvas.querySelector('svg');
      if (!svg) return;
      // 获取 SVG 原始尺寸
      const svgW = parseFloat(svg.getAttribute('width')) || svg.getBoundingClientRect().width;
      const svgH = parseFloat(svg.getAttribute('height')) || svg.getBoundingClientRect().height;
      if (!svgW || !svgH) return;
      // 获取预览区可用尺寸（减去 padding）
      const previewW = preview.clientWidth - 48;
      const previewH = preview.clientHeight - 48;
      // 计算适应比例
      const fitScale = Math.min(previewW / svgW, previewH / svgH, 1);
      mermaidZoomState.scale = fitScale;
      mermaidZoomState.translateX = 0;
      mermaidZoomState.translateY = 0;
      updateMermaidTransform();
    }

    function zoomMermaidAt(delta, clientX, clientY) {
      const preview = document.getElementById('md-mermaid-preview');
      if (!preview) return;
      const oldScale = mermaidZoomState.scale;
      const newScale = Math.min(mermaidZoomState.maxScale, Math.max(mermaidZoomState.minScale, oldScale * (1 + delta)));
      // 以鼠标位置为缩放中心
      const rect = preview.getBoundingClientRect();
      const offsetX = clientX - rect.left - rect.width / 2;
      const offsetY = clientY - rect.top - rect.height / 2;
      const scaleRatio = newScale / oldScale;
      mermaidZoomState.translateX = offsetX - scaleRatio * (offsetX - mermaidZoomState.translateX);
      mermaidZoomState.translateY = offsetY - scaleRatio * (offsetY - mermaidZoomState.translateY);
      mermaidZoomState.scale = newScale;
      updateMermaidTransform();
    }

    // Mermaid 图表点击放大预览
    document.addEventListener('click', (e) => {
      const mermaidRendered = e.target.closest('.mermaid-rendered');
      if (mermaidRendered) {
        // 排除点击复制按钮
        if (e.target.classList.contains('mermaid-copy-btn')) return;
        const overlay = document.getElementById('md-mermaid-overlay');
        const canvas = document.getElementById('md-mermaid-canvas');
        if (overlay && canvas) {
          const svgEl = mermaidRendered.querySelector('svg');
          if (svgEl) {
            canvas.innerHTML = '';
            const clonedSvg = svgEl.cloneNode(true);
            // 从 viewBox 读取原始尺寸，恢复为 SVG 的固有宽高
            const viewBox = clonedSvg.getAttribute('viewBox');
            if (viewBox) {
              const parts = viewBox.split(/[\s,]+/);
              const vbW = parseFloat(parts[2]);
              const vbH = parseFloat(parts[3]);
              if (vbW && vbH) {
                clonedSvg.setAttribute('width', vbW);
                clonedSvg.setAttribute('height', vbH);
              }
            }
            // 清除页面中为自适应设置的内联样式
            clonedSvg.style.cssText = 'width: auto; height: auto;';
            canvas.appendChild(clonedSvg);
            // 重置缩放状态
            resetMermaidZoom();
            overlay.style.display = 'flex';
            // 打开后自动适应窗口
            requestAnimationFrame(() => fitMermaidToWindow());
          }
        }
      }
    });

    // 关闭 Mermaid 预览
    const mermaidOverlay = document.getElementById('md-mermaid-overlay');
    if (mermaidOverlay) {
      // 点击遮罩或关闭按钮关闭
      mermaidOverlay.addEventListener('click', (e) => {
        if (e.target === mermaidOverlay || e.target.classList.contains('md-mermaid-close')) {
          mermaidOverlay.style.display = 'none';
        }
      });

      // 滚轮缩放
      const mermaidPreview = document.getElementById('md-mermaid-preview');
      if (mermaidPreview) {
        mermaidPreview.addEventListener('wheel', (e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -mermaidZoomState.scaleStep : mermaidZoomState.scaleStep;
          zoomMermaidAt(delta, e.clientX, e.clientY);
        }, { passive: false });

        // 鼠标拖拽
        mermaidPreview.addEventListener('mousedown', (e) => {
          // 排除点击按钮
          if (e.target.closest('button')) return;
          e.preventDefault();
          mermaidZoomState.isDragging = true;
          mermaidZoomState.startX = e.clientX;
          mermaidZoomState.startY = e.clientY;
          mermaidZoomState.lastTranslateX = mermaidZoomState.translateX;
          mermaidZoomState.lastTranslateY = mermaidZoomState.translateY;
          mermaidPreview.classList.add('grabbing');
        });
      }

      document.addEventListener('mousemove', (e) => {
        if (!mermaidZoomState.isDragging) return;
        const dx = e.clientX - mermaidZoomState.startX;
        const dy = e.clientY - mermaidZoomState.startY;
        mermaidZoomState.translateX = mermaidZoomState.lastTranslateX + dx;
        mermaidZoomState.translateY = mermaidZoomState.lastTranslateY + dy;
        updateMermaidTransform();
      });

      document.addEventListener('mouseup', () => {
        if (mermaidZoomState.isDragging) {
          mermaidZoomState.isDragging = false;
          const mermaidPreviewEl = document.getElementById('md-mermaid-preview');
          if (mermaidPreviewEl) mermaidPreviewEl.classList.remove('grabbing');
        }
      });

      // 缩放按钮
      const btnZoomIn = document.getElementById('btn-mermaid-zoom-in');
      const btnZoomOut = document.getElementById('btn-mermaid-zoom-out');
      const btnZoomReset = document.getElementById('btn-mermaid-zoom-reset');
      const btnZoomFit = document.getElementById('btn-mermaid-zoom-fit');

      if (btnZoomIn) {
        btnZoomIn.addEventListener('click', (e) => {
          e.stopPropagation();
          const preview = document.getElementById('md-mermaid-preview');
          if (!preview) return;
          const rect = preview.getBoundingClientRect();
          zoomMermaidAt(mermaidZoomState.scaleStep, rect.left + rect.width / 2, rect.top + rect.height / 2);
        });
      }
      if (btnZoomOut) {
        btnZoomOut.addEventListener('click', (e) => {
          e.stopPropagation();
          const preview = document.getElementById('md-mermaid-preview');
          if (!preview) return;
          const rect = preview.getBoundingClientRect();
          zoomMermaidAt(-mermaidZoomState.scaleStep, rect.left + rect.width / 2, rect.top + rect.height / 2);
        });
      }
      if (btnZoomReset) {
        btnZoomReset.addEventListener('click', (e) => {
          e.stopPropagation();
          resetMermaidZoom();
        });
      }
      if (btnZoomFit) {
        btnZoomFit.addEventListener('click', (e) => {
          e.stopPropagation();
          fitMermaidToWindow();
        });
      }
    }

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      // ESC 关闭图片预览和 Mermaid 预览
      if (e.key === 'Escape') {
        const imgOverlay = document.getElementById('md-image-overlay');
        if (imgOverlay) imgOverlay.style.display = 'none';
        const mmdOverlay = document.getElementById('md-mermaid-overlay');
        if (mmdOverlay) mmdOverlay.style.display = 'none';
      }
      // Mermaid 弹窗快捷键
      const mmdOverlay = document.getElementById('md-mermaid-overlay');
      if (mmdOverlay && mmdOverlay.style.display !== 'none') {
        if (e.key === '+' || e.key === '=') {
          const preview = document.getElementById('md-mermaid-preview');
          if (preview) {
            const rect = preview.getBoundingClientRect();
            zoomMermaidAt(mermaidZoomState.scaleStep, rect.left + rect.width / 2, rect.top + rect.height / 2);
          }
        } else if (e.key === '-') {
          const preview = document.getElementById('md-mermaid-preview');
          if (preview) {
            const rect = preview.getBoundingClientRect();
            zoomMermaidAt(-mermaidZoomState.scaleStep, rect.left + rect.width / 2, rect.top + rect.height / 2);
          }
        } else if (e.key === '0') {
          resetMermaidZoom();
        }
      }
      // Ctrl+R 刷新（保持浏览器默认行为）
    });

    // 监听来自 background 的设置更新消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SETTINGS_UPDATED') {
        applySettings(message.settings);
        sendResponse({ success: true });
      }
      return false;
    });
  }

  /**
   * 复制文本到剪贴板
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  // ==================== 设置管理 ====================

  /**
   * 从 storage 加载设置
   */
  function loadSettings() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('[MD Viewer] 获取设置失败:', chrome.runtime.lastError);
            resolve(DEFAULT_SETTINGS);
            return;
          }
          resolve(response?.settings || DEFAULT_SETTINGS);
        });
      } catch {
        resolve(DEFAULT_SETTINGS);
      }
    });
  }

  /**
   * 保存设置
   */
  function saveSettings() {
    try {
      chrome.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings: currentSettings
      });
    } catch (e) {
      console.warn('[MD Viewer] 保存设置失败:', e);
    }
  }

  /**
   * 应用设置到页面
   */
  function applySettings(settings) {
    const oldSettings = { ...currentSettings };
    currentSettings = { ...DEFAULT_SETTINGS, ...settings };
    const app = document.getElementById('md-viewer-app');
    if (app) {
      app.className = `md-viewer-app theme-${currentSettings.theme}`;
    }

    const content = document.getElementById('md-content');
    if (content) {
      content.style.maxWidth = currentSettings.maxWidth + 'px';
      content.style.fontSize = currentSettings.fontSize + 'px';
      content.style.lineHeight = currentSettings.lineHeight;
      content.style.setProperty('--code-font-size', (currentSettings.codeFontSize || 14) + 'px');
    }

    const tocSidebar = document.getElementById('md-toc-sidebar');
    if (tocSidebar) {
      tocSidebar.className = `md-toc-sidebar toc-${currentSettings.tocPosition} ${currentSettings.showToc ? 'visible' : 'hidden'}`;
    }

    // 应用代码高亮主题
    applyCodeTheme(currentSettings.codeTheme);

    // 应用行号设置
    if (app) {
      const codeBlocks = app.querySelectorAll('.code-block');
      codeBlocks.forEach(block => {
        block.classList.toggle('show-line-numbers', !!currentSettings.showLineNumbers);
      });
    }

    // 检测 Mermaid/Math 开关变化，触发重新渲染
    const mermaidChanged = oldSettings.enableMermaid !== currentSettings.enableMermaid;
    const mathChanged = oldSettings.enableMathJax !== currentSettings.enableMathJax;
    if (mermaidChanged || mathChanged) {
      reRenderContent();
    }
  }

  /**
   * 重新渲染 Markdown 内容（Mermaid/Math 开关变化时调用）
   */
  async function reRenderContent() {
    if (!window.__MD_RAW_SOURCE__) return;

    const rawMarkdown = window.__MD_RAW_SOURCE__;

    // 重新配置 marked（重置目录）
    tocItems = [];
    configureMarked();

    // 预处理数学公式
    let processedMarkdown = rawMarkdown;
    if (currentSettings.enableMathJax) {
      processedMarkdown = preprocessMath(rawMarkdown);
    } else {
      mathExpressions = [];
    }

    // 解析 Markdown → HTML
    let htmlContent = '';
    try {
      const rawHtml = marked.parse(processedMarkdown);
      if (typeof DOMPurify !== 'undefined') {
        htmlContent = DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ['div', 'figure', 'figcaption', 'input', 'details', 'summary', 'mark', 'u', 'section', 'sup', 'ol', 'li', 'span', 'dl', 'dt', 'dd'],
          ADD_ATTR: [
            'class', 'id', 'loading', 'checked', 'disabled', 'open', 'style',
            'target', 'rel', 'title', 'href', 'src', 'alt',
            'data-source', 'data-index',
            'data-footnotes', 'data-footnote-ref', 'data-footnote-backref',
            'data-footnoteref', 'data-footnotebackref',
            'aria-describedby', 'aria-label',
          ],
          ALLOW_DATA_ATTR: true,
          FORBID_TAGS: [],
          FORBID_ATTR: [],
          RETURN_TRUSTED_TYPE: false,
        });
        const rawHasLinks = rawHtml.includes('<a ');
        const sanitizedHasLinks = (typeof htmlContent === 'string') && htmlContent.includes('<a ');
        if (rawHasLinks && !sanitizedHasLinks) {
          htmlContent = rawHtml;
        }
      } else {
        htmlContent = rawHtml;
      }
    } catch (err) {
      console.error('[MD Viewer] Markdown 重新解析失败:', err);
      return;
    }

    // 更新内容区域
    const contentEl = document.getElementById('md-content');
    if (contentEl) {
      contentEl.innerHTML = htmlContent;
    }

    // 重新应用代码高亮主题
    applyCodeTheme(currentSettings.codeTheme);

    // 重新应用行号
    if (contentEl) {
      const codeBlocks = contentEl.querySelectorAll('.code-block');
      codeBlocks.forEach(block => {
        block.classList.toggle('show-line-numbers', !!currentSettings.showLineNumbers);
      });
    }

    // 重新生成目录
    buildToc();

    // 重新渲染 Mermaid
    await renderMermaidDiagrams();

    // 重新渲染数学公式
    await renderMathFormulas();

    console.log('[MD Viewer] 内容已重新渲染 ✅');
  }

  // 暗色代码高亮主题列表
  const DARK_CODE_THEMES = [
    'github-dark', 'monokai', 'vs2015', 'atom-one-dark',
    'one-dark-pro', 'dracula', 'nord', 'solarized-dark', 'tokyo-night',
    'default-dark-modern'
  ];

  /**
   * 应用代码高亮主题
   * 通过在 #md-viewer-app 上设置 data-code-theme 属性切换主题
   * 同时给每个 .code-block 添加 code-theme-dark/code-theme-light 类以确保 header 反色
   */
  function applyCodeTheme(themeName) {
    const app = document.getElementById('md-viewer-app');
    if (!app) return;

    const resolvedTheme = resolveCodeTheme(themeName);
    app.setAttribute('data-code-theme', resolvedTheme);

    // 判断是否为暗色代码主题
    const isDarkCodeTheme = DARK_CODE_THEMES.includes(resolvedTheme);

    // 给所有 .code-block 添加/移除暗色标记类
    const codeBlocks = app.querySelectorAll('.code-block');
    codeBlocks.forEach(block => {
      block.classList.toggle('code-theme-dark', isDarkCodeTheme);
      block.classList.toggle('code-theme-light', !isDarkCodeTheme);
    });

    console.log(`[MD Viewer] 代码高亮主题已切换: ${resolvedTheme} (${isDarkCodeTheme ? '暗色' : '亮色'})`);
  }

  /**
   * 解析代码高亮主题名（处理 "auto" 模式）
   * auto 模式下：跟随页面主题自动选择亮色/暗色代码主题
   */
  function resolveCodeTheme(themeName) {
    if (themeName === 'auto') {
      // 检测当前是否为暗色模式
      const app = document.getElementById('md-viewer-app');
      const isDark = app && (app.classList.contains('theme-dark') ||
        (app.classList.contains('theme-auto') && window.matchMedia('(prefers-color-scheme: dark)').matches));
      return isDark ? 'github-dark' : 'github';
    }
    return themeName || 'github';
  }

  /**
   * 重新渲染 Mermaid（主题切换时）
   */
  async function reRenderMermaid() {
    if (!currentSettings.enableMermaid || typeof mermaid === 'undefined') return;

    const containers = document.querySelectorAll('.mermaid-container');
    containers.forEach(container => {
      const mermaidDiv = container.querySelector('.mermaid');
      if (mermaidDiv) {
        // data-source 属性保留了原始 base64 编码，无需修改
        mermaidDiv.innerHTML = '';
        mermaidDiv.classList.remove('mermaid-rendered');
        mermaidDiv.removeAttribute('data-processed');
      }
    });

    await renderMermaidDiagrams();
  }

  // ==================== 自动检测主题 ====================

  /**
   * 检测系统深色模式
   */
  function detectSystemTheme() {
    if (currentSettings.theme !== 'auto') return;
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const app = document.getElementById('md-viewer-app');
    if (app) {
      app.className = `md-viewer-app theme-${isDark ? 'dark' : 'light'}`;
    }
  }

  // ==================== 主流程 ====================

  /**
   * 主初始化函数
   */
  async function init() {
    // 检测是否为 Markdown 文件
    if (!isMarkdownFile()) {
      console.log('[MD Viewer] 当前页面不是 Markdown 文件，跳过渲染');
      return;
    }

    console.log('[MD Viewer] 检测到 Markdown 文件，开始渲染...');

    // 获取原始 Markdown 内容
    const rawMarkdown = getRawContent();
    if (!rawMarkdown || rawMarkdown.trim().length === 0) {
      console.warn('[MD Viewer] 页面内容为空');
      return;
    }

    // 保存原始源码
    window.__MD_RAW_SOURCE__ = rawMarkdown;

    // 加载用户设置
    currentSettings = await loadSettings();

    // 检测系统主题
    if (currentSettings.theme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      currentSettings.theme = isDark ? 'dark' : 'light';
    }

    // 配置 marked 解析器
    tocItems = [];
    configureMarked();

    // 预处理数学公式（在 marked 解析前保护公式）
    let processedMarkdown = rawMarkdown;
    if (currentSettings.enableMathJax) {
      processedMarkdown = preprocessMath(rawMarkdown);
      console.log(`[MD Viewer] 检测到 ${mathExpressions.length} 个数学公式`);
    }

    // 解析 Markdown → HTML
    let htmlContent = '';
    try {
      // 使用 DOMPurify 清理（如果可用）
      const rawHtml = marked.parse(processedMarkdown);
      // 使用 DOMPurify 清理 HTML（防止 XSS）
      if (typeof DOMPurify !== 'undefined') {
        htmlContent = DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ['div', 'figure', 'figcaption', 'input', 'details', 'summary', 'mark', 'u', 'section', 'sup', 'ol', 'li', 'span', 'dl', 'dt', 'dd'],
          ADD_ATTR: [
            'class', 'id', 'loading', 'checked', 'disabled', 'open', 'style',
            'target', 'rel', 'title', 'href', 'src', 'alt',
            'data-source', 'data-index',
            'data-footnotes', 'data-footnote-ref', 'data-footnote-backref',
            'data-footnoteref', 'data-footnotebackref',
            'aria-describedby', 'aria-label',
          ],
          ALLOW_DATA_ATTR: true,
          FORBID_TAGS: [],
          FORBID_ATTR: [],
          RETURN_TRUSTED_TYPE: false,
        });
        // 安全检查：如果 DOMPurify 意外清除了链接标签，回退到原始 HTML
        const rawHasLinks = rawHtml.includes('<a ');
        const sanitizedHasLinks = (typeof htmlContent === 'string') && htmlContent.includes('<a ');
        if (rawHasLinks && !sanitizedHasLinks) {
          console.warn('[MD Viewer] DOMPurify 意外清除了链接标签，回退到原始 HTML');
          htmlContent = rawHtml;
        }
      } else {
        htmlContent = rawHtml;
      }
    } catch (err) {
      console.error('[MD Viewer] Markdown 解析失败:', err);
      htmlContent = `<div class="md-error"><p>⚠️ Markdown 解析失败</p><pre>${escapeHtml(rawMarkdown)}</pre></div>`;
    }

    // 构建渲染页面
    buildPage(htmlContent);

    // 应用代码高亮主题
    applyCodeTheme(currentSettings.codeTheme);

    // 生成目录
    buildToc();

    // 渲染 Mermaid 图表
    await renderMermaidDiagrams();

    // 渲染数学公式
    await renderMathFormulas();

    // 绑定事件
    bindEvents();

    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (currentSettings.theme === 'auto') {
        detectSystemTheme();
        reRenderMermaid();
        // 联动更新代码高亮主题（auto 模式下）
        if (currentSettings.codeTheme === 'auto') {
          applyCodeTheme('auto');
        }
      }
    });

    // 处理 URL hash 定位
    if (window.location.hash) {
      const target = document.getElementById(window.location.hash.slice(1));
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    }

    isRendered = true;
    console.log('[MD Viewer] Markdown 渲染完成 ✅');
  }

  // 启动
  init().catch(err => {
    console.error('[MD Viewer] 初始化失败:', err);
  });

})();
