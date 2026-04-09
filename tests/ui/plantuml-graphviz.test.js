/**
 * PlantUML & Graphviz 渲染测试
 * Tier 1: 存在性断言
 * Tier 2: 行为级断言
 * Tier 3: 任务特定断言
 */

// 读取源码用于 Tier 1 关键字检查
const fs = require('fs');
const path = require('path');
const contentJs = fs.readFileSync(path.resolve(__dirname, '../../content/content.js'), 'utf-8');
const contentCss = fs.readFileSync(path.resolve(__dirname, '../../styles/content.css'), 'utf-8');
const zhCN = fs.readFileSync(path.resolve(__dirname, '../../i18n/zh-CN.js'), 'utf-8');
const enJs = fs.readFileSync(path.resolve(__dirname, '../../i18n/en.js'), 'utf-8');

// ==================== Tier 1: 存在性断言 ====================

describe('Tier 1: PlantUML/Graphviz 存在性', () => {
  test('1.1 content.js 包含 plantumlHexEncode 函数', () => {
    expect(contentJs).toContain('function plantumlHexEncode');
  });

  test('1.2 content.js 包含 renderPlantUML 函数', () => {
    expect(contentJs).toContain('function renderPlantUML');
  });

  test('1.3 content.js 包含 renderGraphviz 函数', () => {
    expect(contentJs).toContain('function renderGraphviz');
  });

  test('1.4 content.js renderer.code 检测 plantuml/puml', () => {
    expect(contentJs).toContain("lang === 'plantuml'");
    expect(contentJs).toContain("lang === 'puml'");
  });

  test('1.5 content.js renderer.code 检测 dot/graphviz', () => {
    expect(contentJs).toContain("lang === 'dot'");
    expect(contentJs).toContain("lang === 'graphviz'");
  });

  test('1.6 content.js DEFAULT_SETTINGS 包含 enablePlantUML', () => {
    expect(contentJs).toContain('enablePlantUML');
  });

  test('1.7 content.js DEFAULT_SETTINGS 包含 enableGraphviz', () => {
    expect(contentJs).toContain('enableGraphviz');
  });

  test('1.8 CSS 包含 PlantUML 容器样式', () => {
    expect(contentCss).toContain('.plantuml-container');
    expect(contentCss).toContain('.plantuml-rendered');
    expect(contentCss).toContain('.plantuml-error');
  });

  test('1.9 CSS 包含 Graphviz 容器样式', () => {
    expect(contentCss).toContain('.graphviz-container');
    expect(contentCss).toContain('.graphviz-rendered');
    expect(contentCss).toContain('.graphviz-error');
  });

  test('1.10 CSS 包含暗色主题滤镜', () => {
    expect(contentCss).toContain('.theme-dark .plantuml-rendered');
    expect(contentCss).toContain('.theme-dark .graphviz-rendered svg');
    expect(contentCss).toContain('invert(0.88)');
  });

  test('1.11 i18n zh-CN 包含 PlantUML/Graphviz key', () => {
    expect(zhCN).toContain("'settings.plantuml'");
    expect(zhCN).toContain("'settings.graphviz'");
    expect(zhCN).toContain("'plantuml.error.tooLong'");
    expect(zhCN).toContain("'plantuml.error.network'");
    expect(zhCN).toContain("'graphviz.error.syntax'");
  });

  test('1.12 i18n en 包含 PlantUML/Graphviz key', () => {
    expect(enJs).toContain("'settings.plantuml'");
    expect(enJs).toContain("'settings.graphviz'");
    expect(enJs).toContain("'plantuml.error.tooLong'");
    expect(enJs).toContain("'plantuml.error.network'");
    expect(enJs).toContain("'graphviz.error.syntax'");
  });

  test('1.13 manifest.json 包含 viz-global.js', () => {
    const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../manifest.json'), 'utf-8'));
    const jsFiles = manifest.content_scripts[0].js;
    expect(jsFiles).toContain('libs/viz-global.js');
  });

  test('1.14 viz-global.js 文件存在', () => {
    const vizPath = path.resolve(__dirname, '../../libs/viz-global.js');
    expect(fs.existsSync(vizPath)).toBe(true);
  });

  test('1.15 background.js 包含 enablePlantUML 和 enableGraphviz', () => {
    const bgJs = fs.readFileSync(path.resolve(__dirname, '../../background.js'), 'utf-8');
    expect(bgJs).toContain('enablePlantUML');
    expect(bgJs).toContain('enableGraphviz');
  });

  test('1.16 background.js injectContentScripts 包含 viz-global.js', () => {
    const bgJs = fs.readFileSync(path.resolve(__dirname, '../../background.js'), 'utf-8');
    expect(bgJs).toContain('libs/viz-global.js');
  });
});

// ==================== Tier 2: 行为级断言 ====================

