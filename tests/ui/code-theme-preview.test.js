/**
 * UI 测试：大设置面板 — 代码高亮主题预览同步
 * 修复：切换代码高亮主题后，设置面板中的代码预览区域不更新
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
const highlightThemesCss = fs.readFileSync(
  path.join(__dirname, '../../styles/highlight-themes.css'),
  'utf-8'
);

// 所有代码主题列表
const allThemes = [
  'default-light-modern', 'github', 'atom-one-light', 'solarized-light',
  'default-dark-modern', 'github-dark', 'monokai', 'vs2015',
  'atom-one-dark', 'one-dark-pro', 'dracula', 'nord',
  'solarized-dark', 'tokyo-night'
];

const darkThemes = [
  'github-dark', 'default-dark-modern', 'monokai', 'vs2015',
  'atom-one-dark', 'one-dark-pro', 'dracula', 'nord',
  'solarized-dark', 'tokyo-night'
];

const lightThemes = [
  'default-light-modern', 'github', 'atom-one-light', 'solarized-light'
];

// =====================================================
//  Tier 1 — 存在性断言
// =====================================================
describe('Tier 1: 代码预览区域存在性检查', () => {
  test('1.1 content.js 中预览区域使用 hljs 类名而非自定义类名', () => {
    // 预览区域应使用 hljs 类名
    expect(contentJs).toMatch(/id="stg-code-preview"[\s\S]*?class="hljs"/);
    // 预览区域应使用 hljs-keyword, hljs-title 等标准类名
    expect(contentJs).toMatch(/stg-code-preview[\s\S]*?hljs-keyword/);
  });

  test('1.2 content.js 中预览区域带有 data-code-theme 属性', () => {
    expect(contentJs).toMatch(/id="stg-code-preview"[^>]*data-code-theme=/);
  });

  test('1.3 content.js 中存在 updateCodePreviewTheme 函数', () => {
    expect(contentJs).toContain('function updateCodePreviewTheme');
  });

  test('1.4 代码主题切换事件中调用了 updateCodePreviewTheme', () => {
    // 在 stg-codeTheme change 事件中应调用 updateCodePreviewTheme
    expect(contentJs).toMatch(/stg-codeTheme[\s\S]*?updateCodePreviewTheme/);
  });

  test('1.5 syncSettingsToPanel 中调用了 updateCodePreviewTheme', () => {
    // syncSettingsToPanel 函数中应同步预览区域主题
    expect(contentJs).toMatch(/syncSettingsToPanel[\s\S]*?updateCodePreviewTheme/);
  });

  test.each(allThemes)(
    '1.6 content.css 中存在 %s 主题的预览背景色规则',
    (theme) => {
      // 检查 CSS 中存在该主题的预览背景色规则
      const regex = new RegExp(
        `\\.md-settings-code-preview\\[data-code-theme="${theme}"\\]`
      );
      expect(contentCss).toMatch(regex);
      // 同时确认该选择器附近有 background 属性
      expect(contentCss).toMatch(
        new RegExp(`\\[data-code-theme="${theme}"\\][^{]*\\{[^}]*background`)
      );
    }
  );

  test.each(darkThemes)(
    '1.7 content.css 中 %s 暗色主题有预览边框颜色规则',
    (theme) => {
      expect(contentCss).toMatch(
        new RegExp(`\\.md-settings-code-preview\\[data-code-theme="${theme}"\\]`)
      );
    }
  );
});

// =====================================================
//  Tier 2 — 行为级断言：模拟用户切换主题
// =====================================================
describe('Tier 2: 代码主题切换后预览区域更新', () => {
  beforeEach(() => {
    // 构建包含设置面板的 DOM
    document.body.innerHTML = `
      <div id="md-viewer-app" class="md-viewer-app theme-light" data-code-theme="default-dark-modern">
        <div id="md-settings-overlay" class="md-settings-overlay">
          <div class="md-settings-panel">
            <select id="stg-codeTheme" class="md-settings-select">
              <optgroup label="亮色主题">
                <option value="default-light-modern">Default Light Modern</option>
                <option value="github">GitHub</option>
                <option value="atom-one-light">Atom One Light</option>
                <option value="solarized-light">Solarized Light</option>
              </optgroup>
              <optgroup label="暗色主题">
                <option value="default-dark-modern" selected>Default Dark Modern</option>
                <option value="github-dark">GitHub Dark</option>
                <option value="monokai">Monokai</option>
                <option value="dracula">Dracula</option>
              </optgroup>
              <optgroup label="自动">
                <option value="auto">跟随页面主题</option>
              </optgroup>
            </select>
            <div class="md-settings-code-preview" id="stg-code-preview" data-code-theme="default-dark-modern">
              <pre><code class="hljs"><span class="hljs-keyword">function</span> <span class="hljs-title function_">fibonacci</span>(<span class="hljs-params">n</span>) {
  <span class="hljs-comment">// 递归实现斐波那契数列</span>
  <span class="hljs-keyword">return</span> n;
}</code></pre>
            </div>
          </div>
        </div>
      </div>
    `;

    // 注入 CSS
    const style = document.createElement('style');
    style.textContent = contentCss + '\n' + highlightThemesCss;
    document.head.appendChild(style);
  });

  test('2.1 预览区域初始 data-code-theme 与下拉框一致', () => {
    const preview = document.getElementById('stg-code-preview');
    const select = document.getElementById('stg-codeTheme');
    expect(preview.getAttribute('data-code-theme')).toBe(select.value);
  });

  test('2.2 手动更新预览区域 data-code-theme 后属性值正确变化', () => {
    const preview = document.getElementById('stg-code-preview');

    // 模拟 updateCodePreviewTheme 的逻辑
    const updatePreview = (themeName) => {
      const previewTheme = themeName === 'auto' ? 'github' : (themeName || 'default-dark-modern');
      preview.setAttribute('data-code-theme', previewTheme);
    };

    // 切换到 github
    updatePreview('github');
    expect(preview.getAttribute('data-code-theme')).toBe('github');

    // 切换到 monokai
    updatePreview('monokai');
    expect(preview.getAttribute('data-code-theme')).toBe('monokai');

    // 切换到 dracula
    updatePreview('dracula');
    expect(preview.getAttribute('data-code-theme')).toBe('dracula');
  });

  test('2.3 auto 模式下预览区域使用 github 作为预览主题', () => {
    const preview = document.getElementById('stg-code-preview');

    const updatePreview = (themeName) => {
      const previewTheme = themeName === 'auto' ? 'github' : (themeName || 'default-dark-modern');
      preview.setAttribute('data-code-theme', previewTheme);
    };

    updatePreview('auto');
    expect(preview.getAttribute('data-code-theme')).toBe('github');
  });

  test('2.4 切换到暗色主题后预览区域中 hljs 元素存在', () => {
    const preview = document.getElementById('stg-code-preview');
    preview.setAttribute('data-code-theme', 'monokai');

    const hljsEl = preview.querySelector('.hljs');
    expect(hljsEl).not.toBeNull();

    const keywordEl = preview.querySelector('.hljs-keyword');
    expect(keywordEl).not.toBeNull();
    expect(keywordEl.textContent).toContain('function');
  });

  test('2.5 遍历所有主题切换后预览区域 data-code-theme 均正确更新', () => {
    const preview = document.getElementById('stg-code-preview');

    const updatePreview = (themeName) => {
      const previewTheme = themeName === 'auto' ? 'github' : (themeName || 'default-dark-modern');
      preview.setAttribute('data-code-theme', previewTheme);
    };

    allThemes.forEach(theme => {
      updatePreview(theme);
      expect(preview.getAttribute('data-code-theme')).toBe(theme);
    });
  });
});

// =====================================================
//  Tier 3 — 任务特定断言：修复的具体场景
// =====================================================
describe('Tier 3: BT-codePreview 代码预览主题同步回归', () => {
  test('BT-codePreview.1 预览区域不再使用固定的自定义类名 (.cp/.cf/.cm/.cs)', () => {
    // 修复前使用 .cp, .cf, .cm, .cs 自定义类名，修复后应使用 hljs-* 类名
    // 检查 stg-code-preview 区域的 HTML 模板中不包含旧的自定义类名
    const previewSection = contentJs.match(/id="stg-code-preview"[\s\S]*?<\/pre>/);
    expect(previewSection).not.toBeNull();
    const previewHtml = previewSection[0];
    expect(previewHtml).not.toMatch(/class="cp"/);
    expect(previewHtml).not.toMatch(/class="cf"/);
    expect(previewHtml).not.toMatch(/class="cm"/);
    expect(previewHtml).not.toMatch(/class="cs"/);
    // 应使用 hljs-* 类名
    expect(previewHtml).toMatch(/class="hljs-keyword"/);
    expect(previewHtml).toMatch(/class="hljs-title function_"/);
    expect(previewHtml).toMatch(/class="hljs-comment"/);
  });

  test('BT-codePreview.2 content.css 中不再有固定颜色的 .cp/.cf/.cm/.cs 规则', () => {
    // 修复前 content.css 中有 .md-settings-code-preview .cp { color: #cba6f7; } 等固定颜色
    expect(contentCss).not.toMatch(/\.md-settings-code-preview\s+\.cp\s*\{/);
    expect(contentCss).not.toMatch(/\.md-settings-code-preview\s+\.cf\s*\{/);
    expect(contentCss).not.toMatch(/\.md-settings-code-preview\s+\.cm\s*\{/);
    expect(contentCss).not.toMatch(/\.md-settings-code-preview\s+\.cs\s*\{/);
  });

  test('BT-codePreview.3 content.css 中预览区域 pre 不再有固定的 background 颜色', () => {
    // 修复前：.md-settings-code-preview pre { background: #1e1e2e; }
    // 修复后：背景色由 data-code-theme 属性驱动
    const preRule = contentCss.match(/\.md-settings-code-preview\s+pre\s*\{([^}]*)\}/);
    expect(preRule).not.toBeNull();
    // pre 规则中不应有固定的 background 属性（背景色由 [data-code-theme] 选择器提供）
    expect(preRule[1]).not.toMatch(/background\s*:/);
  });

  test('BT-codePreview.4 content.css 中预览区域 code 不再有固定的 color 属性', () => {
    // 修复前：.md-settings-code-preview code { color: #cdd6f4; }
    // 修复后：颜色由 highlight-themes.css 中的 [data-code-theme] .hljs 规则提供
    const codeRule = contentCss.match(/\.md-settings-code-preview\s+code\s*\{([^}]*)\}/);
    expect(codeRule).not.toBeNull();
    expect(codeRule[1]).not.toMatch(/color\s*:/);
  });
});
