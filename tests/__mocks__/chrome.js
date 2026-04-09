/**
 * Chrome Extension API Mock
 * 为 Jest 测试环境提供 chrome.* API 的模拟实现
 */

// 内存存储（模拟 chrome.storage.sync）
const storageData = {};

const chrome = {
  // chrome.storage
  storage: {
    sync: {
      get: jest.fn((keys, callback) => {
        if (typeof keys === 'string') {
          callback({ [keys]: storageData[keys] });
        } else if (Array.isArray(keys)) {
          const result = {};
          keys.forEach(k => { result[k] = storageData[k]; });
          callback(result);
        } else {
          callback({ ...storageData });
        }
      }),
      set: jest.fn((items, callback) => {
        Object.assign(storageData, items);
        if (callback) callback();
      }),
      remove: jest.fn((keys, callback) => {
        if (typeof keys === 'string') {
          delete storageData[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach(k => delete storageData[k]);
        }
        if (callback) callback();
      }),
      clear: jest.fn((callback) => {
        Object.keys(storageData).forEach(k => delete storageData[k]);
        if (callback) callback();
      }),
    },
    local: {
      get: jest.fn((keys, callback) => callback({})),
      set: jest.fn((items, callback) => { if (callback) callback(); }),
    },
  },

  // chrome.runtime
  runtime: {
    lastError: null,
    onInstalled: {
      addListener: jest.fn(),
    },
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn((message, callback) => {
      if (callback) callback({});
    }),
    openOptionsPage: jest.fn(),
    getURL: jest.fn((path) => `chrome-extension://mock-id/${path}`),
  },

  // chrome.tabs
  tabs: {
    query: jest.fn((queryInfo, callback) => {
      if (callback) {
        callback([{ id: 1, url: 'file:///test.md', active: true }]);
      }
      return Promise.resolve([{ id: 1, url: 'file:///test.md', active: true }]);
    }),
    sendMessage: jest.fn(() => Promise.resolve()),
    reload: jest.fn(),
    create: jest.fn((options, callback) => {
      if (callback) callback({ id: 99 });
      return Promise.resolve({ id: 99 });
    }),
    remove: jest.fn(() => Promise.resolve()),
    onRemoved: {
      addListener: jest.fn(),
    },
  },

  // chrome.action (Manifest V3)
  action: {
    setBadgeText: jest.fn(() => Promise.resolve()),
    setBadgeBackgroundColor: jest.fn(() => Promise.resolve()),
  },

  // chrome.scripting
  scripting: {
    insertCSS: jest.fn(() => Promise.resolve()),
    executeScript: jest.fn(() => Promise.resolve([{ result: null }])),
  },

  // chrome.permissions
  permissions: {
    contains: jest.fn(() => Promise.resolve(false)),
    request: jest.fn(() => Promise.resolve(true)),
  },
};

// 辅助函数：重置存储数据
chrome.__resetStorage = () => {
  Object.keys(storageData).forEach(k => delete storageData[k]);
};

// 辅助函数：预设存储数据
chrome.__setStorageData = (data) => {
  Object.assign(storageData, data);
};

module.exports = chrome;
