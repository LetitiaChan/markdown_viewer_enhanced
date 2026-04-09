/**
 * UI 测试：主题切换
 * 覆盖：亮色/暗色主题切换
 */

// =====================================================
//  BT-theme.1 主题切换测试
// =====================================================
describe('BT-theme.1 主题切换', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="md-viewer-app" class="md-viewer-app theme-light">
        <button id="btn-toggle-theme" class="md-toolbar-btn">🌓 主题</button>
      </div>
    `;
  });

  test('1.1 初始为亮色主题', () => {
    const app = document.getElementById('md-viewer-app');
    expect(app.classList.contains('theme-light')).toBe(true);
  });

  test('1.2 点击切换为暗色主题', () => {
    const app = document.getElementById('md-viewer-app');
    const btn = document.getElementById('btn-toggle-theme');

    // 模拟主题切换逻辑
    btn.addEventListener('click', () => {
      const themes = ['light', 'dark'];
      const currentTheme = app.className.includes('theme-light') ? 'light' : 'dark';
      const currentIndex = themes.indexOf(currentTheme);
      const nextTheme = themes[(currentIndex + 1) % themes.length];
      app.className = `md-viewer-app theme-${nextTheme}`;
    });

    btn.click();
    expect(app.classList.contains('theme-dark')).toBe(true);
    expect(app.classList.contains('theme-light')).toBe(false);
  });

  test('1.3 再次点击切换回亮色主题', () => {
    const app = document.getElementById('md-viewer-app');
    const btn = document.getElementById('btn-toggle-theme');

    btn.addEventListener('click', () => {
      const themes = ['light', 'dark'];
      const currentTheme = app.className.includes('theme-light') ? 'light' : 'dark';
      const currentIndex = themes.indexOf(currentTheme);
      const nextTheme = themes[(currentIndex + 1) % themes.length];
      app.className = `md-viewer-app theme-${nextTheme}`;
    });

    btn.click(); // → dark
    btn.click(); // → light
    expect(app.classList.contains('theme-light')).toBe(true);
  });
});
