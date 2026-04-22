/**
 * UI 测试：暗色代码高亮主题中 .hljs-strong / .hljs-emphasis 颜色可读性
 * 修复：暗色代码主题下加粗/斜体文字缺少 color 属性导致看不清
 */

const fs = require('fs');
const path = require('path');

// 读取 highlight-themes.css 内容
const cssContent = fs.readFileSync(
  path.join(__dirname, '../../styles/highlight-themes.css'),
  'utf-8'
);

// 暗色主题列表及其期望的基础文字颜色
const darkThemes = [
  { name: 'github-dark', baseColor: '#c9d1d9' },
  { name: 'monokai', baseColor: '#f8f8f2' },
  { name: 'vs2015', baseColor: '#dcdcdc' },
  { name: 'atom-one-dark', baseColor: '#abb2bf' },
  { name: 'dracula', baseColor: '#ffb86c' },  // dracula 的 strong 有独特颜色
  { name: 'nord', baseColor: '#d8dee9' },
  { name: 'solarized-dark', baseColor: '#839496' },
  { name: 'tokyo-night', baseColor: '#a9b1d6' },
  { name: 'one-dark-pro', baseColor: '#abb2bf' },
  { name: 'default-dark-modern', baseColor: '#cccccc' },
];

// =====================================================
//  Tier 1 — 存在性断言：CSS 规则存在性检查
// =====================================================
describe('Tier 1: 暗色代码主题 .hljs-strong/.hljs-emphasis CSS 规则存在性', () => {
  test.each(darkThemes)(
    '1.1 $name 主题的 .hljs-strong 规则包含 color 属性',
    ({ name }) => {
      // 匹配 [data-code-theme="xxx"] .hljs-strong { ... color: ... }
      const regex = new RegExp(
        `\\[data-code-theme="${name}"\\]\\s+\\.hljs-strong\\s*\\{[^}]*color\\s*:`
      );
      expect(cssContent).toMatch(regex);
    }
  );

  test.each(darkThemes)(
    '1.2 $name 主题的 .hljs-emphasis 规则包含 color 属性',
    ({ name }) => {
      const regex = new RegExp(
        `\\[data-code-theme="${name}"\\]\\s+\\.hljs-emphasis\\s*\\{[^}]*color\\s*:`
      );
      expect(cssContent).toMatch(regex);
    }
  );
});

// =====================================================
//  Tier 2 — 行为级断言：暗色主题下 strong/emphasis 元素颜色可读性
// =====================================================
describe('Tier 2: 暗色主题下代码块中 strong/emphasis 元素颜色可读性', () => {
  beforeEach(() => {
    // 构建包含代码块和 hljs-strong/hljs-emphasis 的 DOM
    document.body.innerHTML = `
      <div id="md-viewer-app" class="md-viewer-app" data-code-theme="monokai">
        <div class="code-block">
          <code class="hljs language-markdown">
            <span class="hljs-strong">**加粗文字**</span>
            <span class="hljs-emphasis">*斜体文字*</span>
          </code>
        </div>
      </div>
    `;

    // 注入 CSS 到 jsdom
    const style = document.createElement('style');
    style.textContent = cssContent;
    document.head.appendChild(style);
  });

  test('2.1 切换暗色代码主题后 hljs-strong 元素存在于 DOM 中', () => {
    const strongEl = document.querySelector('.hljs-strong');
    expect(strongEl).not.toBeNull();
    expect(strongEl.textContent).toContain('加粗文字');
  });

  test('2.2 切换暗色代码主题后 hljs-emphasis 元素存在于 DOM 中', () => {
    const emphasisEl = document.querySelector('.hljs-emphasis');
    expect(emphasisEl).not.toBeNull();
    expect(emphasisEl.textContent).toContain('斜体文字');
  });

  test('2.3 切换不同暗色主题时 data-code-theme 属性正确更新', () => {
    const app = document.getElementById('md-viewer-app');

    // 模拟切换到不同暗色主题
    const themesToTest = ['github-dark', 'vs2015', 'atom-one-dark', 'dracula', 'nord', 'tokyo-night'];
    themesToTest.forEach(theme => {
      app.setAttribute('data-code-theme', theme);
      expect(app.getAttribute('data-code-theme')).toBe(theme);
    });
  });
});

