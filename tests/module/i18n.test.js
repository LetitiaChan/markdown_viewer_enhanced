/**
 * i18n 模块测试
 * Tier 1: 语言包结构一致性
 * Tier 2: t() 函数行为、语言切换
 * Tier 3: i18n-multi-language 变更特定场景
 */

// 加载语言包
const zhCN = require('../../i18n/zh-CN');
const en = require('../../i18n/en');

// 加载 i18n 核心模块
// 需要先设置全局变量
global.window = global.window || {};
global.window.__I18N_ZH_CN__ = zhCN;
global.window.__I18N_EN__ = en;
const i18n = require('../../i18n/i18n');

describe('BT-i18n.1 语言包结构一致性 (Tier 1)', () => {
  const zhKeys = Object.keys(zhCN).sort();
  const enKeys = Object.keys(en).sort();

  test('1.1 中英文语言包 key 集合完全一致', () => {
    expect(zhKeys).toEqual(enKeys);
  });

  test('1.2 中文语言包无空值', () => {
    zhKeys.forEach(key => {
      expect(typeof zhCN[key]).toBe('string');
      expect(zhCN[key].length).toBeGreaterThan(0);
    });
  });

  test('1.3 英文语言包无空值', () => {
    enKeys.forEach(key => {
      expect(typeof en[key]).toBe('string');
      expect(en[key].length).toBeGreaterThan(0);
    });
  });

  test('1.4 语言包包含核心 UI key', () => {
    const requiredKeys = [
      'toolbar.toc', 'toolbar.theme', 'toolbar.source', 'toolbar.settings', 'toolbar.refresh',
      'settings.title', 'settings.appearance.title', 'settings.codeTheme.title',
      'settings.typography.title', 'settings.features.title', 'settings.language.title',
      'code.copy', 'code.copied',
      'popup.subtitle', 'popup.isMarkdown', 'popup.notMarkdown',
      'options.saved', 'options.resetBtn',
    ];
    requiredKeys.forEach(key => {
      expect(key in zhCN).toBe(true);
      expect(key in en).toBe(true);
    });
  });

  test('1.5 语言包 key 数量大于 100', () => {
    expect(zhKeys.length).toBeGreaterThan(100);
    expect(enKeys.length).toBeGreaterThan(100);
  });
});

describe('BT-i18n.2 翻译函数 t() (Tier 2)', () => {
  beforeEach(() => {
    i18n.setLanguage('zh-CN');
  });

  test('2.1 默认语言为 zh-CN', () => {
    expect(i18n.getCurrentLanguage()).toBe('zh-CN');
  });

  test('2.2 中文模式下返回中文文本', () => {
    const result = i18n.t('toolbar.toc');
    expect(result).toBe(zhCN['toolbar.toc']);
  });

  test('2.3 切换到英文后返回英文文本', () => {
    i18n.setLanguage('en');
    const result = i18n.t('toolbar.toc');
    expect(result).toBe(en['toolbar.toc']);
  });

  test('2.4 不存在的 key 返回 key 本身', () => {
    const result = i18n.t('nonexistent.key');
    expect(result).toBe('nonexistent.key');
  });

  test('2.5 setLanguage 忽略不支持的语言', () => {
    i18n.setLanguage('ja');
    expect(i18n.getCurrentLanguage()).toBe('zh-CN');
  });

  test('2.6 getSupportedLanguages 返回正确列表', () => {
    const langs = i18n.getSupportedLanguages();
    expect(langs).toContain('zh-CN');
    expect(langs).toContain('en');
    expect(langs.length).toBe(2);
  });
});

describe('BT-i18n.3 applyLanguage DOM 更新 (Tier 2)', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <span data-i18n="toolbar.toc">初始文本</span>
      <span data-i18n="toolbar.theme">初始文本</span>
      <button data-i18n-title="toolbar.toc.title" title="初始">按钮</button>
      <optgroup data-i18n-label="settings.codeTheme.groupLight" label="初始"></optgroup>
    `;
    i18n.setLanguage('zh-CN');
  });

  test('3.1 applyLanguage 更新 textContent', () => {
    i18n.applyLanguage(document.body);
    const el = document.querySelector('[data-i18n="toolbar.toc"]');
    expect(el.textContent).toBe(zhCN['toolbar.toc']);
  });

  test('3.2 applyLanguage 更新 title 属性', () => {
    i18n.applyLanguage(document.body);
    const el = document.querySelector('[data-i18n-title="toolbar.toc.title"]');
    expect(el.title).toBe(zhCN['toolbar.toc.title']);
  });

  test('3.3 applyLanguage 更新 optgroup label', () => {
    i18n.applyLanguage(document.body);
    const el = document.querySelector('[data-i18n-label="settings.codeTheme.groupLight"]');
    expect(el.label).toBe(zhCN['settings.codeTheme.groupLight']);
  });

  test('3.4 切换语言后 applyLanguage 更新为新语言', () => {
    i18n.setLanguage('en');
    i18n.applyLanguage(document.body);
    const el = document.querySelector('[data-i18n="toolbar.toc"]');
    expect(el.textContent).toBe(en['toolbar.toc']);
  });
});

describe('BT-i18n.4 语言切换场景 (Tier 3)', () => {
  test('4.1 BT-i18n.1 中英文语言包 key 差异为零', () => {
    const zhOnlyKeys = Object.keys(zhCN).filter(k => !(k in en));
    const enOnlyKeys = Object.keys(en).filter(k => !(k in zhCN));
    expect(zhOnlyKeys).toEqual([]);
    expect(enOnlyKeys).toEqual([]);
  });

  test('4.2 BT-i18n.2 语言设置项 key 存在', () => {
    expect(zhCN['settings.language.title']).toBeTruthy();
    expect(en['settings.language.title']).toBeTruthy();
    expect(zhCN['settings.language.desc']).toBeTruthy();
    expect(en['settings.language.desc']).toBeTruthy();
  });

  test('4.3 BT-i18n.3 popup 语言 key 存在', () => {
    expect(zhCN['popup.language']).toBeTruthy();
    expect(en['popup.language']).toBeTruthy();
  });

  test('4.4 BT-i18n.4 options 语言 key 存在', () => {
    expect(zhCN['options.language.title']).toBeTruthy();
    expect(en['options.language.title']).toBeTruthy();
  });
});
