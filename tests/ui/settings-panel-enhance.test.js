/**
 * 设置面板增强测试
 */

const fs = require('fs');
const path = require('path');
const contentJs = fs.readFileSync(path.resolve(__dirname, '../../content/content.js'), 'utf-8');
const contentCss = fs.readFileSync(path.resolve(__dirname, '../../styles/content.css'), 'utf-8');
const zhCN = fs.readFileSync(path.resolve(__dirname, '../../i18n/zh-CN.js'), 'utf-8');
const enJs = fs.readFileSync(path.resolve(__dirname, '../../i18n/en.js'), 'utf-8');
const bgJs = fs.readFileSync(path.resolve(__dirname, '../../background.js'), 'utf-8');

describe('Tier 1: 设置面板增强存在性', () => {
  test('1.1 面板模式 UI 存在', () => {
    expect(contentJs).toContain('md-stg-panel-mode-btn');
    expect(contentJs).toContain("data-mode=\"float\"");
    expect(contentJs).toContain("data-mode=\"embed\"");
  });

  test('1.2 文档对齐 UI 存在', () => {
    expect(contentJs).toContain('md-stg-align-btn');
    expect(contentJs).toContain("data-align=\"left\"");
    expect(contentJs).toContain("data-align=\"center\"");
    expect(contentJs).toContain("data-align=\"right\"");
  });

  test('1.3 DEFAULT_SETTINGS 包含 panelMode', () => {
    expect(contentJs).toContain("panelMode: 'embed'");
    expect(bgJs).toContain("panelMode: 'embed'");
  });

  test('1.4 DEFAULT_SETTINGS 包含 contentAlign', () => {
    expect(contentJs).toContain("contentAlign: 'center'");
    expect(bgJs).toContain("contentAlign: 'center'");
  });

  test('1.5 底部栏包含 GitHub 链接', () => {
    expect(contentJs).toContain('github.com/LetitiaChan/markdown_viewer_enhanced');
  });

  test('1.6 底部栏包含反馈链接', () => {
    expect(contentJs).toContain('/issues');
    expect(contentJs).toContain("settings.feedback");
  });

  test('1.7 数学公式在 Mermaid 之上', () => {
    const mathPos = contentJs.indexOf('stg-enableMathJax');
    const mermaidPos = contentJs.indexOf('stg-enableMermaid');
    // 在 HTML 模板中，MathJax 应该出现在 Mermaid 之前
    // 找 HTML 模板中的位置（在 settings-card-body 中）
    const cardBody = contentJs.indexOf("settings-card-body");
    const mathInCard = contentJs.indexOf('stg-enableMathJax', cardBody);
    const mermaidInCard = contentJs.indexOf('stg-enableMermaid', cardBody);
    expect(mathInCard).toBeLessThan(mermaidInCard);
  });

  test('1.8 大设置布尔项使用 toggle-switch 结构', () => {
    expect(contentJs).toContain('class="md-stg-toggle-switch"');
    expect(contentJs).toContain('class="md-stg-bool-toggle" data-key="showToc"');
    expect(contentJs).toContain('class="md-stg-bool-toggle" data-key="enableMathJax"');
    expect(contentJs).toContain('class="md-stg-bool-toggle" data-key="enableMermaid"');
    expect(contentJs).toContain('class="md-stg-bool-toggle" data-key="enablePlantUML"');
    expect(contentJs).toContain('class="md-stg-bool-toggle" data-key="enableGraphviz"');
    expect(contentJs).toContain('class="md-stg-bool-toggle" data-key="showLineNumbers"');
    expect(contentJs).toContain('class="md-stg-bool-toggle" data-key="autoDetect"');
  });

  test('1.9 i18n 包含面板模式 key', () => {
    expect(zhCN).toContain("'settings.panelMode'");
    expect(enJs).toContain("'settings.panelMode'");
  });

  test('1.10 i18n 包含文档对齐 key', () => {
    expect(zhCN).toContain("'settings.contentAlign'");
    expect(enJs).toContain("'settings.contentAlign'");
  });

  test('1.11 CSS 包含底部链接样式', () => {
    expect(contentCss).toContain('.md-settings-footer-link');
  });

  test('1.12 CSS 包含设置项描述样式', () => {
    expect(contentCss).toContain('.md-settings-item-desc');
  });
});

describe('Tier 2: 设置逻辑', () => {
  test('2.1 syncSettingsToPanel 同步面板模式', () => {
    expect(contentJs).toContain("md-stg-panel-mode-btn");
    expect(contentJs).toContain("currentSettings.panelMode");
  });

  test('2.2 syncSettingsToPanel 同步文档对齐', () => {
    expect(contentJs).toContain("md-stg-align-btn");
    expect(contentJs).toContain("currentSettings.contentAlign");
  });

  test('2.3 syncSettingsToPanel 同步布尔开关 checked 状态', () => {
    expect(contentJs).toContain('group.checked = isOn');
    expect(contentJs).toContain("document.querySelectorAll('.md-stg-bool-toggle')");
  });

  test('2.4 applySettings 应用文档对齐', () => {
    expect(contentJs).toContain("content.style.marginLeft");
    expect(contentJs).toContain("content.style.marginRight");
  });

  test('2.5 applySettings 应用面板模式 class', () => {
    expect(contentJs).toContain("panel-embed");
  });
});

describe('Tier 3: 场景特定', () => {
  test('BT-settings-enhance.1 面板模式事件绑定', () => {
    expect(contentJs).toContain("currentSettings.panelMode = btn.dataset.mode");
  });

  test('BT-settings-enhance.2 文档对齐事件绑定', () => {
    expect(contentJs).toContain("currentSettings.contentAlign = btn.dataset.align");
  });

  test('BT-settings-enhance.3 布尔开关 change 事件写入设置', () => {
    expect(contentJs).toContain("toggle.addEventListener('change'");
    expect(contentJs).toContain('currentSettings[key] = isOn');
    expect(contentJs).toContain("if (key !== 'autoDetect')");
  });
});

