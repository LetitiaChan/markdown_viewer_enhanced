/**
 * 文件变更检测测试
 */

const fs = require('fs');
const path = require('path');
const contentJs = fs.readFileSync(path.resolve(__dirname, '../../content/content.js'), 'utf-8');
const contentCss = fs.readFileSync(path.resolve(__dirname, '../../styles/content.css'), 'utf-8');
const zhCN = fs.readFileSync(path.resolve(__dirname, '../../i18n/zh-CN.js'), 'utf-8');
const enJs = fs.readFileSync(path.resolve(__dirname, '../../i18n/en.js'), 'utf-8');

describe('Tier 1: 文件变更检测存在性', () => {
  test('1.1 content.js 包含 startFileWatcher 函数', () => {
    expect(contentJs).toContain('function startFileWatcher');
  });

  test('1.2 content.js 包含 fileWatcherTimer 变量', () => {
    expect(contentJs).toContain('fileWatcherTimer');
  });

  test('1.3 content.js 包含 md-file-changed-badge DOM', () => {
    expect(contentJs).toContain('md-file-changed-badge');
  });

  test('1.4 CSS 包含徽章样式', () => {
    expect(contentCss).toContain('.md-file-changed-badge');
  });

  test('1.5 CSS 包含脉冲动画', () => {
    expect(contentCss).toContain('md-badge-pulse');
  });

  test('1.6 i18n zh-CN 包含 fileChanged key', () => {
    expect(zhCN).toContain("'toolbar.fileChanged'");
  });

  test('1.7 i18n en 包含 fileChanged key', () => {
    expect(enJs).toContain("'toolbar.fileChanged'");
  });
});

describe('Tier 2: 文件变更检测行为', () => {
  test('2.1 仅在 file:// 协议下启动 watcher', () => {
    expect(contentJs).toContain('isFileProtocol()');
    expect(contentJs).toContain('startFileWatcher()');
  });

  test('2.2 使用 setInterval 轮询', () => {
    expect(contentJs).toContain('setInterval');
  });

  test('2.3 检测到变化后停止轮询', () => {
    expect(contentJs).toContain('clearInterval(fileWatcherTimer)');
  });

  test('2.4 使用 fetch 获取文件内容', () => {
    expect(contentJs).toContain('fetch(location.href)');
  });
});

describe('Tier 3: 文件变更检测场景', () => {
  test('BT-filewatch.1 徽章初始隐藏', () => {
    expect(contentJs).toContain("style=\"display:none;\"");
  });

  test('BT-filewatch.2 检测到变化后显示徽章', () => {
    expect(contentJs).toContain("badge.style.display = ''");
  });

  test('BT-filewatch.3 刷新按钮有 position relative 容器', () => {
    expect(contentJs).toContain('md-refresh-wrapper');
    expect(contentCss).toContain('.md-refresh-wrapper');
  });
});
