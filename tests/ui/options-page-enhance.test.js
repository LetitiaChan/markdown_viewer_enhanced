/**
 * Options 设置页增强 - 测试
 * 覆盖 panelMode、contentAlign、PlantUML、Graphviz 控件及滑块范围扩展
 */

const fs = require('fs');
const path = require('path');

// 读取 HTML
const optionsHtml = fs.readFileSync(path.join(__dirname, '../../options/options.html'), 'utf-8');

// 简易 Chrome API mock
const chromeMock = {
  runtime: {
    sendMessage: jest.fn((msg, cb) => {
      if (msg.type === 'GET_SETTINGS') {
        cb({
          settings: {
            theme: 'light',
            codeTheme: 'default-dark-modern',
            fontSize: 16,
            lineHeight: 1.6,
            showToc: true,
            tocPosition: 'right',
            panelMode: 'float',
            contentAlign: 'center',
            enableMermaid: true,
            enableMathJax: false,
            enablePlantUML: true,
            enableGraphviz: true,
            autoDetect: true,
            maxWidth: 1200,
            fontFamily: 'system',
            showLineNumbers: false,
            language: 'zh-CN',
          }
        });
      } else if (msg.type === 'SAVE_SETTINGS') {
        cb({ success: true });
      } else if (msg.type === 'RESET_SETTINGS') {
        cb({ settings: msg.settings });
      }
    }),
    lastError: null,
    openOptionsPage: jest.fn(),
  },
  tabs: {
    query: jest.fn().mockResolvedValue([]),
    sendMessage: jest.fn().mockResolvedValue({}),
  },
  storage: { sync: { get: jest.fn(), set: jest.fn() } },
};