describe('Tier 1: 设置弹窗按钮组 segment 样式存在性', () => {
  test('BT-stg-segment.1 md-stg-btn-group 有外层边框容器样式', () => {
    // 验证 .md-stg-btn-group 使用了 segment 风格（外层边框）
    expect(contentCss).toMatch(/\.md-stg-btn-group\s*\{[^}]*border:\s*1\.5px\s+solid/);
    expect(contentCss).toMatch(/\.md-stg-btn-group\s*\{[^}]*border-radius:\s*10px/);
    expect(contentCss).toMatch(/\.md-stg-btn-group\s*\{[^}]*display:\s*inline-flex/);
  });

  test('BT-stg-segment.2 md-stg-btn-option 有 segment 按钮样式', () => {
    // 验证按钮有 transparent 边框（用于 active 态切换）
    expect(contentCss).toMatch(/\.md-stg-btn-option[^{]*\{[^}]*border:\s*1\.5px\s+solid\s+transparent/);
  });

  test('BT-stg-segment.3 md-stg-btn-option.active 有蓝色边框', () => {
    expect(contentCss).toMatch(/\.md-stg-btn-option\.active[^{]*\{[^}]*border-color:\s*#667eea/);
  });

  test('BT-stg-segment.4 md-stg-panel-mode-btn 有 CSS 样式定义', () => {
    expect(contentCss).toContain('.md-stg-panel-mode-btn');
    expect(contentCss).toMatch(/\.md-stg-panel-mode-btn\.active[^{]*\{[^}]*border-color:\s*#667eea/);
  });

  test('BT-stg-segment.5 md-stg-align-btn 有 CSS 样式定义', () => {
    expect(contentCss).toContain('.md-stg-align-btn');
    expect(contentCss).toMatch(/\.md-stg-align-btn\.active[^{]*\{[^}]*border-color:\s*#667eea/);
  });

  test('BT-stg-segment.6 md-stg-toc-pos-btn 有 segment 按钮样式', () => {
    expect(contentCss).toMatch(/\.md-stg-toc-pos-btn\s*\{[^}]*border:\s*1\.5px\s+solid\s+transparent/);
    expect(contentCss).toMatch(/\.md-stg-toc-pos-btn\.active[^{]*\{[^}]*border-color:\s*#667eea/);
  });
});

describe('Tier 2: 设置弹窗按钮组暗色主题适配', () => {
  test('BT-stg-segment-dark.1 暗色主题下 btn-group 有暗色边框', () => {
    expect(contentCss).toMatch(/\.theme-dark\s+\.md-stg-btn-group\s*\{[^}]*border-color:\s*#2a2a4a/);
  });

  test('BT-stg-segment-dark.2 暗色主题下 active 按钮有蓝色边框', () => {
    expect(contentCss).toMatch(/\.theme-dark\s+\.md-stg-btn-option\.active[^{]*\{[^}]*border-color:\s*#818cf8/);
  });

  test('BT-stg-segment-dark.3 暗色主题下 toc-pos-btn active 有蓝色边框', () => {
    expect(contentCss).toMatch(/\.theme-dark\s+\.md-stg-toc-pos-btn\.active[^{]*\{[^}]*border-color:\s*#818cf8/);
  });
});

describe('Tier 3: 大设置页 toggle-switch 样式', () => {
  test('BT-stg-toggle.1 toggle-switch 有开关尺寸和圆角滑槽', () => {
    expect(contentCss).toMatch(/\.md-stg-toggle-switch\s*\{[^}]*width:\s*44px/);
    expect(contentCss).toMatch(/\.md-stg-toggle-switch\s*\{[^}]*height:\s*24px/);
    expect(contentCss).toMatch(/\.md-stg-toggle-slider\s*\{[^}]*border-radius:\s*12px/);
  });

  test('BT-stg-toggle.2 checked 状态使用品牌蓝色', () => {
    expect(contentCss).toMatch(/\.md-stg-toggle-switch input:checked \+ \.md-stg-toggle-slider\s*\{[^}]*background:\s*#667eea/);
  });

  test('BT-stg-toggle.3 checked 状态滑块移动 20px', () => {
    expect(contentCss).toMatch(/\.md-stg-toggle-switch input:checked \+ \.md-stg-toggle-slider::before\s*\{[^}]*transform:\s*translateX\(20px\)/);
  });
});

describe('Tier 3: i18n 按钮文本包含 emoji 图标', () => {
  test('BT-stg-i18n.1 中文翻译面板模式按钮包含 emoji', () => {
    expect(zhCN).toContain("'settings.panelMode.float': '✨");
    expect(zhCN).toContain("'settings.panelMode.embed': '📌");
  });

  test('BT-stg-i18n.2 中文翻译文档对齐按钮包含 emoji', () => {
    expect(zhCN).toContain("'settings.contentAlign.left': '◀");
    expect(zhCN).toContain("'settings.contentAlign.center': '⬤");
    expect(zhCN).toContain("'settings.contentAlign.right': '▶");
  });

  test('BT-stg-i18n.3 中文翻译目录位置按钮包含 emoji', () => {
    expect(zhCN).toContain("'settings.tocPosition.left': '📍");
    expect(zhCN).toContain("'settings.tocPosition.right': '📍");
  });

  test('BT-stg-i18n.4 英文翻译面板模式按钮包含 emoji', () => {
    expect(enJs).toContain("'settings.panelMode.float': '✨");
    expect(enJs).toContain("'settings.panelMode.embed': '📌");
  });
});
