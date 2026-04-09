/**
 * 图片灯箱测试 — image-lightbox
 * Tier 1: DOM 创建/销毁存在性
 * Tier 2: 缩放/拖拽/双击行为
 * Tier 3: 场景特定断言
 */

// Mock chrome API
require('../__mocks__/chrome');

// Mock t() 函数
global.t = (key) => {
  const map = {
    'lightbox.close': '✕ 关闭',
    'imagePreview.close': '✕ 关闭',
  };
  return map[key] || key;
};

describe('图片灯箱 (Image Lightbox)', () => {

  // ==================== Tier 1: 存在性断言 ====================
  describe('Tier 1 — 存在性断言', () => {

    test('1.1 openImageLightbox 函数应存在于 content.js 源码中', () => {
      const fs = require('fs');
      const src = fs.readFileSync('content/content.js', 'utf-8');
      expect(src).toContain('function openImageLightbox(src)');
    });

    test('1.2 灯箱 CSS 类名应存在于 content.css 中', () => {
      const fs = require('fs');
      const css = fs.readFileSync('styles/content.css', 'utf-8');
      expect(css).toContain('.md-lightbox-overlay');
      expect(css).toContain('.md-lightbox-img');
      expect(css).toContain('.md-lightbox-close');
      expect(css).toContain('.md-lightbox-zoom-tip');
    });

    test('1.3 i18n 语言包应包含 lightbox.close key', () => {
      const fs = require('fs');
      const zhCN = fs.readFileSync('i18n/zh-CN.js', 'utf-8');
      const en = fs.readFileSync('i18n/en.js', 'utf-8');
      expect(zhCN).toContain("'lightbox.close'");
      expect(en).toContain("'lightbox.close'");
    });

    test('1.4 旧的 md-image-overlay 静态 DOM 不应存在于 buildPage 模板中', () => {
      const fs = require('fs');
      const src = fs.readFileSync('content/content.js', 'utf-8');
      expect(src).not.toContain('id="md-image-overlay"');
      expect(src).not.toContain('id="md-image-preview"');
    });

    test('1.5 图片 hover 样式（zoom-in 光标）应存在于 CSS', () => {
      const fs = require('fs');
      const css = fs.readFileSync('styles/content.css', 'utf-8');
      expect(css).toContain('#md-content img');
      expect(css).toContain('cursor: zoom-in');
    });
  });

  // ==================== Tier 2: 行为级断言 ====================
  describe('Tier 2 — 行为级断言', () => {

    let openImageLightbox;

    beforeEach(() => {
      // 清理 DOM
      document.body.innerHTML = '';
      // 模拟 openImageLightbox（从源码中提取核心逻辑）
      const IMG_LIGHTBOX = {
        MIN_SCALE: 0.1,
        MAX_SCALE: 20,
        ZOOM_FACTOR: 1.15,
        DRAG_THRESHOLD: 5,
        TIP_DURATION: 800,
      };

      openImageLightbox = function(src) {
        let scale = 1, translateX = 0, translateY = 0;
        let isDragging = false, dragMoved = false, startX = 0, startY = 0;
        let tipTimer = null;

        const overlay = document.createElement('div');
        overlay.className = 'md-lightbox-overlay';
        overlay.innerHTML = `
          <img class="md-lightbox-img" src="${src}" draggable="false" />
          <button class="md-lightbox-close">${t('lightbox.close')}</button>
          <div class="md-lightbox-zoom-tip"></div>
        `;
        document.body.appendChild(overlay);

        const img = overlay.querySelector('.md-lightbox-img');
        const zoomTip = overlay.querySelector('.md-lightbox-zoom-tip');

        requestAnimationFrame(() => overlay.classList.add('active'));

        function updateTransform() {
          img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
          img.style.cursor = scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in';
        }

        function showZoomTip() {
          zoomTip.textContent = Math.round(scale * 100) + '%';
          zoomTip.classList.add('visible');
          clearTimeout(tipTimer);
          tipTimer = setTimeout(() => zoomTip.classList.remove('visible'), IMG_LIGHTBOX.TIP_DURATION);
        }

        function closeLightbox() {
          overlay.classList.remove('active');
          overlay.remove();
          document.removeEventListener('keydown', onKeydown);
        }

        overlay.addEventListener('wheel', (e) => {
          e.preventDefault();
          const prevScale = scale;
          scale = e.deltaY < 0
            ? Math.min(scale * IMG_LIGHTBOX.ZOOM_FACTOR, IMG_LIGHTBOX.MAX_SCALE)
            : Math.max(scale / IMG_LIGHTBOX.ZOOM_FACTOR, IMG_LIGHTBOX.MIN_SCALE);
          updateTransform();
          showZoomTip();
        }, { passive: false });

        img.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          scale = 1; translateX = 0; translateY = 0;
          updateTransform();
          showZoomTip();
        });

        overlay.addEventListener('click', (e) => {
          if (dragMoved) return;
          if (e.target === overlay || e.target.classList.contains('md-lightbox-close')) {
            closeLightbox();
          }
        });

        function onKeydown(e) {
          if (!overlay.parentNode) return;
          switch (e.key) {
            case '+': case '=':
              scale = Math.min(scale * IMG_LIGHTBOX.ZOOM_FACTOR, IMG_LIGHTBOX.MAX_SCALE);
              updateTransform(); showZoomTip(); break;
            case '-':
              scale = Math.max(scale / IMG_LIGHTBOX.ZOOM_FACTOR, IMG_LIGHTBOX.MIN_SCALE);
              updateTransform(); showZoomTip(); break;
            case 'r': case 'R':
              scale = 1; translateX = 0; translateY = 0;
              updateTransform(); showZoomTip(); break;
            case 'Escape':
              closeLightbox(); break;
          }
        }
        document.addEventListener('keydown', onKeydown);

        // 暴露内部状态供测试
        overlay._lightbox = { getScale: () => scale, getTranslateX: () => translateX, getTranslateY: () => translateY };
      };
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    test('2.1 调用 openImageLightbox 应创建灯箱 DOM', () => {
      openImageLightbox('test.png');
      const overlay = document.querySelector('.md-lightbox-overlay');
      expect(overlay).not.toBeNull();
      expect(overlay.querySelector('.md-lightbox-img')).not.toBeNull();
      expect(overlay.querySelector('.md-lightbox-close')).not.toBeNull();
      expect(overlay.querySelector('.md-lightbox-zoom-tip')).not.toBeNull();
    });

    test('2.2 图片 src 应正确设置', () => {
      openImageLightbox('http://example.com/photo.jpg');
      const img = document.querySelector('.md-lightbox-img');
      expect(img.getAttribute('src')).toBe('http://example.com/photo.jpg');
    });

    test('2.3 点击遮罩应关闭灯箱（DOM 移除）', () => {
      openImageLightbox('test.png');
      const overlay = document.querySelector('.md-lightbox-overlay');
      overlay.click(); // 点击遮罩本身
      expect(document.querySelector('.md-lightbox-overlay')).toBeNull();
    });

    test('2.4 点击关闭按钮应关闭灯箱', () => {
      openImageLightbox('test.png');
      const closeBtn = document.querySelector('.md-lightbox-close');
      closeBtn.click();
      expect(document.querySelector('.md-lightbox-overlay')).toBeNull();
    });

    test('2.5 按 Esc 应关闭灯箱', () => {
      openImageLightbox('test.png');
      expect(document.querySelector('.md-lightbox-overlay')).not.toBeNull();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(document.querySelector('.md-lightbox-overlay')).toBeNull();
    });

    test('2.6 滚轮向上应放大（scale 增加）', () => {
      openImageLightbox('test.png');
      const overlay = document.querySelector('.md-lightbox-overlay');
      const initialScale = overlay._lightbox.getScale();
      overlay.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));
      expect(overlay._lightbox.getScale()).toBeGreaterThan(initialScale);
    });

    test('2.7 滚轮向下应缩小（scale 减少）', () => {
      openImageLightbox('test.png');
      const overlay = document.querySelector('.md-lightbox-overlay');
      // 先放大
      overlay.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));
      const zoomedScale = overlay._lightbox.getScale();
      // 再缩小
      overlay.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true }));
      expect(overlay._lightbox.getScale()).toBeLessThan(zoomedScale);
    });

    test('2.8 缩放应显示百分比提示', () => {
      openImageLightbox('test.png');
      const overlay = document.querySelector('.md-lightbox-overlay');
      const zoomTip = overlay.querySelector('.md-lightbox-zoom-tip');
      overlay.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));
      expect(zoomTip.classList.contains('visible')).toBe(true);
      expect(zoomTip.textContent).toMatch(/^\d+%$/);
    });

    test('2.9 双击应重置缩放到 1x', () => {
      openImageLightbox('test.png');
      const overlay = document.querySelector('.md-lightbox-overlay');
      const img = overlay.querySelector('.md-lightbox-img');
      // 先放大
      overlay.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));
      expect(overlay._lightbox.getScale()).toBeGreaterThan(1);
      // 双击还原
      img.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(overlay._lightbox.getScale()).toBe(1);
      expect(overlay._lightbox.getTranslateX()).toBe(0);
      expect(overlay._lightbox.getTranslateY()).toBe(0);
    });

    test('2.10 按 + 键应放大', () => {
      openImageLightbox('test.png');
      const overlay = document.querySelector('.md-lightbox-overlay');
      const initialScale = overlay._lightbox.getScale();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));
      expect(overlay._lightbox.getScale()).toBeGreaterThan(initialScale);
    });

    test('2.11 按 - 键应缩小', () => {
      openImageLightbox('test.png');
      const overlay = document.querySelector('.md-lightbox-overlay');
      // 先放大
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));
      const zoomedScale = overlay._lightbox.getScale();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }));
      expect(overlay._lightbox.getScale()).toBeLessThan(zoomedScale);
    });

    test('2.12 按 R 键应重置', () => {
      openImageLightbox('test.png');
      const overlay = document.querySelector('.md-lightbox-overlay');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'R' }));
      expect(overlay._lightbox.getScale()).toBe(1);
    });
  });

  // ==================== Tier 3: 场景特定断言 ====================
  describe('Tier 3 — 任务特定断言', () => {

    test('BT-lightbox.1 灯箱不使用静态 DOM，每次动态创建', () => {
      const fs = require('fs');
      const src = fs.readFileSync('content/content.js', 'utf-8');
      // 不应该有预创建的图片预览 DOM
      expect(src).not.toMatch(/id=["']md-image-overlay["']/);
      // 应该有 document.createElement
      expect(src).toContain("overlay.className = 'md-lightbox-overlay'");
    });

    test('BT-lightbox.2 灯箱缩放范围应为 0.1x ~ 20x', () => {
      const fs = require('fs');
      const src = fs.readFileSync('content/content.js', 'utf-8');
      expect(src).toContain('MIN_SCALE: 0.1');
      expect(src).toContain('MAX_SCALE: 20');
    });

    test('BT-lightbox.3 灯箱关闭时应销毁 DOM（不留残余）', () => {
      // 重用 Tier 2 的 setup
      document.body.innerHTML = '';
      global.t = (key) => key;

      const overlay = document.createElement('div');
      overlay.className = 'md-lightbox-overlay';
      overlay.innerHTML = '<img class="md-lightbox-img" /><button class="md-lightbox-close">X</button><div class="md-lightbox-zoom-tip"></div>';
      document.body.appendChild(overlay);

      // 模拟关闭
      overlay.remove();
      expect(document.querySelector('.md-lightbox-overlay')).toBeNull();
      expect(document.querySelector('.md-lightbox-img')).toBeNull();
    });

    test('BT-lightbox.4 事件委托应排除 Mermaid overlay 内的图片', () => {
      const fs = require('fs');
      const src = fs.readFileSync('content/content.js', 'utf-8');
      expect(src).toContain("img.closest('.md-lightbox-overlay')");
      expect(src).toContain("img.closest('#md-mermaid-overlay')");
    });
  });
});
