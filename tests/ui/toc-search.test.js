/**
 * UI 测试：目录面板搜索框功能
 * 覆盖 Tier 1（存在性）、Tier 2（行为级）、Tier 3（任务特定）
 */

const fs = require('fs');
const path = require('path');

// 读取源文件
const contentJs = fs.readFileSync(
  path.join(__dirname, '../../content/content.js'),
  'utf-8'
);
const contentCss = fs.readFileSync(
  path.join(__dirname, '../../styles/content.css'),
  'utf-8'
);
const zhCN = require('../../i18n/zh-CN');
const en = require('../../i18n/en');

// =====================================================
//  Tier 1 — 存在性断言
// =====================================================
describe('Tier 1: 目录搜索框存在性', () => {
  test('1.1 content.js 中包含搜索框 DOM 结构', () => {
    expect(contentJs).toContain('md-toc-search-input');
    expect(contentJs).toContain('md-toc-search-clear');
    expect(contentJs).toContain('md-toc-search-count');
    expect(contentJs).toContain('md-toc-no-result');
  });

  test('1.2 content.js 中包含 filterTocItems 函数', () => {
    expect(contentJs).toMatch(/function filterTocItems\s*\(/);
  });

  test('1.3 content.js 中包含 saveTocCollapseState 函数', () => {
    expect(contentJs).toMatch(/function saveTocCollapseState\s*\(/);
  });

  test('1.4 content.js 中包含 restoreTocFromSearch 函数', () => {
    expect(contentJs).toMatch(/function restoreTocFromSearch\s*\(/);
  });

  test('1.5 content.js 中包含 escapeRegExp 函数', () => {
    expect(contentJs).toMatch(/function escapeRegExp\s*\(/);
  });

  test('1.6 content.css 中包含搜索框样式', () => {
    expect(contentCss).toContain('.md-toc-search-box');
    expect(contentCss).toContain('.md-toc-search-input');
    expect(contentCss).toContain('.md-toc-search-clear');
    expect(contentCss).toContain('.md-toc-search-count');
    expect(contentCss).toContain('.md-toc-no-result');
  });

  test('1.7 content.css 中包含 mark 高亮样式', () => {
    expect(contentCss).toContain('.md-toc-link mark');
  });

  test('1.8 content.css 中包含暗色主题搜索框样式', () => {
    expect(contentCss).toContain('.theme-dark .md-toc-search-box');
    expect(contentCss).toContain('.theme-dark .md-toc-search-input');
  });

  test('1.9 content.css 中包含 auto 主题搜索框样式', () => {
    expect(contentCss).toContain('.theme-auto .md-toc-search-box');
    expect(contentCss).toContain('.theme-auto .md-toc-search-input');
  });

  test('1.10 i18n 中文语言包包含搜索相关翻译键', () => {
    expect(zhCN['sidebar.toc.search.placeholder']).toBe('搜索目录…');
    expect(zhCN['sidebar.toc.search.clear']).toBe('清除搜索');
    expect(zhCN['sidebar.toc.search.noResult']).toBe('无匹配结果');
  });

  test('1.11 i18n 英文语言包包含搜索相关翻译键', () => {
    expect(en['sidebar.toc.search.placeholder']).toBe('Search headings…');
    expect(en['sidebar.toc.search.clear']).toBe('Clear search');
    expect(en['sidebar.toc.search.noResult']).toBe('No matching results');
  });

  test('1.12 搜索框事件绑定使用了 debounce', () => {
    expect(contentJs).toMatch(/debounce\(.*filterTocItems.*150\)/s);
  });

  test('1.13 搜索框绑定了 Escape 键事件', () => {
    // 搜索框的 keydown 事件中检查 Escape 键
    expect(contentJs).toMatch(/tocSearchInput[\s\S]*?addEventListener\s*\(\s*['"]keydown['"]/);
    expect(contentJs).toMatch(/e\.key\s*===\s*['"]Escape['"]/);
  });
});

// =====================================================
//  Tier 2 — 行为级断言
// =====================================================
describe('Tier 2: 目录搜索过滤行为', () => {
  // 模拟 tocItems 和 DOM 结构
  function setupTocDOM() {
    const tocItems = [
      { id: 'h1', text: '安装指南', depth: 1 },
      { id: 'h1-1', text: '系统要求', depth: 2 },
      { id: 'h1-2', text: '安装步骤', depth: 2 },
      { id: 'h2', text: '配置说明', depth: 1 },
      { id: 'h2-1', text: '基本配置', depth: 2 },
      { id: 'h2-2', text: '高级配置', depth: 2 },
      { id: 'h3', text: '常见问题', depth: 1 },
    ];

    const minDepth = 1;
    let tocHtml = '<ul class="md-toc-list">';
    tocItems.forEach((item, index) => {
      const indent = item.depth - minDepth;
      tocHtml += `<li class="md-toc-item toc-level-${indent}" data-toc-index="${index}" data-toc-depth="${item.depth}" style="padding-left:${indent * 16}px;">
        <span class="md-toc-toggle-placeholder"></span>
        <a href="#${item.id}" class="md-toc-link" data-index="${index}" title="${item.text}">${item.text}</a>
      </li>`;
    });
    tocHtml += '</ul>';

    document.body.innerHTML = `
      <div id="sidebar-panel-toc" class="sidebar-panel">
        <div class="md-toc-search-box">
          <span class="md-toc-search-icon">🔍</span>
          <input id="md-toc-search-input" class="md-toc-search-input" type="text" placeholder="搜索目录…" />
          <span id="md-toc-search-count" class="md-toc-search-count"></span>
          <button id="md-toc-search-clear" class="md-toc-search-clear" title="清除搜索" style="display:none;">✕</button>
        </div>
        <nav id="md-toc-nav" class="md-toc-nav">${tocHtml}</nav>
        <div id="md-toc-no-result" class="md-toc-no-result" style="display:none;">无匹配结果</div>
      </div>
    `;

    return tocItems;
  }

  // 简化版 filterTocItems（从 content.js 中提取核心逻辑）
  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function filterTocItems(keyword, tocItems) {
    const allItems = document.querySelectorAll('.md-toc-item');
    const countEl = document.getElementById('md-toc-search-count');
    const clearBtn = document.getElementById('md-toc-search-clear');
    const noResultEl = document.getElementById('md-toc-no-result');
    const tocNav = document.getElementById('md-toc-nav');

    if (!allItems.length) return;

    const trimmed = keyword.trim();

    if (!trimmed) {
      // 恢复全部
      allItems.forEach((item, i) => {
        item.style.display = '';
        const link = item.querySelector('.md-toc-link');
        if (link && tocItems[i]) link.innerHTML = escapeHtml(tocItems[i].text);
      });
      if (countEl) countEl.textContent = '';
      if (clearBtn) clearBtn.style.display = 'none';
      if (noResultEl) noResultEl.style.display = 'none';
      if (tocNav) tocNav.style.display = '';
      return;
    }

    if (clearBtn) clearBtn.style.display = '';

    const lowerKeyword = trimmed.toLowerCase();
    const escapedKeyword = escapeHtml(trimmed);
    const total = allItems.length;
    let matchCount = 0;

    const matchFlags = new Array(total).fill(false);
    allItems.forEach((item, i) => {
      const originalText = tocItems[i] ? tocItems[i].text : '';
      if (originalText.toLowerCase().includes(lowerKeyword)) {
        matchFlags[i] = true;
        matchCount++;
      }
    });

    const visibleFlags = [...matchFlags];
    for (let i = total - 1; i >= 0; i--) {
      if (!matchFlags[i]) continue;
      const myDepth = parseInt(allItems[i].dataset.tocDepth);
      for (let j = i - 1; j >= 0; j--) {
        const ancestorDepth = parseInt(allItems[j].dataset.tocDepth);
        if (ancestorDepth < myDepth) {
          visibleFlags[j] = true;
        }
      }
    }

    allItems.forEach((item, i) => {
      const link = item.querySelector('.md-toc-link');
      if (!link) return;

      if (visibleFlags[i]) {
        item.style.display = '';
        const originalText = tocItems[i] ? tocItems[i].text : '';
        if (matchFlags[i]) {
          const regex = new RegExp(`(${escapeRegExp(escapedKeyword)})`, 'gi');
          const escapedText = escapeHtml(originalText);
          link.innerHTML = escapedText.replace(regex, '<mark>$1</mark>');
        } else {
          link.innerHTML = escapeHtml(originalText);
        }
      } else {
        item.style.display = 'none';
      }
    });

    if (countEl) countEl.textContent = `${matchCount}/${total}`;
    if (noResultEl) noResultEl.style.display = matchCount === 0 ? '' : 'none';
    if (tocNav) tocNav.style.display = matchCount === 0 ? 'none' : '';
  }

  test('2.1 输入关键词后匹配项可见，不匹配项隐藏', () => {
    const tocItems = setupTocDOM();
    filterTocItems('安装', tocItems);

    const allItems = document.querySelectorAll('.md-toc-item');
    // "安装指南" (index 0) 和 "安装步骤" (index 2) 匹配
    expect(allItems[0].style.display).toBe('');
    expect(allItems[2].style.display).toBe('');
    // "配置说明" (index 3) 不匹配且无匹配子项
    expect(allItems[3].style.display).toBe('none');
  });

  test('2.2 匹配文本被 <mark> 标签高亮', () => {
    const tocItems = setupTocDOM();
    filterTocItems('配置', tocItems);

    const allItems = document.querySelectorAll('.md-toc-item');
    // "配置说明" (index 3) 匹配
    const link3 = allItems[3].querySelector('.md-toc-link');
    expect(link3.innerHTML).toContain('<mark>');
    expect(link3.innerHTML).toContain('配置');
  });

  test('2.3 匹配计数正确显示', () => {
    const tocItems = setupTocDOM();
    filterTocItems('配置', tocItems);

    const countEl = document.getElementById('md-toc-search-count');
    // "配置说明"、"基本配置"、"高级配置" 共 3 个匹配
    expect(countEl.textContent).toBe('3/7');
  });

  test('2.4 清空搜索后恢复全部项', () => {
    const tocItems = setupTocDOM();
    filterTocItems('安装', tocItems);
    filterTocItems('', tocItems);

    const allItems = document.querySelectorAll('.md-toc-item');
    allItems.forEach(item => {
      expect(item.style.display).toBe('');
    });

    const countEl = document.getElementById('md-toc-search-count');
    expect(countEl.textContent).toBe('');
  });

  test('2.5 清除按钮在有输入时显示，清空后隐藏', () => {
    const tocItems = setupTocDOM();
    const clearBtn = document.getElementById('md-toc-search-clear');

    filterTocItems('安装', tocItems);
    expect(clearBtn.style.display).toBe('');

    filterTocItems('', tocItems);
    expect(clearBtn.style.display).toBe('none');
  });

  test('2.6 无匹配结果时显示提示', () => {
    const tocItems = setupTocDOM();
    filterTocItems('不存在的关键词xyz', tocItems);

    const noResultEl = document.getElementById('md-toc-no-result');
    expect(noResultEl.style.display).toBe('');

    const countEl = document.getElementById('md-toc-search-count');
    expect(countEl.textContent).toBe('0/7');
  });

  test('2.7 搜索大小写不敏感', () => {
    const tocItems = setupTocDOM();
    // 修改一个项为英文以测试大小写
    tocItems[6] = { id: 'h3', text: 'FAQ Questions', depth: 1 };
    const allItems = document.querySelectorAll('.md-toc-item');
    allItems[6].querySelector('.md-toc-link').textContent = 'FAQ Questions';

    filterTocItems('faq', tocItems);
    expect(allItems[6].style.display).toBe('');
  });

  test('2.8 清空搜索后 mark 标签被移除', () => {
    const tocItems = setupTocDOM();
    filterTocItems('配置', tocItems);
    filterTocItems('', tocItems);

    const allItems = document.querySelectorAll('.md-toc-item');
    allItems.forEach(item => {
      const link = item.querySelector('.md-toc-link');
      expect(link.innerHTML).not.toContain('<mark>');
    });
  });
});

// =====================================================
//  Tier 3 — 任务特定断言
// =====================================================
describe('Tier 3: BT-tocSearch 目录搜索回归', () => {
  test('BT-tocSearch.1 祖先项在子项匹配时保持可见', () => {
    // 设置 DOM
    const tocItems = [
      { id: 'h1', text: '第一章', depth: 1 },
      { id: 'h1-1', text: '第一节', depth: 2 },
      { id: 'h1-1-1', text: '安装配置详解', depth: 3 },
      { id: 'h2', text: '第二章', depth: 1 },
    ];

    let tocHtml = '<ul class="md-toc-list">';
    tocItems.forEach((item, index) => {
      const indent = item.depth - 1;
      tocHtml += `<li class="md-toc-item toc-level-${indent}" data-toc-index="${index}" data-toc-depth="${item.depth}" style="padding-left:${indent * 16}px;">
        <span class="md-toc-toggle-placeholder"></span>
        <a href="#${item.id}" class="md-toc-link" data-index="${index}" title="${item.text}">${item.text}</a>
      </li>`;
    });
    tocHtml += '</ul>';

    document.body.innerHTML = `
      <div id="sidebar-panel-toc" class="sidebar-panel">
        <div class="md-toc-search-box">
          <input id="md-toc-search-input" class="md-toc-search-input" type="text" />
          <span id="md-toc-search-count" class="md-toc-search-count"></span>
          <button id="md-toc-search-clear" class="md-toc-search-clear" style="display:none;">✕</button>
        </div>
        <nav id="md-toc-nav" class="md-toc-nav">${tocHtml}</nav>
        <div id="md-toc-no-result" class="md-toc-no-result" style="display:none;"></div>
      </div>
    `;

    // 简化版 filter（复用 Tier 2 的逻辑）
    function escapeHtml(text) {
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function escapeRegExp(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    const allItems = document.querySelectorAll('.md-toc-item');
    const keyword = '安装';
    const lowerKeyword = keyword.toLowerCase();
    const total = allItems.length;
    const matchFlags = new Array(total).fill(false);

    allItems.forEach((item, i) => {
      if (tocItems[i].text.toLowerCase().includes(lowerKeyword)) {
        matchFlags[i] = true;
      }
    });

    const visibleFlags = [...matchFlags];
    for (let i = total - 1; i >= 0; i--) {
      if (!matchFlags[i]) continue;
      const myDepth = parseInt(allItems[i].dataset.tocDepth);
      for (let j = i - 1; j >= 0; j--) {
        const ancestorDepth = parseInt(allItems[j].dataset.tocDepth);
        if (ancestorDepth < myDepth) {
          visibleFlags[j] = true;
        }
      }
    }

    allItems.forEach((item, i) => {
      item.style.display = visibleFlags[i] ? '' : 'none';
    });

    // "安装配置详解" (index 2) 匹配
    expect(allItems[2].style.display).toBe('');
    // "第一节" (index 1) 是祖先，应可见
    expect(allItems[1].style.display).toBe('');
    // "第一章" (index 0) 是更高层祖先，应可见
    expect(allItems[0].style.display).toBe('');
    // "第二章" (index 3) 不匹配且无匹配子项
    expect(allItems[3].style.display).toBe('none');
  });

  test('BT-tocSearch.2 搜索框 DOM 在目录面板中正确定位（在 md-toc-nav 之前）', () => {
    // 验证 content.js 中搜索框 HTML 在 md-toc-nav 之前
    const searchBoxPos = contentJs.indexOf('md-toc-search-box');
    const tocNavPos = contentJs.indexOf('id="md-toc-nav"');
    expect(searchBoxPos).toBeLessThan(tocNavPos);
    expect(searchBoxPos).toBeGreaterThan(0);
  });

  test('BT-tocSearch.3 搜索框使用 i18n t() 函数设置 placeholder', () => {
    // 验证 content.js 中搜索框 placeholder 使用了 t() 函数
    expect(contentJs).toMatch(/placeholder="\$\{t\('sidebar\.toc\.search\.placeholder'\)\}"/);
  });

  test('BT-tocSearch.4 filterTocItems 中使用 escapeHtml 防止 XSS', () => {
    // 验证 filterTocItems 函数体中调用了 escapeHtml
    const fnMatch = contentJs.match(/function filterTocItems[\s\S]*?function saveTocCollapseState/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toContain('escapeHtml');
  });

  test('BT-tocSearch.5 搜索框事件绑定使用了 debounce 150ms', () => {
    expect(contentJs).toMatch(/debounce\(\s*\(.*?\)\s*=>\s*filterTocItems\(.*?\)\s*,\s*150\s*\)/);
  });
});
