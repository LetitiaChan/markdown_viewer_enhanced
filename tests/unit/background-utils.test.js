/**
 * 单元测试：background.js 工具函数
 * 覆盖：isMarkdownUrl, isTextContentType, DEFAULT_SETTINGS
 */

const {
  DEFAULT_SETTINGS,
  isMarkdownUrl,
  isTextContentType,
} = require('../../background.js');

// =====================================================
//  BT-background.1 isMarkdownUrl 函数测试
// =====================================================
describe('BT-background.1 isMarkdownUrl', () => {
  test('1.1 识别 .md 文件', () => {
    expect(isMarkdownUrl('file:///C:/docs/readme.md')).toBe(true);
  });

  test('1.2 识别 .markdown 文件', () => {
    expect(isMarkdownUrl('file:///docs/test.markdown')).toBe(true);
  });

  test('1.3 识别 .mdc 文件', () => {
    expect(isMarkdownUrl('file:///docs/test.mdc')).toBe(true);
  });

  test('1.4 识别 HTTP 协议的 .md', () => {
    expect(isMarkdownUrl('https://example.com/readme.md')).toBe(true);
  });

  test('1.5 识别带查询参数的 .md', () => {
    expect(isMarkdownUrl('https://example.com/readme.md?v=1')).toBe(true);
  });

  test('1.6 排除 .html 文件', () => {
    expect(isMarkdownUrl('https://example.com/index.html')).toBe(false);
  });

  test('1.7 排除 .js 文件', () => {
    expect(isMarkdownUrl('https://example.com/app.js')).toBe(false);
  });

  test('1.8 空 URL 返回 false', () => {
    expect(isMarkdownUrl('')).toBe(false);
  });

  test('1.9 null 返回 false', () => {
    expect(isMarkdownUrl(null)).toBe(false);
  });

  test('1.10 undefined 返回 false', () => {
    expect(isMarkdownUrl(undefined)).toBe(false);
  });

  test('1.11 大小写不敏感', () => {
    expect(isMarkdownUrl('file:///test.MD')).toBe(true);
    expect(isMarkdownUrl('file:///test.Markdown')).toBe(true);
  });
});

// =====================================================
//  BT-background.2 isTextContentType 函数测试
// =====================================================
describe('BT-background.2 isTextContentType', () => {
  test('2.1 识别 text/plain', () => {
    expect(isTextContentType('text/plain')).toBe(true);
  });

  test('2.2 识别 text/markdown', () => {
    expect(isTextContentType('text/markdown')).toBe(true);
  });

  test('2.3 识别 text/x-markdown', () => {
    expect(isTextContentType('text/x-markdown')).toBe(true);
  });

  test('2.4 排除 text/html', () => {
    expect(isTextContentType('text/html')).toBe(false);
  });

  test('2.5 排除 application/json', () => {
    expect(isTextContentType('application/json')).toBe(false);
  });

  test('2.6 null 返回 false', () => {
    expect(isTextContentType(null)).toBe(false);
  });

  test('2.7 空字符串返回 false', () => {
    expect(isTextContentType('')).toBe(false);
  });
});

// =====================================================
//  BT-background.3 DEFAULT_SETTINGS 完整性测试
// =====================================================
describe('BT-background.3 DEFAULT_SETTINGS', () => {
  test('3.1 包含所有必需设置项', () => {
    const requiredKeys = [
      'theme', 'codeTheme', 'fontSize', 'lineHeight',
      'showToc', 'tocPosition', 'enableMermaid', 'enableMathJax',
      'autoDetect', 'maxWidth', 'fontFamily', 'showLineNumbers',
    ];
    requiredKeys.forEach(key => {
      expect(DEFAULT_SETTINGS).toHaveProperty(key);
    });
  });

  test('3.2 与 content.js 的 DEFAULT_SETTINGS 一致', () => {
    const contentModule = require('../../content/content.js');
    // 两个模块的默认设置应该一致
    expect(DEFAULT_SETTINGS.theme).toBe(contentModule.DEFAULT_SETTINGS.theme);
    expect(DEFAULT_SETTINGS.fontSize).toBe(contentModule.DEFAULT_SETTINGS.fontSize);
    expect(DEFAULT_SETTINGS.enableMermaid).toBe(contentModule.DEFAULT_SETTINGS.enableMermaid);
    expect(DEFAULT_SETTINGS.showToc).toBe(contentModule.DEFAULT_SETTINGS.showToc);
  });
});
