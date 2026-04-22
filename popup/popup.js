/**
 * Markdown Viewer Enhanced - Popup 弹出窗口脚本
 * 负责：所有设置界面的交互逻辑
 */

(function () {
  'use strict';

  // ========== DOM 元素引用 ==========
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const fontSizeSlider = document.getElementById('fontSizeSlider');
  const fontSizeValue = document.getElementById('fontSizeValue');
  const lineHeightSlider = document.getElementById('lineHeightSlider');
  const lineHeightValue = document.getElementById('lineHeightValue');
  const maxWidthSlider = document.getElementById('maxWidthSlider');
  const maxWidthValue = document.getElementById('maxWidthValue');
  const codeThemeSelect = document.getElementById('codeThemeSelect');
  const toggleToc = document.getElementById('toggleToc');
  const tocPositionRow = document.getElementById('tocPositionRow');
  const toggleMermaid = document.getElementById('toggleMermaid');
  const toggleMathJax = document.getElementById('toggleMathJax');
  const toggleLineNumbers = document.getElementById('toggleLineNumbers');
  const toggleAutoDetect = document.getElementById('toggleAutoDetect');
  const btnReset = document.getElementById('btnReset');
  const btnRefresh = document.getElementById('btnRefresh');
  const renderBar = document.getElementById('renderBar');
  const btnRender = document.getElementById('btnRender');

  const themeBtns = document.querySelectorAll('.theme-btn');
  const fontFamilySelect = document.getElementById('fontFamilySelect');
  const fontFamilyCustom = document.getElementById('fontFamilyCustom');
  const tocPosBtns = document.querySelectorAll('.toc-pos-btn');

  const langBtns = document.querySelectorAll('.lang-btn');

  // 当前设置
  let currentSettings = {};

  // ========== 初始化 ==========
  async function init() {
    // 加载设置
    await loadSettings();
    // 初始化 i18n
    if (typeof window.__I18N__ !== 'undefined' && currentSettings.language) {
      window.__I18N__.setLanguage(currentSettings.language);
      window.__I18N__.applyLanguage();
    }
    // 同步语言按钮状态
    langBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === (currentSettings.language || 'zh-CN'));
    });
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

    // 代码高亮主题
    if (codeThemeSelect) {
      codeThemeSelect.value = settings.codeTheme || 'default-dark-modern';
    }

    // 正文字体
    if (fontFamilySelect) {
      fontFamilySelect.value = settings.fontFamily || 'system';
    }
    if (fontFamilyCustom) {
      if (settings.fontFamily === 'custom') {
        fontFamilyCustom.style.display = '';
        fontFamilyCustom.value = settings.customFontFamily || '';
      } else {
        fontFamilyCustom.style.display = 'none';
      }
    }

    // 字体大小
