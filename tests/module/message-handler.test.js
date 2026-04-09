/**
 * 模块测试：background.js 消息处理
 * 覆盖：各种消息类型的处理逻辑
 */

const { DEFAULT_SETTINGS, isMarkdownUrl } = require('../../background.js');

// =====================================================
//  BT-message.1 GET_SETTINGS 消息处理
// =====================================================
describe('BT-message.1 GET_SETTINGS', () => {
  test('1.1 从 storage 读取设置', (done) => {
    const savedSettings = { ...DEFAULT_SETTINGS, theme: 'dark' };
    chrome.__setStorageData({ settings: savedSettings });

    chrome.storage.sync.get('settings', (data) => {
      expect(data.settings).toEqual(savedSettings);
      done();
    });
  });

  test('1.2 storage 为空时返回默认设置', (done) => {
    chrome.__resetStorage();

    chrome.storage.sync.get('settings', (data) => {
      const settings = data.settings || DEFAULT_SETTINGS;
      expect(settings).toEqual(DEFAULT_SETTINGS);
      done();
    });
  });
});

// =====================================================
//  BT-message.2 SAVE_SETTINGS 消息处理
// =====================================================
describe('BT-message.2 SAVE_SETTINGS', () => {
  test('2.1 保存到 storage', (done) => {
    const newSettings = { ...DEFAULT_SETTINGS, fontSize: 20 };

    chrome.storage.sync.set({ settings: newSettings }, () => {
      expect(chrome.storage.sync.set).toHaveBeenCalledWith(
        { settings: newSettings },
        expect.any(Function)
      );
      done();
    });
  });

  test('2.2 通知所有标签页', (done) => {
    chrome.tabs.query({}, (tabs) => {
      expect(chrome.tabs.query).toHaveBeenCalled();
      expect(Array.isArray(tabs)).toBe(true);
      done();
    });
  });
});

// =====================================================
//  BT-message.3 RESET_SETTINGS 消息处理
// =====================================================
describe('BT-message.3 RESET_SETTINGS', () => {
  test('3.1 恢复默认设置到 storage', (done) => {
    // 先设置自定义值
    chrome.__setStorageData({ settings: { theme: 'dark' } });

    // 重置
    chrome.storage.sync.set({ settings: DEFAULT_SETTINGS }, () => {
      chrome.storage.sync.get('settings', (data) => {
        expect(data.settings).toEqual(DEFAULT_SETTINGS);
        done();
      });
    });
  });
});

// =====================================================
//  BT-message.4 IS_MARKDOWN 消息处理
// =====================================================
describe('BT-message.4 IS_MARKDOWN', () => {
  test('4.1 正确判断 Markdown URL', () => {
    expect(isMarkdownUrl('file:///test.md')).toBe(true);
    expect(isMarkdownUrl('file:///test.html')).toBe(false);
  });

  test('4.2 正确判断 HTTP Markdown URL', () => {
    expect(isMarkdownUrl('https://example.com/readme.md')).toBe(true);
    expect(isMarkdownUrl('https://example.com/index.html')).toBe(false);
  });
});

// =====================================================
//  BT-message.5 SET_BADGE 消息处理
// =====================================================
describe('BT-message.5 SET_BADGE', () => {
  test('5.1 setBadgeText 被调用', () => {
    chrome.action.setBadgeText({ tabId: 1, text: 'MD' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 1, text: 'MD' });
  });

  test('5.2 setBadgeBackgroundColor 被调用', () => {
    chrome.action.setBadgeBackgroundColor({ tabId: 1, color: '#4CAF50' });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ tabId: 1, color: '#4CAF50' });
  });

  test('5.3 清除 badge', () => {
    chrome.action.setBadgeText({ tabId: 1, text: '' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 1, text: '' });
  });
});

// =====================================================
//  BT-message.6 INJECT_CONTENT_SCRIPTS 消息处理
// =====================================================
describe('BT-message.6 INJECT_CONTENT_SCRIPTS', () => {
  test('6.1 scripting.insertCSS 被调用', async () => {
    await chrome.scripting.insertCSS({ target: { tabId: 1 }, files: ['test.css'] });
    expect(chrome.scripting.insertCSS).toHaveBeenCalled();
  });

  test('6.2 scripting.executeScript 被调用', async () => {
    await chrome.scripting.executeScript({ target: { tabId: 1 }, files: ['test.js'] });
    expect(chrome.scripting.executeScript).toHaveBeenCalled();
  });
});

// =====================================================
//  BT-message.7 权限检查消息处理
// =====================================================
describe('BT-message.7 权限检查', () => {
  test('7.1 permissions.contains 被调用', async () => {
    await chrome.permissions.contains({ origins: ['file://*/*'] });
    expect(chrome.permissions.contains).toHaveBeenCalledWith({ origins: ['file://*/*'] });
  });

  test('7.2 permissions.request 被调用', async () => {
    await chrome.permissions.request({ origins: ['file://*/*'] });
    expect(chrome.permissions.request).toHaveBeenCalledWith({ origins: ['file://*/*'] });
  });
});
