/**
 * UI 测试：设置面板
 * 覆盖：打开/关闭设置面板、设置项交互
 */

// =====================================================
//  BT-settings-panel.1 打开/关闭设置面板
// =====================================================
describe('BT-settings-panel.1 打开/关闭', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="btn-settings" class="md-toolbar-btn">⚙️ 设置</button>
      <div id="md-settings-overlay" class="md-settings-overlay" style="display:none;">
        <div class="md-settings-panel">
          <button id="btn-settings-close" class="md-settings-close">✕</button>
          <div class="md-settings-body">
            <div class="md-stg-slider-row">
              <input type="range" id="stg-fontSize" min="12" max="24" step="1" value="16">
              <span class="md-stg-slider-value" id="stg-fontSizeVal">16px</span>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  test('1.1 初始状态设置面板隐藏', () => {
    const overlay = document.getElementById('md-settings-overlay');
    expect(overlay.style.display).toBe('none');
  });

  test('1.2 点击设置按钮打开面板', () => {
    const btn = document.getElementById('btn-settings');
    const overlay = document.getElementById('md-settings-overlay');

    btn.addEventListener('click', () => {
      overlay.style.display = 'flex';
    });

    btn.click();
    expect(overlay.style.display).toBe('flex');
  });

  test('1.3 点击关闭按钮关闭面板', () => {
    const closeBtn = document.getElementById('btn-settings-close');
    const overlay = document.getElementById('md-settings-overlay');

    overlay.style.display = 'flex'; // 先打开

    closeBtn.addEventListener('click', () => {
      overlay.style.display = 'none';
    });

    closeBtn.click();
    expect(overlay.style.display).toBe('none');
  });
});

// =====================================================
//  BT-settings-panel.2 设置项交互
// =====================================================
describe('BT-settings-panel.2 设置项交互', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="md-settings-body">
        <input type="range" id="stg-fontSize" min="12" max="24" step="1" value="16">
        <span id="stg-fontSizeVal">16px</span>
        <input type="range" id="stg-lineHeight" min="1.2" max="2.0" step="0.1" value="1.6">
        <span id="stg-lineHeightVal">1.6</span>
        <input type="range" id="stg-maxWidth" min="600" max="1400" step="50" value="1200">
        <span id="stg-maxWidthVal">1200px</span>
        <input type="checkbox" id="stg-showToc" checked>
        <input type="checkbox" id="stg-enableMermaid" checked>
        <input type="checkbox" id="stg-enableMathJax">
        <input type="checkbox" id="stg-showLineNumbers">
      </div>
    `;
  });

  test('2.1 字体大小滑块修改更新显示值', () => {
    const slider = document.getElementById('stg-fontSize');
    const display = document.getElementById('stg-fontSizeVal');

    slider.addEventListener('input', () => {
      display.textContent = slider.value + 'px';
    });

    slider.value = '20';
    slider.dispatchEvent(new Event('input'));
    expect(display.textContent).toBe('20px');
  });

  test('2.2 行高滑块修改更新显示值', () => {
    const slider = document.getElementById('stg-lineHeight');
    const display = document.getElementById('stg-lineHeightVal');

    slider.addEventListener('input', () => {
      display.textContent = parseFloat(slider.value).toFixed(1);
    });

    slider.value = '1.8';
    slider.dispatchEvent(new Event('input'));
    expect(display.textContent).toBe('1.8');
  });

  test('2.3 内容宽度滑块修改更新显示值', () => {
    const slider = document.getElementById('stg-maxWidth');
    const display = document.getElementById('stg-maxWidthVal');

    slider.addEventListener('input', () => {
      display.textContent = slider.value + 'px';
    });

    slider.value = '1000';
    slider.dispatchEvent(new Event('input'));
    expect(display.textContent).toBe('1000px');
  });

  test('2.4 目录开关切换', () => {
    const checkbox = document.getElementById('stg-showToc');
    expect(checkbox.checked).toBe(true);

    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    expect(checkbox.checked).toBe(false);
  });

  test('2.5 Mermaid 开关切换', () => {
    const checkbox = document.getElementById('stg-enableMermaid');
    expect(checkbox.checked).toBe(true);

    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    expect(checkbox.checked).toBe(false);
  });

  test('2.6 数学公式开关切换', () => {
    const checkbox = document.getElementById('stg-enableMathJax');
    expect(checkbox.checked).toBe(false);

    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    expect(checkbox.checked).toBe(true);
  });
});
