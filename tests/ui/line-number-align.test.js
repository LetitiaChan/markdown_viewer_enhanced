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
    // 提取 .code-line 规则块
    const lineRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s+\.code-line\s*\{([^}]+)\}/
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
describe('BT-line-number-extra-line.1 display:block + join(\\n) 双倍换行回归测试', () => {
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

  test('4.1 show-line-numbers 模式下 <code> 设置了 font-size: 0 消除 \\n 文本节点的视觉空间', () => {
    const codeRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s*\{([^}]+)\}/
    );
    expect(codeRuleMatch).not.toBeNull();
    expect(codeRuleMatch[1]).toMatch(/font-size:\s*0/);
  });

  test('4.2 show-line-numbers 模式下 <code> 设置了 line-height: 0', () => {
    const codeRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s*\{([^}]+)\}/
    );
    expect(codeRuleMatch).not.toBeNull();
    expect(codeRuleMatch[1]).toMatch(/line-height:\s*0/);
  });

  test('4.3 .code-line 恢复了正常的 font-size（回归防护）', () => {
    const lineRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s+\.code-line\s*\{([^}]+)\}/
    );
    expect(lineRuleMatch).not.toBeNull();
    // font-size 必须大于 0
    expect(lineRuleMatch[1]).toMatch(/font-size:\s*\d+px/);
    // 不能是 font-size: 0
    expect(lineRuleMatch[1]).not.toMatch(/font-size:\s*0[^1-9]/);
  });

  test('4.4 .code-line 恢复了正常的 line-height', () => {
    const lineRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s+\.code-line\s*\{([^}]+)\}/
    );
    expect(lineRuleMatch).not.toBeNull();
    expect(lineRuleMatch[1]).toMatch(/line-height:\s*[\d.]+/);
    // 不能是 line-height: 0
    expect(lineRuleMatch[1]).not.toMatch(/line-height:\s*0[^.1-9]/);
  });

  test('4.5 .code-line 仍然使用 display: block（行号对齐的基础）', () => {
    const lineRuleMatch = contentCss.match(
      /\.code-block\.show-line-numbers\s+pre\s+code\s+\.code-line\s*\{([^}]+)\}/
    );
    expect(lineRuleMatch).not.toBeNull();
    expect(lineRuleMatch[1]).toMatch(/display:\s*block/);
  });

  test('4.6 wrapLines 函数使用 join(\\n) 保持代码复制功能正常', () => {
    // 确认 wrapLines 函数中使用 join('\n')，这是代码复制功能（textContent）所需的
    expect(contentJs).toMatch(/\.join\s*\(\s*['"]\\n['"]\s*\)/);
  });

  test('4.7 diff-addition 使用 display: block（与 .code-line 一致，避免在行号模式下出现对齐问题）', () => {
    const diffAddMatch = contentCss.match(
      /\.code-block\s+pre\s+code\s+\.code-line\.diff-addition\s*\{([^}]+)\}/
    );
    expect(diffAddMatch).not.toBeNull();
    expect(diffAddMatch[1]).toMatch(/display:\s*block/);
    expect(diffAddMatch[1]).not.toMatch(/display:\s*inline-block/);
  });

  test('4.8 diff-deletion 使用 display: block（与 .code-line 一致）', () => {
    const diffDelMatch = contentCss.match(
      /\.code-block\s+pre\s+code\s+\.code-line\.diff-deletion\s*\{([^}]+)\}/
    );
    expect(diffDelMatch).not.toBeNull();
    expect(diffDelMatch[1]).toMatch(/display:\s*block/);
    expect(diffDelMatch[1]).not.toMatch(/display:\s*inline-block/);
  });
});