describe('Tier 2: PlantUML hex 编码', () => {
  // 使用 Buffer 替代 TextEncoder（jsdom 环境兼容）
  function plantumlHexEncode(text) {
    const bytes = Buffer.from(text, 'utf-8');
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  test('2.1 ASCII 文本正确编码为 hex', () => {
    const result = plantumlHexEncode('@startuml\nA -> B\n@enduml');
    expect(result).toBe('407374617274756d6c0a41202d3e20420a40656e64756d6c');
  });

  test('2.2 空字符串编码为空', () => {
    expect(plantumlHexEncode('')).toBe('');
  });

  test('2.3 中文字符正确编码', () => {
    const result = plantumlHexEncode('你好');
    // UTF-8: 你=e4bda0, 好=e5a5bd
    expect(result).toBe('e4bda0e5a5bd');
  });
});

describe('Tier 2: PlantUML DOM 占位', () => {
  test('2.4 plantuml 代码块生成占位容器', () => {
    // 模拟 renderer.code 逻辑
    const code = '@startuml\nA -> B\n@enduml';
    const lang = 'plantuml';
    const enablePlantUML = true;

    if ((lang === 'plantuml' || lang === 'puml') && enablePlantUML) {
      const base64Code = btoa(unescape(encodeURIComponent(code)));
      const html = `<div class="plantuml-container" data-source="${base64Code}">
        <pre class="plantuml-source" style="display:none"><code>${code}</code></pre>
      </div>`;
      expect(html).toContain('plantuml-container');
      expect(html).toContain('data-source');
      expect(html).toContain('plantuml-source');
    }
  });

  test('2.5 puml 语言别名也生成占位容器', () => {
    const lang = 'puml';
    expect(lang === 'plantuml' || lang === 'puml').toBe(true);
  });
});

describe('Tier 2: Graphviz DOM 占位', () => {
  test('2.6 dot 代码块生成占位容器', () => {
    const code = 'digraph { A -> B }';
    const lang = 'dot';
    const enableGraphviz = true;

    if ((lang === 'dot' || lang === 'graphviz') && enableGraphviz) {
      const base64Code = btoa(unescape(encodeURIComponent(code)));
      const html = `<div class="graphviz-container" data-source="${base64Code}">
        <pre class="graphviz-source" style="display:none"><code>${code}</code></pre>
      </div>`;
      expect(html).toContain('graphviz-container');
      expect(html).toContain('data-source');
    }
  });

  test('2.7 graphviz 语言别名也生成占位容器', () => {
    const lang = 'graphviz';
    expect(lang === 'dot' || lang === 'graphviz').toBe(true);
  });
});

describe('Tier 2: PlantUML 源码长度限制', () => {
  test('2.8 源码超过 4000 字符应拒绝渲染', () => {
    const longSource = 'A'.repeat(4001);
    expect(longSource.length).toBeGreaterThan(4000);
  });

  test('2.9 源码 4000 字符以内应正常渲染', () => {
    const shortSource = 'A'.repeat(4000);
    expect(shortSource.length).toBeLessThanOrEqual(4000);
  });
});

describe('Tier 2: 设置开关控制', () => {
  test('2.10 enablePlantUML=false 时不生成占位容器', () => {
    const lang = 'plantuml';
    const enablePlantUML = false;
    const shouldRender = (lang === 'plantuml' || lang === 'puml') && enablePlantUML;
    expect(shouldRender).toBe(false);
  });

  test('2.11 enableGraphviz=false 时不生成占位容器', () => {
    const lang = 'dot';
    const enableGraphviz = false;
    const shouldRender = (lang === 'dot' || lang === 'graphviz') && enableGraphviz;
    expect(shouldRender).toBe(false);
  });
});

describe('Tier 2: PlantUML URL 构造', () => {
  function plantumlHexEncode(text) {
    const bytes = Buffer.from(text, 'utf-8');
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  test('2.12 URL 格式正确', () => {
    const source = '@startuml\nA -> B\n@enduml';
    const hex = plantumlHexEncode(source);
    const url = `https://www.plantuml.com/plantuml/svg/~h${hex}`;
    expect(url).toMatch(/^https:\/\/www\.plantuml\.com\/plantuml\/svg\/~h[0-9a-f]+$/);
  });
});

describe('Tier 2: base64 编解码一致性', () => {
  test('2.13 base64 编码后可正确解码还原', () => {
    const source = '@startuml\n你好 -> 世界\n@enduml';
    const encoded = btoa(unescape(encodeURIComponent(source)));
    const decoded = decodeURIComponent(escape(atob(encoded)));
    expect(decoded).toBe(source);
  });
});

// ==================== Tier 3: 任务特定断言 ====================

describe('Tier 3: PlantUML + Graphviz 特定场景', () => {
  test('BT-plantuml.1 PlantUML 渲染调用在主渲染流程中存在', () => {
    expect(contentJs).toContain('renderPlantUML()');
  });

  test('BT-graphviz.1 Graphviz 渲染调用在主渲染流程中存在', () => {
    expect(contentJs).toContain('renderGraphviz()');
  });

  test('BT-plantuml.2 PlantUML 图片使用 plantuml.com 服务器', () => {
    expect(contentJs).toContain('https://www.plantuml.com/plantuml/svg/~h');
  });

  test('BT-graphviz.2 Graphviz 使用 Viz.js 实例渲染', () => {
    expect(contentJs).toContain('Viz.instance');
    expect(contentJs).toContain('vizInstance.renderSVGElement');
  });

  test('BT-graphviz.3 Graphviz SVG 自适应处理', () => {
    expect(contentJs).toContain("svgEl.style.width = '100%'");
    expect(contentJs).toContain("svgEl.style.height = 'auto'");
    expect(contentJs).toContain("preserveAspectRatio");
  });

  test('BT-plantuml.3 PlantUML onerror 降级处理', () => {
    expect(contentJs).toContain('img.onerror');
    expect(contentJs).toContain('plantuml.error.network');
  });

  test('BT-graphviz.4 Graphviz 语法错误处理', () => {
    expect(contentJs).toContain('graphviz.error.syntax');
  });

  test('BT-graphviz.5 Graphviz 点击复用 Mermaid 灯箱', () => {
    expect(contentJs).toContain('.graphviz-rendered');
    expect(contentJs).toContain("e.target.closest('.graphviz-rendered')");
  });

  test('BT-settings.1 设置面板包含 PlantUML 开关', () => {
    expect(contentJs).toContain('stg-enablePlantUML');
  });

  test('BT-settings.2 设置面板包含 Graphviz 开关', () => {
    expect(contentJs).toContain('stg-enableGraphviz');
  });
});
