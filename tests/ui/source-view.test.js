/**
 * UI 测试：源码查看
 * 覆盖：源码/预览切换
 */

// =====================================================
//  BT-source-view.1 源码/预览切换
// =====================================================
describe('BT-source-view.1 源码/预览切换', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="btn-toggle-raw" class="md-toolbar-btn">📝 源码</button>
      <main id="md-content" class="md-content" style="display:block;">
        <h1>Rendered Content</h1>
      </main>
      <pre id="md-raw-content" class="md-raw-content" style="display:none;">
# Raw Markdown Source
      </pre>
    `;

    // 绑定切换逻辑
    const btn = document.getElementById('btn-toggle-raw');
    const content = document.getElementById('md-content');
    const raw = document.getElementById('md-raw-content');

    btn.addEventListener('click', () => {
      const isShowingRaw = raw.style.display !== 'none';
      if (isShowingRaw) {
        raw.style.display = 'none';
        content.style.display = 'block';
        btn.textContent = '📝 源码';
      } else {
        raw.style.display = 'block';
        content.style.display = 'none';
        btn.textContent = '📄 预览';
      }
    });
  });

  test('1.1 初始状态显示渲染内容', () => {
    const content = document.getElementById('md-content');
    const raw = document.getElementById('md-raw-content');
    expect(content.style.display).toBe('block');
    expect(raw.style.display).toBe('none');
  });

  test('1.2 点击切换到源码视图', () => {
    const btn = document.getElementById('btn-toggle-raw');
    const content = document.getElementById('md-content');
    const raw = document.getElementById('md-raw-content');

    btn.click();
    expect(raw.style.display).toBe('block');
    expect(content.style.display).toBe('none');
    expect(btn.textContent).toBe('📄 预览');
  });

  test('1.3 再次点击切换回渲染视图', () => {
    const btn = document.getElementById('btn-toggle-raw');
    const content = document.getElementById('md-content');
    const raw = document.getElementById('md-raw-content');

    btn.click(); // → 源码
    btn.click(); // → 预览
    expect(content.style.display).toBe('block');
    expect(raw.style.display).toBe('none');
    expect(btn.textContent).toBe('📝 源码');
  });

  test('1.4 源码内容存在', () => {
    const raw = document.getElementById('md-raw-content');
    expect(raw.textContent.trim()).toContain('# Raw Markdown Source');
  });
});
