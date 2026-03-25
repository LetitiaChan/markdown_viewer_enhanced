# Markdown Viewer Enhanced

> 🌐 [English](#english) | 🇨🇳 [中文](#中文)

---

<a id="中文"></a>

## 中文

一款浏览器扩展，在浏览器中优雅地渲染 Markdown 文件，支持 Mermaid 图表、代码高亮、KaTeX 数学公式、目录导航、多主题切换等功能。

### ✨ 功能亮点

- 🎨 **多主题切换** — 浅色 / 深色 / 跟随系统，14 种代码高亮主题
- 📊 **Mermaid 图表** — 流程图、时序图、甘特图等，支持点击放大、缩放、拖拽
- 💻 **代码高亮** — 基于 highlight.js，180+ 语言，行号显示，一键复制
- 🔢 **KaTeX 数学公式** — 行内 `$...$` 和块级 `$$...$$` LaTeX 公式渲染
- 📑 **目录导航** — 自动生成目录树，支持左/右侧边栏，滚动高亮追踪
- 📐 **排版设置** — 字体大小、行高、内容宽度、字体族自由调节
- 🖼️ **图片增强** — 点击放大预览、懒加载、自动图注
- 📝 **扩展语法** — GitHub 告警块、任务列表、脚注、定义列表、增强表格

### 📋 支持的文件格式

| 扩展名 | 说明 |
|--------|------|
| `.md` | Markdown 文件 |
| `.mdc` | Markdown 组件文件 |
| `.markdown` | Markdown 文件 |
| `.mkd` | Markdown 文件 |
| `.mdown` | Markdown 文件 |
| `.mdtxt` | Markdown 文本文件 |
| `.mdtext` | Markdown 文本文件 |
| `.txt` | 纯文本文件（自动检测） |

支持 `file://`、`http://`、`https://` 协议。

### 🚀 快速开始

1. **安装插件**：从浏览器插件市场安装
2. **打开文件**：在浏览器中直接打开 `.md` / `.mdc` 文件
3. **自动渲染**：插件自动检测并渲染 Markdown 内容
4. **自定义设置**：点击扩展图标调整主题、字体等偏好

#### 访问本地文件

渲染本地文件需要开启插件的文件访问权限：

1. 进入浏览器扩展管理页面
2. 找到 **Markdown Viewer Enhanced**
3. 点击「详情」→ 开启「允许访问文件网址」

### 🛠️ 技术栈

| 模块 | 技术 |
|------|------|
| Markdown 解析 | [Marked.js](https://github.com/markedjs/marked) |
| 图表渲染 | [Mermaid](https://github.com/mermaid-js/mermaid) |
| 代码高亮 | [highlight.js](https://github.com/highlightjs/highlight.js) |
| 数学公式 | [KaTeX](https://github.com/KaTeX/KaTeX) |
| 脚注扩展 | [marked-footnote](https://github.com/bent10/marked-extensions) |
| 安全过滤 | [DOMPurify](https://github.com/cure53/DOMPurify) |
| 平台 | Browser Extension Manifest V3 |

### 🔒 隐私声明

- **不会**收集任何用户数据
- **不会**向外部服务器发送信息（KaTeX 字体 CDN 加载除外）
- 所有设置仅存储在浏览器本地（`storage.sync`）
- 仅需 `activeTab` 和 `storage` 两项最小权限

---

<a id="english"></a>

## English

A browser extension that elegantly renders Markdown files with Mermaid diagrams, syntax highlighting, KaTeX math formulas, table of contents navigation, multiple themes, and more.

### ✨ Key Features

- 🎨 **Multiple Themes** — Light / Dark / Auto (follows system), 14 code highlight themes
- 📊 **Mermaid Diagrams** — Flowcharts, sequence diagrams, Gantt charts with click-to-zoom, drag & pan
- 💻 **Syntax Highlighting** — Powered by highlight.js, 180+ languages, line numbers, one-click copy
- 🔢 **KaTeX Math** — Inline `$...$` and block `$$...$$` LaTeX formula rendering
- 📑 **TOC Navigation** — Auto-generated heading tree, left/right sidebar, scroll tracking
- 📐 **Typography** — Font size, line height, content width, font family customization
- 🖼️ **Image Enhancement** — Click-to-zoom, lazy loading, auto captions
- 📝 **Extended Syntax** — GitHub alerts, task lists, footnotes, definition lists, enhanced tables

### 📋 Supported File Formats

| Extension | Description |
|-----------|-------------|
| `.md` | Markdown file |
| `.mdc` | Markdown component file |
| `.markdown` | Markdown file |
| `.mkd` | Markdown file |
| `.mdown` | Markdown file |
| `.mdtxt` | Markdown text file |
| `.mdtext` | Markdown text file |
| `.txt` | Plain text file (auto-detected) |

Supports `file://`, `http://`, and `https://` protocols.

### 🚀 Getting Started

1. **Install** the extension from the Web Store
2. **Open** any `.md` / `.mdc` file in your browser
3. **Auto Render** — the extension detects and renders Markdown automatically
4. **Customize** — click the extension icon to adjust themes, fonts, and more

#### Accessing Local Files

To render local Markdown files, enable file access for the extension:

1. Go to your browser's extension management page
2. Find **Markdown Viewer Enhanced**
3. Click "Details" → Enable "Allow access to file URLs"

### 🛠️ Tech Stack

| Module | Technology |
|--------|-----------|
| Markdown Parsing | [Marked.js](https://github.com/markedjs/marked) |
| Diagram Rendering | [Mermaid](https://github.com/mermaid-js/mermaid) |
| Syntax Highlighting | [highlight.js](https://github.com/highlightjs/highlight.js) |
| Math Formulas | [KaTeX](https://github.com/KaTeX/KaTeX) |
| Footnotes | [marked-footnote](https://github.com/bent10/marked-extensions) |
| HTML Sanitization | [DOMPurify](https://github.com/cure53/DOMPurify) |
| Platform | Browser Extension Manifest V3 |

### 🔒 Privacy

- **Does NOT** collect any user data
- **Does NOT** send information to external servers (except KaTeX font CDN)
- All settings stored locally in the browser (`storage.sync`)
- Requires only minimal permissions: `activeTab` and `storage`

---

## 📬 Feedback & Support

- 🐛 [GitHub Issues](https://github.com/nichuanfang/markdown_viewer_enhanced/issues)

---

## 📄 License

MIT License

---

**Markdown Viewer Enhanced** — 让 Markdown 阅读更优雅 ✨
