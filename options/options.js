/**
 * Markdown Viewer Enhanced - Options 选项页脚本
 * 负责：高级设置界面的交互逻辑，与 background.js 通信存取设置
 */

(function () {
  'use strict';

  // ========== DOM 元素引用 ==========
  const themeBtns = document.querySelectorAll('.theme-btn');
  const codeThemeSelect = document.getElementById('codeThemeSelect');
  const codeThemePreview = document.getElementById('codeThemePreview');
  const fontBtns = document.querySelectorAll('.btn-option[data-font]');
  const fontSizeSlider = document.getElementById('fontSizeSlider');
  const fontSizeValue = document.getElementById('fontSizeValue');
  const lineHeightSlider = document.getElementById('lineHeightSlider');
  const lineHeightValue = document.getElementById('lineHeightValue');
  const maxWidthSlider = document.getElementById('maxWidthSlider');
  const maxWidthValue = document.getElementById('maxWidthValue');
  const toggleToc = document.getElementById('toggleToc');
  const tocPositionRow = document.getElementById('tocPositionRow');
  const tocPosBtns = document.querySelectorAll('.toc-pos-btn');
  const toggleMermaid = document.getElementById('toggleMermaid');
  const toggleMathJax = document.getElementById('toggleMathJax');
  const toggleLineNumbers = document.getElementById('toggleLineNumbers');
  const toggleAutoDetect = document.getElementById('toggleAutoDetect');
  const typographyPreview = document.getElementById('typographyPreview');
  const btnReset = document.getElementById('btnReset');
  const saveToast = document.getElementById('saveToast');

  // 当前设置
  let currentSettings = {};
  let autoSaveTimer = null;
  let saveToastTimer = null;

  // ========== 初始化 ==========
  async function init() {
    await loadSettings();
    // 初始化 i18n
    if (typeof window.__I18N__ !== 'undefined' && currentSettings.language) {
      window.__I18N__.setLanguage(currentSettings.language);
      window.__I18N__.applyLanguage();
    }
    // 同步语言下拉框状态
    const langSelect = document.getElementById('langSelect');
    if (langSelect) {
      langSelect.value = currentSettings.language || 'zh-CN';
    }
    bindEvents();
  }

  // ========== 加载设置 ==========
  function loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[Options] 获取设置失败:', chrome.runtime.lastError);
          resolve();
          return;
        }
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
      updateCodeThemePreview(settings.codeTheme || 'default-dark-modern');
    }

    // 字体
    fontBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.font === (settings.fontFamily || 'system'));
    });

    // 字体大小
    fontSizeSlider.value = settings.fontSize || 16;
    fontSizeValue.textContent = (settings.fontSize || 16) + 'px';

    // 行高
    lineHeightSlider.value = settings.lineHeight || 1.6;
    lineHeightValue.textContent = settings.lineHeight || 1.6;

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

    // MathJax
    toggleMathJax.checked = settings.enableMathJax === true;

    // 自动检测
    toggleAutoDetect.checked = settings.autoDetect !== false;

    // 更新预览
    updatePreview();
  }

  // ========== 更新目录位置行的可见性 ==========
  function updateTocPositionVisibility() {
    if (tocPositionRow) {
      tocPositionRow.style.display = toggleToc.checked ? 'flex' : 'none';
    }
  }

  // ========== 更新排版预览 ==========
  function updatePreview() {
    if (!typographyPreview) return;

    const fontSize = currentSettings.fontSize || 16;
    const lineHeight = currentSettings.lineHeight || 1.6;
    const fontFamily = currentSettings.fontFamily || 'system';
    const theme = currentSettings.theme || 'light';

    // 设置字体
    let fontFamilyCSS;
    switch (fontFamily) {
      case 'serif':
        fontFamilyCSS = 'Georgia, "Times New Roman", "SimSun", serif';
        break;
      case 'mono':
        fontFamilyCSS = '"Consolas", "Monaco", "Courier New", monospace';
        break;
      default:
        fontFamilyCSS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Microsoft YaHei", sans-serif';
    }

    typographyPreview.style.fontSize = fontSize + 'px';
    typographyPreview.style.lineHeight = lineHeight;
    typographyPreview.style.fontFamily = fontFamilyCSS;

    // 主题预览
    if (theme === 'dark') {
      typographyPreview.classList.add('preview-dark');
    } else {
      typographyPreview.classList.remove('preview-dark');
    }
  }

  // ========== 保存设置 ==========
  function saveSettings(showToast = true) {
    chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      settings: currentSettings
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[Options] 保存设置失败:', chrome.runtime.lastError);
        return;
      }
      if (response && response.success) {
        if (showToast) showSaveToast();
      }
    });
  }

  // ========== 通知所有标签页更新设置 ==========
  async function notifyAllTabs() {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SETTINGS_UPDATED',
            settings: currentSettings
          }).catch(() => {
            // 非 Markdown 页面会报错，忽略
          });
        }
      }
    } catch (err) {
      // 忽略
    }
  }

  // ========== 显示保存提示 ==========
  function showSaveToast(message) {
    if (!saveToast) return;
    const defaultMsg = typeof t === 'function' ? t('options.saved') : '✅ 设置已保存';
    saveToast.textContent = message || defaultMsg;
    saveToast.classList.add('visible');
    if (saveToastTimer) {
      clearTimeout(saveToastTimer);
    }
    saveToastTimer = setTimeout(() => {
      saveToast.classList.remove('visible');
      saveToast.textContent = typeof t === 'function' ? t('options.saved') : '✅ 设置已保存';
      saveToastTimer = null;
    }, 2000);
  }

  // ========== 自动保存（连续操作防抖） ==========
  function scheduleAutoSave(delay = 300) {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    autoSaveTimer = setTimeout(() => {
      autoSaveTimer = null;
      saveSettings(true);
    }, delay);
  }

  // ========== 绑定事件 ==========
  function bindEvents() {
    // 主题切换
    themeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        themeBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentSettings.theme = btn.dataset.theme;
        updatePreview();
        scheduleAutoSave(0);
      });
    });

    // 代码高亮主题
    if (codeThemeSelect) {
      codeThemeSelect.addEventListener('change', () => {
        currentSettings.codeTheme = codeThemeSelect.value;
        updateCodeThemePreview(codeThemeSelect.value);
        scheduleAutoSave(0);
      });
    }

    // 字体选择
    fontBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        fontBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentSettings.fontFamily = btn.dataset.font;
        updatePreview();
        scheduleAutoSave(0);
      });
    });

    // 字体大小
    fontSizeSlider.addEventListener('input', () => {
      const size = parseInt(fontSizeSlider.value);
      fontSizeValue.textContent = size + 'px';
      currentSettings.fontSize = size;
      updatePreview();
      scheduleAutoSave();
    });

    // 行高
    lineHeightSlider.addEventListener('input', () => {
      const lh = parseFloat(lineHeightSlider.value);
      lineHeightValue.textContent = lh.toFixed(1);
      currentSettings.lineHeight = lh;
      updatePreview();
      scheduleAutoSave();
    });

    // 内容宽度
    maxWidthSlider.addEventListener('input', () => {
      const width = parseInt(maxWidthSlider.value);
      maxWidthValue.textContent = width + 'px';
      currentSettings.maxWidth = width;
      scheduleAutoSave();
    });

    // 目录开关
    toggleToc.addEventListener('change', () => {
      currentSettings.showToc = toggleToc.checked;
      updateTocPositionVisibility();
      scheduleAutoSave(0);
    });

    // 目录位置
    tocPosBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tocPosBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentSettings.tocPosition = btn.dataset.pos;
        scheduleAutoSave(0);
      });
    });

    // Mermaid 开关
    toggleMermaid.addEventListener('change', () => {
      currentSettings.enableMermaid = toggleMermaid.checked;
      scheduleAutoSave(0);
    });

    // MathJax 开关
    toggleMathJax.addEventListener('change', () => {
      currentSettings.enableMathJax = toggleMathJax.checked;
      scheduleAutoSave(0);
    });

    // 自动检测开关
    toggleAutoDetect.addEventListener('change', () => {
      currentSettings.autoDetect = toggleAutoDetect.checked;
      scheduleAutoSave(0);
    });

    // 行号开关
    toggleLineNumbers.addEventListener('change', () => {
      currentSettings.showLineNumbers = toggleLineNumbers.checked;
      scheduleAutoSave(0);
    });

    // 语言切换（下拉框）
    const langSelectEl = document.getElementById('langSelect');
    if (langSelectEl) {
      langSelectEl.addEventListener('change', () => {
        const newLang = langSelectEl.value;
        if (newLang && newLang !== currentSettings.language) {
          currentSettings.language = newLang;
          scheduleAutoSave(0);
          // 应用新语言
          if (typeof window.__I18N__ !== 'undefined') {
            window.__I18N__.setLanguage(newLang);
            window.__I18N__.applyLanguage();
          }
        }
      });
    }

    // 恢复默认设置
    btnReset.addEventListener('click', () => {
      if (!confirm(typeof t === 'function' ? t('options.resetConfirm') : '确定要恢复所有设置为默认值吗？此操作不可撤销。')) {
        return;
      }
      chrome.runtime.sendMessage({ type: 'RESET_SETTINGS' }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[Options] 重置设置失败:', chrome.runtime.lastError);
          return;
        }
        if (response && response.settings) {
          currentSettings = response.settings;
          applySettingsToUI(currentSettings);
          notifyAllTabs();
          showSaveToast(typeof t === 'function' ? t('options.resetDone') : '✅ 已恢复默认设置');
        }
      });
    });
  }

  // ========== 更新代码主题预览 ==========
  function updateCodeThemePreview(themeName) {
    if (!codeThemePreview) return;
    // auto 模式下使用 github 主题作为预览
    const previewTheme = themeName === 'auto' ? 'github' : themeName;
    codeThemePreview.setAttribute('data-code-theme', previewTheme);
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
      updatePreview,
      scheduleAutoSave,
    };
  }
})();
