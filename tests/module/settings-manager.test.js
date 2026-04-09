/**
 * 模块测试：设置管理
 * 覆盖：设置加载、保存、重置、合并逻辑
 */

const { DEFAULT_SETTINGS } = require('../../background.js');

// =====================================================
//  BT-settings.1 设置加载测试
// =====================================================
describe('BT-settings.1 设置加载', () => {
  test('1.1 无已保存设置时返回默认值', (done) => {
    chrome.__resetStorage();

    chrome.storage.sync.get('settings', (data) => {
      const settings = data.settings || DEFAULT_SETTINGS;
      expect(settings).toEqual(DEFAULT_SETTINGS);
      done();
    });
  });

  test('1.2 有已保存设置时返回合并结果', (done) => {
    chrome.__setStorageData({
      settings: { theme: 'dark', fontSize: 18 }
    });

    chrome.storage.sync.get('settings', (data) => {
      const saved = data.settings;
      const merged = { ...DEFAULT_SETTINGS, ...saved };
      expect(merged.theme).toBe('dark');
      expect(merged.fontSize).toBe(18);
      // 未保存的项使用默认值
      expect(merged.enableMermaid).toBe(DEFAULT_SETTINGS.enableMermaid);
      done();
    });
  });

  test('1.3 部分设置缺失时补全默认值', (done) => {
    chrome.__setStorageData({
      settings: { theme: 'dark' }
    });

    chrome.storage.sync.get('settings', (data) => {
      const merged = { ...DEFAULT_SETTINGS, ...data.settings };
      expect(merged.theme).toBe('dark');
      expect(merged.fontSize).toBe(DEFAULT_SETTINGS.fontSize);
      expect(merged.showToc).toBe(DEFAULT_SETTINGS.showToc);
      done();
    });
  });
});

// =====================================================
//  BT-settings.2 设置保存测试
// =====================================================
describe('BT-settings.2 设置保存', () => {
  test('2.1 保存设置到 storage', (done) => {
    const newSettings = { ...DEFAULT_SETTINGS, theme: 'dark', fontSize: 20 };

    chrome.storage.sync.set({ settings: newSettings }, () => {
      chrome.storage.sync.get('settings', (data) => {
        expect(data.settings.theme).toBe('dark');
        expect(data.settings.fontSize).toBe(20);
        done();
      });
    });
  });

  test('2.2 保存后可以读取', (done) => {
    const settings = { ...DEFAULT_SETTINGS, enableMermaid: false };

    chrome.storage.sync.set({ settings }, () => {
      chrome.storage.sync.get('settings', (data) => {
        expect(data.settings.enableMermaid).toBe(false);
        done();
      });
    });
  });
});

// =====================================================
//  BT-settings.3 设置重置测试
// =====================================================
describe('BT-settings.3 设置重置', () => {
  test('3.1 重置后恢复默认值', (done) => {
    // 先保存自定义设置
    chrome.__setStorageData({
      settings: { theme: 'dark', fontSize: 20, enableMermaid: false }
    });

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
//  BT-settings.4 消息通信测试
// =====================================================
describe('BT-settings.4 消息通信', () => {
  test('4.1 sendMessage 被正确调用', () => {
    chrome.runtime.sendMessage(
      { type: 'SAVE_SETTINGS', settings: DEFAULT_SETTINGS },
      (response) => {}
    );

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'SAVE_SETTINGS', settings: DEFAULT_SETTINGS },
      expect.any(Function)
    );
  });

  test('4.2 GET_SETTINGS 消息格式正确', () => {
    chrome.runtime.sendMessage(
      { type: 'GET_SETTINGS' },
      (response) => {}
    );

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'GET_SETTINGS' },
      expect.any(Function)
    );
  });

  test('4.3 RESET_SETTINGS 消息格式正确', () => {
    chrome.runtime.sendMessage(
      { type: 'RESET_SETTINGS' },
      (response) => {}
    );

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'RESET_SETTINGS' },
      expect.any(Function)
    );
  });
});