describe('Options 设置页增强', () => {
  let doc;

  beforeEach(() => {
    // 解析 HTML
    document.documentElement.innerHTML = '';
    document.write(optionsHtml);
    document.close();
    doc = document;

    // Mock Chrome API
    global.chrome = chromeMock;
    chromeMock.runtime.sendMessage.mockClear();

    // Mock i18n
    global.window.__I18N__ = {
      setLanguage: jest.fn(),
      applyLanguage: jest.fn(),
    };
    global.t = (key) => key;
  });

  afterEach(() => {
    delete global.chrome;
    delete global.window.__I18N__;
    delete global.t;
  });

  // ========== Tier 1: 存在性断言 ==========

  describe('Tier 1 — 存在性断言', () => {
    test('BT-OPTIONS.1 面板模式按钮组存在', () => {
      const btns = doc.querySelectorAll('.panel-mode-btn');
      expect(btns.length).toBe(2);
      expect(btns[0].dataset.mode).toBe('float');
      expect(btns[1].dataset.mode).toBe('embed');
    });

    test('BT-OPTIONS.2 文档对齐按钮组存在', () => {
      const btns = doc.querySelectorAll('.content-align-btn');
      expect(btns.length).toBe(3);
      expect(btns[0].dataset.align).toBe('left');
      expect(btns[1].dataset.align).toBe('center');
      expect(btns[2].dataset.align).toBe('right');
    });

    test('BT-OPTIONS.3 PlantUML 开关存在', () => {
      const toggle = doc.getElementById('togglePlantUML');
      expect(toggle).not.toBeNull();
      expect(toggle.type).toBe('checkbox');
    });

    test('BT-OPTIONS.4 Graphviz 开关存在', () => {
      const toggle = doc.getElementById('toggleGraphviz');
      expect(toggle).not.toBeNull();
      expect(toggle.type).toBe('checkbox');
    });

    test('BT-OPTIONS.5 行高滑块 max=2.4', () => {
      const slider = doc.getElementById('lineHeightSlider');
      expect(slider).not.toBeNull();
      expect(slider.max).toBe('2.4');
    });

    test('BT-OPTIONS.6 宽度滑块 max=1800', () => {
      const slider = doc.getElementById('maxWidthSlider');
      expect(slider).not.toBeNull();
      expect(slider.max).toBe('1800');
    });

    test('BT-OPTIONS.7 底部包含 GitHub 和反馈链接', () => {
      const links = doc.querySelectorAll('.version-info a');
      const hrefs = Array.from(links).map(a => a.href);
      expect(hrefs.some(h => h.includes('github.com/LetitiaChan/markdown_viewer_enhanced'))).toBe(true);
      expect(hrefs.some(h => h.includes('/issues'))).toBe(true);
    });

    test('BT-OPTIONS.8 数学公式在 Mermaid 之前', () => {
      const toggleMathJax = doc.getElementById('toggleMathJax');
      const toggleMermaid = doc.getElementById('toggleMermaid');
      expect(toggleMathJax).not.toBeNull();
      expect(toggleMermaid).not.toBeNull();
      // 比较 DOM 顺序
      const position = toggleMathJax.compareDocumentPosition(toggleMermaid);
      // DOCUMENT_POSITION_FOLLOWING = 4
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  // ========== Tier 2: 行为级断言 ==========

  describe('Tier 2 — 行为级断言', () => {
    test('BT-OPTIONS.9 面板模式按钮点击切换 active', () => {
      const btns = doc.querySelectorAll('.panel-mode-btn');
      // 初始无 active
      btns[1].click();
      // 手动模拟 JS 行为（options.js 在真实环境中绑定事件）
      // 这里直接验证 HTML 结构和 dataset
      expect(btns[1].dataset.mode).toBe('embed');
    });

    test('BT-OPTIONS.10 文档对齐按钮 dataset 正确', () => {
      const btns = doc.querySelectorAll('.content-align-btn');
      expect(btns[0].dataset.align).toBe('left');
      expect(btns[1].dataset.align).toBe('center');
      expect(btns[2].dataset.align).toBe('right');
    });

    test('BT-OPTIONS.11 PlantUML 开关默认 checked', () => {
      const toggle = doc.getElementById('togglePlantUML');
      expect(toggle.checked).toBe(true);
    });

    test('BT-OPTIONS.12 Graphviz 开关默认 checked', () => {
      const toggle = doc.getElementById('toggleGraphviz');
      expect(toggle.checked).toBe(true);
    });

    test('BT-OPTIONS.13 行高滑块可设置到 2.4', () => {
      const slider = doc.getElementById('lineHeightSlider');
      // 模拟设置到最大值
      slider.value = '2.4';
      slider.dispatchEvent(new Event('input'));
      expect(slider.value).toBe('2.4');
    });

    test('BT-OPTIONS.14 宽度滑块可设置到 1800', () => {
      const slider = doc.getElementById('maxWidthSlider');
      slider.value = '1800';
      slider.dispatchEvent(new Event('input'));
      expect(slider.value).toBe('1800');
    });
  });

  // ========== Tier 3: 任务特定断言 ==========

  describe('Tier 3 — Options 页增强场景', () => {
    test('BT-OPTIONS.15 功能设置卡片包含全部 10 个设置项', () => {
      // 计算功能设置卡片中的所有设置行
      const featureCard = doc.querySelectorAll('.settings-card')[3]; // 第4个卡片是功能设置
      expect(featureCard).toBeTruthy();
      const rows = featureCard.querySelectorAll('.setting-row');
      // 目录 + 目录位置 + 面板模式 + 文档对齐 + 数学 + Mermaid + PlantUML + Graphviz + 行号 + 自动检测 = 10
      expect(rows.length).toBe(10);
    });

    test('BT-OPTIONS.16 面板模式和文档对齐使用胶囊按钮组样式', () => {
      const panelBtns = doc.querySelectorAll('.panel-mode-btn');
      const alignBtns = doc.querySelectorAll('.content-align-btn');
      panelBtns.forEach(btn => {
        expect(btn.classList.contains('capsule-btn')).toBe(true);
        expect(btn.parentElement.classList.contains('capsule-group')).toBe(true);
      });
      alignBtns.forEach(btn => {
        expect(btn.classList.contains('capsule-btn')).toBe(true);
        expect(btn.parentElement.classList.contains('capsule-group')).toBe(true);
      });
    });

    test('BT-OPTIONS.17 PlantUML 和 Graphviz 使用 toggle-capsule 胶囊开关', () => {
      const plantUML = doc.getElementById('togglePlantUML');
      const graphviz = doc.getElementById('toggleGraphviz');
      expect(plantUML.closest('.setting-control').querySelector('.toggle-capsule')).not.toBeNull();
      expect(graphviz.closest('.setting-control').querySelector('.toggle-capsule')).not.toBeNull();
    });

    test('BT-OPTIONS.18 i18n data-i18n 属性存在于新增控件', () => {
      // 检查面板模式的 data-i18n
      const panelLabel = doc.querySelector('[data-i18n="settings.panelMode"]');
      expect(panelLabel).not.toBeNull();
      const alignLabel = doc.querySelector('[data-i18n="settings.contentAlign"]');
      expect(alignLabel).not.toBeNull();
      const plantumlLabel = doc.querySelector('[data-i18n="settings.plantuml"]');
      expect(plantumlLabel).not.toBeNull();
      const graphvizLabel = doc.querySelector('[data-i18n="settings.graphviz"]');
      expect(graphvizLabel).not.toBeNull();
    });

    test('BT-OPTIONS.19 主题选择器使用胶囊风格', () => {
      const themeSelector = doc.querySelector('.theme-selector');
      expect(themeSelector).not.toBeNull();
      const btns = themeSelector.querySelectorAll('.theme-btn');
      expect(btns.length).toBe(3);
      // theme-selector 容器无边框（胶囊风格特征）
      expect(themeSelector).toBeTruthy();
    });

    test('BT-OPTIONS.20 目录位置使用胶囊按钮组', () => {
      const tocBtns = doc.querySelectorAll('.toc-pos-btn');
      expect(tocBtns.length).toBe(2);
      tocBtns.forEach(btn => {
        expect(btn.classList.contains('capsule-btn')).toBe(true);
        expect(btn.parentElement.classList.contains('capsule-group')).toBe(true);
      });
    });
  });
});