// =====================================================
//  Tier 3 — 任务特定断言：BT-hljs-strong 回归测试
// =====================================================
describe('BT-hljs-strong.1 暗色代码主题加粗文字颜色回归测试', () => {
  // 辅助函数：从 CSS 中提取指定主题 .hljs-strong 的 color 值
  function extractStrongColor(themeName) {
    const regex = new RegExp(
      `\\[data-code-theme="${themeName}"\\]\\s+\\.hljs-strong\\s*\\{([^}]*)\\}`,
      's'
    );
    const match = cssContent.match(regex);
    if (!match) return null;
    const colorMatch = match[1].match(/color\s*:\s*(#[0-9a-fA-F]{3,8})/);
    return colorMatch ? colorMatch[1].toLowerCase() : null;
  }

  // 辅助函数：从 CSS 中提取指定主题 .hljs-emphasis 的 color 值
  function extractEmphasisColor(themeName) {
    const regex = new RegExp(
      `\\[data-code-theme="${themeName}"\\]\\s+\\.hljs-emphasis\\s*\\{([^}]*)\\}`,
      's'
    );
    const match = cssContent.match(regex);
    if (!match) return null;
    const colorMatch = match[1].match(/color\s*:\s*(#[0-9a-fA-F]{3,8})/);
    return colorMatch ? colorMatch[1].toLowerCase() : null;
  }

  // 辅助函数：计算颜色亮度（0-255），用于判断是否在暗色背景下可读
  function getLuminance(hexColor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // 使用相对亮度公式
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  test('3.1 所有暗色主题的 .hljs-strong 颜色亮度足够高（在暗色背景下可读）', () => {
    darkThemes.forEach(({ name }) => {
      const color = extractStrongColor(name);
      expect(color).not.toBeNull();
      // 暗色背景下，文字颜色亮度应 >= 120（确保可读性）
      const luminance = getLuminance(color);
      expect(luminance).toBeGreaterThanOrEqual(120);
    });
  });

  test('3.2 所有暗色主题的 .hljs-emphasis 颜色亮度足够高（在暗色背景下可读）', () => {
    darkThemes.forEach(({ name }) => {
      const color = extractEmphasisColor(name);
      expect(color).not.toBeNull();
      const luminance = getLuminance(color);
      expect(luminance).toBeGreaterThanOrEqual(120);
    });
  });

  test('3.3 暗色主题的 .hljs-strong 颜色不是深色（排除 #24292e 等暗色值）', () => {
    const darkColors = ['#24292e', '#1f2328', '#000000', '#333333'];
    darkThemes.forEach(({ name }) => {
      const color = extractStrongColor(name);
      expect(color).not.toBeNull();
      expect(darkColors).not.toContain(color);
    });
  });

  test('3.4 暗色主题的 .hljs-strong 同时包含 font-weight 属性', () => {
    darkThemes.forEach(({ name }) => {
      const regex = new RegExp(
        `\\[data-code-theme="${name}"\\]\\s+\\.hljs-strong\\s*\\{[^}]*font-weight\\s*:`
      );
      expect(cssContent).toMatch(regex);
    });
  });

  test('3.5 暗色主题的 .hljs-emphasis 同时包含 font-style: italic', () => {
    darkThemes.forEach(({ name }) => {
      const regex = new RegExp(
        `\\[data-code-theme="${name}"\\]\\s+\\.hljs-emphasis\\s*\\{[^}]*font-style\\s*:\\s*italic`
      );
      expect(cssContent).toMatch(regex);
    });
  });
});
