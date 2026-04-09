/**
 * 模块测试：Markdown 文件检测逻辑
 * 覆盖：各种协议和扩展名的检测
 */

const { isMarkdownUrl } = require('../../background.js');
const { MD_EXTENSIONS, SUPPORTED_FILE_EXTENSIONS } = require('../../content/content.js');

// =====================================================
//  BT-detection.1 文件协议检测
// =====================================================
describe('BT-detection.1 文件协议检测', () => {
  test('1.1 file:// + .md', () => {
    expect(isMarkdownUrl('file:///C:/docs/readme.md')).toBe(true);
  });

  test('1.2 file:// + .markdown', () => {
    expect(isMarkdownUrl('file:///home/user/doc.markdown')).toBe(true);
  });

  test('1.3 file:// + .mdc', () => {
    expect(isMarkdownUrl('file:///docs/rules.mdc')).toBe(true);
  });

  test('1.4 file:// + .mkd', () => {
    expect(isMarkdownUrl('file:///docs/test.mkd')).toBe(true);
  });

  test('1.5 file:// + .mdown', () => {
    expect(isMarkdownUrl('file:///docs/test.mdown')).toBe(true);
  });

  test('1.6 file:// + .mdtxt', () => {
    expect(isMarkdownUrl('file:///docs/test.mdtxt')).toBe(true);
  });

  test('1.7 file:// + .mdtext', () => {
    expect(isMarkdownUrl('file:///docs/test.mdtext')).toBe(true);
  });

  test('1.8 file:// + 中文路径', () => {
    expect(isMarkdownUrl('file:///C:/文档/笔记.md')).toBe(true);
  });

  test('1.9 file:// + 空格路径', () => {
    expect(isMarkdownUrl('file:///C:/my%20docs/readme.md')).toBe(true);
  });
});

// =====================================================
//  BT-detection.2 HTTP 协议检测
// =====================================================
describe('BT-detection.2 HTTP 协议检测', () => {
  test('2.1 https:// + .md', () => {
    expect(isMarkdownUrl('https://example.com/readme.md')).toBe(true);
  });

  test('2.2 http:// + .md', () => {
    expect(isMarkdownUrl('http://example.com/readme.md')).toBe(true);
  });

  test('2.3 https:// + .md + 查询参数', () => {
    expect(isMarkdownUrl('https://example.com/readme.md?token=abc')).toBe(true);
  });

  test('2.4 GitHub raw 文件', () => {
    expect(isMarkdownUrl('https://raw.githubusercontent.com/user/repo/main/README.md')).toBe(true);
  });
});

// =====================================================
//  BT-detection.3 非 Markdown 文件排除
// =====================================================
describe('BT-detection.3 非 Markdown 文件排除', () => {
  test('3.1 排除 .html', () => {
    expect(isMarkdownUrl('file:///index.html')).toBe(false);
  });

  test('3.2 排除 .js', () => {
    expect(isMarkdownUrl('file:///app.js')).toBe(false);
  });

  test('3.3 排除 .css', () => {
    expect(isMarkdownUrl('file:///style.css')).toBe(false);
  });

  test('3.4 排除 .json', () => {
    expect(isMarkdownUrl('file:///package.json')).toBe(false);
  });

  test('3.5 排除 .txt（background 的 isMarkdownUrl 不匹配 .txt）', () => {
    expect(isMarkdownUrl('file:///notes.txt')).toBe(false);
  });

  test('3.6 排除无扩展名', () => {
    expect(isMarkdownUrl('file:///Makefile')).toBe(false);
  });

  test('3.7 排除目录 URL', () => {
    expect(isMarkdownUrl('file:///C:/docs/')).toBe(false);
  });
});

// =====================================================
//  BT-detection.4 SUPPORTED_FILE_EXTENSIONS 正则测试
// =====================================================
describe('BT-detection.4 SUPPORTED_FILE_EXTENSIONS', () => {
  test('4.1 匹配所有 Markdown 扩展名', () => {
    const extensions = ['.md', '.mdc', '.markdown', '.mkd', '.mdown', '.mdtxt', '.mdtext'];
    extensions.forEach(ext => {
      expect(SUPPORTED_FILE_EXTENSIONS.test(`file${ext}`)).toBe(true);
    });
  });

  test('4.2 不匹配非 Markdown 扩展名', () => {
    const extensions = ['.html', '.js', '.css', '.json', '.xml', '.pdf'];
    extensions.forEach(ext => {
      expect(SUPPORTED_FILE_EXTENSIONS.test(`file${ext}`)).toBe(false);
    });
  });
});

// =====================================================
//  BT-detection.5 边界情况
// =====================================================
describe('BT-detection.5 边界情况', () => {
  test('5.1 空字符串', () => {
    expect(isMarkdownUrl('')).toBe(false);
  });

  test('5.2 null', () => {
    expect(isMarkdownUrl(null)).toBe(false);
  });

  test('5.3 undefined', () => {
    expect(isMarkdownUrl(undefined)).toBe(false);
  });

  test('5.4 纯域名无路径', () => {
    expect(isMarkdownUrl('https://example.com')).toBe(false);
  });

  test('5.5 包含 md 但不是扩展名', () => {
    expect(isMarkdownUrl('https://example.com/markdown-guide')).toBe(false);
  });
});
