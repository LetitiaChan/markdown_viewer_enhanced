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

  // 支持在文件浏览器中显示的文件扩展名（Markdown 格式 + 常见关联文件）
  const SUPPORTED_FILE_EXTENSIONS = /\.(md|mdc|markdown|mkd|mdown|mdtxt|mdtext)$/i;

  // 预缓存的目录文件列表（通过 background 临时 tab 获取）
  let __cachedDirItems = null;
  // 目录获取 Promise（用于等待预获取完成）
  let __dirFetchPromise = null;

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
    codeTheme: 'default-dark-modern',
    fontSize: 16,
    lineHeight: 1.6,
    showToc: true,
    tocPosition: 'right',
    enableMermaid: true,
    enableMathJax: true,
    enablePlantUML: true,
    enableGraphviz: true,
    autoDetect: true,
    maxWidth: 1200,
    fontFamily: 'system',
    showLineNumbers: false,
    language: 'zh-CN',
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

  // 记录已使用的 baseId，避免重复锚点
  let usedBaseIds = new Set();
  let markedExtensionsRegistered = false;

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
    usedBaseIds = new Set();

    // 自定义标题渲染 - 收集目录信息
    renderer.heading = function (data) {
      const depth = data.depth;
      const text = data.text;
      const textHtml = data.tokens ? this.parser.parseInline(data.tokens) : text;
      const baseId = generateId(text);
      const id = baseId + '-' + headingIndex++;
      tocItems.push({ id, text, depth, baseId });
      // 同时输出一个不带后缀的隐形锚点，使 Markdown 中手写的 [xxx](#anchor) 锚点链接也能匹配
      // 仅在该 baseId 首次出现时添加，避免重复 ID
      let extraAnchor = '';
      if (!usedBaseIds.has(baseId)) {
        usedBaseIds.add(baseId);
        extraAnchor = `<span id="${baseId}" class="md-anchor-alias"></span>`;
      }
      return `<h${depth} id="${id}" class="md-heading">
        ${extraAnchor}<a class="md-anchor" href="#${id}">#</a>
        ${textHtml}
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
          <button class="mermaid-copy-btn" title="${t('code.mermaidCopy.title')}">📋</button>
          <pre class="mermaid-source" style="display:none"><code>${escapeHtml(code)}</code></pre>
        </div>`;
      }

      // PlantUML 代码块处理
      if ((lang === 'plantuml' || lang === 'puml') && currentSettings.enablePlantUML) {
        const base64Code = btoa(unescape(encodeURIComponent(code)));
        return `<div class="plantuml-container" data-source="${base64Code}">
          <pre class="plantuml-source" style="display:none"><code>${escapeHtml(code)}</code></pre>
        </div>`;
      }

      // Graphviz/DOT 代码块处理
      if ((lang === 'dot' || lang === 'graphviz') && currentSettings.enableGraphviz) {
        const base64Code = btoa(unescape(encodeURIComponent(code)));
        return `<div class="graphviz-container" data-source="${base64Code}">
          <pre class="graphviz-source" style="display:none"><code>${escapeHtml(code)}</code></pre>
        </div>`;
      }

      // 行号类名：根据设置决定是否添加 show-line-numbers
      const lineNumClass = currentSettings.showLineNumbers ? ' show-line-numbers' : '';

      /**
       * 将高亮后的 HTML 代码按行包裹 <span class="code-line">
       * 以支持 CSS counter 行号显示
       * 对 diff 语言，自动检测 addition/deletion 行并添加辅助类名实现整行背景色
       */
      function wrapLines(highlightedCode, language) {
        // 按换行符拆分，保留 HTML 标签完整性
        const lines = highlightedCode.split('\n');
        // 去除最后一行的空行（通常代码末尾有一个换行）
        if (lines.length > 0 && lines[lines.length - 1] === '') {
          lines.pop();
        }
        const isDiff = language === 'diff';
        return lines.map(line => {
          let lineClass = 'code-line';
          if (isDiff) {
            // 优先检测 hljs 生成的 class（如果 hljs 支持 diff 语言）
            if (line.includes('hljs-addition')) {
              lineClass += ' diff-addition';
            } else if (line.includes('hljs-deletion')) {
              lineClass += ' diff-deletion';
            } else {
              // hljs 未识别 diff 语言时，通过纯文本行首字符判断
              const plainText = line.replace(/<[^>]*>/g, '');
              if (plainText.startsWith('+')) {
                lineClass += ' diff-addition';
              } else if (plainText.startsWith('-')) {
                lineClass += ' diff-deletion';
              }
            }
          }
          return `<span class="${lineClass}">${line}</span>`;
        }).join('\n');
      }

      // 普通代码块 - 使用 highlight.js
      // 注意：使用 <div> 而非 <pre> 作为 .code-block 容器，
      // 因为 <pre> 内不允许嵌套 <div>（code-header），浏览器会自动修复 DOM 结构导致样式失效
      if (lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang)) {
        try {
          const highlighted = hljs.highlight(code, { language: lang }).value;
          return `<div class="code-block${lineNumClass}"><div class="code-header"><span class="code-lang">${lang}</span><button class="code-copy-btn" title="${t('code.copy.title')}">${t('code.copy')}</button></div><pre><code class="hljs language-${lang}">${wrapLines(highlighted, lang)}</code></pre></div>`;
        } catch (e) {
          // 高亮失败，使用默认渲染
        }
      }

      // 尝试自动检测语言
      if (typeof hljs !== 'undefined') {
        try {
          const highlighted = hljs.highlightAuto(code).value;
          return `<div class="code-block${lineNumClass}"><div class="code-header"><span class="code-lang">${lang || 'code'}</span><button class="code-copy-btn" title="${t('code.copy.title')}">${t('code.copy')}</button></div><pre><code class="hljs">${wrapLines(highlighted, lang)}</code></pre></div>`;
        } catch (e) {
          // 忽略
        }
      }

      return `<div class="code-block${lineNumClass}"><div class="code-header"><span class="code-lang">${lang || 'code'}</span><button class="code-copy-btn" title="${t('code.copy.title')}">${t('code.copy')}</button></div><pre><code>${wrapLines(escapeHtml(code))}</code></pre></div>`;
    };

    // 自定义链接渲染 - 外部链接新窗口打开
    renderer.link = function (data) {
      const href = data.href;
      const title = data.title;
      let text = data.tokens ? this.parser.parseInline(data.tokens) : data.text;
      const titleAttr = title ? ` title="${title}"` : '';
      const isExternal = href && (href.startsWith('http://') || href.startsWith('https://'));
      const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';

      // 处理链接内嵌套图片的情况，如 [![alt](img-url)](link-url)
      // marked 新版本中 data.tokens 包含已解析的子 token，data.text 是未渲染的原始文本
      if (data.tokens && data.tokens.length === 1 && data.tokens[0].type === 'image') {
        const firstToken = data.tokens[0];
        const imgTitle = firstToken.title ? ` title="${firstToken.title}"` : '';
        text = `<img src="${firstToken.href}" alt="${firstToken.text}"${imgTitle} loading="lazy" class="md-image" />`;
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
        NOTE:      { icon: 'ℹ️', title: t('alert.note'),      class: 'note' },
        TIP:       { icon: '💡', title: t('alert.tip'),       class: 'tip' },
        IMPORTANT: { icon: '❗', title: t('alert.important'),  class: 'important' },
        WARNING:   { icon: '⚠️', title: t('alert.warning'),   class: 'warning' },
        CAUTION:   { icon: '🔴', title: t('alert.caution'),   class: 'caution' },
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
      breaks: false,
      pedantic: false,
      smartLists: true,
      smartypants: false,
    });

    if (!markedExtensionsRegistered) {
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
      markedExtensionsRegistered = true;
    }
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
            <button id="btn-toggle-toc" class="md-toolbar-btn" title="${t('toolbar.toc.title')}">${t('toolbar.toc')}</button>
            <button id="btn-toggle-theme" class="md-toolbar-btn" title="${t('toolbar.theme.title')}">${t('toolbar.theme')}</button>
            <button id="btn-toggle-raw" class="md-toolbar-btn" title="${t('toolbar.source.title')}">${t('toolbar.source')}</button>
            <button id="btn-settings" class="md-toolbar-btn" title="${t('toolbar.settings.title')}">${t('toolbar.settings')}</button>
            <button id="btn-refresh" class="md-toolbar-btn" title="${t('toolbar.refresh.title')}">${t('toolbar.refresh')}</button>
          </div>
        </div>

        <div class="md-main-container">
          <!-- 侧边栏（含文件浏览器 + 目录页签） -->
          <aside id="md-toc-sidebar" class="md-toc-sidebar toc-${currentSettings.tocPosition} ${currentSettings.showToc ? 'visible' : 'hidden'}">
            <!-- 页签栏 -->
            <div class="sidebar-tabs">
              <button class="sidebar-tab" data-tab="files" title="${t('sidebar.files.title')}">📁</button>
              <button class="sidebar-tab active" data-tab="toc" title="${t('sidebar.toc.title')}">≡</button>
              <span class="sidebar-tab-spacer"></span>
              <div class="sidebar-tab-actions">
                <button id="btn-sidebar-menu" class="sidebar-action-btn" title="${t('sidebar.menu.title')}">⋯</button>
                <button id="btn-close-toc" class="md-toc-close" title="${t('sidebar.close.title')}">✕</button>
              </div>
            </div>
            <!-- 侧边栏菜单（内联折叠） -->
            <div id="sidebar-context-menu" class="sidebar-context-menu" style="display:none;"></div>
            <!-- 文件浏览器面板 -->
            <div id="sidebar-panel-files" class="sidebar-panel" style="display:none;">
              <div id="file-tree-breadcrumb" class="file-tree-breadcrumb"></div>
              <div id="file-tree" class="file-tree"></div>
            </div>
            <!-- 目录面板 -->
            <div id="sidebar-panel-toc" class="sidebar-panel">
              <nav id="md-toc-nav" class="md-toc-nav"></nav>
            </div>
            <!-- 侧边栏拖拽调整宽度的手柄 -->
            <div id="sidebar-resize-handle" class="sidebar-resize-handle" style="${currentSettings.showToc ? '' : 'display:none;'}"></div>
          </aside>

          <!-- 主内容区域 -->
          <main id="md-content" class="md-content markdown-viewer-enhanced" style="max-width:${currentSettings.maxWidth}px; font-size:${currentSettings.fontSize}px; line-height:${currentSettings.lineHeight}; --code-font-size:${currentSettings.codeFontSize || 14}px;">
            ${htmlContent}
          </main>

          <!-- 源码面板（默认隐藏） -->
          <pre id="md-raw-content" class="md-raw-content" style="display:none;"></pre>
        </div>

        <!-- 回到顶部浮动按钮 -->
        <button id="btn-float-top" class="md-float-top" style="display:none;" title="${t('sidebar.backToTop.title')}">⬆️</button>


        <!-- Mermaid 图表预览遮罩 -->
        <div id="md-mermaid-overlay" class="md-mermaid-overlay" style="display:none;">
          <div class="md-mermaid-zoom-bar">
            <button class="md-mermaid-zoom-btn" id="btn-mermaid-zoom-out" title="${t('mermaid.zoomOut.title')}">➖</button>
            <span class="md-mermaid-zoom-level" id="md-mermaid-zoom-level">100%</span>
            <button class="md-mermaid-zoom-btn" id="btn-mermaid-zoom-in" title="${t('mermaid.zoomIn.title')}">➕</button>
            <button class="md-mermaid-zoom-btn" id="btn-mermaid-zoom-reset" title="${t('mermaid.zoomReset.title')}">${t('mermaid.zoomReset')}</button>
            <button class="md-mermaid-zoom-btn" id="btn-mermaid-zoom-fit" title="${t('mermaid.zoomFit.title')}">${t('mermaid.zoomFit')}</button>
          </div>
          <div id="md-mermaid-preview" class="md-mermaid-preview">
            <div id="md-mermaid-canvas" class="md-mermaid-canvas"></div>
          </div>
          <button class="md-mermaid-close">${t('mermaid.close')}</button>
        </div>

        <!-- 内嵌设置弹窗（全屏卡片式） -->
        <div id="md-settings-overlay" class="md-settings-overlay" style="display:none;">
          <div class="md-settings-panel">
            <!-- 渐变头部 -->
            <div class="md-settings-header">
              <div class="md-settings-header-info">
                <div class="md-settings-header-title">${t('settings.title')}</div>
                <div class="md-settings-header-desc">${t('settings.desc')}</div>
              </div>
              <button id="btn-settings-close" class="md-settings-close">✕</button>
            </div>

            <!-- 可滚动内容区 -->
            <div class="md-settings-body">

              <!-- 外观主题卡片 -->
              <div class="md-settings-card">
                <div class="md-settings-card-header">
                  <span class="md-settings-card-icon">🎨</span>
                  <div>
                    <div class="md-settings-card-title">${t('settings.appearance.title')}</div>
                    <div class="md-settings-card-desc">${t('settings.appearance.desc')}</div>
                  </div>
                </div>
                <div class="md-settings-card-body">
                  <div class="md-settings-theme-selector">
                    <button class="md-stg-theme-btn" data-theme="light"><span>🌞</span> ${t('settings.theme.light')}</button>
                    <button class="md-stg-theme-btn" data-theme="dark"><span>🌙</span> ${t('settings.theme.dark')}</button>
                    <button class="md-stg-theme-btn" data-theme="auto"><span>💻</span> ${t('settings.theme.auto')}</button>
                  </div>
                  <!-- 语言 -->
                  <div class="md-settings-item" style="margin-top:8px;">
                    <div class="md-settings-item-left" style="flex:1;min-width:0;">
                      <span class="md-settings-item-icon">🌐</span>
                      <div>
                        <span class="md-settings-label">${t('settings.language.title')}</span>
                        <span class="md-settings-label-desc">${t('settings.language.desc')}</span>
                      </div>
                    </div>
                    <select id="stg-language" class="md-settings-select" style="max-width:160px;flex-shrink:0;">
                      <option value="zh-CN">CN 中文</option>
                      <option value="en">US English</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- 排版设置卡片 -->
              <div class="md-settings-card">
                <div class="md-settings-card-header">
                  <span class="md-settings-card-icon">📐</span>
                  <div>
                    <div class="md-settings-card-title">${t('settings.typography.title')}</div>
                    <div class="md-settings-card-desc">${t('settings.typography.desc')}</div>
                  </div>
                </div>
                <div class="md-settings-card-body">
                  <!-- 正文字体 -->
                  <div class="md-settings-item">
                    <div class="md-settings-item-left">
                      <span class="md-settings-item-icon">🔤</span>
                      <div>
                        <span class="md-settings-label">${t('settings.font.title')}</span>
                        <span class="md-settings-label-desc">${t('settings.font.desc')}</span>
                      </div>
                    </div>
                    <div class="md-stg-btn-group">
                      <button class="md-stg-btn-option" data-font="system">${t('settings.font.system')}</button>
                      <button class="md-stg-btn-option" data-font="serif">${t('settings.font.serif')}</button>
                      <button class="md-stg-btn-option" data-font="mono">${t('settings.font.mono')}</button>
                    </div>
                  </div>
                  <!-- 字体大小 -->
                  <div class="md-settings-item">
                    <div class="md-settings-item-left">
                      <span class="md-settings-item-icon">🔠</span>
                      <div>
                        <span class="md-settings-label">${t('settings.fontSize.title')}</span>
                        <span class="md-settings-label-desc">${t('settings.fontSize.desc')}</span>
                      </div>
                    </div>
                  </div>
                  <div class="md-stg-slider-row">
                    <span class="md-stg-slider-label">A</span>
                    <input type="range" id="stg-fontSize" min="12" max="24" step="1" value="16">
                    <span class="md-stg-slider-label" style="font-size:18px;">A</span>
                    <span class="md-stg-slider-value" id="stg-fontSizeVal">16px</span>
                  </div>
                  <!-- 行高 -->
                  <div class="md-settings-item">
                    <div class="md-settings-item-left">
                      <span class="md-settings-item-icon">↕️</span>
                      <div>
                        <span class="md-settings-label">${t('settings.lineHeight.title')}</span>
                        <span class="md-settings-label-desc">${t('settings.lineHeight.desc')}</span>
                      </div>
                    </div>
                  </div>
                  <div class="md-stg-slider-row">
                    <span class="md-stg-slider-label">${t('settings.lineHeight.compact')}</span>
                    <input type="range" id="stg-lineHeight" min="1.2" max="2.0" step="0.1" value="1.6">
                    <span class="md-stg-slider-label">${t('settings.lineHeight.loose')}</span>
                    <span class="md-stg-slider-value" id="stg-lineHeightVal">1.6</span>
                  </div>
                  <!-- 内容最大宽度 -->
                  <div class="md-settings-item">
                    <div class="md-settings-item-left">
                      <span class="md-settings-item-icon">↔️</span>
                      <div>
                        <span class="md-settings-label">${t('settings.maxWidth.title')}</span>
                        <span class="md-settings-label-desc">${t('settings.maxWidth.desc')}</span>
                      </div>
                    </div>
                  </div>
                  <div class="md-stg-slider-row">
                    <span class="md-stg-slider-label">${t('settings.maxWidth.narrow')}</span>
                    <input type="range" id="stg-maxWidth" min="600" max="1400" step="50" value="1200">
                    <span class="md-stg-slider-label">${t('settings.maxWidth.wide')}</span>
                    <span class="md-stg-slider-value" id="stg-maxWidthVal">1200px</span>
                  </div>
                </div>
              </div>

              <!-- 代码高亮主题卡片 -->
              <div class="md-settings-card">
                <div class="md-settings-card-header">
                  <span class="md-settings-card-icon">🖌️</span>
                  <div>
                    <div class="md-settings-card-title">${t('settings.codeTheme.title')}</div>
                    <div class="md-settings-card-desc">${t('settings.codeTheme.desc')}</div>
                  </div>
                </div>
                <div class="md-settings-card-body">
                  <div class="md-settings-code-theme-row">
                    <div class="md-settings-code-theme-label">
                      <span class="md-settings-label">${t('settings.codeTheme.title')}</span>
                      <span class="md-settings-label-desc">${t('settings.codeTheme.desc')}</span>
                    </div>
                    <select id="stg-codeTheme" class="md-settings-select">
                    <optgroup label="${t('settings.codeTheme.groupLight')}">
                      <option value="default-light-modern">Default Light Modern</option>
                      <option value="github">GitHub</option>
                      <option value="atom-one-light">Atom One Light</option>
                      <option value="solarized-light">Solarized Light</option>
                    </optgroup>
                    <optgroup label="${t('settings.codeTheme.groupDark')}">
                      <option value="default-dark-modern">Default Dark Modern</option>
                      <option value="github-dark">GitHub Dark</option>
                      <option value="monokai">Monokai</option>
                      <option value="vs2015">VS 2015</option>
                      <option value="atom-one-dark">Atom One Dark</option>
                      <option value="one-dark-pro">One Dark Pro</option>
                      <option value="dracula">Dracula</option>
                      <option value="nord">Nord</option>
                      <option value="solarized-dark">Solarized Dark</option>
                      <option value="tokyo-night">Tokyo Night</option>
                    </optgroup>
                    <optgroup label="${t('settings.codeTheme.groupAuto')}">
                      <option value="auto">${t('settings.codeTheme.followPage')}</option>
                    </optgroup>
                  </select>
                  </div>
                  <!-- 代码预览 -->
                  <div class="md-settings-code-preview" id="stg-code-preview">
                    <pre><code><span class="cp">function</span> <span class="cf">fibonacci</span>(n) {
  <span class="cm">// 递归实现斐波那契数列</span>
  <span class="cp">if</span> (n <= 1) <span class="cp">return</span> n;
  <span class="cp">return</span> <span class="cf">fibonacci</span>(n - 1) + <span class="cf">fibonacci</span>(n - 2);
}
<span class="cp">const</span> result = <span class="cf">fibonacci</span>(10);
console.<span class="cf">log</span>(<span class="cs">\`Result: \${result}\`</span>);</code></pre>
                  </div>
                </div>
              </div>

              <!-- 功能开关卡片 -->
              <div class="md-settings-card">
                <div class="md-settings-card-header">
                  <span class="md-settings-card-icon">⚙️</span>
                  <div>
                    <div class="md-settings-card-title">${t('settings.features.title')}</div>
                    <div class="md-settings-card-desc">${t('settings.features.desc')}</div>
                  </div>
                </div>
                <div class="md-settings-card-body">
                  <div class="md-settings-item">
                    <div class="md-settings-item-left">
                      <span class="md-settings-item-icon">📑</span>
                      <span class="md-settings-label">${t('settings.showToc')}</span>
                    </div>
                    <label class="md-stg-toggle"><input type="checkbox" id="stg-showToc" checked><span class="md-stg-toggle-slider"></span></label>
                  </div>
                  <div class="md-settings-item" id="stg-tocPosRow">
                    <div class="md-settings-item-left">
                      <span class="md-settings-item-icon">📌</span>
                      <span class="md-settings-label">${t('settings.tocPosition')}</span>
                    </div>
                    <div class="md-stg-btn-group">
                      <button class="md-stg-toc-pos-btn" data-pos="left">${t('settings.tocPosition.left')}</button>
                      <button class="md-stg-toc-pos-btn" data-pos="right">${t('settings.tocPosition.right')}</button>
                    </div>
                  </div>
                  <div class="md-settings-item">
                    <div class="md-settings-item-left">
                      <span class="md-settings-item-icon">📊</span>
                      <span class="md-settings-label">${t('settings.mermaid')}</span>
                    </div>
                    <label class="md-stg-toggle"><input type="checkbox" id="stg-enableMermaid" checked><span class="md-stg-toggle-slider"></span></label>
                  </div>
                  <div class="md-settings-item">
                    <div class="md-settings-item-left">
                      <span class="md-settings-item-icon">🔢</span>
                      <span class="md-settings-label">${t('settings.mathJax')}</span>
                    </div>
                    <label class="md-stg-toggle"><input type="checkbox" id="stg-enableMathJax"><span class="md-stg-toggle-slider"></span></label>
                  </div>
                  <div class="md-settings-item">
                    <div class="md-settings-item-left">
                      <span class="md-settings-item-icon">🌱</span>
                      <span class="md-settings-label">${t('settings.plantuml')}</span>
                    </div>
                    <label class="md-stg-toggle"><input type="checkbox" id="stg-enablePlantUML" checked><span class="md-stg-toggle-slider"></span></label>
                  </div>
                  <div class="md-settings-item">
                    <div class="md-settings-item-left">
                      <span class="md-settings-item-icon">🔗</span>
                      <span class="md-settings-label">${t('settings.graphviz')}</span>
                    </div>
                    <label class="md-stg-toggle"><input type="checkbox" id="stg-enableGraphviz" checked><span class="md-stg-toggle-slider"></span></label>
                  </div>
                  <div class="md-settings-item">
                    <div class="md-settings-item-left">
                      <span class="md-settings-item-icon">#️⃣</span>
                      <span class="md-settings-label">${t('settings.lineNumbers')}</span>
                    </div>
                    <label class="md-stg-toggle"><input type="checkbox" id="stg-showLineNumbers"><span class="md-stg-toggle-slider"></span></label>
                  </div>
                  <div class="md-settings-item">
                    <div class="md-settings-item-left">
                      <span class="md-settings-item-icon">🔍</span>
                      <span class="md-settings-label">${t('settings.autoDetect')}</span>
                    </div>
                    <label class="md-stg-toggle"><input type="checkbox" id="stg-autoDetect" checked><span class="md-stg-toggle-slider"></span></label>
                  </div>
                </div>
              </div>
            </div>

            <!-- 底部固定栏 -->
            <div class="md-settings-footer">
              <span class="md-settings-footer-hint">${t('settings.autoSave')}</span>
              <button id="btn-settings-reset" class="md-stg-footer-btn">${t('settings.resetDefault')}</button>
            </div>
          </div>
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
   * 生成目录导航（支持折叠/展开）
   * 构建层级树结构，每个有子级的项目会显示折叠按钮
   */
  function buildToc() {
    const tocNav = document.getElementById('md-toc-nav');
    if (!tocNav || tocItems.length === 0) return;

    const minDepth = Math.min(...tocItems.map(item => item.depth));

    // 构建层级结构：判断每个 item 是否有子项
    const hasChildren = new Array(tocItems.length).fill(false);
    for (let i = 0; i < tocItems.length; i++) {
      const currentDepth = tocItems[i].depth;
      for (let j = i + 1; j < tocItems.length; j++) {
        if (tocItems[j].depth <= currentDepth) break;
        if (tocItems[j].depth > currentDepth) {
          hasChildren[i] = true;
          break;
        }
      }
    }

    let tocHtml = '<ul class="md-toc-list">';
    tocItems.forEach((item, index) => {
      const indent = item.depth - minDepth;
      const isParent = hasChildren[index];
      const parentClass = isParent ? ' md-toc-parent' : '';
      const toggleBtn = isParent
        ? `<span class="md-toc-toggle" data-index="${index}" title="${t('sidebar.toc.toggle.title')}">▾</span>`
        : `<span class="md-toc-toggle-placeholder"></span>`;

      tocHtml += `<li class="md-toc-item toc-level-${indent}${parentClass}" data-toc-index="${index}" data-toc-depth="${item.depth}" style="padding-left:${indent * 16}px;">
        ${toggleBtn}<a href="#${item.id}" class="md-toc-link" data-index="${index}" title="${item.text}">
          ${item.text}
        </a>
      </li>`;
    });
    tocHtml += '</ul>';
    tocNav.innerHTML = tocHtml;
  }

  /**
   * 切换目录项的折叠/展开状态
   */
  function toggleTocItem(index) {
    const allItems = document.querySelectorAll('.md-toc-item');
    if (!allItems[index]) return;

    const parentItem = allItems[index];
    const parentDepth = parseInt(parentItem.dataset.tocDepth);
    const toggle = parentItem.querySelector('.md-toc-toggle');
    const isCollapsed = parentItem.classList.contains('toc-collapsed');

    if (isCollapsed) {
      // 展开：显示直接子项（非递归，已折叠的子项保持折叠）
      parentItem.classList.remove('toc-collapsed');
      if (toggle) toggle.textContent = '▾';
      for (let i = index + 1; i < allItems.length; i++) {
        const depth = parseInt(allItems[i].dataset.tocDepth);
        if (depth <= parentDepth) break;
        // 只展开直接子级
        if (depth === parentDepth + 1) {
          allItems[i].style.display = '';
        }
        // 如果子项是一个已展开的父项，也递归显示其子项
        if (depth === parentDepth + 1 && allItems[i].classList.contains('md-toc-parent') && !allItems[i].classList.contains('toc-collapsed')) {
          // 子项已展开，显示子项的子项
          const subDepth = depth;
          for (let j = i + 1; j < allItems.length; j++) {
            const d = parseInt(allItems[j].dataset.tocDepth);
            if (d <= subDepth) break;
            allItems[j].style.display = '';
          }
        }
      }
    } else {
      // 折叠：隐藏所有后代项
      parentItem.classList.add('toc-collapsed');
      if (toggle) toggle.textContent = '▸';
      for (let i = index + 1; i < allItems.length; i++) {
        const depth = parseInt(allItems[i].dataset.tocDepth);
        if (depth <= parentDepth) break;
        allItems[i].style.display = 'none';
      }
    }
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

  // ==================== 文件浏览器 ====================

  /**
   * 当前文件浏览器的状态
   */
  let fileTreeState = {
    sortBy: 'name',      // name | size | modified
    sortAsc: true,        // 升序
    foldersFirst: true,   // 文件夹置顶
    showHidden: true,     // 显示隐藏文件
    expandedDirs: {},     // 已展开的目录路径
    data: null,           // 缓存的文件数据
  };

  /**
   * 判断当前页面是否为 file:// 协议（文件浏览器仅在本地文件生效）
   */
  function isFileProtocol() {
    return window.location.protocol === 'file:';
  }

  /**
   * 获取当前文件所在目录的 URL
   */
  function getCurrentDirUrl() {
    const href = window.location.href;
    return href.substring(0, href.lastIndexOf('/') + 1);
  }

  /**
   * 获取当前目录的路径名（从 file:// URL 中解析）
   */
  function getCurrentDirPath() {
    const dirUrl = getCurrentDirUrl();
    try {
      const pathname = decodeURIComponent(new URL(dirUrl).pathname);
      return pathname;
    } catch {
      return dirUrl;
    }
  }

  /**
   * 渲染文件浏览器面包屑导航（显示当前目录路径）
   */
  function renderBreadcrumb() {
    const breadcrumbEl = document.getElementById('file-tree-breadcrumb');
    if (!breadcrumbEl) return;

    const dirUrl = getCurrentDirUrl();
    const dirPath = getCurrentDirPath();

    // 将路径拆成片段用于导航
    // 如 /C:/Users/xxx/docs/ → ['C:', 'Users', 'xxx', 'docs']
    const segments = dirPath.split('/').filter(Boolean);

    let html = '<span class="breadcrumb-icon">📂</span>';

    // 构建每一级的可点击路径
    let accUrl = dirUrl.split('/').slice(0, 3).join('/') + '/'; // file:///
    segments.forEach((seg, idx) => {
      const isLast = idx === segments.length - 1;
      accUrl += seg + '/';
      if (isLast) {
        html += `<span class="breadcrumb-current" title="${escapeHtml(dirPath)}">${escapeHtml(seg)}</span>`;
      } else {
        html += `<a class="breadcrumb-link" href="#" data-url="${escapeHtml(accUrl)}" title="${escapeHtml(accUrl)}">${escapeHtml(seg)}</a>`;
        html += '<span class="breadcrumb-sep">/</span>';
      }
    });

    breadcrumbEl.innerHTML = html;
  }

  /**
   * 获取当前文件名
   */
  function getCurrentFileName() {
    return decodeURIComponent(window.location.pathname.split('/').pop() || '');
  }

  /**
   * 在 init() 中 buildPage() 之后调用：
   * 预获取当前目录的文件列表
   * 通过 background service worker 临时 tab + executeScript 获取
   */
  function prefetchDirectoryHtml() {
    const href = window.location.href;
    const dirUrl = href.substring(0, href.lastIndexOf('/') + 1);

    __dirFetchPromise = new Promise((resolve) => {
      console.log('[MD Viewer] 开始通过 background 预获取目录:', dirUrl);
      fetchDirectoryViaBackground(dirUrl).then(items => {
        if (items.length > 0) {
          __cachedDirItems = items;
          console.log('[MD Viewer] 目录预获取成功，文件数:', items.length);
        } else {
          console.log('[MD Viewer] 目录预获取返回空列表');
        }
        resolve(items);
      }).catch(err => {
        console.warn('[MD Viewer] 目录预获取异常:', err.message || String(err));
        resolve([]);
      });
    });
  }

  /**
   * 通过 background service worker 获取目录列表
   * background 使用 chrome.tabs.create + chrome.scripting.executeScript
   */
  function fetchDirectoryViaBackground(dirUrl) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'FETCH_DIRECTORY', url: dirUrl }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('[MD Viewer] background 目录获取失败:', chrome.runtime.lastError.message);
            resolve([]);
            return;
          }
          if (response && response.items && response.items.length > 0) {
            __cachedDirItems = response.items;
            console.log('[MD Viewer] background 返回目录文件数:', response.items.length);
            resolve(response.items);
          } else {
            console.log('[MD Viewer] background 返回空结果');
            resolve([]);
          }
        });
      } catch (err) {
        console.warn('[MD Viewer] background 目录预获取异常:', err.message || String(err));
        resolve([]);
      }
    });
  }

  /**
   * 获取目录文件列表
   * 优先使用预缓存的列表，回退到 background 消息方式
   */
  async function fetchDirectoryListing(dirUrl) {
    // 方法 1：使用预缓存的目录列表
    if (__cachedDirItems && __cachedDirItems.length > 0) {
      console.log('[MD Viewer] 从预缓存获取到', __cachedDirItems.length, '个文件/目录');
      return __cachedDirItems;
    }

    // 方法 2：等待预获取 Promise 完成
    if (__dirFetchPromise) {
      try {
        const items = await __dirFetchPromise;
        if (items && items.length > 0) {
          return items;
        }
      } catch (err) {
        console.warn('[MD Viewer] 等待预获取失败:', err.message || String(err));
      }
    }

    // 方法 3：通过 background 获取
    try {
      const items = await fetchDirectoryViaBackground(dirUrl);
      if (items.length > 0) {
        __cachedDirItems = items;
        return items;
      }
    } catch (err) {
      console.warn('[MD Viewer] background 获取目录失败:', err.message || String(err));
    }

    return [];
  }

  /**
   * 解析浏览器生成的文件目录 HTML 字符串
   * 支持多种 Chrome/Firefox 的目录页面格式
   */
  function parseDirectoryHtml(html, baseUrl) {
    const items = [];

    // 方法 A：DOMParser 解析（支持标准 HTML 结构）
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Chrome 目录页面：table#table > tbody > tr
      const rows = doc.querySelectorAll('#table tbody tr');
      if (rows.length > 0) {
        rows.forEach(row => {
          const linkEl = row.querySelector('a');
          if (!linkEl) return;
          const name = linkEl.textContent.trim();
          if (name === '.' || name === '..') return;

          const isDir = name.endsWith('/');
          const displayName = isDir ? name.slice(0, -1) : name;

          const cells = row.querySelectorAll('td');
          const sizeText = cells[1] ? cells[1].textContent.trim() : '';
          const dateText = cells[2] ? cells[2].textContent.trim() : '';

          items.push({
            name: displayName,
            isDir,
            url: new URL(linkEl.getAttribute('href'), baseUrl).href,
            size: sizeText,
            date: dateText,
          });
        });
        if (items.length > 0) return items;
      }

      // Firefox / 旧版 Chrome：简单 <a> 列表
      const links = doc.querySelectorAll('a');
      links.forEach(a => {
        const name = a.textContent.trim();
        if (!name || name === '.' || name === '..' || name === 'Parent Directory') return;
        const isDir = name.endsWith('/');
        const displayName = isDir ? name.slice(0, -1) : name;
        items.push({
          name: displayName,
          isDir,
          url: new URL(a.getAttribute('href'), baseUrl).href,
          size: '',
          date: '',
        });
      });
      if (items.length > 0) return items;
    } catch (err) {
      console.warn('[MD Viewer] DOMParser 解析失败，尝试正则:', err);
    }

    // 方法 B：正则表达式解析（兼容 DOMParser 无法处理的特殊格式）
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const name = match[2].trim();

      if (!name || name === '.' || name === '..' || name === 'Parent Directory' ||
          name === 'Name' || name === 'Size' || name === 'Date Modified') continue;
      if (href.startsWith('?')) continue;

      const isDir = name.endsWith('/');
      const displayName = isDir ? name.slice(0, -1) : name;

      try {
        items.push({
          name: displayName,
          isDir,
          url: new URL(href, baseUrl).href,
          size: '',
          date: '',
        });
      } catch (e) {
        // URL 解析失败
      }
    }

    return items;
  }

  /**
   * 对文件列表排序
   */
  function sortFileList(items) {
    const { sortBy, sortAsc, foldersFirst, showHidden } = fileTreeState;

    // 过滤隐藏文件
    let filtered = items;
    if (!showHidden) {
      filtered = items.filter(item => !item.name.startsWith('.'));
    }

    return filtered.sort((a, b) => {
      // 文件夹置顶
      if (foldersFirst) {
        if (a.isDir && !b.isDir) return -1;
        if (!a.isDir && b.isDir) return 1;
      }

      let cmp = 0;
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      } else if (sortBy === 'size') {
        cmp = parseSizeToBytes(a.size) - parseSizeToBytes(b.size);
      } else if (sortBy === 'modified') {
        cmp = (a.date || '').localeCompare(b.date || '');
      }

      return sortAsc ? cmp : -cmp;
    });
  }

  /**
   * 简单的文件大小解析
   */
  function parseSizeToBytes(sizeStr) {
    if (!sizeStr || sizeStr === '-') return 0;
    const match = sizeStr.match(/([\d.]+)\s*(B|K|KB|M|MB|G|GB|T|TB)?/i);
    if (!match) return 0;
    const num = parseFloat(match[1]);
    const unit = (match[2] || 'B').toUpperCase();
    const multipliers = { B: 1, K: 1024, KB: 1024, M: 1048576, MB: 1048576, G: 1073741824, GB: 1073741824, T: 1099511627776, TB: 1099511627776 };
    return num * (multipliers[unit] || 1);
  }

  /**
   * 获取文件图标
   */
  function getFileIcon(name, isDir) {
    if (isDir) return '📁';
    const ext = name.split('.').pop().toLowerCase();
    const iconMap = {
      md: 'M', mdc: 'M', markdown: 'M', mkd: 'M', mdown: 'M',
      js: '📜', ts: '📜', jsx: '📜', tsx: '📜',
      html: '🌐', htm: '🌐', css: '🎨',
      json: '📋', xml: '📋', yaml: '📋', yml: '📋', toml: '📋',
      py: '🐍', rb: '💎', go: '🔵', rs: '🦀', java: '☕', c: '⚙️', cpp: '⚙️', h: '⚙️',
      png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️', ico: '🖼️',
      pdf: '📕', doc: '📄', docx: '📄', xls: '📊', xlsx: '📊', ppt: '📊', pptx: '📊',
      zip: '📦', tar: '📦', gz: '📦', rar: '📦', '7z': '📦',
      txt: '📝', log: '📝', csv: '📝',
      sh: '🖥️', bat: '🖥️', cmd: '🖥️', ps1: '🖥️',
      gitignore: '⚙️', env: '⚙️', lock: '🔒',
    };
    return iconMap[ext] || '📄';
  }

  /**
   * 构建并渲染文件树
   */
  async function buildFileTree() {
    if (!isFileProtocol()) return;

    const fileTreeEl = document.getElementById('file-tree');
    if (!fileTreeEl) return;

    fileTreeEl.innerHTML = '<div class="file-tree-loading">' + t('fileTree.loading') + '</div>';

    // 渲染面包屑路径
    renderBreadcrumb();

    const dirUrl = getCurrentDirUrl();
    const items = await fetchDirectoryListing(dirUrl);
    fileTreeState.data = items;

    renderFileTree(fileTreeEl, items);
  }

  /**
   * 渲染文件树列表
   * 只显示支持格式的文件（Markdown）和子级文件夹
   * @param {HTMLElement} container - 容器元素
   * @param {Array} items - 文件列表
   * @param {number} depth - 缩进层级（0 = 根目录）
   */
  function renderFileTree(container, items, depth = 0) {
    if (!items || items.length === 0) {
      if (depth === 0) {
        container.innerHTML = '<div class="file-tree-empty">' + t('fileTree.empty') + '</div>';
      }
      return;
    }

    // 过滤：只保留子级文件夹 + 支持的文件格式（Markdown）
    const filtered = items.filter(item => {
      if (item.isDir) return true;
      return SUPPORTED_FILE_EXTENSIONS.test(item.name);
    });

    if (filtered.length === 0) {
      if (depth === 0) {
        container.innerHTML = '<div class="file-tree-empty">' + t('fileTree.noMarkdown') + '</div>';
      }
      return;
    }

    const sorted = sortFileList(filtered);
    const currentFile = getCurrentFileName();

    let html = '<ul class="file-tree-list">';
    sorted.forEach(item => {
      const icon = getFileIcon(item.name, item.isDir);
      const activeClass = (!item.isDir && item.name === currentFile && depth === 0) ? ' file-tree-active' : '';
      const isMd = !item.isDir && SUPPORTED_FILE_EXTENSIONS.test(item.name);
      const dirClass = item.isDir ? ' file-tree-dir' : '';
      const mdClass = isMd ? ' file-tree-md' : '';
      const isExpanded = item.isDir && fileTreeState.expandedDirs[item.url];
      const expandedClass = isExpanded ? ' file-tree-expanded' : '';
      const indentStyle = depth > 0 ? ` style="padding-left:${12 + depth * 16}px"` : '';

      if (item.isDir) {
        // 文件夹：带展开/折叠箭头 + 子目录容器
        const arrow = isExpanded ? '▾' : '▸';
        html += `<li class="file-tree-item${dirClass}${expandedClass}" data-url="${escapeHtml(item.url)}" data-is-dir="true" data-name="${escapeHtml(item.name)}" title="${escapeHtml(item.name)}"${indentStyle}>
          <span class="file-tree-arrow">${arrow}</span>
          <span class="file-tree-icon">${icon}</span>
          <span class="file-tree-name">${escapeHtml(item.name)}</span>
        </li>`;
        // 子目录容器（展开时显示）
        html += `<li class="file-tree-subdir" data-dir-url="${escapeHtml(item.url)}" style="${isExpanded ? '' : 'display:none;'}">`;
        if (isExpanded && fileTreeState.expandedDirs[item.url]?.items) {
          // 已有缓存数据，递归渲染子目录
          html += '<ul class="file-tree-list">';
          const subFiltered = fileTreeState.expandedDirs[item.url].items.filter(sub => {
            if (sub.isDir) return true;
            return SUPPORTED_FILE_EXTENSIONS.test(sub.name);
          });
          const subSorted = sortFileList(subFiltered);
          subSorted.forEach(sub => {
            const subIcon = getFileIcon(sub.name, sub.isDir);
            const subIsMd = !sub.isDir && SUPPORTED_FILE_EXTENSIONS.test(sub.name);
            const subDirClass = sub.isDir ? ' file-tree-dir' : '';
            const subMdClass = subIsMd ? ' file-tree-md' : '';
            const subIsExpanded = sub.isDir && fileTreeState.expandedDirs[sub.url];
            const subExpandedClass = subIsExpanded ? ' file-tree-expanded' : '';
            const subIndent = ` style="padding-left:${12 + (depth + 1) * 16}px"`;

            if (sub.isDir) {
              const subArrow = subIsExpanded ? '▾' : '▸';
              html += `<li class="file-tree-item${subDirClass}${subExpandedClass}" data-url="${escapeHtml(sub.url)}" data-is-dir="true" data-name="${escapeHtml(sub.name)}" title="${escapeHtml(sub.name)}"${subIndent}>
                <span class="file-tree-arrow">${subArrow}</span>
                <span class="file-tree-icon">${subIcon}</span>
                <span class="file-tree-name">${escapeHtml(sub.name)}</span>
              </li>`;
              html += `<li class="file-tree-subdir" data-dir-url="${escapeHtml(sub.url)}" style="${subIsExpanded ? '' : 'display:none;'}">`;
              if (subIsExpanded && fileTreeState.expandedDirs[sub.url]?.items) {
                // 继续递归（最多支持多层嵌套）
                html += buildSubTreeHtml(fileTreeState.expandedDirs[sub.url].items, depth + 2);
              }
              html += '</li>';
            } else {
              html += `<li class="file-tree-item${subMdClass}" data-url="${escapeHtml(sub.url)}" data-is-dir="false" data-name="${escapeHtml(sub.name)}" title="${escapeHtml(sub.name)}"${subIndent}>
                <span class="file-tree-arrow-placeholder"></span>
                <span class="file-tree-icon">${subIcon}</span>
                <span class="file-tree-name">${escapeHtml(sub.name)}</span>
              </li>`;
            }
          });
          html += '</ul>';
        }
        html += '</li>';
      } else {
        // 文件：无箭头，有箭头占位符保持对齐
        html += `<li class="file-tree-item${activeClass}${mdClass}" data-url="${escapeHtml(item.url)}" data-is-dir="false" data-name="${escapeHtml(item.name)}" title="${escapeHtml(item.name)}"${indentStyle}>
          <span class="file-tree-arrow-placeholder"></span>
          <span class="file-tree-icon">${icon}</span>
          <span class="file-tree-name">${escapeHtml(item.name)}</span>
        </li>`;
      }
    });
    html += '</ul>';
    container.innerHTML = html;

    // 滚动到当前文件
    requestAnimationFrame(() => {
      const activeItem = container.querySelector('.file-tree-active');
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  /**
   * 构建子目录树 HTML（递归辅助函数）
   */
  function buildSubTreeHtml(items, depth) {
    if (!items || items.length === 0) return '';

    const filtered = items.filter(item => {
      if (item.isDir) return true;
      return SUPPORTED_FILE_EXTENSIONS.test(item.name);
    });
    const sorted = sortFileList(filtered);

    let html = '<ul class="file-tree-list">';
    sorted.forEach(item => {
      const icon = getFileIcon(item.name, item.isDir);
      const isMd = !item.isDir && SUPPORTED_FILE_EXTENSIONS.test(item.name);
      const dirClass = item.isDir ? ' file-tree-dir' : '';
      const mdClass = isMd ? ' file-tree-md' : '';
      const isExpanded = item.isDir && fileTreeState.expandedDirs[item.url];
      const expandedClass = isExpanded ? ' file-tree-expanded' : '';
      const indentStyle = ` style="padding-left:${12 + depth * 16}px"`;

      if (item.isDir) {
        const arrow = isExpanded ? '▾' : '▸';
        html += `<li class="file-tree-item${dirClass}${expandedClass}" data-url="${escapeHtml(item.url)}" data-is-dir="true" data-name="${escapeHtml(item.name)}" title="${escapeHtml(item.name)}"${indentStyle}>
          <span class="file-tree-arrow">${arrow}</span>
          <span class="file-tree-icon">${icon}</span>
          <span class="file-tree-name">${escapeHtml(item.name)}</span>
        </li>`;
        html += `<li class="file-tree-subdir" data-dir-url="${escapeHtml(item.url)}" style="${isExpanded ? '' : 'display:none;'}">`;
        if (isExpanded && fileTreeState.expandedDirs[item.url]?.items) {
          html += buildSubTreeHtml(fileTreeState.expandedDirs[item.url].items, depth + 1);
        }
        html += '</li>';
      } else {
        html += `<li class="file-tree-item${mdClass}" data-url="${escapeHtml(item.url)}" data-is-dir="false" data-name="${escapeHtml(item.name)}" title="${escapeHtml(item.name)}"${indentStyle}>
          <span class="file-tree-arrow-placeholder"></span>
          <span class="file-tree-icon">${icon}</span>
          <span class="file-tree-name">${escapeHtml(item.name)}</span>
        </li>`;
      }
    });
    html += '</ul>';
    return html;
  }

  /**
   * 展开或折叠文件夹
   * @param {HTMLElement} itemEl - 文件夹的 <li> 元素
   */
  async function toggleDirectory(itemEl) {
    const url = itemEl.dataset.url;
    if (!url) return;

    const isExpanded = itemEl.classList.contains('file-tree-expanded');
    const subdirEl = itemEl.nextElementSibling;
    if (!subdirEl || !subdirEl.classList.contains('file-tree-subdir')) return;

    const arrow = itemEl.querySelector('.file-tree-arrow');

    if (isExpanded) {
      // 折叠
      itemEl.classList.remove('file-tree-expanded');
      subdirEl.style.display = 'none';
      if (arrow) arrow.textContent = '▸';
      // 更新图标为关闭文件夹
      const iconEl = itemEl.querySelector('.file-tree-icon');
      if (iconEl) iconEl.textContent = '📁';
      delete fileTreeState.expandedDirs[url];
    } else {
      // 展开
      itemEl.classList.add('file-tree-expanded');
      subdirEl.style.display = '';
      if (arrow) arrow.textContent = '▾';
      // 更新图标为打开文件夹
      const iconEl = itemEl.querySelector('.file-tree-icon');
      if (iconEl) iconEl.textContent = '📂';

      // 如果子目录内容尚未加载
      if (!subdirEl.querySelector('.file-tree-list')) {
        subdirEl.innerHTML = '<div class="file-tree-loading" style="padding:4px 12px;font-size:12px;">' + t('fileTree.loading') + '</div>';

        try {
          const items = await fetchDirectoryViaBackground(url);
          if (items && items.length > 0) {
            // 缓存子目录数据
            fileTreeState.expandedDirs[url] = { items };

            // 计算当前层级
            const depth = getItemDepth(itemEl);

            // 渲染子目录内容
            subdirEl.innerHTML = buildSubTreeHtml(items, depth + 1);
          } else {
            subdirEl.innerHTML = '<div class="file-tree-empty" style="padding:4px 12px;font-size:12px;padding-left:' + (12 + (getItemDepth(itemEl) + 1) * 16) + 'px;">' + t('fileTree.emptyFolder') + '</div>';
          }
        } catch (err) {
          console.warn('[MD Viewer] 加载子目录失败:', err);
          subdirEl.innerHTML = '<div class="file-tree-empty" style="padding:4px 12px;font-size:12px;">' + t('fileTree.loadFailed') + '</div>';
        }
      }

      fileTreeState.expandedDirs[url] = fileTreeState.expandedDirs[url] || true;
    }
  }

  /**
   * 获取文件树项的缩进层级
   */
  function getItemDepth(itemEl) {
    const paddingLeft = parseInt(itemEl.style.paddingLeft) || 12;
    return Math.max(0, Math.round((paddingLeft - 12) / 16));
  }

  /**
   * 构建侧边栏右键菜单内容（根据当前页签）
   */
  function buildSidebarMenu(activeTab) {
    const menu = document.getElementById('sidebar-context-menu');
    if (!menu) return;

    if (activeTab === 'toc') {
      menu.innerHTML = `
        <div class="ctx-menu-item" data-action="toc-collapse-all">${t('menu.toc.collapseAll')}</div>
        <div class="ctx-menu-item" data-action="toc-expand-all">${t('menu.toc.expandAll')}</div>
      `;
    } else if (activeTab === 'files') {
      const { sortBy, sortAsc, foldersFirst, showHidden } = fileTreeState;
      menu.innerHTML = `
        <div class="ctx-menu-item" data-action="file-refresh">${t('menu.files.refresh')}</div>
        <div class="ctx-menu-item" data-action="file-collapse-all">${t('menu.files.collapseAll')}</div>
        <div class="ctx-menu-divider"></div>
        <div class="ctx-menu-group">
          <div class="ctx-menu-item ctx-menu-group-trigger" data-action="toggle-sort-group">${t('menu.files.sortGroup')} <span class="ctx-menu-arrow">▸</span></div>
          <div class="ctx-menu-group-content" style="display: none;">
            <div class="ctx-menu-item ctx-menu-sub-item${sortBy === 'name' ? ' ctx-checked' : ''}" data-action="sort-name">${t('menu.files.sortByName')}</div>
            <div class="ctx-menu-item ctx-menu-sub-item${sortBy === 'size' ? ' ctx-checked' : ''}" data-action="sort-size">${t('menu.files.sortBySize')}</div>
            <div class="ctx-menu-item ctx-menu-sub-item${sortBy === 'modified' ? ' ctx-checked' : ''}" data-action="sort-modified">${t('menu.files.sortByModified')}</div>
            <div class="ctx-menu-divider"></div>
            <div class="ctx-menu-item ctx-menu-sub-item${sortAsc ? ' ctx-checked' : ''}" data-action="sort-asc">${t('menu.files.sortAsc')}</div>
            <div class="ctx-menu-item ctx-menu-sub-item${!sortAsc ? ' ctx-checked' : ''}" data-action="sort-desc">${t('menu.files.sortDesc')}</div>
            <div class="ctx-menu-divider"></div>
            <div class="ctx-menu-item ctx-menu-sub-item${foldersFirst ? ' ctx-checked' : ''}" data-action="toggle-folders-first">${t('menu.files.foldersFirst')}</div>
          </div>
        </div>
        <div class="ctx-menu-item${showHidden ? ' ctx-checked' : ''}" data-action="toggle-hidden">${t('menu.files.showHidden')}</div>
      `;
    }
  }

  /**
   * 获取当前激活的页签
   */
  function getActiveSidebarTab() {
    const activeTab = document.querySelector('.sidebar-tab.active');
    return activeTab ? activeTab.dataset.tab : 'toc';
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
            <p class="error-message">${escapeHtml(err.message || t('error.unknown'))}</p>
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
    // 侧边栏开关
    const btnToggleToc = document.getElementById('btn-toggle-toc');
    const tocSidebar = document.getElementById('md-toc-sidebar');
    const resizeHandle = document.getElementById('sidebar-resize-handle');
    if (btnToggleToc && tocSidebar) {
      btnToggleToc.addEventListener('click', () => {
        tocSidebar.classList.toggle('visible');
        tocSidebar.classList.toggle('hidden');
        if (resizeHandle) {
          resizeHandle.style.display = tocSidebar.classList.contains('visible') ? '' : 'none';
        }
      });
    }

    // 关闭侧边栏
    const btnCloseToc = document.getElementById('btn-close-toc');
    if (btnCloseToc && tocSidebar) {
      btnCloseToc.addEventListener('click', () => {
        tocSidebar.classList.remove('visible');
        tocSidebar.classList.add('hidden');
        if (resizeHandle) resizeHandle.style.display = 'none';
      });
    }

    // ========== 侧边栏拖拽调整宽度 ==========
    if (resizeHandle && tocSidebar) {
      let isResizing = false;
      let startX = 0;
      let startWidth = 0;
      const minWidth = 180;
      const maxWidth = 600;
      const isRight = tocSidebar.classList.contains('toc-right');

      resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isResizing = true;
        startX = e.clientX;
        startWidth = tocSidebar.getBoundingClientRect().width;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        resizeHandle.classList.add('active');
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const isCurrentlyRight = tocSidebar.classList.contains('toc-right');
        const diff = isCurrentlyRight ? (startX - e.clientX) : (e.clientX - startX);
        const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + diff));
        tocSidebar.style.width = newWidth + 'px';
      });

      document.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          resizeHandle.classList.remove('active');
        }
      });
    }

    // ========== 页签切换 ==========
    const sidebarTabs = document.querySelectorAll('.sidebar-tab');
    sidebarTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        if (!tabName) return;
        // 切换激活状态
        sidebarTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        // 切换面板
        document.querySelectorAll('.sidebar-panel').forEach(p => p.style.display = 'none');
        const panel = document.getElementById(`sidebar-panel-${tabName}`);
        if (panel) panel.style.display = 'block';
        // 懒加载文件树
        if (tabName === 'files' && !fileTreeState.data) {
          buildFileTree();
        }
        // 关闭菜单
        const menu = document.getElementById('sidebar-context-menu');
        if (menu) menu.style.display = 'none';
      });
    });

    // ========== 侧边栏菜单按钮 ==========
    const btnSidebarMenu = document.getElementById('btn-sidebar-menu');
    const sidebarCtxMenu = document.getElementById('sidebar-context-menu');
    if (btnSidebarMenu && sidebarCtxMenu) {
      btnSidebarMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sidebarCtxMenu.style.display === 'none' || !sidebarCtxMenu.style.display) {
          buildSidebarMenu(getActiveSidebarTab());
          sidebarCtxMenu.style.display = 'block';
        } else {
          sidebarCtxMenu.style.display = 'none';
        }
      });

      // 菜单项点击
      sidebarCtxMenu.addEventListener('click', (e) => {
        const actionEl = e.target.closest('[data-action]');
        if (!actionEl) return;
        e.stopPropagation();
        const action = actionEl.dataset.action;

        // 排序组展开/折叠
        if (action === 'toggle-sort-group') {
          const group = actionEl.closest('.ctx-menu-group');
          if (group) {
            const content = group.querySelector('.ctx-menu-group-content');
            const arrow = actionEl.querySelector('.ctx-menu-arrow');
            if (content) {
              const isOpen = content.style.display !== 'none';
              content.style.display = isOpen ? 'none' : 'block';
              if (arrow) arrow.textContent = isOpen ? '▸' : '▾';
            }
          }
          return;
        }

        // 目录操作
        if (action === 'toc-collapse-all') {
          document.querySelectorAll('.md-toc-item').forEach(item => {
            const level = parseInt(item.className.match(/toc-level-(\d+)/)?.[1] || 0);
            if (level > 0) item.style.display = 'none';
            if (item.classList.contains('md-toc-parent')) {
              item.classList.add('toc-collapsed');
              const toggle = item.querySelector('.md-toc-toggle');
              if (toggle) toggle.textContent = '▸';
            }
          });
        } else if (action === 'toc-expand-all') {
          document.querySelectorAll('.md-toc-item').forEach(item => {
            item.style.display = '';
            if (item.classList.contains('md-toc-parent')) {
              item.classList.remove('toc-collapsed');
              const toggle = item.querySelector('.md-toc-toggle');
              if (toggle) toggle.textContent = '▾';
            }
          });
        }

        // 文件树操作
        if (action === 'file-refresh') {
          fileTreeState.data = null;
          buildFileTree();
        } else if (action === 'file-collapse-all') {
          // 折叠所有展开的文件夹
          fileTreeState.expandedDirs = {};
          const fileTreeEl = document.getElementById('file-tree');
          if (fileTreeEl) {
            // 隐藏所有子目录容器
            fileTreeEl.querySelectorAll('.file-tree-subdir').forEach(el => {
              el.style.display = 'none';
            });
            // 重置所有展开状态
            fileTreeEl.querySelectorAll('.file-tree-expanded').forEach(el => {
              el.classList.remove('file-tree-expanded');
              const arrow = el.querySelector('.file-tree-arrow');
              if (arrow) arrow.textContent = '▸';
              const iconEl = el.querySelector('.file-tree-icon');
              if (iconEl) iconEl.textContent = '📁';
            });
          }
        } else if (action === 'sort-name') {
          fileTreeState.sortBy = 'name';
        } else if (action === 'sort-size') {
          fileTreeState.sortBy = 'size';
        } else if (action === 'sort-modified') {
          fileTreeState.sortBy = 'modified';
        } else if (action === 'sort-asc') {
          fileTreeState.sortAsc = true;
        } else if (action === 'sort-desc') {
          fileTreeState.sortAsc = false;
        } else if (action === 'toggle-folders-first') {
          fileTreeState.foldersFirst = !fileTreeState.foldersFirst;
        } else if (action === 'toggle-hidden') {
          fileTreeState.showHidden = !fileTreeState.showHidden;
        }

        // 排序/过滤操作后重新渲染
        if (action.startsWith('sort-') || action.startsWith('toggle-')) {
          const fileTreeEl = document.getElementById('file-tree');
          if (fileTreeEl && fileTreeState.data) renderFileTree(fileTreeEl, fileTreeState.data);
          // 重建菜单以更新勾选状态
          buildSidebarMenu('files');
          return; // 不关闭菜单
        }

        sidebarCtxMenu.style.display = 'none';
      });

      // 点击外部关闭菜单
      document.addEventListener('click', (e) => {
        if (!sidebarCtxMenu.contains(e.target) && e.target !== btnSidebarMenu) {
          sidebarCtxMenu.style.display = 'none';
        }
      });
    }

    // ========== 文件树点击导航 ==========
    const fileTreeEl = document.getElementById('file-tree');
    if (fileTreeEl) {
      fileTreeEl.addEventListener('click', (e) => {
        const item = e.target.closest('.file-tree-item');
        if (!item) return;
        const url = item.dataset.url;
        if (!url) return;
        const isDir = item.dataset.isDir === 'true';

        if (isDir) {
          // 文件夹：就地展开/折叠
          e.preventDefault();
          toggleDirectory(item);
        } else {
          // 文件：在新标签页打开
          e.preventDefault();
          window.open(url, '_blank');
        }
      });
    }

    // ========== 面包屑导航点击 ==========
    const breadcrumbEl = document.getElementById('file-tree-breadcrumb');
    if (breadcrumbEl) {
      breadcrumbEl.addEventListener('click', (e) => {
        const link = e.target.closest('.breadcrumb-link');
        if (link) {
          e.preventDefault();
          const url = link.dataset.url;
          if (url) window.open(url, '_blank');
        }
      });
    }

    // 目录点击平滑滚动 + 折叠按钮
    const tocNav = document.getElementById('md-toc-nav');
    if (tocNav) {
      tocNav.addEventListener('click', (e) => {
        // 折叠/展开按钮
        const toggle = e.target.closest('.md-toc-toggle');
        if (toggle) {
          e.preventDefault();
          e.stopPropagation();
          const index = parseInt(toggle.dataset.index);
          if (!isNaN(index)) toggleTocItem(index);
          return;
        }

        // 链接点击
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
          btnToggleRaw.textContent = t('toolbar.source');
        } else {
          rawContent.style.display = 'block';
          mdContent.style.display = 'none';
          btnToggleRaw.textContent = t('toolbar.preview');
        }
      });
    }

    // 回到顶部
    const btnFloatTop = document.getElementById('btn-float-top');
    const scrollTopHandler = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
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

    // 设置
    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        openSettingsPanel();
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
            e.target.textContent = t('code.copied');
            setTimeout(() => { e.target.textContent = t('code.copy'); }, 2000);
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

    // ==================== 图片灯箱 ====================
    const IMG_LIGHTBOX = {
      MIN_SCALE: 0.1,
      MAX_SCALE: 20,
      ZOOM_FACTOR: 1.15,
      DRAG_THRESHOLD: 5,
      TIP_DURATION: 800,
    };

    function openImageLightbox(src) {
      let scale = 1, translateX = 0, translateY = 0;
      let isDragging = false, dragMoved = false, startX = 0, startY = 0;
      let tipTimer = null;

      // 创建 DOM
      const overlay = document.createElement('div');
      overlay.className = 'md-lightbox-overlay';
      overlay.innerHTML = `
        <img class="md-lightbox-img" src="${src}" draggable="false" />
        <button class="md-lightbox-close">${t('lightbox.close')}</button>
        <div class="md-lightbox-zoom-tip"></div>
      `;
      document.body.appendChild(overlay);

      const img = overlay.querySelector('.md-lightbox-img');
      const zoomTip = overlay.querySelector('.md-lightbox-zoom-tip');

      // 淡入
      requestAnimationFrame(() => overlay.classList.add('active'));

      function updateTransform() {
        img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        img.style.cursor = scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in';
      }

      function showZoomTip() {
        zoomTip.textContent = Math.round(scale * 100) + '%';
        zoomTip.classList.add('visible');
        clearTimeout(tipTimer);
        tipTimer = setTimeout(() => zoomTip.classList.remove('visible'), IMG_LIGHTBOX.TIP_DURATION);
      }

      function closeLightbox() {
        overlay.classList.remove('active');
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
        // 如果 transition 未触发（例如 display:none），延迟兜底移除
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 300);
        document.removeEventListener('keydown', onKeydown);
      }

      // 滚轮缩放（以鼠标位置为中心）
      overlay.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = img.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;
        const prevScale = scale;
        scale = e.deltaY < 0
          ? Math.min(scale * IMG_LIGHTBOX.ZOOM_FACTOR, IMG_LIGHTBOX.MAX_SCALE)
          : Math.max(scale / IMG_LIGHTBOX.ZOOM_FACTOR, IMG_LIGHTBOX.MIN_SCALE);
        const ratio = 1 - scale / prevScale;
        translateX += mouseX * ratio;
        translateY += mouseY * ratio;
        updateTransform();
        showZoomTip();
      }, { passive: false });

      // 拖拽平移
      img.addEventListener('mousedown', (e) => {
        if (scale <= 1) return;
        e.preventDefault();
        isDragging = true;
        dragMoved = false;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        img.style.cursor = 'grabbing';
      });

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      function onMouseMove(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX - translateX;
        const dy = e.clientY - startY - translateY;
        if (Math.abs(dx) > IMG_LIGHTBOX.DRAG_THRESHOLD || Math.abs(dy) > IMG_LIGHTBOX.DRAG_THRESHOLD) {
          dragMoved = true;
        }
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        updateTransform();
      }

      function onMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        img.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
        // 延迟重置 dragMoved，让 click 事件能读到
        setTimeout(() => { dragMoved = false; }, 0);
      }

      // 双击还原
      img.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        scale = 1; translateX = 0; translateY = 0;
        updateTransform();
        showZoomTip();
      });

      // 点击遮罩/关闭按钮 关闭（拖拽不触发）
      overlay.addEventListener('click', (e) => {
        if (dragMoved) return;
        if (e.target === overlay || e.target.classList.contains('md-lightbox-close')) {
          closeLightbox();
        }
      });

      // 键盘快捷键
      function onKeydown(e) {
        if (!overlay.parentNode) return;
        switch (e.key) {
          case '+': case '=':
            e.preventDefault();
            scale = Math.min(scale * IMG_LIGHTBOX.ZOOM_FACTOR, IMG_LIGHTBOX.MAX_SCALE);
            updateTransform(); showZoomTip(); break;
          case '-':
            e.preventDefault();
            scale = Math.max(scale / IMG_LIGHTBOX.ZOOM_FACTOR, IMG_LIGHTBOX.MIN_SCALE);
            updateTransform(); showZoomTip(); break;
          case '0':
            e.preventDefault();
            // 适应窗口
            const vw = window.innerWidth * 0.9, vh = window.innerHeight * 0.9;
            const nw = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
            scale = Math.min(vw / nw, vh / nh, 1);
            translateX = 0; translateY = 0;
            updateTransform(); showZoomTip(); break;
          case 'r': case 'R':
            e.preventDefault();
            scale = 1; translateX = 0; translateY = 0;
            updateTransform(); showZoomTip(); break;
          case 'Escape':
            e.preventDefault();
            closeLightbox(); break;
        }
      }
      document.addEventListener('keydown', onKeydown);
    }

    // 图片点击放大（支持 Markdown 渲染的图片和 HTML <img> 标签）
    document.addEventListener('click', (e) => {
      // 处理正文内的锚点链接点击跳转
      const anchor = e.target.closest('#md-content a[href^="#"]');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const targetId = href.slice(1);
          let target = document.getElementById(targetId);
          // 如果精确匹配不到，尝试模糊匹配（用户手写锚点可能不含计数后缀）
          if (!target) {
            target = document.getElementById(decodeURIComponent(targetId));
          }
          if (!target) {
            // 尝试通过 baseId 查找标题（遍历 tocItems）
            const matchedItem = tocItems.find(item => item.baseId === targetId || item.id === targetId);
            if (matchedItem) {
              target = document.getElementById(matchedItem.id);
            }
          }
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', '#' + targetId);
          }
          return;
        }
      }

      const img = e.target.closest('img');
      if (!img) return;
      // 排除灯箱/Mermaid 遮罩内部的图片和非内容区域的图片
      if (img.closest('.md-lightbox-overlay') || img.closest('#md-mermaid-overlay')) return;
      if (!img.closest('#md-content')) return;
      openImageLightbox(img.src);
    });


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
        canvas.style.transform = `translate(calc(-50% + ${mermaidZoomState.translateX}px), calc(-50% + ${mermaidZoomState.translateY}px)) scale(${mermaidZoomState.scale})`;
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

    // Graphviz 图表点击放大预览（复用 Mermaid 灯箱）
    document.addEventListener('click', (e) => {
      const graphvizRendered = e.target.closest('.graphviz-rendered');
      if (graphvizRendered) {
        const overlay = document.getElementById('md-mermaid-overlay');
        const canvas = document.getElementById('md-mermaid-canvas');
        if (overlay && canvas) {
          const svgEl = graphvizRendered.querySelector('svg');
          if (svgEl) {
            canvas.innerHTML = '';
            const clonedSvg = svgEl.cloneNode(true);
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
            clonedSvg.style.cssText = 'width: auto; height: auto;';
            canvas.appendChild(clonedSvg);
            resetMermaidZoom();
            overlay.style.display = 'flex';
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
      // ESC 关闭 Mermaid 预览（图片灯箱已有独立 ESC 处理）
      if (e.key === 'Escape') {
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

    // 监听来自 background/popup 的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'SETTINGS_UPDATED') {
        applySettings(message.settings);
        sendResponse({ success: true });
      } else if (message.type === 'PING') {
        // 用于检测 content script 是否已注入
        sendResponse({ alive: true });
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
        // 直接从 storage 读取，无需经过 background service worker
        chrome.storage.sync.get('settings', (data) => {
          if (chrome.runtime.lastError) {
            console.warn('[MD Viewer] 获取设置失败:', chrome.runtime.lastError.message);
            resolve(DEFAULT_SETTINGS);
            return;
          }
          resolve(data?.settings ? { ...DEFAULT_SETTINGS, ...data.settings } : DEFAULT_SETTINGS);
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
      // 直接写入 storage，无需经过 background service worker
      chrome.storage.sync.set({ settings: currentSettings }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[MD Viewer] 保存设置失败:', chrome.runtime.lastError.message);
        }
      });
    } catch (e) {
      console.warn('[MD Viewer] 保存设置失败:', e);
    }
  }

  // ==================== 内嵌设置弹窗 ====================

  /**
   * 打开设置弹窗，并将当前设置同步到弹窗 UI
   */
  function openSettingsPanel() {
    const overlay = document.getElementById('md-settings-overlay');
    if (!overlay) return;

    // 同步当前设置到弹窗 UI
    syncSettingsToPanel();

    overlay.style.display = 'flex';

    // 绑定弹窗事件（仅绑定一次）
    if (!overlay.__eventsBound) {
      bindSettingsPanelEvents();
      overlay.__eventsBound = true;
    }
  }

  /**
   * 关闭设置弹窗
   */
  function closeSettingsPanel() {
    const overlay = document.getElementById('md-settings-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  /**
   * 将当前设置同步到弹窗 UI 控件
   */
  function syncSettingsToPanel() {
    // 主题按钮
    document.querySelectorAll('.md-stg-theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === currentSettings.theme);
    });

    // 代码高亮主题
    const codeThemeSel = document.getElementById('stg-codeTheme');
    if (codeThemeSel) codeThemeSel.value = currentSettings.codeTheme || 'default-dark-modern';

    // 正文字体
    document.querySelectorAll('.md-stg-btn-option[data-font]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.font === (currentSettings.fontFamily || 'system'));
    });

    // 字体大小
    const fontSizeEl = document.getElementById('stg-fontSize');
    const fontSizeValEl = document.getElementById('stg-fontSizeVal');
    if (fontSizeEl) fontSizeEl.value = currentSettings.fontSize || 16;
    if (fontSizeValEl) fontSizeValEl.textContent = (currentSettings.fontSize || 16) + 'px';

    // 行高
    const lineHeightEl = document.getElementById('stg-lineHeight');
    const lineHeightValEl = document.getElementById('stg-lineHeightVal');
    if (lineHeightEl) lineHeightEl.value = currentSettings.lineHeight || 1.6;
    if (lineHeightValEl) lineHeightValEl.textContent = (currentSettings.lineHeight || 1.6).toFixed(1);

    // 内容宽度
    const maxWidthEl = document.getElementById('stg-maxWidth');
    const maxWidthValEl = document.getElementById('stg-maxWidthVal');
    if (maxWidthEl) maxWidthEl.value = currentSettings.maxWidth || 1200;
    if (maxWidthValEl) maxWidthValEl.textContent = (currentSettings.maxWidth || 1200) + 'px';

    // 开关
    const stgShowToc = document.getElementById('stg-showToc');
    if (stgShowToc) stgShowToc.checked = currentSettings.showToc !== false;

    // 目录位置
    document.querySelectorAll('.md-stg-toc-pos-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pos === (currentSettings.tocPosition || 'right'));
    });
    const tocPosRow = document.getElementById('stg-tocPosRow');
    if (tocPosRow) tocPosRow.style.display = (currentSettings.showToc !== false) ? 'flex' : 'none';

    const stgMermaid = document.getElementById('stg-enableMermaid');
    if (stgMermaid) stgMermaid.checked = currentSettings.enableMermaid !== false;

    const stgMathJax = document.getElementById('stg-enableMathJax');
    if (stgMathJax) stgMathJax.checked = currentSettings.enableMathJax === true;

    const stgPlantUML = document.getElementById('stg-enablePlantUML');
    if (stgPlantUML) stgPlantUML.checked = currentSettings.enablePlantUML !== false;

    const stgGraphviz = document.getElementById('stg-enableGraphviz');
    if (stgGraphviz) stgGraphviz.checked = currentSettings.enableGraphviz !== false;

    const stgLineNumbers = document.getElementById('stg-showLineNumbers');
    if (stgLineNumbers) stgLineNumbers.checked = currentSettings.showLineNumbers === true;

    const stgAutoDetect = document.getElementById('stg-autoDetect');
    if (stgAutoDetect) stgAutoDetect.checked = currentSettings.autoDetect !== false;

    // 语言下拉框
    const stgLang = document.getElementById('stg-language');
    if (stgLang) stgLang.value = currentSettings.language || 'zh-CN';
  }

  /**
   * 绑定设置弹窗内部的交互事件
   */
  function bindSettingsPanelEvents() {
    const overlay = document.getElementById('md-settings-overlay');
    if (!overlay) return;

    // 点击遮罩关闭
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSettingsPanel();
    });

    // 关闭按钮
    const btnClose = document.getElementById('btn-settings-close');
    if (btnClose) btnClose.addEventListener('click', closeSettingsPanel);

    // 主题切换
    document.querySelectorAll('.md-stg-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.md-stg-theme-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSettings.theme = btn.dataset.theme;
        applySettings(currentSettings);
        saveSettings();
        reRenderMermaid();
      });
    });

    // 代码高亮主题
    const codeThemeSel = document.getElementById('stg-codeTheme');
    if (codeThemeSel) {
      codeThemeSel.addEventListener('change', () => {
        currentSettings.codeTheme = codeThemeSel.value;
        applySettings(currentSettings);
        saveSettings();
      });
    }

    // 正文字体
    document.querySelectorAll('.md-stg-btn-option[data-font]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.md-stg-btn-option[data-font]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSettings.fontFamily = btn.dataset.font;
        applySettings(currentSettings);
        saveSettings();
      });
    });

    // 字体大小
    const fontSizeEl = document.getElementById('stg-fontSize');
    const fontSizeValEl = document.getElementById('stg-fontSizeVal');
    if (fontSizeEl) {
      fontSizeEl.addEventListener('input', () => {
        const size = parseInt(fontSizeEl.value);
        if (fontSizeValEl) fontSizeValEl.textContent = size + 'px';
        currentSettings.fontSize = size;
        applySettings(currentSettings);
      });
      fontSizeEl.addEventListener('change', () => saveSettings());
    }

    // 行高
    const lineHeightEl = document.getElementById('stg-lineHeight');
    const lineHeightValEl = document.getElementById('stg-lineHeightVal');
    if (lineHeightEl) {
      lineHeightEl.addEventListener('input', () => {
        const lh = parseFloat(lineHeightEl.value);
        if (lineHeightValEl) lineHeightValEl.textContent = lh.toFixed(1);
        currentSettings.lineHeight = lh;
        applySettings(currentSettings);
      });
      lineHeightEl.addEventListener('change', () => saveSettings());
    }

    // 内容宽度
    const maxWidthEl = document.getElementById('stg-maxWidth');
    const maxWidthValEl = document.getElementById('stg-maxWidthVal');
    if (maxWidthEl) {
      maxWidthEl.addEventListener('input', () => {
        const w = parseInt(maxWidthEl.value);
        if (maxWidthValEl) maxWidthValEl.textContent = w + 'px';
        currentSettings.maxWidth = w;
        applySettings(currentSettings);
      });
      maxWidthEl.addEventListener('change', () => saveSettings());
    }

    // 显示目录
    const stgShowToc = document.getElementById('stg-showToc');
    if (stgShowToc) {
      stgShowToc.addEventListener('change', () => {
        currentSettings.showToc = stgShowToc.checked;
        const tocPosRow = document.getElementById('stg-tocPosRow');
        if (tocPosRow) tocPosRow.style.display = stgShowToc.checked ? 'flex' : 'none';
        applySettings(currentSettings);
        saveSettings();
      });
    }

    // 目录位置
    document.querySelectorAll('.md-stg-toc-pos-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.md-stg-toc-pos-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSettings.tocPosition = btn.dataset.pos;
        applySettings(currentSettings);
        saveSettings();
      });
    });

    // Mermaid 开关
    const stgMermaid = document.getElementById('stg-enableMermaid');
    if (stgMermaid) {
      stgMermaid.addEventListener('change', () => {
        currentSettings.enableMermaid = stgMermaid.checked;
        applySettings(currentSettings);
        saveSettings();
      });
    }

    // 数学公式开关
    const stgMathJax = document.getElementById('stg-enableMathJax');
    if (stgMathJax) {
      stgMathJax.addEventListener('change', () => {
        currentSettings.enableMathJax = stgMathJax.checked;
        applySettings(currentSettings);
        saveSettings();
      });
    }

    // PlantUML 开关
    const stgPlantUML = document.getElementById('stg-enablePlantUML');
    if (stgPlantUML) {
      stgPlantUML.addEventListener('change', () => {
        currentSettings.enablePlantUML = stgPlantUML.checked;
        applySettings(currentSettings);
        saveSettings();
      });
    }

    // Graphviz 开关
    const stgGraphviz = document.getElementById('stg-enableGraphviz');
    if (stgGraphviz) {
      stgGraphviz.addEventListener('change', () => {
        currentSettings.enableGraphviz = stgGraphviz.checked;
        applySettings(currentSettings);
        saveSettings();
      });
    }

    // 代码行号开关
    const stgLineNumbers = document.getElementById('stg-showLineNumbers');
    if (stgLineNumbers) {
      stgLineNumbers.addEventListener('change', () => {
        currentSettings.showLineNumbers = stgLineNumbers.checked;
        applySettings(currentSettings);
        saveSettings();
      });
    }

    // 自动检测开关
    const stgAutoDetect = document.getElementById('stg-autoDetect');
    if (stgAutoDetect) {
      stgAutoDetect.addEventListener('change', () => {
        currentSettings.autoDetect = stgAutoDetect.checked;
        saveSettings();
      });
    }

    // 重置按钮
    const btnReset = document.getElementById('btn-settings-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        currentSettings = { ...DEFAULT_SETTINGS };
        syncSettingsToPanel();
        applySettings(currentSettings);
        saveSettings();
        reRenderMermaid();
      });
    }

    // 语言切换（下拉框）
    const stgLangSelect = document.getElementById('stg-language');
    if (stgLangSelect) {
      stgLangSelect.addEventListener('change', () => {
        const newLang = stgLangSelect.value;
        if (newLang && newLang !== currentSettings.language) {
          currentSettings.language = newLang;
          saveSettings();
          location.reload();
        }
      });
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
    const resizeHandle = document.getElementById('sidebar-resize-handle');
    if (resizeHandle) {
      resizeHandle.style.display = currentSettings.showToc ? '' : 'none';
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

    // 重新渲染 PlantUML
    renderPlantUML();

    // 重新渲染 Graphviz
    await renderGraphviz();

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

  // ==================== PlantUML 渲染 ====================

  /**
   * PlantUML hex 编码：UTF-8 bytes → hex string
   */
  function plantumlHexEncode(text) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 渲染所有 PlantUML 容器
   */
  function renderPlantUML() {
    if (!currentSettings.enablePlantUML) return;

    const containers = document.querySelectorAll('.plantuml-container:not(.plantuml-processed)');
    containers.forEach(container => {
      const base64 = container.getAttribute('data-source');
      if (!base64) return;

      let source;
      try {
        source = decodeURIComponent(escape(atob(base64)));
      } catch {
        return;
      }

      // 源码长度限制
      if (source.length > 4000) {
        container.innerHTML = `<div class="plantuml-error">${t('plantuml.error.tooLong')}</div>
          <pre class="plantuml-source"><code>${escapeHtml(source)}</code></pre>`;
        container.classList.add('plantuml-processed');
        return;
      }

      const hex = plantumlHexEncode(source);
      const url = `https://www.plantuml.com/plantuml/svg/~h${hex}`;

      const img = document.createElement('img');
      img.className = 'plantuml-rendered';
      img.src = url;
      img.alt = 'PlantUML Diagram';
      img.loading = 'lazy';

      img.onerror = () => {
        container.innerHTML = `<div class="plantuml-error">${t('plantuml.error.network')}</div>
          <pre class="plantuml-source"><code>${escapeHtml(source)}</code></pre>`;
      };

      // 清空占位，插入图片
      const sourceEl = container.querySelector('.plantuml-source');
      container.innerHTML = '';
      container.appendChild(img);
      if (sourceEl) container.appendChild(sourceEl);
      container.classList.add('plantuml-processed');
    });
  }

  // ==================== Graphviz 渲染 ====================

  let vizInstance = null;

  /**
   * 渲染所有 Graphviz 容器
   */
  async function renderGraphviz() {
    if (!currentSettings.enableGraphviz) return;
    if (typeof Viz === 'undefined') {
      console.log('[MD Viewer] Viz.js 未加载，跳过 Graphviz 渲染');
      return;
    }

    const containers = document.querySelectorAll('.graphviz-container:not(.graphviz-processed)');
    if (containers.length === 0) return;

    // 初始化 Viz 实例
    if (!vizInstance) {
      try {
        vizInstance = await Viz.instance();
      } catch (err) {
        console.error('[MD Viewer] Viz.js 初始化失败:', err);
        return;
      }
    }

    containers.forEach(container => {
      const base64 = container.getAttribute('data-source');
      if (!base64) return;

      let source;
      try {
        source = decodeURIComponent(escape(atob(base64)));
      } catch {
        return;
      }

      try {
        const svgString = vizInstance.render(source, { format: 'svg', engine: 'dot' });
        const wrapper = document.createElement('div');
        wrapper.className = 'graphviz-rendered';
        wrapper.innerHTML = svgString;

        // SVG 自适应
        const svgEl = wrapper.querySelector('svg');
        if (svgEl) {
          // 确保有 viewBox
          if (!svgEl.getAttribute('viewBox')) {
            const w = svgEl.getAttribute('width');
            const h = svgEl.getAttribute('height');
            if (w && h) {
              svgEl.setAttribute('viewBox', `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
            }
          }
          svgEl.removeAttribute('width');
          svgEl.removeAttribute('height');
          svgEl.style.width = '100%';
          svgEl.style.height = 'auto';
          svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }

        const sourceEl = container.querySelector('.graphviz-source');
        container.innerHTML = '';
        container.appendChild(wrapper);
        if (sourceEl) container.appendChild(sourceEl);
        container.classList.add('graphviz-processed');
      } catch (err) {
        container.innerHTML = `<div class="graphviz-error">${t('graphviz.error.syntax')}<br><small>${escapeHtml(String(err.message || err))}</small></div>
          <pre class="graphviz-source"><code>${escapeHtml(source)}</code></pre>`;
        container.classList.add('graphviz-processed');
      }
    });
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

    // 初始化 i18n 语言
    if (typeof window.__I18N__ !== 'undefined' && currentSettings.language) {
      window.__I18N__.setLanguage(currentSettings.language);
    }

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
      htmlContent = `<div class="md-error"><p>${t('error.parseFailed')}</p><pre>${escapeHtml(rawMarkdown)}</pre></div>`;
    }

    // 构建渲染页面
    buildPage(htmlContent);

    // ★ 在 buildPage 替换 DOM 之后，预获取目录文件列表（file:// 协议下）
    // 通过 background service worker 临时 tab + executeScript 获取
    if (window.location.protocol === 'file:') {
      prefetchDirectoryHtml();
    }

    // 应用代码高亮主题
    applyCodeTheme(currentSettings.codeTheme);

    // 生成目录
    buildToc();

    // 渲染 Mermaid 图表
    await renderMermaidDiagrams();

    // 渲染 PlantUML 图表
    renderPlantUML();

    // 渲染 Graphviz 图表
    await renderGraphviz();

    // 渲染数学公式
    await renderMathFormulas();

    // 非 file:// 协议时隐藏文件浏览器页签
    if (!isFileProtocol()) {
      const filesTab = document.querySelector('.sidebar-tab[data-tab="files"]');
      if (filesTab) filesTab.style.display = 'none';
    }

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
      const targetId = decodeURIComponent(window.location.hash.slice(1));
      let target = document.getElementById(targetId);
      // 如果精确匹配不到，尝试通过 baseId 查找
      if (!target) {
        const matchedItem = tocItems.find(item => item.baseId === targetId || item.id === targetId);
        if (matchedItem) {
          target = document.getElementById(matchedItem.id);
        }
      }
      if (target) {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    }

    isRendered = true;
    console.log('[MD Viewer] Markdown 渲染完成 ✅');

    // 通知 background 设置 MD badge（因为没有 tabs 权限，background 无法自动检测）
    try {
      chrome.runtime.sendMessage({ type: 'SET_BADGE', tabId: undefined, isMarkdown: true });
    } catch (_) { /* 忽略 */ }
  }

  // 启动
  init().catch(err => {
    console.error('[MD Viewer] 初始化失败:', err);
  });

  // ==================== 测试导出 ====================
  // 仅在 Node.js 环境下导出（用于 Jest 测试），浏览器环境中不生效
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      // 工具函数
      generateId,
      escapeHtml,
      debounce,
      isMarkdownFile,
      isFileProtocol,
      parseSizeToBytes,
      getFileIcon,
      // 常量
      DEFAULT_SETTINGS,
      MD_EXTENSIONS,
      SUPPORTED_FILE_EXTENSIONS,
    };
  }

})();
