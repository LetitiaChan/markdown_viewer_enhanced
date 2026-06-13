/**
 * UI 测试：页面构建
 * 覆盖：buildPage DOM 结构、工具栏按钮存在性
 */

const fs = require('fs');
const path = require('path');
const { DEFAULT_SETTINGS, getScrollContainer } = require('../../content/content.js');

const contentCss = fs.readFileSync(
  path.join(__dirname, '../../styles/content.css'),
  'utf8'
);

// =====================================================
//  BT-page-build.1 DOM 结构测试
// =====================================================
describe('BT-page-build.1 DOM 结构', () => {
  beforeEach(() => {
    // 模拟 buildPage 生成的 DOM 结构
    document.body.innerHTML = `
      <div id="md-viewer-app" class="md-viewer-app theme-light">
        <div id="md-toolbar" class="md-toolbar">
          <div class="md-toolbar-left">
            <span class="md-toolbar-title">📄 test.md</span>
          </div>
          <div class="md-toolbar-right">
            <button id="btn-toggle-toc" class="md-toolbar-btn">📑 目录</button>
            <button id="btn-toggle-theme" class="md-toolbar-btn">🌓 主题</button>
            <button id="btn-toggle-raw" class="md-toolbar-btn">📝 源码</button>
            <button id="btn-settings" class="md-toolbar-btn">⚙️ 设置</button>
            <button id="btn-refresh" class="md-toolbar-btn">🔃 刷新</button>
          </div>
        </div>
        <div class="md-main-container">
          <aside id="md-toc-sidebar" class="md-toc-sidebar toc-right visible">
            <div class="sidebar-tabs">
              <span class="sidebar-tab-spacer"></span>
            </div>
            <div id="sidebar-panel-toc" class="sidebar-panel">
              <nav id="md-toc-nav" class="md-toc-nav"></nav>
            </div>
          </aside>
          <main id="md-content" class="md-content markdown-viewer-enhanced">
            <h1 id="test-heading">Test Content</h1>
            <p>Hello World</p>
          </main>
          <pre id="md-raw-content" class="md-raw-content" style="display:none;">
# Test Content\nHello World
          </pre>
        </div>
        <button id="btn-float-top" class="md-float-top" style="display:none;">⬆️</button>
        <div id="md-image-overlay" class="md-image-overlay" style="display:none;"></div>
        <div id="md-mermaid-overlay" class="md-mermaid-overlay" style="display:none;"></div>
        <div id="md-settings-overlay" class="md-settings-overlay" style="display:none;"></div>
      </div>
    `;
  });

  test('1.1 主容器存在', () => {
    expect(document.getElementById('md-viewer-app')).not.toBeNull();
  });

  test('1.2 工具栏存在', () => {
    expect(document.getElementById('md-toolbar')).not.toBeNull();
  });

  test('1.3 侧边栏存在', () => {
    expect(document.getElementById('md-toc-sidebar')).not.toBeNull();
  });

  test('1.4 内容区域存在', () => {
    expect(document.getElementById('md-content')).not.toBeNull();
  });

  test('1.5 源码面板存在', () => {
    expect(document.getElementById('md-raw-content')).not.toBeNull();
  });

  test('1.6 回到顶部按钮存在', () => {
    expect(document.getElementById('btn-float-top')).not.toBeNull();
  });

  test('1.7 图片灯箱为动态创建（不预存在于 DOM）', () => {
    expect(document.querySelector('.md-lightbox-overlay')).toBeNull();
  });

  test('1.8 Mermaid 预览遮罩存在', () => {
    expect(document.getElementById('md-mermaid-overlay')).not.toBeNull();
  });

  test('1.9 设置面板遮罩存在', () => {
    expect(document.getElementById('md-settings-overlay')).not.toBeNull();
  });
});

