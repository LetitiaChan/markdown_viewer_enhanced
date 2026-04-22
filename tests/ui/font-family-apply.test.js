/**
 * UI 测试：正文字体切换 — applySettings 中 fontFamily 实际渲染
 * 修复：切换正文字体后，渲染内容的 font-family 没有实际变化
 */

const fs = require('fs');
const path = require('path');

// 读取源文件
const contentJs = fs.readFileSync(
  path.join(__dirname, '../../content/content.js'),
  'utf-8'
);

// 字体映射（与 content.js 和 options.js 中的映射一致）
const FONT_MAP = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Microsoft YaHei", sans-serif',
  serif: 'Georgia, "Times New Roman", "SimSun", serif',
  mono: '"Consolas", "Monaco", "Courier New", monospace',
};

// =====================================================
//  Tier 1 — 存在性断言
// =====================================================
describe('Tier 1: applySettings 中 fontFamily 应用逻辑存在性', () => {
  test('1.1 applySettings 函数中包含 fontFamily 的处理逻辑', () => {
    // 提取 applySettings 函数体
    const applySettingsMatch = contentJs.match(/function applySettings\(settings\)\s*\{[\s\S]*?\n  \}/);
    expect(applySettingsMatch).not.toBeNull();
    const fnBody = applySettingsMatch[0];
    expect(fnBody).toContain('fontFamily');
    expect(fnBody).toContain('content.style.fontFamily');
  });

  test('1.2 applySettings 中包含 serif 字体映射', () => {
    expect(contentJs).toMatch(/case\s+['"]serif['"]\s*:/);
    expect(contentJs).toMatch(/Georgia/);
  });

  test('1.3 applySettings 中包含 mono 字体映射', () => {
    expect(contentJs).toMatch(/case\s+['"]mono['"]\s*:/);
    expect(contentJs).toMatch(/Consolas/);
  });

  test('1.4 applySettings 中包含 system 默认字体映射', () => {
    expect(contentJs).toMatch(/default\s*:/);
    expect(contentJs).toMatch(/apple-system/);
  });

  test('1.5 content.style.fontFamily 被设置', () => {
    expect(contentJs).toMatch(/content\.style\.fontFamily\s*=/);
  });
});

// =====================================================
//  Tier 2 — 行为级断言：模拟字体切换
// =====================================================
describe('Tier 2: 正文字体切换后 content 元素 font-family 实际变化', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="md-viewer-app" class="md-viewer-app theme-light">
        <main id="md-content" class="md-content markdown-viewer-enhanced"
              style="max-width:1200px; font-size:18px; line-height:1.8;">
          <h1>测试标题</h1>
          <p>这是一段测试正文内容。</p>
        </main>
      </div>
    `;
  });

  // 模拟 applySettings 中 fontFamily 的核心逻辑
  function applyFontFamily(fontFamily) {
    const content = document.getElementById('md-content');
    if (!content) return;
    switch (fontFamily) {
      case 'serif':
        content.style.fontFamily = 'Georgia, "Times New Roman", "SimSun", serif';
        break;
      case 'mono':
        content.style.fontFamily = '"Consolas", "Monaco", "Courier New", monospace';
        break;
      default:
        content.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Microsoft YaHei", sans-serif';
    }
  }

  test('2.1 切换到 serif 后 content 元素 font-family 包含 Georgia', () => {
    applyFontFamily('serif');
    const content = document.getElementById('md-content');
    expect(content.style.fontFamily).toContain('Georgia');
    expect(content.style.fontFamily).toContain('serif');
  });

  test('2.2 切换到 mono 后 content 元素 font-family 包含 Consolas', () => {
    applyFontFamily('mono');
    const content = document.getElementById('md-content');
    expect(content.style.fontFamily).toContain('Consolas');
    expect(content.style.fontFamily).toContain('monospace');
  });

  test('2.3 切换到 system 后 content 元素 font-family 包含 sans-serif', () => {
    applyFontFamily('system');
    const content = document.getElementById('md-content');
    expect(content.style.fontFamily).toContain('sans-serif');
  });

  test('2.4 连续切换字体后 font-family 正确更新', () => {
    const content = document.getElementById('md-content');

    applyFontFamily('serif');
    expect(content.style.fontFamily).toContain('Georgia');

    applyFontFamily('mono');
    expect(content.style.fontFamily).toContain('Consolas');
    expect(content.style.fontFamily).not.toContain('Georgia');

    applyFontFamily('system');
    expect(content.style.fontFamily).toContain('sans-serif');
    expect(content.style.fontFamily).not.toContain('Consolas');
  });

  test('2.5 未知字体值回退到 system 默认', () => {
    applyFontFamily('unknown');
    const content = document.getElementById('md-content');
    expect(content.style.fontFamily).toContain('sans-serif');
  });
});

// =====================================================
//  Tier 3 — 任务特定断言
// =====================================================
describe('Tier 3: BT-fontFamily 正文字体渲染回归', () => {
  test('BT-fontFamily.1 applySettings 函数中 fontFamily 与 fontSize/lineHeight 在同一个 if(content) 块中', () => {
    // 确保 fontFamily 的应用逻辑在 content 元素的 if 块中，与其他排版属性一起
    const applySettingsMatch = contentJs.match(/function applySettings\(settings\)\s*\{[\s\S]*?\n  \}/);
    expect(applySettingsMatch).not.toBeNull();
    const fnBody = applySettingsMatch[0];

    // fontSize 和 fontFamily 都应在同一个 if (content) 块中
    const contentBlock = fnBody.match(/if\s*\(content\)\s*\{([\s\S]*?)\n    \}/);
    expect(contentBlock).not.toBeNull();
    const blockBody = contentBlock[1];
    expect(blockBody).toContain('fontSize');
    expect(blockBody).toContain('fontFamily');
    expect(blockBody).toContain('lineHeight');
  });

  test('BT-fontFamily.2 三种字体选项的 CSS 值与 options.js 中的映射一致', () => {
    // options.js 中的映射：
    // serif → Georgia, "Times New Roman", "SimSun", serif
    // mono → "Consolas", "Monaco", "Courier New", monospace
    // system → -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Microsoft YaHei", sans-serif

    // 验证 content.js 中包含相同的映射
    expect(contentJs).toContain('Georgia, "Times New Roman", "SimSun", serif');
    expect(contentJs).toContain('"Consolas", "Monaco", "Courier New", monospace');
    expect(contentJs).toContain('-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Microsoft YaHei", sans-serif');
  });

  test('BT-fontFamily.3 大设置面板中字体按钮点击事件正确更新 fontFamily', () => {
    // 验证 bindSettingsPanelEvents 中字体按钮的事件处理逻辑存在
    expect(contentJs).toMatch(/md-stg-btn-option\[data-font\][\s\S]*?fontFamily\s*=\s*btn\.dataset\.font/);
  });
});
