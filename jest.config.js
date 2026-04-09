/** @type {import('jest').Config} */
module.exports = {
  // 默认使用 jsdom 环境（UI 测试需要）
  testEnvironment: 'jsdom',

  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],

  // 全局 setup：加载 Chrome API mock
  setupFiles: [
    '<rootDir>/tests/setup.js'
  ],

  // 覆盖率配置
  collectCoverageFrom: [
    'content/content.js',
    'background.js',
    'popup/popup.js',
    'options/options.js'
  ],

  // 超时设置
  testTimeout: 10000,

  // 清除 mock
  clearMocks: true,
  restoreMocks: true,
};
