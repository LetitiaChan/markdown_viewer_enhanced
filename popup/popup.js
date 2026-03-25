/**
 * Markdown Viewer Enhanced - Popup 弹出窗口脚本
 * 负责：快捷设置界面的交互逻辑
 */

(function () {
  'use strict';

  // ========== DOM 元素引用 ==========
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const fontSizeSlider = document.getElementById('fontSizeSlider');
  const fontSizeValue = document.getElementById('fontSizeValue');
  const maxWidthSlider = document.getElementById('maxWidthSlider');
  const maxWidthValue = document.getElementById('maxWidthValue');
  const toggleToc = document.getElementById('toggleToc');
  const tocPositionRow = document.getElementById('tocPositionRow');
  const toggleMermaid = document.getElementById('toggleMermaid');
  const toggleMathJax = document.getElementById('toggleMathJax');
  const btnReset = document.getElementById('btnReset');
  const btnOptions = document.getElementById('btnOptions');
  const btnRefresh = document.getElementById('btnRefresh');

  const themeBtns = document.querySelectorAll('.theme-btn');
  const tocPosBtns = document.querySelectorAll('.toc-pos-btn');

  // 当前设置
  let currentSettings = {};

  // ========== 初始化 ==========
  async function init() {
    // 加载设置
    await loadSettings();
    // 检测当前页面状态
    await detectPageStatus();
    // 绑定事件
    bindEvents();
  }

  // ========== 加载设置 ==========
  function loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
        if (response && response.settings) {
          currentSettings = response.settings;
          applySettingsToUI(currentSettings);
        }
        resolve();
      });
    });
  }

  // ========== 将设置应用到 UI ==========
  function applySettingsToUI(settings) {
    // 主题
    themeBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.theme === settings.theme);
    });

    // 字体大小
    fontSizeSlider.value = settings.fontSize || 16;
    fontSizeValue.textContent = (settings.fontSize || 16) + 'px';

    // 内容宽度
    maxWidthSlider.value = settings.maxWidth || 1000;
    maxWidthValue.textContent = (settings.maxWidth || 1000) + 'px';

    // 目录
    toggleToc.checked = settings.showToc !== false;
    updateTocPositionVisibility();

    // 目录位置
    tocPosBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.pos === (settings.tocPosition || 'right'));
    });

    // Mermaid
    toggleMermaid.checked = settings.enableMermaid !== false;

    // 数学公式渲染
    toggleMathJax.checked = settings.enableMathJax === true;
  }

  // ========== 检测页面状态 ==========
  async function detectPageStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) {
        setStatus(false, '无法检测当前页面');
        return;
      }

      // 检测是否为 Markdown 文件
      chrome.runtime.sendMessage({ type: 'IS_MARKDOWN', url: tab.url }, (response) => {
        if (response && response.isMarkdown) {
          setStatus(true, '当前页面为 Markdown 文件 ✓');
        } else {
          setStatus(false, '当前页面非 Markdown 文件');
        }
      });
    } catch (err) {
      setStatus(false, '检测失败');
    }
  }

  function setStatus(active, text) {
    statusDot.classList.toggle('active', active);
    statusText.textContent = text;
  }

  // ========== 更新目录位置行的可见性 ==========
  function updateTocPositionVisibility() {
    if (tocPositionRow) {
      tocPositionRow.style.display = toggleToc.checked ? 'flex' : 'none';
    }
  }

  // ========== 保存设置 ==========
  function saveSettings() {
    chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      settings: currentSettings
    }, (response) => {
      if (response && response.success) {
        // 同时尝试直接通知当前标签页
        notifyCurrentTab();
      }
    });
  }

  // ========== 通知当前标签页更新 ==========
  async function notifyCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'SETTINGS_UPDATED',
          settings: currentSettings
        }).catch(() => {
          // 当前页面可能不是 Markdown 页面，忽略错误
        });
      }
    } catch (err) {
      // 忽略
    }
  }

  // ========== 绑定事件 ==========
  function bindEvents() {
    // 主题切换
    themeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        themeBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentSettings.theme = btn.dataset.theme;
        saveSettings();
      });
    });

    // 字体大小
    fontSizeSlider.addEventListener('input', () => {
      const size = parseInt(fontSizeSlider.value);
      fontSizeValue.textContent = size + 'px';
      currentSettings.fontSize = size;
    });
    fontSizeSlider.addEventListener('change', () => {
      saveSettings();
    });

    // 内容宽度
    maxWidthSlider.addEventListener('input', () => {
      const width = parseInt(maxWidthSlider.value);
      maxWidthValue.textContent = width + 'px';
      currentSettings.maxWidth = width;
    });
    maxWidthSlider.addEventListener('change', () => {
      saveSettings();
    });

    // 目录开关
    toggleToc.addEventListener('change', () => {
      currentSettings.showToc = toggleToc.checked;
      updateTocPositionVisibility();
      saveSettings();
    });

    // 目录位置
    tocPosBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tocPosBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentSettings.tocPosition = btn.dataset.pos;
        saveSettings();
      });
    });

    // Mermaid 开关
    toggleMermaid.addEventListener('change', () => {
      currentSettings.enableMermaid = toggleMermaid.checked;
      saveSettings();
    });

    // 数学公式渲染开关
    toggleMathJax.addEventListener('change', () => {
      currentSettings.enableMathJax = toggleMathJax.checked;
      saveSettings();
    });

    // 重置按钮
    btnReset.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'RESET_SETTINGS' }, (response) => {
        if (response && response.settings) {
          currentSettings = response.settings;
          applySettingsToUI(currentSettings);
          notifyCurrentTab();
        }
      });
    });

    // 更多设置（打开选项页）
    btnOptions.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });

    // 刷新页面
    btnRefresh.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          chrome.tabs.reload(tab.id);
          window.close();
        }
      } catch (err) {
        // 忽略
      }
    });
  }

  // ========== 启动 ==========
  document.addEventListener('DOMContentLoaded', init);
})();