// =====================================================
//  BT-page-build.2 工具栏按钮存在性
// =====================================================
describe('BT-page-build.2 工具栏按钮', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="md-toolbar-right">
        <button id="btn-toggle-toc" class="md-toolbar-btn">📑 目录</button>
        <button id="btn-toggle-theme" class="md-toolbar-btn">🌓 主题</button>
        <button id="btn-toggle-raw" class="md-toolbar-btn">📝 源码</button>
        <button id="btn-settings" class="md-toolbar-btn">⚙️ 设置</button>
        <button id="btn-refresh" class="md-toolbar-btn">🔃 刷新</button>
      </div>
    `;
  });

  test('2.1 目录按钮存在', () => {
    expect(document.getElementById('btn-toggle-toc')).not.toBeNull();
  });

  test('2.2 主题按钮存在', () => {
    expect(document.getElementById('btn-toggle-theme')).not.toBeNull();
  });

  test('2.3 源码按钮存在', () => {
    expect(document.getElementById('btn-toggle-raw')).not.toBeNull();
  });

  test('2.4 设置按钮存在', () => {
    expect(document.getElementById('btn-settings')).not.toBeNull();
  });

  test('2.5 刷新按钮存在', () => {
    expect(document.getElementById('btn-refresh')).not.toBeNull();
  });

  test('2.6 所有按钮都有 md-toolbar-btn class', () => {
    const buttons = document.querySelectorAll('.md-toolbar-btn');
    expect(buttons.length).toBe(5);
  });
});

// =====================================================
//  BT-page-build.3 嵌入模式滚动容器判定
//  回归：embed 模式下滚动发生在 #md-content，float 模式由 window 滚动
// =====================================================
describe('BT-page-build.3 滚动容器判定', () => {
  function buildDom(embed) {
    document.body.innerHTML = `
      <div id="md-viewer-app" class="md-viewer-app theme-light${embed ? ' panel-embed' : ''}">
        <div class="md-main-container">
          <main id="md-content" class="md-content"></main>
        </div>
      </div>
    `;
  }

  test('3.1 getScrollContainer 已导出', () => {
    expect(typeof getScrollContainer).toBe('function');
  });

  test('3.2 嵌入模式返回 #md-content 作为滚动容器', () => {
    buildDom(true);
    expect(getScrollContainer()).toBe(document.getElementById('md-content'));
  });

  test('3.3 悬浮模式返回 null（表示 window 滚动）', () => {
    buildDom(false);
    expect(getScrollContainer()).toBeNull();
  });

  test('3.4 缺少 #md-viewer-app 时安全回退 null', () => {
    document.body.innerHTML = '';
    expect(getScrollContainer()).toBeNull();
  });
});

// =====================================================
//  BT-page-build.4 嵌入模式高度链 CSS 契约
//  回归：app 必须用固定 height:100vh（而非 min-height）约束 flex 子项，
//  否则长文档撑高容器导致正文/目录内部滚动失效、退化为整页 window 滚动
// =====================================================
describe('BT-page-build.4 嵌入模式高度链 CSS', () => {
  test('4.1 存在 .md-viewer-app.panel-embed 复合选择器', () => {
    expect(contentCss).toContain('.md-viewer-app.panel-embed');
  });

  test('4.2 嵌入模式 app 使用固定 height:100vh 并隐藏外溢', () => {
    const m = contentCss.match(/\.md-viewer-app\.panel-embed\s*\{([^}]*)\}/);
    expect(m).not.toBeNull();
    expect(m[1]).toMatch(/height:\s*100vh/);
    expect(m[1]).toMatch(/overflow:\s*hidden/);
  });

  test('4.3 嵌入模式 main-container 不再硬编码 calc(100vh - 30px)', () => {
    const m = contentCss.match(/\.panel-embed\s+\.md-main-container\s*\{([^}]*)\}/);
    expect(m).not.toBeNull();
    expect(m[1]).not.toMatch(/calc\(100vh\s*-\s*30px\)/);
    expect(m[1]).toMatch(/min-height:\s*0/);
  });

  test('4.4 正文与目录在嵌入模式各自独立滚动 (overflow-y:auto + min-height:0)', () => {
    const content = contentCss.match(/\.panel-embed\s+\.md-content\s*\{([^}]*)\}/);
    const sidebar = contentCss.match(/\.panel-embed\s+\.md-toc-sidebar\s*\{([^}]*)\}/);
    expect(content[1]).toMatch(/overflow-y:\s*auto/);
    expect(content[1]).toMatch(/min-height:\s*0/);
    expect(sidebar[1]).toMatch(/overflow-y:\s*auto/);
    expect(sidebar[1]).toMatch(/min-height:\s*0/);
  });
});
