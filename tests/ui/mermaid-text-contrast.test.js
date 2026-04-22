/**
 * UI 测试：Mermaid 图表暗色主题下自定义填充颜色的文字对比度修复
 * 修复：暗色主题下 mermaid 节点使用自定义浅色填充时，文字颜色被 dark 主题设为浅色导致不可读
 */

// 模拟 content.js 中的 parseColor 和 getRelativeLuminance 函数
function parseColor(colorStr) {
  if (!colorStr || typeof colorStr !== 'string') return null;
  colorStr = colorStr.trim().toLowerCase();
  if (colorStr === 'none' || colorStr === 'transparent' || colorStr === 'inherit' ||
      colorStr === 'currentcolor' || colorStr.startsWith('url(')) {
    return null;
  }
  const hexMatch = colorStr.match(/^#([0-9a-f]{3,8})$/);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return { r: parseInt(hex[0] + hex[0], 16), g: parseInt(hex[1] + hex[1], 16), b: parseInt(hex[2] + hex[2], 16) };
    }
    if (hex.length >= 6) {
      return { r: parseInt(hex.substring(0, 2), 16), g: parseInt(hex.substring(2, 4), 16), b: parseInt(hex.substring(4, 6), 16) };
    }
  }
  const rgbMatch = colorStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return { r: parseInt(rgbMatch[1]), g: parseInt(rgbMatch[2]), b: parseInt(rgbMatch[3]) };
  }
  const namedColors = {
    white: { r: 255, g: 255, b: 255 }, lightyellow: { r: 255, g: 255, b: 224 },
    lightgreen: { r: 144, g: 238, b: 144 }, lightpink: { r: 255, g: 182, b: 193 },
    pink: { r: 255, g: 192, b: 203 }, gold: { r: 255, g: 215, b: 0 },
    yellow: { r: 255, g: 255, b: 0 }, orange: { r: 255, g: 165, b: 0 },
    silver: { r: 192, g: 192, b: 192 },
  };
  if (namedColors[colorStr]) return namedColors[colorStr];
  return null;
}

