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
  const fontFamilySelect = document.getElementById('fontFamilySelect');
  const fontFamilyCustom = document.getElementById('fontFamilyCustom');
  const fontSizeSlider = document.getElementById('fontSizeSlider');
  const fontSizeValue = document.getElementById('fontSizeValue');
  const lineHeightSlider = document.getElementById('lineHeightSlider');
  const lineHeightValue = document.getElementById('lineHeightValue');
  const maxWidthSlider = document.getElementById('maxWidthSlider');
  const maxWidthValue = document.getElementById('maxWidthValue');
  const toggleToc = document.getElementById('toggleToc');
  const tocPositionRow = document.getElementById('tocPositionRow');
  const tocPosBtns = document.querySelectorAll('.toc-pos-btn');
  const panelModeBtns = document.querySelectorAll('.panel-mode-btn');
  const contentAlignBtns = document.querySelectorAll('.content-align-btn');
  const toggleMermaid = document.getElementById('toggleMermaid');
  const toggleMathJax = document.getElementById('toggleMathJax');
  const togglePlantUML = document.getElementById('togglePlantUML');
  const toggleGraphviz = document.getElementById('toggleGraphviz');
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

  // ========== 同步胶囊开关 UI 状态 ==========
  function syncToggleCapsule(toggleId, isChecked) {
    const capsule = document.querySelector(`.toggle-capsule[data-toggle="${toggleId}"]`);
    if (!capsule) return;
    const btns = capsule.querySelectorAll('.toggle-capsule-btn');
    btns.forEach((btn) => {
      const isOn = btn.dataset.value === 'on';
      btn.classList.toggle('active', isOn === isChecked);
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
lineHeightSlider.value = settings.lineHeight || 1.8;
    lineHeightValue.textContent = settings.lineHeight || 1.8;

    // 内容宽度
    maxWidthSlider.value = settings.maxWidth || 1200;
    maxWidthValue.textContent = (settings.maxWidth || 1200) + 'px';

    // 目录
    toggleToc.checked = settings.showToc !== false;
    syncToggleCapsule('toggleToc', toggleToc.checked);
    updateTocPositionVisibility();

    // 目录位置
    tocPosBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.pos === (settings.tocPosition || 'right'));
    });

    // Mermaid
    toggleMermaid.checked = settings.enableMermaid !== false;
    syncToggleCapsule('toggleMermaid', toggleMermaid.checked);

    // MathJax
    toggleMathJax.checked = settings.enableMathJax === true;
    syncToggleCapsule('toggleMathJax', toggleMathJax.checked);

    // PlantUML
    if (togglePlantUML) {
      togglePlantUML.checked = settings.enablePlantUML !== false;
      syncToggleCapsule('togglePlantUML', togglePlantUML.checked);
    }

    // Graphviz
    if (toggleGraphviz) {
      toggleGraphviz.checked = settings.enableGraphviz !== false;
      syncToggleCapsule('toggleGraphviz', toggleGraphviz.checked);
    }

    // 面板模式
    panelModeBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === (settings.panelMode || 'float'));
    });

    // 文档对齐
    contentAlignBtns.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.align === (settings.contentAlign || 'center'));
    });

    // 行号
    if (toggleLineNumbers) {
      toggleLineNumbers.checked = settings.showLineNumbers === true;
      syncToggleCapsule('toggleLineNumbers', toggleLineNumbers.checked);
    }

    // 自动检测
    toggleAutoDetect.checked = settings.autoDetect !== false;
    syncToggleCapsule('toggleAutoDetect', toggleAutoDetect.checked);

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

const fontSize = currentSettings.fontSize || 18;
const lineHeight = currentSettings.lineHeight || 1.8;
    const fontFamily = currentSettings.fontFamily || 'system';
    const theme = currentSettings.theme || 'light';

    // 字体映射表
    const FONT_FAMILY_MAP = {
      'system': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Microsoft YaHei", sans-serif',
      'msyh': '"Microsoft YaHei", "微软雅黑", sans-serif',
      'pingfang': '"PingFang SC", sans-serif',
      'noto-sans': '"Noto Sans SC", "Source Han Sans SC", sans-serif',
      'helvetica': '"Helvetica Neue", Helvetica, sans-serif',
      'arial': 'Arial, sans-serif',
      'segoe': '"Segoe UI", sans-serif',
      'serif': 'Georgia, "Times New Roman", "SimSun", serif',
      'simsun': '"SimSun", "宋体", serif',
      'noto-serif': '"Noto Serif SC", "Source Han Serif SC", serif',
      'georgia': 'Georgia, serif',
      'times': '"Times New Roman", Times, serif',
      'mono': '"Consolas", "Monaco", "Courier New", monospace',
    };
    let fontFamilyCSS;
    if (fontFamily === 'custom' && currentSettings.customFontFamily) {
      fontFamilyCSS = currentSettings.customFontFamily;
    } else {
      fontFamilyCSS = FONT_FAMILY_MAP[fontFamily] || FONT_FAMILY_MAP['system'];
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
    // 胶囊开关通用绑定
    document.querySelectorAll('.toggle-capsule').forEach((capsule) => {
      const toggleId = capsule.dataset.toggle;
      const checkbox = document.getElementById(toggleId);
      if (!checkbox) return;
      capsule.querySelectorAll('.toggle-capsule-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const isOn = btn.dataset.value === 'on';
          checkbox.checked = isOn;
          syncToggleCapsule(toggleId, isOn);
          checkbox.dispatchEvent(new Event('change'));
        });
      });
    });

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

    // 字体选择（下拉选择器）
    if (fontFamilySelect) {
      fontFamilySelect.addEventListener('change', () => {
        currentSettings.fontFamily = fontFamilySelect.value;
        if (fontFamilyCustom) {
          fontFamilyCustom.style.display = fontFamilySelect.value === 'custom' ? '' : 'none';
        }
        updatePreview();
        scheduleAutoSave(0);
      });
    }
    if (fontFamilyCustom) {
      fontFamilyCustom.addEventListener('input', () => {
        currentSettings.customFontFamily = fontFamilyCustom.value;
        updatePreview();
        scheduleAutoSave();
      });
    }

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

    // PlantUML 开关
    if (togglePlantUML) {
      togglePlantUML.addEventListener('change', () => {
        currentSettings.enablePlantUML = togglePlantUML.checked;
        scheduleAutoSave(0);
      });
    }

    // Graphviz 开关
    if (toggleGraphviz) {
      toggleGraphviz.addEventListener('change', () => {
        currentSettings.enableGraphviz = toggleGraphviz.checked;
        scheduleAutoSave(0);
      });
    }

    // 面板模式按钮组
    panelModeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        panelModeBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentSettings.panelMode = btn.dataset.mode;
        scheduleAutoSave(0);
      });
    });

    // 文档对齐按钮组
    contentAlignBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        contentAlignBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentSettings.contentAlign = btn.dataset.align;
        scheduleAutoSave(0);
      });
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
