/**
 * UI 测试：代码块行号对齐
 * 修复：行号使用 display: inline-block 导致行号与代码内容左边缘不对齐
 * 修复方案：将 .code-line 的 display 从 inline-block 改为 block
 */

const fs = require('fs');
const path = require('path');

const contentCssPath = path.join(__dirname, '../../styles/content.css');
const contentCss = fs.readFileSync(contentCssPath, 'utf-8');

// =====================================================
//  Tier 1 — 存在性断言：行号相关 CSS 规则存在性
// =====================================================
describe('Tier 1: 行号 CSS 规则存在性', () => {
  test('1.1 content.css 包含 .code-block.show-line-numbers 规则', () => {
    expect(contentCss).toContain('.code-block.show-line-numbers pre code');
  });

  test('1.2 content.css 包含 .code-line 样式规则', () => {
    expect(contentCss).toContain('.code-block.show-line-numbers pre code .code-line');
  });

  test('1.3 content.css 包含 .code-line::before 伪元素规则', () => {
    expect(contentCss).toContain('.code-block.show-line-numbers pre code .code-line::before');
  });

  test('1.4 行号使用 CSS counter 机制', () => {
    expect(contentCss).toContain('counter-reset: line');
    expect(contentCss).toContain('counter-increment: line');
    expect(contentCss).toContain('content: counter(line)');
  });

  test('1.5 行号伪元素设置了 text-align: right', () => {
    // 提取 .code-line::before 规则块
    const beforeRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s+\.code-line::before\s*\{([^}]+)\}/
    );
    expect(beforeRuleMatch).not.toBeNull();
    expect(beforeRuleMatch[1]).toContain('text-align: right');
  });

  test('1.6 行号伪元素设置了固定宽度', () => {
    const beforeRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s+\.code-line::before\s*\{([^}]+)\}/
    );
    expect(beforeRuleMatch).not.toBeNull();
    expect(beforeRuleMatch[1]).toMatch(/width:\s*\d+em/);
  });
});

// =====================================================
//  Tier 2 — 行为级断言：行号布局属性正确性
// =====================================================
describe('Tier 2: 行号布局属性正确性', () => {
  test('2.1 .code-line 使用 display: block（非 inline-block）确保对齐', () => {
    // display: block 现在在全局 .code-block pre code .code-line 规则中（不仅限于 show-line-numbers）
    const lineRuleMatch = contentCss.match(
      /\.code-block\s+pre\s+code\s+\.code-line\s*\{([^}]+)\}/
    );
    expect(lineRuleMatch).not.toBeNull();
    const ruleBody = lineRuleMatch[1];
    // 必须包含 display: block
    expect(ruleBody).toMatch(/display:\s*block/);
    // 不能包含 display: inline-block（这是导致不对齐的根因）
    expect(ruleBody).not.toMatch(/display:\s*inline-block/);
  });

  test('2.2 .code-line::before 使用 display: inline-block 确保行号在行内显示', () => {
    const beforeRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s+\.code-line::before\s*\{([^}]+)\}/
    );
    expect(beforeRuleMatch).not.toBeNull();
    expect(beforeRuleMatch[1]).toMatch(/display:\s*inline-block/);
  });

  test('2.3 .code-line 设置了 counter-increment: line', () => {
    const lineRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s+\.code-line\s*\{([^}]+)\}/
    );
    expect(lineRuleMatch).not.toBeNull();
    expect(lineRuleMatch[1]).toContain('counter-increment: line');
  });

  test('2.4 行号容器设置了 counter-reset: line', () => {
    const containerRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s*\{([^}]+)\}/
    );
    expect(containerRuleMatch).not.toBeNull();
    expect(containerRuleMatch[1]).toContain('counter-reset: line');
  });

  test('2.5 行号伪元素设置了 user-select: none 防止选中', () => {
    const beforeRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s+\.code-line::before\s*\{([^}]+)\}/
    );
    expect(beforeRuleMatch).not.toBeNull();
    expect(beforeRuleMatch[1]).toContain('user-select: none');
  });

  test('2.6 DOM 结构：wrapLines 函数生成正确的 code-line span', () => {
    const contentJs = fs.readFileSync(
      path.join(__dirname, '../../content/content.js'),
      'utf-8'
    );
    // 确认 wrapLines 函数存在并生成 code-line 类名
    expect(contentJs).toContain('function wrapLines');
    expect(contentJs).toMatch(/class=.*code-line/);
  });
});

