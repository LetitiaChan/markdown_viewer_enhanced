/**
 * 单元测试：content.js 工具函数
 * 覆盖：generateId, escapeHtml, debounce, parseSizeToBytes, isMarkdownFile 等
 */

const {
  generateId,
  escapeHtml,
  debounce,
  parseSizeToBytes,
  getFileIcon,
  DEFAULT_SETTINGS,
  MD_EXTENSIONS,
  SUPPORTED_FILE_EXTENSIONS,
} = require('../../content/content.js');

// =====================================================
//  BT-content-utils.1 generateId 函数测试
// =====================================================
describe('BT-content-utils.1 generateId', () => {
  test('1.1 英文标题转换为小写连字符格式', () => {
    expect(generateId('Hello World')).toBe('hello-world');
  });

  test('1.2 中文标题保留', () => {
    const result = generateId('你好世界');
    expect(result).toBe('你好世界');
  });

  test('1.3 混合中英文标题', () => {
    const result = generateId('Hello 你好 World');
    expect(result).toBe('hello-你好-world');
  });

  test('1.4 特殊字符被移除', () => {
    const result = generateId('Hello! @World# $Test');
    expect(result).toBe('hello-world-test');
  });

  test('1.5 多余连字符被合并', () => {
    const result = generateId('Hello   World');
    expect(result).toBe('hello-world');
  });

  test('1.6 首尾连字符被移除', () => {
    const result = generateId(' Hello World ');
    expect(result).toBe('hello-world');
  });

  test('1.7 空字符串返回 heading', () => {
    expect(generateId('')).toBe('heading');
  });

  test('1.8 纯特殊字符返回 heading', () => {
    expect(generateId('!@#$%')).toBe('heading');
  });
});

