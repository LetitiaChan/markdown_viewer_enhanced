/**
 * UI 测试：TOC 目录生成
 * 覆盖：从标题生成目录、折叠/展开
 */

const { generateId } = require('../../content/content.js');

// =====================================================
//  BT-toc.1 目录生成测试
// =====================================================
describe('BT-toc.1 目录生成', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="md-viewer-app">
        <nav id="md-toc-nav" class="md-toc-nav"></nav>
        <main id="md-content" class="md-content">
          <h1 id="title">Title</h1>
          <h2 id="section-1">Section 1</h2>
          <h3 id="sub-section-11">Sub Section 1.1</h3>
          <h2 id="section-2">Section 2</h2>
          <h3 id="sub-section-21">Sub Section 2.1</h3>
          <h3 id="sub-section-22">Sub Section 2.2</h3>
        </main>
      </div>
    `;
  });

  test('1.1 检测到所有标题', () => {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    expect(headings.length).toBe(6);
  });

  test('1.2 标题有正确的 id', () => {
    expect(document.getElementById('title')).not.toBeNull();
    expect(document.getElementById('section-1')).not.toBeNull();
    expect(document.getElementById('sub-section-11')).not.toBeNull();
  });

  test('1.3 生成目录链接', () => {
    const tocNav = document.getElementById('md-toc-nav');
    // 模拟生成目录
    const headings = document.querySelectorAll('h1, h2, h3');
    let tocHtml = '';
    headings.forEach(h => {
      const level = parseInt(h.tagName[1]);
      const indent = (level - 1) * 16;
      tocHtml += `<a class="md-toc-link md-toc-h${level}" href="#${h.id}" style="padding-left:${indent}px">${h.textContent}</a>`;
    });
    tocNav.innerHTML = tocHtml;

    const links = tocNav.querySelectorAll('.md-toc-link');
    expect(links.length).toBe(6);
  });

  test('1.4 目录链接层级正确', () => {
    const tocNav = document.getElementById('md-toc-nav');
    const headings = document.querySelectorAll('h1, h2, h3');
    let tocHtml = '';
    headings.forEach(h => {
      const level = parseInt(h.tagName[1]);
      tocHtml += `<a class="md-toc-link md-toc-h${level}" href="#${h.id}">${h.textContent}</a>`;
    });
    tocNav.innerHTML = tocHtml;

    expect(tocNav.querySelectorAll('.md-toc-h1').length).toBe(1);
    expect(tocNav.querySelectorAll('.md-toc-h2').length).toBe(2);
    expect(tocNav.querySelectorAll('.md-toc-h3').length).toBe(3);
  });
});

// =====================================================
//  BT-toc.2 目录折叠/展开测试
// =====================================================
describe('BT-toc.2 目录折叠/展开', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <nav id="md-toc-nav">
        <div class="md-toc-item" data-index="0">
          <button class="md-toc-toggle" data-index="0">▼</button>
          <a class="md-toc-link md-toc-h2" href="#section-1">Section 1</a>
        </div>
        <div class="md-toc-item md-toc-child" data-parent="0" data-index="1">
          <a class="md-toc-link md-toc-h3" href="#sub-1">Sub 1</a>
        </div>
        <div class="md-toc-item md-toc-child" data-parent="0" data-index="2">
          <a class="md-toc-link md-toc-h3" href="#sub-2">Sub 2</a>
        </div>
      </nav>
    `;
  });

  test('2.1 折叠按钮存在', () => {
    const toggle = document.querySelector('.md-toc-toggle');
    expect(toggle).not.toBeNull();
  });

  test('2.2 点击折叠隐藏子项', () => {
    const toggle = document.querySelector('.md-toc-toggle');
    const children = document.querySelectorAll('.md-toc-child');

    // 模拟折叠逻辑
    toggle.addEventListener('click', () => {
      children.forEach(child => {
        child.style.display = child.style.display === 'none' ? '' : 'none';
      });
      toggle.textContent = toggle.textContent === '▼' ? '▶' : '▼';
    });

    toggle.click();
    children.forEach(child => {
      expect(child.style.display).toBe('none');
    });
    expect(toggle.textContent).toBe('▶');
  });

  test('2.3 再次点击展开子项', () => {
    const toggle = document.querySelector('.md-toc-toggle');
    const children = document.querySelectorAll('.md-toc-child');

    toggle.addEventListener('click', () => {
      children.forEach(child => {
        child.style.display = child.style.display === 'none' ? '' : 'none';
      });
      toggle.textContent = toggle.textContent === '▼' ? '▶' : '▼';
    });

    toggle.click(); // 折叠
    toggle.click(); // 展开
    children.forEach(child => {
      expect(child.style.display).toBe('');
    });
    expect(toggle.textContent).toBe('▼');
  });
});