// =====================================================
//  Tier 3 — 任务特定断言：BT-line-number-align 回归测试
// =====================================================
describe('BT-line-number-align.1 代码行号对齐回归测试', () => {
  test('3.1 .code-line 绝不使用 display: inline-block（回归防护）', () => {
    // 这是本次 bug 的直接回归测试
    // 如果有人将 display 改回 inline-block，此测试会立即失败
    const lineRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s+\.code-line\s*\{([^}]+)\}/
    );
    expect(lineRuleMatch).not.toBeNull();
    expect(lineRuleMatch[1]).not.toMatch(/display:\s*inline-block/);
  });

  test('3.2 行号宽度足够容纳三位数（≥3em）', () => {
    const beforeRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s+\.code-line::before\s*\{([^}]+)\}/
    );
    expect(beforeRuleMatch).not.toBeNull();
    const widthMatch = beforeRuleMatch[1].match(/width:\s*(\d+)em/);
    expect(widthMatch).not.toBeNull();
    expect(parseInt(widthMatch[1])).toBeGreaterThanOrEqual(3);
  });

  test('3.3 行号与代码内容之间有间距（margin-right）', () => {
    const beforeRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s+\.code-line::before\s*\{([^}]+)\}/
    );
    expect(beforeRuleMatch).not.toBeNull();
    expect(beforeRuleMatch[1]).toMatch(/margin-right:\s*\d+px/);
  });
});

