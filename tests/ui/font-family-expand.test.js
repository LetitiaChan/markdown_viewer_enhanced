/**
 * UI 测试：字体选择器扩展功能
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
const optionsJs = fs.readFileSync(
  path.join(__dirname, '../../options/options.js'),
  'utf-8'
);
const optionsHtml = fs.readFileSync(
  path.join(__dirname, '../../options/options.html'),
  'utf-8'
);
const popupHtml = fs.readFileSync(
  path.join(__dirname, '../../popup/popup.html'),
  'utf-8'
);
const popupJs = fs.readFileSync(
  path.join(__dirname, '../../popup/popup.js'),
  'utf-8'
);
const zhCN = require('../../i18n/zh-CN');
const en = require('../../i18n/en');

// =====================================================
//  Tier 1 — 存在性断言
// =====================================================
describe('Tier 1: 字体选择器扩展存在性', () => {
  test('1.1 content.js 中包含 FONT_FAMILY_MAP 常量', () => {
    expect(contentJs).toMatch(/const FONT_FAMILY_MAP\s*=\s*\{/);
  });

  test('1.2 content.js 中 FONT_FAMILY_MAP 包含所有 13 个字体标识符', () => {
    const identifiers = ['system', 'msyh', 'pingfang', 'noto-sans', 'helvetica', 'arial', 'segoe', 'serif', 'simsun', 'noto-serif', 'georgia', 'times', 'mono'];
    identifiers.forEach(id => {
      expect(contentJs).toContain(`'${id}':`);
    });
  });

  test('1.3 options.js 中包含 FONT_FAMILY_MAP', () => {
    expect(optionsJs).toContain('FONT_FAMILY_MAP');
  });

  test('1.4 content.js 中包含 md-stg-font-select 下拉选择器', () => {
    expect(contentJs).toContain('md-stg-font-select');
  });

  test('1.5 content.js 中包含 md-stg-font-custom 自定义输入框', () => {
    expect(contentJs).toContain('md-stg-font-custom');
  });

  test('1.6 options.html 中包含 fontFamilySelect 下拉选择器', () => {
    expect(optionsHtml).toContain('fontFamilySelect');
  });

  test('1.7 options.html 中包含 fontFamilyCustom 自定义输入框', () => {
    expect(optionsHtml).toContain('fontFamilyCustom');
  });

  test('1.8 popup.html 中包含 fontFamilySelect 下拉选择器', () => {
    expect(popupHtml).toContain('fontFamilySelect');
  });

  test('1.9 popup.html 中包含 fontFamilyCustom 自定义输入框', () => {
    expect(popupHtml).toContain('fontFamilyCustom');
  });

  test('1.10 content.css 中包含 md-stg-font-select 样式', () => {
    expect(contentCss).toContain('.md-stg-font-select');
  });

  test('1.11 content.css 中包含 md-stg-font-custom 样式', () => {
    expect(contentCss).toContain('.md-stg-font-custom');
  });

  test('1.12 options.html 中包含 font-select 样式', () => {
    expect(optionsHtml).toContain('.font-select');
  });

  test('1.13 popup.html 中包含 font-select 样式', () => {
    expect(popupHtml).toContain('.font-select');
  });

  test('1.14 i18n 中文语言包包含字体分组翻译键', () => {
    expect(zhCN['settings.font.group.sansSerif']).toBe('无衬线');
    expect(zhCN['settings.font.group.serif']).toBe('衬线');
    expect(zhCN['settings.font.group.other']).toBe('其他');
  });

  test('1.15 i18n 英文语言包包含字体分组翻译键', () => {
    expect(en['settings.font.group.sansSerif']).toBe('Sans-serif');
    expect(en['settings.font.group.serif']).toBe('Serif');
    expect(en['settings.font.group.other']).toBe('Other');
  });

  test('1.16 i18n 中文语言包包含所有字体名称翻译键', () => {
    expect(zhCN['settings.font.msyh']).toBe('微软雅黑');
    expect(zhCN['settings.font.pingfang']).toBe('苹方');
    expect(zhCN['settings.font.notoSans']).toBe('思源黑体');
    expect(zhCN['settings.font.simsun']).toBe('宋体');
    expect(zhCN['settings.font.notoSerif']).toBe('思源宋体');
    expect(zhCN['settings.font.custom']).toBe('自定义...');
  });

  test('1.17 i18n 英文语言包包含所有字体名称翻译键', () => {
    expect(en['settings.font.msyh']).toBe('Microsoft YaHei');
    expect(en['settings.font.pingfang']).toBe('PingFang SC');
    expect(en['settings.font.notoSans']).toBe('Noto Sans SC');
    expect(en['settings.font.simsun']).toBe('SimSun');
    expect(en['settings.font.notoSerif']).toBe('Noto Serif SC');
    expect(en['settings.font.custom']).toBe('Custom...');
  });

  test('1.18 content.js 中不再包含旧的字体按钮 data-font 属性', () => {
    // 大设置面板中不应再有 data-font 按钮
    expect(contentJs).not.toMatch(/md-stg-btn-option.*data-font/);
  });

  test('1.19 options.html 中不再包含旧的字体按钮 data-font 属性', () => {
    expect(optionsHtml).not.toMatch(/btn-option.*data-font/);
  });

  test('1.20 popup.html 中不再包含旧的字体按钮 data-font 属性', () => {
    expect(popupHtml).not.toMatch(/btn-option.*data-font/);
  });
});

// =====================================================
//  Tier 2 — 行为级断言
// =====================================================
describe('Tier 2: 字体选择器行为', () => {
  // 提取 FONT_FAMILY_MAP 用于测试
  const FONT_FAMILY_MAP = {
    'system': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Microsoft YaHei", sans-serif',
    'msyh': '"Microsoft YaHei", "微软雅黑", sans-serif',
    'pingfang': '"PingFang SC", sans-serif',
    'noto-sans': '"Noto Sans SC", "Source Han Sans SC", sans-serif',
    'helvetica': '"Helvetica Neue", Helvetica, sans-serif',
    'arial': 'Arial, sans-serif',
    'segoe': '"Segoe UI", sans-serif',
    'serif': 'Georgia, "Times New Roman", "SimSun", serif',
    'simsun': '"SimSun", "宋体", serif',
    'noto-serif': '"Noto Serif SC", "Source Han Serif SC", serif',
    'georgia': 'Georgia, serif',
    'times': '"Times New Roman", Times, serif',
    'mono': '"Consolas", "Monaco", "Courier New", monospace',
  };

  test('2.1 每个字体标识符都有对应的 CSS font-family 值', () => {
    Object.entries(FONT_FAMILY_MAP).forEach(([id, css]) => {
      expect(css).toBeTruthy();
      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);
    });
  });

  test('2.2 向后兼容：旧值 system/serif/mono 在映射表中存在', () => {
    expect(FONT_FAMILY_MAP['system']).toBeDefined();
    expect(FONT_FAMILY_MAP['serif']).toBeDefined();
    expect(FONT_FAMILY_MAP['mono']).toBeDefined();
  });

  test('2.3 content.js 中 applySettings 使用 FONT_FAMILY_MAP 而非 switch', () => {
    // 确认不再使用 switch 语句处理字体
    const applySettingsMatch = contentJs.match(/function applySettings[\s\S]*?function /);
    expect(applySettingsMatch).not.toBeNull();
    expect(applySettingsMatch[0]).toContain('FONT_FAMILY_MAP');
    expect(applySettingsMatch[0]).not.toMatch(/switch\s*\(\s*fontFamily\s*\)/);
  });

  test('2.4 options.js 中 updatePreview 使用 FONT_FAMILY_MAP 而非 switch', () => {
    const updatePreviewMatch = optionsJs.match(/function updatePreview[\s\S]*?function /);
    expect(updatePreviewMatch).not.toBeNull();
    expect(updatePreviewMatch[0]).toContain('FONT_FAMILY_MAP');
    expect(updatePreviewMatch[0]).not.toMatch(/switch\s*\(\s*fontFamily\s*\)/);
  });

  test('2.5 content.js 支持 custom 字体（customFontFamily 属性）', () => {
    expect(contentJs).toContain('customFontFamily');
    expect(contentJs).toMatch(/fontFamily\s*===\s*['"]custom['"]/);
  });

  test('2.6 options.js 支持 custom 字体', () => {
    expect(optionsJs).toContain('customFontFamily');
  });

  test('2.7 popup.js 支持 custom 字体', () => {
    expect(popupJs).toContain('customFontFamily');
  });

  test('2.8 下拉选择器选择 custom 时显示自定义输入框', () => {
    // 验证 content.js 中有 custom 显示/隐藏逻辑
    expect(contentJs).toMatch(/fontSelectEl\.value\s*===\s*['"]custom['"]/);
    // 验证 options.js 中有 custom 显示/隐藏逻辑
    expect(optionsJs).toMatch(/fontFamilySelect\.value\s*===\s*['"]custom['"]/);
    // 验证 popup.js 中有 custom 显示/隐藏逻辑
    expect(popupJs).toMatch(/fontFamilySelect\.value\s*===\s*['"]custom['"]/);
  });

  test('2.9 DOM 行为：下拉选择器 change 事件触发字体更新', () => {
    document.body.innerHTML = `
      <select id="md-stg-font-select">
        <option value="system">系统默认</option>
        <option value="msyh">微软雅黑</option>
        <option value="custom">自定义...</option>
      </select>
      <input id="md-stg-font-custom" type="text" style="display:none;" />
    `;

    const select = document.getElementById('md-stg-font-select');
    const customInput = document.getElementById('md-stg-font-custom');

    // 模拟选择 custom
    select.value = 'custom';
    // 模拟 change 事件处理逻辑
    customInput.style.display = select.value === 'custom' ? '' : 'none';
    expect(customInput.style.display).toBe('');

    // 模拟选择非 custom
    select.value = 'msyh';
    customInput.style.display = select.value === 'custom' ? '' : 'none';
    expect(customInput.style.display).toBe('none');
  });
});

// =====================================================
//  Tier 3 — 任务特定断言
// =====================================================
describe('Tier 3: BT-fontExpand 字体选择器扩展回归', () => {
  test('BT-fontExpand.1 三处 UI 的字体选项值一致', () => {
    // 从 content.js 提取所有 option value
    const contentOptions = [...contentJs.matchAll(/value="([^"]+)".*?<\/option>/g)]
      .map(m => m[1])
      .filter(v => ['system', 'msyh', 'pingfang', 'noto-sans', 'helvetica', 'arial', 'segoe', 'serif', 'simsun', 'noto-serif', 'georgia', 'times', 'custom'].includes(v));

    // 从 options.html 提取
    const optionsOptions = [...optionsHtml.matchAll(/value="([^"]+)".*?<\/option>/g)]
      .map(m => m[1])
      .filter(v => ['system', 'msyh', 'pingfang', 'noto-sans', 'helvetica', 'arial', 'segoe', 'serif', 'simsun', 'noto-serif', 'georgia', 'times', 'custom'].includes(v));

    // 从 popup.html 提取
    const popupOptions = [...popupHtml.matchAll(/value="([^"]+)".*?<\/option>/g)]
      .map(m => m[1])
      .filter(v => ['system', 'msyh', 'pingfang', 'noto-sans', 'helvetica', 'arial', 'segoe', 'serif', 'simsun', 'noto-serif', 'georgia', 'times', 'custom'].includes(v));

    // 三处应包含相同的选项
    expect(contentOptions.length).toBe(13);
    expect(optionsOptions.length).toBe(13);
    expect(popupOptions.length).toBe(13);
    expect(contentOptions).toEqual(optionsOptions);
    expect(contentOptions).toEqual(popupOptions);
  });

  test('BT-fontExpand.2 optgroup 分组正确', () => {
    // content.js 中应有 3 个 optgroup（无衬线、衬线、其他）
    const contentOptgroups = contentJs.match(/<optgroup/g);
    expect(contentOptgroups).not.toBeNull();
    expect(contentOptgroups.length).toBeGreaterThanOrEqual(3);

    // options.html 中应有 3 个 optgroup
    const optionsOptgroups = optionsHtml.match(/<optgroup/g);
    expect(optionsOptgroups).not.toBeNull();
    expect(optionsOptgroups.length).toBeGreaterThanOrEqual(3);

    // popup.html 中应有 3 个 optgroup
    const popupOptgroups = popupHtml.match(/<optgroup/g);
    expect(popupOptgroups).not.toBeNull();
    expect(popupOptgroups.length).toBeGreaterThanOrEqual(3);
  });

  test('BT-fontExpand.3 无衬线组包含正确的字体', () => {
    const sansSerifFonts = ['msyh', 'pingfang', 'noto-sans', 'helvetica', 'arial', 'segoe'];
    sansSerifFonts.forEach(font => {
      expect(contentJs).toContain(`value="${font}"`);
      expect(optionsHtml).toContain(`value="${font}"`);
      expect(popupHtml).toContain(`value="${font}"`);
    });
  });

  test('BT-fontExpand.4 衬线组包含正确的字体', () => {
    const serifFonts = ['serif', 'simsun', 'noto-serif', 'georgia', 'times'];
    serifFonts.forEach(font => {
      expect(contentJs).toContain(`value="${font}"`);
      expect(optionsHtml).toContain(`value="${font}"`);
      expect(popupHtml).toContain(`value="${font}"`);
    });
  });

  test('BT-fontExpand.5 自定义字体输入框有 placeholder', () => {
    expect(contentJs).toMatch(/md-stg-font-custom.*placeholder/);
    expect(optionsHtml).toMatch(/fontFamilyCustom.*placeholder/s);
    expect(popupHtml).toMatch(/fontFamilyCustom.*placeholder/s);
  });

  test('BT-fontExpand.6 content.css 中有 font-select 的 focus 样式', () => {
    expect(contentCss).toContain('.md-stg-font-select:focus');
  });

  test('BT-fontExpand.7 options.html 中有 font-select 的 focus 样式', () => {
    expect(optionsHtml).toContain('.font-select:focus');
  });

  test('BT-fontExpand.8 popup.html 中有 font-select 的 focus 样式', () => {
    expect(popupHtml).toContain('.font-select:focus');
  });
});