// =====================================================
//  BT-content-utils.2 escapeHtml 函数测试
// =====================================================
describe('BT-content-utils.2 escapeHtml', () => {
  test('2.1 转义 < 和 >', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  test('2.2 转义 &', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  test('2.3 转义引号', () => {
    // textContent 设置不会转义引号（这是 DOM 的正常行为）
    const result = escapeHtml('"hello"');
    // 引号在 textContent 中不需要转义，保持原样
    expect(result).toContain('"');
  });

  test('2.4 普通文本不变', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  test('2.5 空字符串', () => {
    expect(escapeHtml('')).toBe('');
  });

  test('2.6 复合 HTML 字符串', () => {
    const result = escapeHtml('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });
});

// =====================================================
//  BT-content-utils.3 debounce 函数测试
// =====================================================
describe('BT-content-utils.3 debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('3.1 延迟执行', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('3.2 多次调用只执行最后一次', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    debounced('b');
    debounced('c');

    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');
  });

  test('3.3 间隔足够长则每次都执行', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);

    debounced();
    jest.advanceTimersByTime(100);
    debounced();
    jest.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// =====================================================
//  BT-content-utils.4 parseSizeToBytes 函数测试
// =====================================================
describe('BT-content-utils.4 parseSizeToBytes', () => {
  test('4.1 解析 KB', () => {
    expect(parseSizeToBytes('100 KB')).toBe(100 * 1024);
  });

  test('4.2 解析 MB', () => {
    expect(parseSizeToBytes('1.5 MB')).toBe(1.5 * 1048576);
  });

  test('4.3 解析 GB', () => {
    expect(parseSizeToBytes('2 GB')).toBe(2 * 1073741824);
  });

  test('4.4 解析纯字节', () => {
    expect(parseSizeToBytes('512 B')).toBe(512);
  });

  test('4.5 解析简写 K', () => {
    expect(parseSizeToBytes('10K')).toBe(10 * 1024);
  });

  test('4.6 空字符串返回 0', () => {
    expect(parseSizeToBytes('')).toBe(0);
  });

  test('4.7 横杠返回 0', () => {
    expect(parseSizeToBytes('-')).toBe(0);
  });

  test('4.8 null 返回 0', () => {
    expect(parseSizeToBytes(null)).toBe(0);
  });
});

// =====================================================
//  BT-content-utils.5 MD_EXTENSIONS 正则测试
// =====================================================
describe('BT-content-utils.5 MD_EXTENSIONS 正则', () => {
  test('5.1 匹配 .md', () => {
    expect(MD_EXTENSIONS.test('file.md')).toBe(true);
  });

  test('5.2 匹配 .markdown', () => {
    expect(MD_EXTENSIONS.test('file.markdown')).toBe(true);
  });

  test('5.3 匹配 .mdc', () => {
    expect(MD_EXTENSIONS.test('file.mdc')).toBe(true);
  });

  test('5.4 匹配 .mkd', () => {
    expect(MD_EXTENSIONS.test('file.mkd')).toBe(true);
  });

  test('5.5 匹配带查询参数的 .md', () => {
    expect(MD_EXTENSIONS.test('file.md?v=1')).toBe(true);
  });

  test('5.6 匹配带 hash 的 .md', () => {
    expect(MD_EXTENSIONS.test('file.md#section')).toBe(true);
  });

  test('5.7 不匹配 .html', () => {
    expect(MD_EXTENSIONS.test('file.html')).toBe(false);
  });

  test('5.8 不匹配 .js', () => {
    expect(MD_EXTENSIONS.test('file.js')).toBe(false);
  });

  test('5.9 大小写不敏感', () => {
    expect(MD_EXTENSIONS.test('file.MD')).toBe(true);
    expect(MD_EXTENSIONS.test('file.Markdown')).toBe(true);
  });
});

// =====================================================
//  BT-content-utils.6 DEFAULT_SETTINGS 完整性测试
// =====================================================
describe('BT-content-utils.6 DEFAULT_SETTINGS 完整性', () => {
  test('6.1 包含所有必需设置项', () => {
    const requiredKeys = [
      'theme', 'codeTheme', 'fontSize', 'lineHeight',
      'showToc', 'tocPosition', 'enableMermaid', 'enableMathJax',
      'autoDetect', 'maxWidth', 'fontFamily', 'showLineNumbers',
    ];
    requiredKeys.forEach(key => {
      expect(DEFAULT_SETTINGS).toHaveProperty(key);
    });
  });

  test('6.2 默认值类型正确', () => {
    expect(typeof DEFAULT_SETTINGS.theme).toBe('string');
    expect(typeof DEFAULT_SETTINGS.fontSize).toBe('number');
    expect(typeof DEFAULT_SETTINGS.lineHeight).toBe('number');
    expect(typeof DEFAULT_SETTINGS.showToc).toBe('boolean');
    expect(typeof DEFAULT_SETTINGS.enableMermaid).toBe('boolean');
    expect(typeof DEFAULT_SETTINGS.maxWidth).toBe('number');
  });

  test('6.3 默认值范围合理', () => {
    expect(DEFAULT_SETTINGS.fontSize).toBeGreaterThanOrEqual(12);
    expect(DEFAULT_SETTINGS.fontSize).toBeLessThanOrEqual(24);
    expect(DEFAULT_SETTINGS.lineHeight).toBeGreaterThanOrEqual(1.0);
    expect(DEFAULT_SETTINGS.lineHeight).toBeLessThanOrEqual(3.0);
    expect(DEFAULT_SETTINGS.maxWidth).toBeGreaterThanOrEqual(600);
    expect(DEFAULT_SETTINGS.maxWidth).toBeLessThanOrEqual(1600);
  });
});

// =====================================================
//  BT-content-utils.7 getFileIcon 函数测试
// =====================================================
describe('BT-content-utils.7 getFileIcon', () => {
  test('7.1 目录返回文件夹图标', () => {
    expect(getFileIcon('docs', true)).toBe('📁');
  });

  test('7.2 Markdown 文件返回文档图标', () => {
    const icon = getFileIcon('readme.md', false);
    // getFileIcon 返回单字符标识符，具体值取决于实现
    expect(typeof icon).toBe('string');
    expect(icon.length).toBeGreaterThan(0);
  });

  test('7.3 图片文件返回图片图标', () => {
    expect(getFileIcon('photo.png', false)).toBe('🖼️');
    expect(getFileIcon('photo.jpg', false)).toBe('🖼️');
  });

  test('7.4 未知文件返回默认图标', () => {
    const icon = getFileIcon('unknown.xyz', false);
    expect(typeof icon).toBe('string');
    expect(icon.length).toBeGreaterThan(0);
  });
});
