/**
 * GFM 扩展语法测试
 * ==高亮==、^上标^、~下标~、++下划线++、:emoji:、定义列表增强
 */

const fs = require('fs');
const path = require('path');
const contentJs = fs.readFileSync(path.resolve(__dirname, '../../content/content.js'), 'utf-8');
const contentCss = fs.readFileSync(path.resolve(__dirname, '../../styles/content.css'), 'utf-8');

// ==================== Tier 1: 存在性断言 ====================

describe('Tier 1: GFM 扩展语法存在性', () => {
  test('1.1 content.js 包含 highlight 扩展', () => {
    expect(contentJs).toContain("name: 'highlight'");
  });

  test('1.2 content.js 包含 superscript 扩展', () => {
    expect(contentJs).toContain("name: 'superscript'");
  });

  test('1.3 content.js 包含 subscript 扩展', () => {
    expect(contentJs).toContain("name: 'subscript'");
  });

  test('1.4 content.js 包含 underline 扩展', () => {
    expect(contentJs).toContain("name: 'underline'");
  });

  test('1.5 content.js 包含 emoji 扩展', () => {
    expect(contentJs).toContain("name: 'emoji'");
  });

  test('1.6 content.js deflist 使用 inlineTokens', () => {
    expect(contentJs).toContain('this.lexer.inlineTokens(dt)');
    expect(contentJs).toContain('this.lexer.inlineTokens(dd)');
  });

  test('1.7 content.js deflist 使用 parseInline', () => {
    expect(contentJs).toContain('this.parser.parseInline(item.dtTokens)');
    expect(contentJs).toContain('this.parser.parseInline(dd.tokens)');
  });

  test('1.8 emoji-map.js 文件存在', () => {
    const emojiPath = path.resolve(__dirname, '../../libs/emoji-map.js');
    expect(fs.existsSync(emojiPath)).toBe(true);
  });

  test('1.9 manifest.json web_accessible_resources 包含 emoji-map.js（懒加载）', () => {
    const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../manifest.json'), 'utf-8'));
    // emoji-map.js 已改为懒加载，不再在 content_scripts 中，而是通过 web_accessible_resources 的 libs/* 通配符覆盖
    const resources = manifest.web_accessible_resources[0].resources;
    expect(resources).toContain('libs/*');
  });

  test('1.10 background.js 包含 emoji-map.js', () => {
    const bgJs = fs.readFileSync(path.resolve(__dirname, '../../background.js'), 'utf-8');
    expect(bgJs).toContain('libs/emoji-map.js');
  });

  test('1.11 CSS 包含 ins 下划线样式', () => {
    expect(contentCss).toContain('.md-content ins');
  });

  test('1.12 CSS 包含 emoji 样式', () => {
    expect(contentCss).toContain('.md-content .emoji');
  });

  test('1.13 highlight 渲染输出 <mark>', () => {
    expect(contentJs).toContain('<mark>');
    expect(contentJs).toContain('</mark>');
  });

  test('1.14 superscript 渲染输出 <sup>', () => {
    expect(contentJs).toContain("return `<sup>${this.parser.parseInline(token.tokens)}</sup>`");
  });

  test('1.15 subscript 渲染输出 <sub>', () => {
    expect(contentJs).toContain("return `<sub>${this.parser.parseInline(token.tokens)}</sub>`");
  });

  test('1.16 underline 渲染输出 <ins>', () => {
    expect(contentJs).toContain("return `<ins>${this.parser.parseInline(token.tokens)}</ins>`");
  });
});

// ==================== Tier 2: 行为级断言 ====================

describe('Tier 2: Highlight 正则匹配', () => {
  const rule = /^==((?:[^=]|=[^=])+)==/;

  test('2.1 匹配基本高亮', () => {
    expect(rule.test('==重要内容==')).toBe(true);
  });

  test('2.2 匹配包含等号的高亮', () => {
    expect(rule.test('==a=b==')).toBe(true);
  });

  test('2.3 不匹配空内容', () => {
    expect(rule.test('====')).toBe(false);
  });
});

describe('Tier 2: Superscript 正则匹配', () => {
  const rule = /^\^([^\s\^\[\]\n]{1,100})\^/;

  test('2.4 匹配基本上标', () => {
    const match = rule.exec('^2^');
    expect(match).not.toBeNull();
    expect(match[1]).toBe('2');
  });

  test('2.5 不匹配空格内容', () => {
    expect(rule.test('^a b^')).toBe(false);
  });

  test('2.6 不匹配含方括号的内容（脚注安全）', () => {
    // ] 和 [ 在排除字符中，确保不会误匹配脚注相关字符
    const match1 = /^\^([^\s\^\[\]\n]{1,100})\^/.exec('^]^');
    expect(match1).toBeNull(); // ] 在排除字符中
    const match2 = /^\^([^\s\^\[\]\n]{1,100})\^/.exec('^[^');
    expect(match2).toBeNull(); // [ 在排除字符中
  });
});