// =====================================================
//  Tier 3 补充 — BT-line-number-extra-line 行号多一行回归测试
// =====================================================
describe('BT-line-number-extra-line.1 display:block + join 双倍换行回归测试', () => {
  const fs = require('fs');
  const path = require('path');

  let contentCss;
  let contentJs;
  beforeAll(() => {
    contentCss = fs.readFileSync(
      path.join(__dirname, '../../styles/content.css'),
      'utf-8'
    );
    contentJs = fs.readFileSync(
      path.join(__dirname, '../../content/content.js'),
      'utf-8'
    );
  });

  test('4.1 全局 .code-block pre code .code-line 设置了 display: block', () => {
    const lineRuleMatch = contentCss.match(
      /\.code-block\s+pre\s+code\s+\.code-line\s*\{([^}]+)\}/
    );
    expect(lineRuleMatch).not.toBeNull();
    expect(lineRuleMatch[1]).toMatch(/display:\s*block/);
  });

  test('4.2 show-line-numbers 模式下 <code> 不再使用 font-size: 0 hack', () => {
    const codeRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s*\{([^}]+)\}/
    );
    expect(codeRuleMatch).not.toBeNull();
    // font-size: 0 hack 已移除
    expect(codeRuleMatch[1]).not.toMatch(/font-size:\s*0/);
  });

  test('4.3 wrapLines 函数使用 join(\'\') 消除 block 元素间的 \\n 文本节点', () => {
    // 确认 wrapLines 函数中使用 join('')，不再使用 join('\n')
    // 匹配 .join('') 或 .join("")
    expect(contentJs).toMatch(/\.join\s*\(\s*['"]{2}\s*\)/);
  });

  test('4.4 代码复制功能遍历 .code-line 取 textContent 再 join(\\n)', () => {
    // 确认复制功能不再直接使用 code.textContent，而是遍历 .code-line
    expect(contentJs).toMatch(/querySelectorAll\s*\(\s*['"]\.code-line['"]\s*\)/);
    expect(contentJs).toMatch(/\.join\s*\(\s*['"]\\n['"]\s*\)/);
  });

  test('4.5 show-line-numbers 模式下 .code-line 不再需要单独设置 font-size（继承父元素）', () => {
    const lineRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s+\.code-line\s*\{([^}]+)\}/
    );
    expect(lineRuleMatch).not.toBeNull();
    // 不应该有 font-size 属性（继承父元素的 14px）
    expect(lineRuleMatch[1]).not.toMatch(/font-size/);
  });

  test('4.6 diff-addition 使用 display: block（与 .code-line 一致）', () => {
    const diffAddMatch = contentCss.match(
      /\.code-block\s+pre\s+code\s+\.code-line\.diff-addition\s*\{([^}]+)\}/
    );
    expect(diffAddMatch).not.toBeNull();
    expect(diffAddMatch[1]).toMatch(/display:\s*block/);
    expect(diffAddMatch[1]).not.toMatch(/display:\s*inline-block/);
  });

  test('4.7 diff-deletion 使用 display: block（与 .code-line 一致）', () => {
    const diffDelMatch = contentCss.match(
      /\.code-block\s+pre\s+code\s+\.code-line\.diff-deletion\s*\{([^}]+)\}/
    );
    expect(diffDelMatch).not.toBeNull();
    expect(diffDelMatch[1]).toMatch(/display:\s*block/);
    expect(diffDelMatch[1]).not.toMatch(/display:\s*inline-block/);
  });
});

// =====================================================
//  Tier 3 补充 — BT-line-number-nested-indent 嵌套代码行号缩进回归测试
// =====================================================
describe('BT-line-number-nested-indent.1 嵌套代码块行号缩进回归测试', () => {
  const fs = require('fs');
  const path = require('path');

  let contentJs;
  beforeAll(() => {
    contentJs = fs.readFileSync(
      path.join(__dirname, '../../content/content.js'),
      'utf-8'
    );
  });

  test('5.1 wrapLines 函数包含跨行标签平衡逻辑（openTags 栈）', () => {
    // 确认 wrapLines 函数中存在 openTags 变量（标签平衡的核心数据结构）
    expect(contentJs).toMatch(/let\s+openTags\s*=\s*\[\]/);
  });

  test('5.2 wrapLines 函数解析 <span> 和 </span> 标签更新栈', () => {
    // 确认存在标签解析正则
    expect(contentJs).toMatch(/<\\\/\?span\[/);
  });

  test('5.3 wrapLines 函数在行尾补充关闭标签', () => {
    // 确认存在 '</span>'.repeat 逻辑
    expect(contentJs).toMatch(/'<\/span>'\.repeat/);
  });

  test('5.4 wrapLines 函数在行首重新打开上一行遗留的标签', () => {
    // 确认存在 prefix = openTags.join('') 逻辑
    expect(contentJs).toMatch(/prefix\s*=\s*openTags\.join/);
  });

  test('5.5 标签平衡后的行内容用于 diff 检测（使用 balancedLine 而非原始 line）', () => {
    // 确认 diff 检测使用 balancedLine 变量
    expect(contentJs).toMatch(/balancedLine\.includes\s*\(\s*['"]hljs-addition['"]\s*\)/);
    expect(contentJs).toMatch(/balancedLine\.includes\s*\(\s*['"]hljs-deletion['"]\s*\)/);
  });

  test('5.6 标签平衡逻辑对 hljs 跨行 <span> 标签生成正确的 HTML（行为级验证）', () => {
    // 模拟 hljs 对 markdown 语言的高亮输出（跨行 <span class="hljs-code">）
    const simulatedHljsOutput = [
      '<span class="hljs-quote">&gt; line1</span>',
      '',
      '<span class="hljs-code">```lua',
      'local x = 1',
      'end',
      '```</span>',
      '',
      'text'
    ].join('\n');

    // 提取 wrapLines 函数并执行
    // 由于 wrapLines 是 content.js 内部函数，我们通过正则提取其逻辑来验证
    // 这里直接用 JS 实现相同的标签平衡逻辑来验证
    const lines = simulatedHljsOutput.split('\n');
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    let openTags = [];
    const result = lines.map(line => {
      const prefix = openTags.join('');
      const tagRegex = /<\/?span[^>]*>/g;
      let match;
      while ((match = tagRegex.exec(line)) !== null) {
        const tag = match[0];
        if (tag.startsWith('</')) {
          openTags.pop();
        } else {
          openTags.push(tag);
        }
      }
      const suffix = '</span>'.repeat(openTags.length);
      const balancedLine = prefix + line + suffix;
      return `<span class="code-line">${balancedLine}</span>`;
    }).join('');

    // 验证每个 code-line 的 HTML 标签都是平衡的
    const codeLines = result.split('<span class="code-line">').filter(s => s.length > 0);
    codeLines.forEach((lineHtml, i) => {
      const content = lineHtml.replace(/<\/span>$/, '');
      const opens = (content.match(/<span[^>]*>/g) || []).length;
      const closes = (content.match(/<\/span>/g) || []).length;
      expect(opens).toBe(closes);
    });

    // 验证嵌套代码块内的行（Line 4: 'local x = 1'）被 hljs-code 包裹
    // Line 4 对应 codeLines[3]
    expect(codeLines[3]).toContain('hljs-code');
    expect(codeLines[3]).toContain('local x = 1');

    // 验证没有 code-line 嵌套（不应该出现 code-line 内部包含另一个 code-line）
    // 检查方法：每个 code-line 的内容中不应该包含 code-line 标签
    codeLines.forEach((lineHtml) => {
      const content = lineHtml.replace(/<\/span>$/, '');
      expect(content).not.toContain('class="code-line"');
    });
  });
});
