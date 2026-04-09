/**
 * Markdown Viewer Enhanced - i18n 核心模块
 * 提供 t() 翻译函数、语言切换、UI 文本动态更新
 */
(function () {
  'use strict';

  const SUPPORTED_LANGUAGES = ['zh-CN', 'en'];
  const DEFAULT_LANGUAGE = 'zh-CN';

  // 语言包映射
  const languagePacks = {
    'zh-CN': (typeof window !== 'undefined' && window.__I18N_ZH_CN__) || {},
    'en': (typeof window !== 'undefined' && window.__I18N_EN__) || {},
  };

  // 当前语言
  let currentLanguage = DEFAULT_LANGUAGE;

  /**
   * 获取当前语言
   */
  function getCurrentLanguage() {
    return currentLanguage;
  }

  /**
   * 获取支持的语言列表
   */
  function getSupportedLanguages() {
    return SUPPORTED_LANGUAGES.slice();
  }

  /**
   * 设置当前语言（仅内存中，不持久化）
   */
  function setLanguage(lang) {
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      currentLanguage = lang;
    }
  }

  /**
   * 翻译函数：根据 key 返回当前语言的翻译文本
   * @param {string} key - 翻译 key（如 'toolbar.toc'）
   * @param {object} [params] - 可选的替换参数（预留扩展）
   * @returns {string} 翻译后的文本，key 不存在时返回 key 本身
   */
  function t(key, params) {
    const pack = languagePacks[currentLanguage] || languagePacks[DEFAULT_LANGUAGE] || {};
    let text = pack[key];
    if (text === undefined) {
      // 回退到默认语言
      const fallback = languagePacks[DEFAULT_LANGUAGE] || {};
      text = fallback[key];
    }
    if (text === undefined) {
      return key;
    }
    return text;
  }

  /**
   * 应用语言到页面（扫描 data-i18n 属性的元素并更新文本）
   * @param {Element} [root=document] - 扫描的根元素
   */
  function applyLanguage(root) {
    const container = root || document;
    const elements = container.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const text = t(key);
        // 检查是否包含 HTML 标签
        if (text.includes('<') && text.includes('>')) {
          el.innerHTML = text;
        } else {
          el.textContent = text;
        }
      }
    });

    // 处理 data-i18n-title 属性（更新 title）
    const titleElements = container.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.title = t(key);
      }
    });

    // 处理 data-i18n-placeholder 属性（更新 placeholder）
    const placeholderElements = container.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.placeholder = t(key);
      }
    });

    // 处理 optgroup 的 label 属性
    const optgroups = container.querySelectorAll('optgroup[data-i18n-label]');
    optgroups.forEach(el => {
      const key = el.getAttribute('data-i18n-label');
      if (key) {
        el.label = t(key);
      }
    });
  }

  /**
   * 从 chrome.storage 加载语言设置
   * @returns {Promise<string>} 当前语言
   */
  function loadLanguageFromStorage() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get('settings', (data) => {
          if (data && data.settings && data.settings.language) {
            setLanguage(data.settings.language);
          }
          resolve(currentLanguage);
        });
      } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
          if (response && response.settings && response.settings.language) {
            setLanguage(response.settings.language);
          }
          resolve(currentLanguage);
        });
      } else {
        resolve(currentLanguage);
      }
    });
  }

  // 导出到全局
  const i18n = {
    t,
    setLanguage,
    getCurrentLanguage,
    getSupportedLanguages,
    applyLanguage,
    loadLanguageFromStorage,
    DEFAULT_LANGUAGE,
    SUPPORTED_LANGUAGES,
  };

  if (typeof window !== 'undefined') {
    window.__I18N__ = i18n;
    // 全局快捷方式
    window.t = t;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = i18n;
  }
})();
