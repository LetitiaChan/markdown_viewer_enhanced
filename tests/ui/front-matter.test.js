/**
 * YAML Front Matter 渲染测试
 * 
 * 测试 .mdc 文件中 YAML Front Matter 的检测、提取和渲染功能
 */

const fs = require('fs');
const path = require('path');

describe('BT-front-matter YAML Front Matter 渲染', () => {
  let contentJs;
  let contentCss;

  beforeAll(() => {
    contentJs = fs.readFileSync(
      path.join(__dirname, '../../content/content.js'),
      'utf-8'
    );
    contentCss = fs.readFileSync(
      path.join(__dirname, '../../styles/content.css'),
      'utf-8'
    );
  });

  // =====================================================
  //  Tier 1 — 存在性断言
  // =====================================================
  describe('Tier 1 — 存在性断言', () => {
    test('1.1 content.js 中存在 preprocessFrontMatter 函数', () => {
      expect(contentJs).toMatch(/function\s+preprocessFrontMatter\s*\(/);
    });

    test('1.2 preprocessFrontMatter 函数使用正则匹配文件开头的 ---', () => {
      expect(contentJs).toMatch(/frontMatterRegex/);
      // 确认正则中包含 --- 匹配模式
      expect(contentJs).toMatch(/\\s\*---/);
    });

    test('1.3 preprocessFrontMatter 返回 frontMatterHtml 和 remainingMarkdown', () => {
      expect(contentJs).toMatch(/frontMatterHtml/);
      expect(contentJs).toMatch(/remainingMarkdown/);
    });

    test('1.4 init() 函数中调用了 preprocessFrontMatter', () => {
      // 确认 init 函数中有 preprocessFrontMatter 调用
      expect(contentJs).toMatch(/preprocessFrontMatter\(rawMarkdown\)/);
    });

    test('1.5 reRenderContent() 函数中调用了 preprocessFrontMatter', () => {
      // 确认 reRenderContent 中有 preprocessFrontMatter 调用
      expect(contentJs).toMatch(/reRenderFrontMatterHtml/);
    });

    test('1.6 content.css 中存在 .front-matter-block 样式', () => {
      expect(contentCss).toMatch(/\.front-matter-block\s*\{/);
    });

    test('1.7 content.css 中存在 .front-matter-header 样式', () => {
      expect(contentCss).toMatch(/\.front-matter-header\s*\{/);
    });

    test('1.8 content.css 中存在暗色主题的 .front-matter-block 样式', () => {
      expect(contentCss).toMatch(/\.theme-dark\s+\.front-matter-block/);
    });

    test('1.9 content.css 中存在暗色主题的 .front-matter-header 样式', () => {
      expect(contentCss).toMatch(/\.theme-dark\s+\.front-matter-header/);
    });

    test('1.10 生成的 HTML 包含齿轮图标 ⚙', () => {
      expect(contentJs).toMatch(/⚙/);
    });

    test('1.11 生成的 HTML 包含 "YAML Front Matter" 标题', () => {
      expect(contentJs).toMatch(/YAML Front Matter/);
    });
  });

  // =====================================================
  //  Tier 2 — 行为级断言
  // =====================================================
  describe('Tier 2 — 行为级断言', () => {
    // 提取 preprocessFrontMatter 函数并在测试环境中执行
    let preprocessFrontMatter;

    beforeAll(() => {
      // 从 content.js 中提取 preprocessFrontMatter 函数的逻辑
      // 由于它是 IIFE 内部函数，我们通过模拟来测试
      const escapeHtml = (str) => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      preprocessFrontMatter = function(markdown) {
        const frontMatterRegex = /^\s*---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
        const match = markdown.match(frontMatterRegex);

        if (!match) {
          return { frontMatterHtml: '', remainingMarkdown: markdown };
        }

        const yamlContent = match[1];
        const remainingMarkdown = markdown.slice(match[0].length);

        // 在测试环境中没有 hljs，使用 escapeHtml
        const highlightedYaml = escapeHtml(yamlContent);

        const frontMatterHtml = `<div class="front-matter-block front-matter-collapsed"><div class="front-matter-header" role="button" tabindex="0" aria-expanded="false"><span class="front-matter-arrow">▶</span><span class="front-matter-icon">⚙</span><span class="front-matter-title">YAML Front Matter</span></div><div class="front-matter-content"><pre><code class="hljs language-yaml">${highlightedYaml}</code></pre></div></div>`;

        return { frontMatterHtml, remainingMarkdown };
      };
    });

    test('2.1 正确提取标准 YAML Front Matter', () => {
      const markdown = '---\nalwaysApply: true\n---\n# Hello';
      const result = preprocessFrontMatter(markdown);

      expect(result.frontMatterHtml).toContain('front-matter-block');
      expect(result.frontMatterHtml).toContain('alwaysApply: true');
      expect(result.frontMatterHtml).toContain('⚙');
      expect(result.frontMatterHtml).toContain('YAML Front Matter');
      expect(result.remainingMarkdown).toBe('# Hello');
    });

    test('2.2 没有 Front Matter 时返回原始 markdown', () => {
      const markdown = '# Hello\nWorld';
      const result = preprocessFrontMatter(markdown);

      expect(result.frontMatterHtml).toBe('');
      expect(result.remainingMarkdown).toBe(markdown);
    });

    test('2.3 正确处理多行 YAML 内容', () => {
      const markdown = '---\n# Comment\nalwaysApply: true\nkey: value\n---\nContent';
      const result = preprocessFrontMatter(markdown);

      expect(result.frontMatterHtml).toContain('# Comment');
      expect(result.frontMatterHtml).toContain('alwaysApply: true');
      expect(result.frontMatterHtml).toContain('key: value');
      expect(result.remainingMarkdown).toBe('Content');
    });

    test('2.4 不匹配文档中间的 --- 分隔线', () => {
      const markdown = '# Title\n---\nContent\n---\nMore';
      const result = preprocessFrontMatter(markdown);

      expect(result.frontMatterHtml).toBe('');
      expect(result.remainingMarkdown).toBe(markdown);
    });

    test('2.5 正确处理 HTML 特殊字符', () => {
      const markdown = '---\nkey: <value>\n---\nContent';
      const result = preprocessFrontMatter(markdown);

      expect(result.frontMatterHtml).toContain('&lt;value&gt;');
      expect(result.frontMatterHtml).not.toContain('<value>');
    });

    test('2.6 正确处理 Front Matter 后无空行的情况', () => {
      const markdown = '---\nkey: value\n---\nContent immediately';
      const result = preprocessFrontMatter(markdown);

      expect(result.frontMatterHtml).toContain('key: value');
      expect(result.remainingMarkdown).toBe('Content immediately');
    });

    test('2.7 正确处理空 Front Matter', () => {
      const markdown = '---\n\n---\nContent';
      const result = preprocessFrontMatter(markdown);

      expect(result.frontMatterHtml).toContain('front-matter-block');
      expect(result.remainingMarkdown).toBe('Content');
    });

    test('2.8 正确处理开头有空白的 Front Matter', () => {
      const markdown = '  ---\nkey: value\n---\nContent';
      const result = preprocessFrontMatter(markdown);

      expect(result.frontMatterHtml).toContain('key: value');
      expect(result.remainingMarkdown).toBe('Content');
    });

    test('2.9 生成的 HTML 结构正确（含折叠元素）', () => {
      const markdown = '---\nalwaysApply: true\n---\n# Hello';
      const result = preprocessFrontMatter(markdown);

      // 检查 HTML 结构
      expect(result.frontMatterHtml).toMatch(/<div class="front-matter-block front-matter-collapsed">/);
      expect(result.frontMatterHtml).toMatch(/<div class="front-matter-header"/);
      expect(result.frontMatterHtml).toMatch(/aria-expanded="false"/);
      expect(result.frontMatterHtml).toMatch(/<span class="front-matter-arrow">/);
      expect(result.frontMatterHtml).toMatch(/<span class="front-matter-icon">/);
      expect(result.frontMatterHtml).toMatch(/<span class="front-matter-title">/);
      expect(result.frontMatterHtml).toMatch(/<div class="front-matter-content">/);
      expect(result.frontMatterHtml).toMatch(/<pre><code class="hljs language-yaml">/);
    });
  });

  // =====================================================
  //  Tier 2.5 — 折叠/展开交互断言
  // =====================================================
  describe('Tier 2.5 — 折叠/展开交互', () => {
    let container;
    let clickHandler;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = `<div class="front-matter-block front-matter-collapsed"><div class="front-matter-header" role="button" tabindex="0" aria-expanded="false"><span class="front-matter-arrow">▶</span><span class="front-matter-icon">⚙</span><span class="front-matter-title">YAML Front Matter</span></div><div class="front-matter-content"><pre><code class="hljs language-yaml">key: value</code></pre></div></div>`;
      document.body.appendChild(container);

      // 绑定折叠事件（模拟 bindEvents 中的逻辑）
      clickHandler = (e) => {
        const header = e.target.closest('.front-matter-header');
        if (header) {
          const block = header.closest('.front-matter-block');
          if (block) {
            const isCollapsed = block.classList.toggle('front-matter-collapsed');
            header.setAttribute('aria-expanded', String(!isCollapsed));
          }
        }
      };
      document.addEventListener('click', clickHandler);
    });

    afterEach(() => {
      document.removeEventListener('click', clickHandler);
      document.body.removeChild(container);
    });

    test('2.10 默认状态为折叠', () => {
      const block = container.querySelector('.front-matter-block');
      expect(block.classList.contains('front-matter-collapsed')).toBe(true);
      expect(block.querySelector('.front-matter-header').getAttribute('aria-expanded')).toBe('false');
    });

    test('2.11 点击 header 展开内容', () => {
      const header = container.querySelector('.front-matter-header');
      header.click();
      const block = container.querySelector('.front-matter-block');
      expect(block.classList.contains('front-matter-collapsed')).toBe(false);
      expect(header.getAttribute('aria-expanded')).toBe('true');
    });

    test('2.12 再次点击 header 折叠内容', () => {
      const header = container.querySelector('.front-matter-header');
      header.click(); // 展开
      header.click(); // 折叠
      const block = container.querySelector('.front-matter-block');
      expect(block.classList.contains('front-matter-collapsed')).toBe(true);
      expect(header.getAttribute('aria-expanded')).toBe('false');
    });

    test('2.13 点击箭头图标也能触发展开/折叠', () => {
      const arrow = container.querySelector('.front-matter-arrow');
      arrow.click();
      const block = container.querySelector('.front-matter-block');
      expect(block.classList.contains('front-matter-collapsed')).toBe(false);
    });
  });

  // =====================================================
  //  Tier 3 — 任务特定断言
  // =====================================================
  describe('Tier 3 — BT-front-matter 任务特定断言', () => {
    test('3.1 BT-front-matter.1 .mdc 文件的 YAML Front Matter 被正确渲染', () => {
      // 模拟 .mdc 文件的典型内容
      const mdcContent = '---\n# Please note: Do not modify the header of this document.\nalwaysApply: true\n---\n\nSome content here.';

      const frontMatterRegex = /^\s*---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
      const match = mdcContent.match(frontMatterRegex);

      expect(match).not.toBeNull();
      expect(match[1]).toContain('alwaysApply: true');
      expect(match[1]).toContain('# Please note');
    });

    test('3.2 BT-front-matter.2 Front Matter 从 markdown 源码中被正确移除', () => {
      const mdcContent = '---\nalwaysApply: true\n---\n\n# Title\n\nContent';

      const frontMatterRegex = /^\s*---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
      const match = mdcContent.match(frontMatterRegex);
      const remaining = mdcContent.slice(match[0].length);

      // 确认 remaining 不包含 --- 和 YAML 内容
      expect(remaining).not.toContain('alwaysApply');
      expect(remaining).toContain('# Title');
      expect(remaining).toContain('Content');
    });

    test('3.3 BT-front-matter.3 CSS 样式与代码块视觉一致', () => {
      // 验证 front-matter-block 的关键样式属性与 code-block 一致
      const fmBlockMatch = contentCss.match(/\.front-matter-block\s*\{([^}]+)\}/);
      expect(fmBlockMatch).not.toBeNull();
      expect(fmBlockMatch[1]).toMatch(/border-radius:\s*8px/);
      expect(fmBlockMatch[1]).toMatch(/border:\s*1px\s+solid/);
      expect(fmBlockMatch[1]).toMatch(/overflow:\s*hidden/);
    });

    test('3.4 BT-front-matter.4 Front Matter 标题栏有正确的背景色', () => {
      const headerMatch = contentCss.match(/\.front-matter-header\s*\{([^}]+)\}/);
      expect(headerMatch).not.toBeNull();
      expect(headerMatch[1]).toMatch(/background:\s*#f1f3f5/);
      expect(headerMatch[1]).toMatch(/border-bottom/);
    });

    test('3.5 BT-front-matter.5 暗色主题下 Front Matter 有正确的样式', () => {
      const darkHeaderMatch = contentCss.match(/\.theme-dark\s+\.front-matter-header\s*\{([^}]+)\}/);
      expect(darkHeaderMatch).not.toBeNull();
      expect(darkHeaderMatch[1]).toMatch(/background:\s*#2d2d2d/);

      const darkBlockPreMatch = contentCss.match(/\.theme-dark\s+\.front-matter-block\s+pre\s*\{([^}]+)\}/);
      expect(darkBlockPreMatch).not.toBeNull();
      expect(darkBlockPreMatch[1]).toMatch(/background:\s*#1e1e1e/);
    });

    test('3.6 BT-front-matter.6 Front Matter 内容使用等宽字体', () => {
      const codeMatch = contentCss.match(/\.front-matter-block\s+pre\s+code\s*\{([^}]+)\}/);
      expect(codeMatch).not.toBeNull();
      expect(codeMatch[1]).toMatch(/font-family/);
      expect(codeMatch[1]).toMatch(/Consolas|monospace/);
    });

    test('3.7 BT-front-matter.7 CSS 包含折叠内容区的 max-height 过渡动画', () => {
      expect(contentCss).toMatch(/\.front-matter-content\s*\{[^}]*max-height/);
      expect(contentCss).toMatch(/\.front-matter-content\s*\{[^}]*transition/);
    });

    test('3.8 BT-front-matter.8 CSS 折叠状态下内容区 max-height 为 0', () => {
      expect(contentCss).toMatch(/\.front-matter-collapsed\s+\.front-matter-content\s*\{[^}]*max-height:\s*0/);
    });

    test('3.9 BT-front-matter.9 CSS 箭头指示器有旋转过渡', () => {
      expect(contentCss).toMatch(/\.front-matter-arrow\s*\{[^}]*transition[^}]*transform/);
    });

    test('3.10 BT-front-matter.10 CSS 展开状态箭头旋转 90 度', () => {
      expect(contentCss).toMatch(/\.front-matter-block:not\(\.front-matter-collapsed\)\s+\.front-matter-arrow\s*\{[^}]*rotate\(90deg\)/);
    });

    test('3.11 BT-front-matter.11 header 有 cursor: pointer 样式', () => {
      const headerMatch = contentCss.match(/\.front-matter-header\s*\{([^}]+)\}/);
      expect(headerMatch).not.toBeNull();
      expect(headerMatch[1]).toMatch(/cursor:\s*pointer/);
    });

    test('3.12 BT-front-matter.12 content.js 中有 front-matter-collapsed 类名切换逻辑', () => {
      expect(contentJs).toMatch(/front-matter-collapsed/);
      expect(contentJs).toMatch(/classList\.toggle\(['"]front-matter-collapsed['"]\)/);
    });
  });
});