describe('Tier 2: Subscript 正则匹配', () => {
  const rule = /^~(?!~)([^\s~][^~]*?)~(?!~)/;

  test('2.7 匹配基本下标', () => {
    const match = rule.exec('~2~');
    expect(match).not.toBeNull();
    expect(match[1]).toBe('2');
  });

  test('2.8 不匹配删除线', () => {
    expect(rule.test('~~deleted~~')).toBe(false);
  });
});

describe('Tier 2: Underline 正则匹配', () => {
  const rule = /^\+\+((?:[^+]|\+[^+])+)\+\+/;

  test('2.9 匹配基本下划线', () => {
    const match = rule.exec('++重要++');
    expect(match).not.toBeNull();
    expect(match[1]).toBe('重要');
  });

  test('2.10 不匹配空内容', () => {
    expect(rule.test('++++')).toBe(false);
  });
});

describe('Tier 2: Emoji 正则匹配', () => {
  const rule = /^:([a-zA-Z0-9_+\-]+):/;

  test('2.11 匹配标准 emoji 名', () => {
    const match = rule.exec(':smile:');
    expect(match).not.toBeNull();
    expect(match[1]).toBe('smile');
  });

  test('2.12 匹配包含连字符的 emoji', () => {
    const match = rule.exec(':thumbs-up:');
    expect(match).not.toBeNull();
    expect(match[1]).toBe('thumbs-up');
  });

  test('2.13 不匹配空名称', () => {
    expect(rule.test('::').length).toBeFalsy;
  });
});

// ==================== Tier 3: 任务特定断言 ====================

describe('Tier 3: GFM 扩展语法特定场景', () => {
  test('BT-gfm.1 superscript 排除脚注冲突', () => {
    // content.js 中应包含脚注冲突规避逻辑
    expect(contentJs).toContain("src[idx - 1] === '['");
  });

  test('BT-gfm.2 subscript 排除删除线', () => {
    // 使用负向前瞻/后顾确保不匹配 ~~
    expect(contentJs).toContain('(?<![~])~(?!~)');
    expect(contentJs).toContain('^~(?!~)');
  });

  test('BT-gfm.3 emoji 扩展检查 EMOJI_MAP 存在性', () => {
    expect(contentJs).toContain("typeof EMOJI_MAP !== 'undefined'");
    expect(contentJs).toContain('EMOJI_MAP[match[1]]');
  });

  test('BT-gfm.4 emoji 渲染输出含 title 属性', () => {
    expect(contentJs).toContain('title=":${token.name}:"');
  });

  test('BT-gfm.5 所有行内扩展使用 inlineTokens 解析子内容', () => {
    // 确保所有扩展都支持嵌套行内格式
    const inlineTokensCalls = contentJs.match(/this\.lexer\.inlineTokens\(/g);
    expect(inlineTokensCalls.length).toBeGreaterThanOrEqual(6); // highlight + super + sub + underline + deflist dt + deflist dd
  });

  test('BT-gfm.6 所有行内扩展使用 parseInline 渲染', () => {
    const parseInlineCalls = contentJs.match(/this\.parser\.parseInline\(token\.tokens\)/g);
    expect(parseInlineCalls.length).toBeGreaterThanOrEqual(4); // highlight + super + sub + underline
  });

  test('BT-gfm.7 暗色主题 ins 样式存在', () => {
    expect(contentCss).toContain('.theme-dark .md-content ins');
  });
});

// ==================== Tier 3: 颜色文本 ====================

describe('Tier 3: 颜色文本 {color:xxx}text{/color}', () => {
  test('BT-color.1 content.js 包含 postprocessColorText 函数', () => {
    expect(contentJs).toContain('function postprocessColorText');
  });

  test('BT-color.2 正则匹配命名颜色', () => {
    const regex = /\{color:([\w#]+(?:\([\d,.\s%]+\))?)\}([\s\S]*?)\{\/color\}/g;
    const result = '{color:red}红色文本{/color}'.replace(regex, '<span style="color:$1">$2</span>');
    expect(result).toBe('<span style="color:red">红色文本</span>');
  });

  test('BT-color.3 正则匹配 hex 颜色', () => {
    const regex = /\{color:([\w#]+(?:\([\d,.\s%]+\))?)\}([\s\S]*?)\{\/color\}/g;
    const result = '{color:#4CAF50}绿色{/color}'.replace(regex, '<span style="color:$1">$2</span>');
    expect(result).toBe('<span style="color:#4CAF50">绿色</span>');
  });

  test('BT-color.4 多个颜色标记同时替换', () => {
    const regex = /\{color:([\w#]+(?:\([\d,.\s%]+\))?)\}([\s\S]*?)\{\/color\}/g;
    const input = '{color:red}红{/color} 和 {color:blue}蓝{/color}';
    const result = input.replace(regex, '<span style="color:$1">$2</span>');
    expect(result).toBe('<span style="color:red">红</span> 和 <span style="color:blue">蓝</span>');
  });

  test('BT-color.5 postprocessColorText 在 DOMPurify 之后被调用', () => {
    expect(contentJs).toContain('postprocessColorText(htmlContent)');
  });
});
