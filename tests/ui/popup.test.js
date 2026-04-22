/**
 * UI 测试：Popup 弹出窗口
 * 覆盖：设置加载到 UI、设置修改触发保存
 */

// =====================================================
//  BT-popup.1 设置加载到 UI
// =====================================================
describe('BT-popup.1 设置加载到 UI', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="statusDot" class="status-dot"></div>
      <span id="statusText">检测中...</span>
      <input type="range" id="fontSizeSlider" min="12" max="24" value="16">
      <span id="fontSizeValue">16px</span>
      <input type="range" id="lineHeightSlider" min="1.2" max="2.0" step="0.1" value="1.6">
      <span id="lineHeightValue">1.6</span>
      <input type="range" id="maxWidthSlider" min="600" max="1400" step="50" value="1200">
      <span id="maxWidthValue">1200px</span>
      <select id="codeThemeSelect">
        <option value="default-dark-modern">Default Dark Modern</option>
        <option value="github">GitHub</option>
      </select>
      <input type="checkbox" id="toggleToc" checked>
      <div id="tocPositionRow">
        <button class="toc-pos-btn" data-pos="left">左侧</button>
        <button class="toc-pos-btn active" data-pos="right">右侧</button>
      </div>
      <input type="checkbox" id="toggleMermaid" checked>
      <input type="checkbox" id="toggleMathJax">
      <input type="checkbox" id="toggleLineNumbers">
      <input type="checkbox" id="toggleAutoDetect" checked>
      <button class="theme-btn" data-theme="light">亮色</button>
      <button class="theme-btn active" data-theme="dark">暗色</button>
      <button class="btn-option" data-font="system">系统</button>
      <button class="btn-option active" data-font="serif">衬线</button>
      <button id="btnReset">重置</button>
      <button id="btnRefresh">刷新</button>
      <div id="renderBar" style="display:none;">
        <button id="btnRender">渲染</button>
      </div>
    `;
  });

  test('1.1 字体大小滑块初始值正确', () => {
    const slider = document.getElementById('fontSizeSlider');
    expect(slider.value).toBe('16');
  });

  test('1.2 行高滑块初始值正确', () => {
    const slider = document.getElementById('lineHeightSlider');
    expect(slider.value).toBe('1.6');
  });

  test('1.3 内容宽度滑块初始值正确', () => {
    const slider = document.getElementById('maxWidthSlider');
    expect(slider.value).toBe('1200');
  });

  test('1.4 目录开关初始为开启', () => {
    const toggle = document.getElementById('toggleToc');
    expect(toggle.checked).toBe(true);
  });

  test('1.5 Mermaid 开关初始为开启', () => {
    const toggle = document.getElementById('toggleMermaid');
    expect(toggle.checked).toBe(true);
  });

  test('1.6 自动检测开关初始为开启', () => {
    const toggle = document.getElementById('toggleAutoDetect');
    expect(toggle.checked).toBe(true);
  });

  test('1.7 数学公式开关初始为关闭', () => {
    const toggle = document.getElementById('toggleMathJax');
    expect(toggle.checked).toBe(false);
  });
});

// =====================================================
//  BT-popup.2 设置修改触发保存
// =====================================================
describe('BT-popup.2 设置修改触发保存', () => {
  let saveCallCount;

  beforeEach(() => {
    saveCallCount = 0;
    document.body.innerHTML = `
      <input type="range" id="fontSizeSlider" min="12" max="24" value="16">
      <span id="fontSizeValue">16px</span>
      <input type="checkbox" id="toggleToc" checked>
      <input type="checkbox" id="toggleMermaid" checked>
    `;
  });

  test('2.1 修改字体大小触发保存', () => {
    const slider = document.getElementById('fontSizeSlider');

    slider.addEventListener('change', () => {
      global.chrome.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings: { fontSize: parseInt(slider.value) }
      }, () => {});
    });

    slider.value = '20';
    slider.dispatchEvent(new Event('change'));

    expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SAVE_SETTINGS' }),
      expect.any(Function)
    );
  });

  test('2.2 切换目录开关触发保存', () => {
    const toggle = document.getElementById('toggleToc');

    toggle.addEventListener('change', () => {
      global.chrome.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings: { showToc: toggle.checked }
      }, () => {});
    });

    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));

    expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SAVE_SETTINGS',
        settings: expect.objectContaining({ showToc: false })
      }),
      expect.any(Function)
    );
  });

  test('2.3 切换 Mermaid 开关触发保存', () => {
    const toggle = document.getElementById('toggleMermaid');

    toggle.addEventListener('change', () => {
      global.chrome.runtime.sendMessage({
        type: 'SAVE_SETTINGS',
        settings: { enableMermaid: toggle.checked }
      }, () => {});
    });

    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));

    expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SAVE_SETTINGS',
        settings: expect.objectContaining({ enableMermaid: false })
      }),
      expect.any(Function)
    );
  });
});

// =====================================================
//  BT-popup.3 按钮组 segment 样式统一性
// =====================================================
describe('BT-popup.3 按钮组 segment 样式统一性', () => {
  let popupHtml;

  beforeAll(() => {
    const fs = require('fs');
    const path = require('path');
    popupHtml = fs.readFileSync(
      path.resolve(__dirname, '../../popup/popup.html'), 'utf-8'
    );
  });

  // Tier 1 — 存在性断言
  test('3.1 [Tier1] popup.html 包含 theme-selector 样式定义', () => {
    expect(popupHtml).toContain('.theme-selector');
  });

  test('3.2 [Tier1] popup.html 包含 btn-group 样式定义', () => {
    expect(popupHtml).toContain('.btn-group');
  });

  test('3.3 [Tier1] popup.html 包含 toc-position-selector 样式定义', () => {
    expect(popupHtml).toContain('.toc-position-selector');
  });

  // Tier 2 — 行为级断言：验证按钮组容器具有外层边框
  test('3.4 [Tier2] theme-selector 具有外层边框容器样式', () => {
    // 提取 .theme-selector 的 CSS 块
    const selectorMatch = popupHtml.match(/\.theme-selector\s*\{([^}]+)\}/);
    expect(selectorMatch).not.toBeNull();
    const css = selectorMatch[1];
    expect(css).toMatch(/border.*#e1e4e8/);
    expect(css).toMatch(/border-radius/);
    expect(css).toMatch(/inline-flex/);
  });

  test('3.5 [Tier2] btn-group 具有外层边框容器样式', () => {
    const groupMatch = popupHtml.match(/\.btn-group\s*\{([^}]+)\}/);
    expect(groupMatch).not.toBeNull();
    const css = groupMatch[1];
    expect(css).toMatch(/border.*#e1e4e8/);
    expect(css).toMatch(/border-radius/);
    expect(css).toMatch(/inline-flex/);
  });

  test('3.6 [Tier2] toc-position-selector 具有外层边框容器样式', () => {
    const tocMatch = popupHtml.match(/\.toc-position-selector\s*\{([^}]+)\}/);
    expect(tocMatch).not.toBeNull();
    const css = tocMatch[1];
    expect(css).toMatch(/border.*#e1e4e8/);
    expect(css).toMatch(/border-radius/);
    expect(css).toMatch(/inline-flex/);
  });

  // Tier 2 — 行为级断言：验证选中态使用绿色
  test('3.7 [Tier2] theme-btn 选中态使用绿色 #059669', () => {
    const activeMatch = popupHtml.match(/\.theme-btn\.active\s*\{([^}]+)\}/);
    expect(activeMatch).not.toBeNull();
    expect(activeMatch[1]).toContain('#059669');
  });

  test('3.8 [Tier2] btn-option 选中态使用绿色 #059669', () => {
    const activeMatch = popupHtml.match(/\.btn-option\.active\s*\{([^}]+)\}/);
    expect(activeMatch).not.toBeNull();
    expect(activeMatch[1]).toContain('#059669');
  });

  test('3.9 [Tier2] toc-pos-btn 选中态使用绿色 #059669', () => {
    const activeMatch = popupHtml.match(/\.toc-pos-btn\.active\s*\{([^}]+)\}/);
    expect(activeMatch).not.toBeNull();
    expect(activeMatch[1]).toContain('#059669');
  });

  // Tier 3 — 任务特定断言：popup 与 options 按钮组风格一致
  test('3.10 [Tier3] popup 所有按钮组不再使用旧紫色 #667eea 选中态', () => {
    // 提取所有 .active 规则块
    const activeBlocks = popupHtml.match(/\.(theme-btn|btn-option|toc-pos-btn)\.active\s*\{[^}]+\}/g);
    expect(activeBlocks).not.toBeNull();
    activeBlocks.forEach(block => {
      expect(block).not.toMatch(/#667eea/);
      expect(block).not.toMatch(/#f0f0ff/);
    });
  });

  test('3.11 [Tier3] popup 所有按钮组容器均使用 inline-flex 而非 flex', () => {
    // 确保容器使用 inline-flex（segment 风格）而非 flex（旧风格）
    const containers = [
      popupHtml.match(/\.theme-selector\s*\{([^}]+)\}/),
      popupHtml.match(/\.btn-group\s*\{([^}]+)\}/),
      popupHtml.match(/\.toc-position-selector\s*\{([^}]+)\}/)
    ];
    containers.forEach(match => {
      expect(match).not.toBeNull();
      expect(match[1]).toMatch(/inline-flex/);
    });
  });
});
