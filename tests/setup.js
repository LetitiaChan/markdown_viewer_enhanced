/**
 * Jest 全局 Setup
 * 在每个测试文件运行前加载 Chrome API mock
 */

const chrome = require('./__mocks__/chrome');

// 将 chrome 挂载到全局
global.chrome = chrome;
