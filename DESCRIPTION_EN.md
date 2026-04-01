# Markdown Viewer Enhanced

> A browser extension that elegantly renders Markdown files with a file browser sidebar, Mermaid diagrams, syntax highlighting, KaTeX math formulas, table of contents navigation, multiple themes, and more.

---

## ✨ Key Features

### 🎨 Multiple Themes & Code Highlighting
- **Three page themes** — Light / Dark / Auto (follows system preference)
- **15 code highlight themes** (including auto) — Default Light/Dark Modern, GitHub, Monokai, VS 2015, Atom One Dark/Light, One Dark Pro, Dracula, Nord, Solarized Light/Dark, Tokyo Night
- Code theme can be set to "follow page theme" for automatic switching

### 📊 Mermaid Diagram Rendering
- Full support for Mermaid syntax: flowcharts, sequence diagrams, Gantt charts, class diagrams, state diagrams, and more
- Diagrams automatically adapt their color scheme to the current page theme
- **Click to zoom** — open diagrams in a fullscreen overlay with mouse wheel zoom, drag-to-pan, and keyboard shortcuts (`+` / `-` / `0`)
- One-click "fit to window" and "reset zoom" controls
- Copy Mermaid source code with a single click

### 💻 Enhanced Code Blocks
- Powered by highlight.js with **180+** supported programming languages
- Code blocks display a **language label** and a **one-click copy** button
- Optional **line numbers** for easy code referencing
- **Diff syntax highlighting**: auto-detects `+` / `-` lines with full-line background colors for additions/deletions
- Code highlight theme is independent of page theme — use dark code themes on light pages

### 🔢 KaTeX Math Formulas
- Supports LaTeX **inline** (`$...$`) and **block-level** (`$$...$$`) formulas
- High-performance rendering powered by KaTeX with automatic CDN font loading
- Smart detection to distinguish math formulas from currency symbols

### 📑 Table of Contents Navigation
- Automatically generates a **TOC tree** from document headings
- Supports **left / right** sidebar layout
- TOC items support **fold/expand** children (▸/▾ toggle buttons)
- Click any TOC item to **smooth-scroll** to the corresponding section
- Current reading position is **automatically highlighted** and tracked in real time
- **URL hash navigation** — automatically scrolls to anchor position on page load
- Toggle the TOC sidebar on or off at any time
- Sidebar supports **drag-to-resize** (180px - 600px)

### 📐 Flexible Typography Settings
- **Font Size**: Adjustable from 12px to 24px
- **Line Height**: Configurable from 1.2 to 2.0
- **Content Width**: Customizable from 600px to 1400px
- **Body Font**: System default / Serif / Monospace
- Real-time typography preview

### 📁 File Browser Sidebar (file:// protocol only)
- Automatically reads the **file list of the current directory**
- **Folder expand/collapse**: Click folders to expand sub-directory contents in-place with lazy loading
- **Open files in new tab**: Click files to open them in a new browser tab
- **Breadcrumb navigation**: Displays current file path; click parent directories to open in new tab
- **Sort mode** switching: by name / size / modified date, plus ascending / descending order
- **Folders first** and **show/hide hidden files** toggles
- Auto-filters to show only supported Markdown file formats
- Current file is automatically highlighted
- Sidebar **tab switching**: 📁 File Browser / ≡ TOC Navigation

### 🖼️ Image Enhancement
- Click images to **zoom in with fullscreen overlay**
- Images support **lazy loading** for optimized performance on long documents
- Press `Esc` to quickly close the preview

### 📝 Extended Markdown Syntax
- ✅ **GitHub-style alerts**: `> [!NOTE]` / `> [!TIP]` / `> [!IMPORTANT]` / `> [!WARNING]` / `> [!CAUTION]`, plus `> [!BLANK]`
- ✅ **Task lists**: `- [x]` / `- [ ]` with beautiful checkbox styling
- ✅ **Footnotes**: Powered by the marked-footnote extension
- ✅ **Definition lists**: `Term` + `: Definition` format (PHP Markdown Extra style)
- ✅ **Tables**: Enhanced with gradient header, row hover highlight, sticky header, and rounded borders
- ✅ **External links** automatically open in new tabs

### 🔧 Toolbar & Quick Actions
| Action | Description |
|--------|-------------|
| 📑 TOC | Toggle the table of contents sidebar |
| 🌓 Theme | Quickly switch between light/dark themes |
| 📝 Source | View / return from raw Markdown source |
| ⚙️ Settings | Open the extension's advanced settings page |
| 🔃 Refresh | Reload the current page |

- A **floating back-to-top button** appears automatically after scrolling 300px
- `Esc` key closes both image preview and Mermaid diagram preview

### ⚙️ Settings System
- **Popup quick panel**: Click the extension icon to quickly adjust theme, font, width, TOC, Mermaid/KaTeX toggles
- **Options advanced page**: Full typography configuration, code theme selection (with live preview), line numbers, line height, and more
- Settings are synced via `storage.sync` across devices
- Changes are pushed in real-time to all open Markdown tabs
- One-click restore to default settings

---

## 📋 Supported File Formats

| Extension | Description |
|-----------|-------------|
| `.md` | Markdown file |
| `.mdc` | Markdown component file |
| `.markdown` | Markdown file |
| `.mkd` | Markdown file |
| `.mdown` | Markdown file |
| `.mdtxt` | Markdown text file |
| `.mdtext` | Markdown text file |

Local `file://` supports all extensions above; remote `http://` / `https://` currently support `.md`, `.mdc`, and `.markdown`.

---

## 🚀 Getting Started

1. **Install the Extension**: Install from the Web Store
2. **Open a Markdown File**: Open any `.md` file directly in your browser
3. **Automatic Rendering**: The extension automatically detects and renders Markdown content
4. **Customize Settings**: Click the extension icon to adjust themes, fonts, and other preferences

### Accessing Local Files

To render local Markdown files, make sure file access is enabled for the extension:
1. Go to `://extensions/`
2. Find **Markdown Viewer Enhanced**
3. Click "Details"
4. Enable "Allow access to file URLs"

---

## 🛠️ Tech Stack

- **Markdown Parsing**: [Marked.js](https://github.com/markedjs/marked)
- **Diagram Rendering**: [Mermaid](https://github.com/mermaid-js/mermaid)
- **Syntax Highlighting**: [highlight.js](https://github.com/highlightjs/highlight.js)
- **Math Formulas**: [KaTeX](https://github.com/KaTeX/KaTeX)
- **Footnotes**: [marked-footnote](https://github.com/bent10/marked-extensions)
- **HTML Sanitization**: [DOMPurify](https://github.com/cure53/DOMPurify)
- **Platform**: Browser Extension Manifest V3

---

## 🔒 Privacy Statement

- This extension **does NOT** collect any user data
- This extension **does NOT** send any information to external servers (except KaTeX font CDN loading)
- All settings are stored locally in the browser (`storage.sync`)
- Only requires `activeTab`, `storage`, `tabs`, `scripting` permissions (the latter two for local file browser feature)

---

## 📬 Feedback & Support

If you encounter any issues or have feature suggestions, feel free to reach out:
- 🐛 [GitHub Issues](https://github.com/nichuanfang/markdown_viewer_enhanced/issues)

---

**Markdown Viewer Enhanced** — Make Markdown reading more elegant ✨
