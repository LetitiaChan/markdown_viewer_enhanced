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
    expect(contentJs).toContain("panelMode: 'float'");
    expect(bgJs).toContain("panelMode: 'float'");
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

  test('1.8 i18n 包含面板模式 key', () => {
    expect(zhCN).toContain("'settings.panelMode'");
    expect(enJs).toContain("'settings.panelMode'");
  });

  test('1.9 i18n 包含文档对齐 key', () => {
    expect(zhCN).toContain("'settings.contentAlign'");
    expect(enJs).toContain("'settings.contentAlign'");
  });

  test('1.10 CSS 包含底部链接样式', () => {
    expect(contentCss).toContain('.md-settings-footer-link');
  });

  test('1.11 CSS 包含设置项描述样式', () => {
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

  test('2.3 applySettings 应用文档对齐', () => {
    expect(contentJs).toContain("content.style.marginLeft");
    expect(contentJs).toContain("content.style.marginRight");
  });

  test('2.4 applySettings 应用面板模式 class', () => {
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
});