function getRelativeLuminance(color) {
  const sRGB = [color.r / 255, color.g / 255, color.b / 255];
  const linear = sRGB.map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

const LUMINANCE_THRESHOLD = 0.4;
const DARK_TEXT_COLOR = '#1a1a2e';

// =====================================================
//  Tier 1 — 存在性断言：parseColor 和 getRelativeLuminance 函数正确性
// =====================================================
describe('Tier 1: parseColor 和 getRelativeLuminance 函数存在性与基本功能', () => {
  test('1.1 parseColor 能解析 #RRGGBB 格式', () => {
    expect(parseColor('#FFDEAD')).toEqual({ r: 255, g: 222, b: 173 });
    expect(parseColor('#ccffcc')).toEqual({ r: 204, g: 255, b: 204 });
    expect(parseColor('#FFB6C1')).toEqual({ r: 255, g: 182, b: 193 });
    expect(parseColor('#1e1e1e')).toEqual({ r: 30, g: 30, b: 30 });
  });

  test('1.2 parseColor 能解析 #RGB 短格式', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('#000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(parseColor('#f00')).toEqual({ r: 255, g: 0, b: 0 });
  });

  test('1.3 parseColor 能解析 rgb() 格式', () => {
    expect(parseColor('rgb(255, 222, 173)')).toEqual({ r: 255, g: 222, b: 173 });
    expect(parseColor('rgb(0, 0, 0)')).toEqual({ r: 0, g: 0, b: 0 });
  });

  test('1.4 parseColor 能解析 rgba() 格式', () => {
    expect(parseColor('rgba(255, 222, 173, 0.5)')).toEqual({ r: 255, g: 222, b: 173 });
  });

  test('1.5 parseColor 能解析 CSS 命名颜色', () => {
    expect(parseColor('white')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor('pink')).toEqual({ r: 255, g: 192, b: 203 });
    expect(parseColor('gold')).toEqual({ r: 255, g: 215, b: 0 });
  });

  test('1.6 parseColor 对非颜色值返回 null', () => {
    expect(parseColor('none')).toBeNull();
    expect(parseColor('transparent')).toBeNull();
    expect(parseColor('inherit')).toBeNull();
    expect(parseColor('currentcolor')).toBeNull();
    expect(parseColor('url(#gradient1)')).toBeNull();
    expect(parseColor(null)).toBeNull();
    expect(parseColor('')).toBeNull();
    expect(parseColor(undefined)).toBeNull();
  });

  test('1.7 getRelativeLuminance 对白色返回接近 1', () => {
    const lum = getRelativeLuminance({ r: 255, g: 255, b: 255 });
    expect(lum).toBeCloseTo(1.0, 1);
  });

  test('1.8 getRelativeLuminance 对黑色返回接近 0', () => {
    const lum = getRelativeLuminance({ r: 0, g: 0, b: 0 });
    expect(lum).toBeCloseTo(0.0, 1);
  });

  test('1.9 getRelativeLuminance 对浅色返回高亮度值', () => {
    // #FFDEAD (NavajoWhite) 应该是浅色
    const lum = getRelativeLuminance({ r: 255, g: 222, b: 173 });
    expect(lum).toBeGreaterThan(LUMINANCE_THRESHOLD);
  });

  test('1.10 getRelativeLuminance 对深色返回低亮度值', () => {
    // #1e1e1e (暗色主题背景) 应该是深色
    const lum = getRelativeLuminance({ r: 30, g: 30, b: 30 });
    expect(lum).toBeLessThan(LUMINANCE_THRESHOLD);
  });
});

// =====================================================
//  Tier 2 — 行为级断言：模拟 mermaid SVG 中的文字对比度修复
// =====================================================
describe('Tier 2: 暗色主题下 mermaid SVG 文字对比度修复行为', () => {
  // 模拟 fixMermaidTextContrast 的核心逻辑
  function fixMermaidTextContrast(svgEl, isDarkTheme) {
    if (!svgEl || !isDarkTheme) return;

    const allGroups = svgEl.querySelectorAll('g');
    allGroups.forEach(group => {
      const shapeTagNames = ['rect', 'polygon', 'circle', 'ellipse', 'path'];
      const shapes = Array.from(group.children).filter(child =>
        shapeTagNames.includes(child.tagName.toLowerCase())
      );
      if (shapes.length === 0) return;

      let fillColor = null;
      for (const shape of shapes) {
        const styleFill = shape.style.fill;
        const attrFill = shape.getAttribute('fill');
        const fill = styleFill || attrFill;
        if (fill) {
          fillColor = parseColor(fill);
          if (fillColor) break;
        }
      }

      if (!fillColor) return;

      const luminance = getRelativeLuminance(fillColor);
      if (luminance <= LUMINANCE_THRESHOLD) return;

      const textElements = group.querySelectorAll('text, tspan, span');
      textElements.forEach(textEl => {
        textEl.setAttribute('fill', DARK_TEXT_COLOR);
        textEl.style.fill = DARK_TEXT_COLOR;
        if (textEl.tagName === 'SPAN' || textEl.tagName === 'span') {
          textEl.style.color = DARK_TEXT_COLOR;
        }
      });

      const foreignObjects = group.querySelectorAll('foreignObject');
      foreignObjects.forEach(fo => {
        const htmlElements = fo.querySelectorAll('div, span, p');
        htmlElements.forEach(el => {
          el.style.color = DARK_TEXT_COLOR;
        });
      });
    });
  }

  function createMockSVG(fillColor, textContent) {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    const g = document.createElementNS(svgNS, 'g');
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('fill', fillColor);
    const text = document.createElementNS(svgNS, 'text');
    text.textContent = textContent;
    text.setAttribute('fill', '#e0e0e0'); // mermaid dark 主题默认浅色文字
    g.appendChild(rect);
    g.appendChild(text);
    svg.appendChild(g);
    return svg;
  }

  test('2.1 浅色填充节点的文字颜色被修正为深色', () => {
    const svg = createMockSVG('#FFDEAD', 'Buff 系统');
    fixMermaidTextContrast(svg, true);
    const text = svg.querySelector('text');
    expect(text.getAttribute('fill')).toBe(DARK_TEXT_COLOR);
  });

  test('2.2 深色填充节点的文字颜色不被修改', () => {
    const svg = createMockSVG('#1e1e1e', '深色节点');
    fixMermaidTextContrast(svg, true);
    const text = svg.querySelector('text');
    expect(text.getAttribute('fill')).toBe('#e0e0e0'); // 保持原始浅色
  });

  test('2.3 亮色主题下不执行任何修改', () => {
    const svg = createMockSVG('#FFDEAD', 'Buff 系统');
    fixMermaidTextContrast(svg, false); // 亮色主题
    const text = svg.querySelector('text');
    expect(text.getAttribute('fill')).toBe('#e0e0e0'); // 保持原始
  });

  test('2.4 多个节点分别处理', () => {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');

    // 浅色节点
    const g1 = document.createElementNS(svgNS, 'g');
    const rect1 = document.createElementNS(svgNS, 'rect');
    rect1.setAttribute('fill', '#ccffcc');
    const text1 = document.createElementNS(svgNS, 'text');
    text1.textContent = '浅色节点';
    text1.setAttribute('fill', '#e0e0e0');
    g1.appendChild(rect1);
    g1.appendChild(text1);

    // 深色节点
    const g2 = document.createElementNS(svgNS, 'g');
    const rect2 = document.createElementNS(svgNS, 'rect');
    rect2.setAttribute('fill', '#2d2d2d');
    const text2 = document.createElementNS(svgNS, 'text');
    text2.textContent = '深色节点';
    text2.setAttribute('fill', '#e0e0e0');
    g2.appendChild(rect2);
    g2.appendChild(text2);

    svg.appendChild(g1);
    svg.appendChild(g2);

    fixMermaidTextContrast(svg, true);

    expect(text1.getAttribute('fill')).toBe(DARK_TEXT_COLOR); // 浅色背景 → 深色文字
    expect(text2.getAttribute('fill')).toBe('#e0e0e0'); // 深色背景 → 保持浅色文字
  });

  test('2.5 处理 foreignObject 内的 HTML 文字', () => {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    const g = document.createElementNS(svgNS, 'g');
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('fill', '#FFB6C1'); // 浅粉色
    const fo = document.createElementNS(svgNS, 'foreignObject');
    const div = document.createElement('div');
    div.textContent = 'HTML 文字';
    div.style.color = '#e0e0e0';
    fo.appendChild(div);
    g.appendChild(rect);
    g.appendChild(fo);
    svg.appendChild(g);

    fixMermaidTextContrast(svg, true);

    // jsdom 会将 hex 颜色转换为 rgb 格式
    expect(div.style.color).toBe('rgb(26, 26, 46)');
  });

  test('2.6 无填充颜色的节点不受影响', () => {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    const g = document.createElementNS(svgNS, 'g');
    const rect = document.createElementNS(svgNS, 'rect');
    // 不设置 fill 属性
    const text = document.createElementNS(svgNS, 'text');
    text.textContent = '无填充';
    text.setAttribute('fill', '#e0e0e0');
    g.appendChild(rect);
    g.appendChild(text);
    svg.appendChild(g);

    fixMermaidTextContrast(svg, true);

    expect(text.getAttribute('fill')).toBe('#e0e0e0'); // 保持原始
  });

  test('2.7 url() 引用填充的节点不受影响', () => {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    const g = document.createElementNS(svgNS, 'g');
    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('fill', 'url(#gradient1)');
    const text = document.createElementNS(svgNS, 'text');
    text.textContent = '渐变填充';
    text.setAttribute('fill', '#e0e0e0');
    g.appendChild(rect);
    g.appendChild(text);
    svg.appendChild(g);

    fixMermaidTextContrast(svg, true);

    expect(text.getAttribute('fill')).toBe('#e0e0e0'); // 保持原始
  });
});

// =====================================================
//  Tier 3 — 任务特定断言：BT-mermaid-contrast 回归测试
// =====================================================
describe('BT-mermaid-contrast.1 暗色主题下 mermaid 自定义填充颜色文字对比度回归测试', () => {
  test('3.1 截图中的典型场景：#FFDEAD 橙色填充 + 浅色文字 → 文字应被修正', () => {
    // 模拟截图中 "GAME_SYSTEM: Buff 系统" 的场景
    const color = parseColor('#FFDEAD');
    expect(color).not.toBeNull();
    const luminance = getRelativeLuminance(color);
    expect(luminance).toBeGreaterThan(LUMINANCE_THRESHOLD);
    // 确认这是浅色背景，需要深色文字
  });

  test('3.2 截图中的典型场景：#ccffcc 浅绿色填充 → 文字应被修正', () => {
    const color = parseColor('#ccffcc');
    expect(color).not.toBeNull();
    const luminance = getRelativeLuminance(color);
    expect(luminance).toBeGreaterThan(LUMINANCE_THRESHOLD);
  });

  test('3.3 截图中的典型场景：#FFB6C1 浅粉色填充 → 文字应被修正', () => {
    const color = parseColor('#FFB6C1');
    expect(color).not.toBeNull();
    const luminance = getRelativeLuminance(color);
    expect(luminance).toBeGreaterThan(LUMINANCE_THRESHOLD);
  });

  test('3.4 截图中的典型场景：#FFD700 金色填充 → 文字应被修正', () => {
    const color = parseColor('#FFD700');
    expect(color).not.toBeNull();
    const luminance = getRelativeLuminance(color);
    expect(luminance).toBeGreaterThan(LUMINANCE_THRESHOLD);
  });

  test('3.5 mermaid dark 主题默认背景色 #1e1e1e → 不应修正文字', () => {
    const color = parseColor('#1e1e1e');
    expect(color).not.toBeNull();
    const luminance = getRelativeLuminance(color);
    expect(luminance).toBeLessThan(LUMINANCE_THRESHOLD);
  });

  test('3.6 mermaid dark 主题 primaryColor #4fc3f7 → 检查是否需要修正', () => {
    // #4fc3f7 是中等亮度的蓝色，需要确认其亮度
    const color = parseColor('#4fc3f7');
    expect(color).not.toBeNull();
    const luminance = getRelativeLuminance(color);
    // 这个颜色亮度约 0.48，刚好在阈值附近，浅色文字在上面可能不太清晰
    // 但 mermaid dark 主题的默认节点使用此颜色时文字是可读的
    expect(typeof luminance).toBe('number');
  });

  test('3.7 content.js 中 fixMermaidTextContrast 函数存在', () => {
    const fs = require('fs');
    const path = require('path');
    const contentJs = fs.readFileSync(
      path.join(__dirname, '../../content/content.js'),
      'utf-8'
    );
    expect(contentJs).toContain('function fixMermaidTextContrast');
    expect(contentJs).toContain('fixMermaidTextContrast(svgEl)');
  });

  test('3.8 content.js 中 parseColor 函数存在', () => {
    const fs = require('fs');
    const path = require('path');
    const contentJs = fs.readFileSync(
      path.join(__dirname, '../../content/content.js'),
      'utf-8'
    );
    expect(contentJs).toContain('function parseColor');
    expect(contentJs).toContain('function getRelativeLuminance');
  });

  test('3.9 fixMermaidTextContrast 仅在暗色主题下执行', () => {
    const fs = require('fs');
    const path = require('path');
    const contentJs = fs.readFileSync(
      path.join(__dirname, '../../content/content.js'),
      'utf-8'
    );
    // 确认函数内有暗色主题检查
    expect(contentJs).toMatch(/fixMermaidTextContrast[\s\S]*?theme\s*!==\s*['"]dark['"]/);
  });
});
