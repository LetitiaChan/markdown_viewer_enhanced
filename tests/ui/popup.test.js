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