fontSizeSlider.value = settings.fontSize || 18;
    fontSizeValue.textContent = (settings.fontSize || 18) + 'px';

    // 行高
    if (lineHeightSlider) {
lineHeightSlider.value = settings.lineHeight || 1.8;
    lineHeightValue.textContent = (settings.lineHeight || 1.8).toFixed(1);
    }

    // 内容宽度
    maxWidthSlider.value = settings.maxWidth || 1200;
    maxWidthValue.textContent = (settings.maxWidth || 1200) + 'px';

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

    // 代码行号
    if (toggleLineNumbers) {
      toggleLineNumbers.checked = settings.showLineNumbers === true;
    }

    // 自动检测
    if (toggleAutoDetect) {
      toggleAutoDetect.checked = settings.autoDetect !== false;
    }
  }

  // ========== 检测页面状态 ==========
  async function detectPageStatus() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) {
        setStatus(false, typeof t === 'function' ? t('popup.cannotDetect') : '无法检测当前页面');
        return;
      }

      // 检测是否为 Markdown 文件
      chrome.runtime.sendMessage({ type: 'IS_MARKDOWN', url: tab.url }, (response) => {
        if (response && response.isMarkdown) {
          setStatus(true, typeof t === 'function' ? t('popup.isMarkdown') : '当前页面为 Markdown 文件 ✓');

          // 设置 badge
          chrome.runtime.sendMessage({ type: 'SET_BADGE', tabId: tab.id, isMarkdown: true });

          // 对 http/https 页面，检查是否已注入脚本，未注入则显示渲染按钮
          if (tab.url.startsWith('http://') || tab.url.startsWith('https://')) {
            chrome.runtime.sendMessage({ type: 'CHECK_INJECTED', tabId: tab.id }, (checkResp) => {
              if (checkResp && !checkResp.injected) {
                chrome.tabs.sendMessage(tab.id, { type: 'PING' }).then(() => {
                  renderBar.style.display = 'none';
                }).catch(() => {
                  renderBar.style.display = 'block';
                });
              }
            });
          }
        } else {
          setStatus(false, typeof t === 'function' ? t('popup.notMarkdown') : '当前页面非 Markdown 文件');
        }
      });
    } catch (err) {
      setStatus(false, typeof t === 'function' ? t('popup.detectFailed') : '检测失败');
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

    // 代码高亮主题
    if (codeThemeSelect) {
      codeThemeSelect.addEventListener('change', () => {
        currentSettings.codeTheme = codeThemeSelect.value;
        saveSettings();
      });
    }

    // 正文字体选择（下拉选择器）
    if (fontFamilySelect) {
      fontFamilySelect.addEventListener('change', () => {
        currentSettings.fontFamily = fontFamilySelect.value;
        if (fontFamilyCustom) {
          fontFamilyCustom.style.display = fontFamilySelect.value === 'custom' ? '' : 'none';
        }
        saveSettings();
      });
    }
    if (fontFamilyCustom) {
      fontFamilyCustom.addEventListener('input', () => {
        currentSettings.customFontFamily = fontFamilyCustom.value;
      });
      fontFamilyCustom.addEventListener('change', () => {
        saveSettings();
      });
    }

    // 字体大小
    fontSizeSlider.addEventListener('input', () => {
      const size = parseInt(fontSizeSlider.value);
      fontSizeValue.textContent = size + 'px';
      currentSettings.fontSize = size;
    });
    fontSizeSlider.addEventListener('change', () => {
      saveSettings();
    });

    // 行高
    if (lineHeightSlider) {
      lineHeightSlider.addEventListener('input', () => {
        const lh = parseFloat(lineHeightSlider.value);
        lineHeightValue.textContent = lh.toFixed(1);
        currentSettings.lineHeight = lh;
      });
      lineHeightSlider.addEventListener('change', () => {
        saveSettings();
      });
    }

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

    // 代码行号开关
    if (toggleLineNumbers) {
      toggleLineNumbers.addEventListener('change', () => {
        currentSettings.showLineNumbers = toggleLineNumbers.checked;
        saveSettings();
      });
    }

    // 自动检测开关
    if (toggleAutoDetect) {
      toggleAutoDetect.addEventListener('change', () => {
        currentSettings.autoDetect = toggleAutoDetect.checked;
        saveSettings();
      });
    }

    // 语言切换
    langBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const newLang = btn.dataset.lang;
        if (newLang && newLang !== currentSettings.language) {
          langBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentSettings.language = newLang;
          saveSettings();
          // 应用新语言到 popup UI
          if (typeof window.__I18N__ !== 'undefined') {
            window.__I18N__.setLanguage(newLang);
            window.__I18N__.applyLanguage();
          }
        }
      });
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

    // 渲染按钮（对 http/https Markdown 页面动态注入脚本）
    if (btnRender) {
      btnRender.addEventListener('click', async () => {
        try {
          btnRender.disabled = true;
          btnRender.textContent = typeof t === 'function' ? t('popup.rendering') : '⏳ 渲染中...';
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab && tab.id) {
            chrome.runtime.sendMessage({ type: 'INJECT_CONTENT_SCRIPTS', tabId: tab.id }, (response) => {
              if (response && response.success) {
                btnRender.textContent = typeof t === 'function' ? t('popup.renderDone') : '✅ 渲染完成';
                renderBar.style.display = 'none';
                setStatus(true, typeof t === 'function' ? t('popup.isMarkdown') : '当前页面为 Markdown 文件 ✓');
                setTimeout(() => window.close(), 500);
              } else {
                btnRender.textContent = typeof t === 'function' ? t('popup.renderFailed') : '❌ 渲染失败，请重试';
                btnRender.disabled = false;
              }
            });
          }
        } catch (err) {
          btnRender.textContent = typeof t === 'function' ? t('popup.renderError') : '❌ 渲染失败';
          btnRender.disabled = false;
        }
      });
    }
  }

  // ========== 启动 ==========
  document.addEventListener('DOMContentLoaded', init);

  // ==================== 测试导出 ====================
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      init,
      loadSettings,
      applySettingsToUI,
      saveSettings,
      notifyCurrentTab,
      detectPageStatus,
    };
  }
})();
