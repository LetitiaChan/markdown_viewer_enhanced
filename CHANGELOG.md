# Changelog

All notable changes to **Markdown Viewer Enhanced** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.3.1] - 2026-04-23

### Fixed
- **Math Formula Rendering**: Fixed KaTeX math formulas displaying as raw `%%MATH_BLOCK_N%%` placeholders instead of rendered equations
- **Mermaid Diagram Rendering**: Fixed Mermaid diagrams (flowcharts, sequence diagrams, class diagrams, etc.) rendering as blank containers
- **Graphviz & Emoji Rendering**: Fixed Graphviz diagrams and emoji shortcodes not rendering due to the same root cause
- **Root Cause**: The v1.3.0 lazy-loading mechanism used `document.createElement('script')` to inject scripts via DOM, which executes in the browser's **main world**. However, Chrome Extension content scripts run in an **isolated world** with a separate JavaScript context, making the lazily-loaded global variables (`mermaid`, `katex`, `Viz`, `emojiMap`) invisible to the content script. All libraries are now restored to `manifest.json` `content_scripts` for reliable isolated-world injection.

### Changed
- Libraries (mermaid.min.js, katex.min.js, viz-global.js, emoji-map.js) restored to static `content_scripts` injection in manifest.json
- Removed `loadScript()` calls from `init()` and `reRenderMermaid()` — rendering functions are now called directly
- Content detection logic (needsMermaid, needsGraphviz) retained for skipping unnecessary render calls

---

## [1.3.0] - 2026-04-23

### Added
- **TOC Search & Filter**: Real-time keyword search in the TOC sidebar — case-insensitive substring matching, `<mark>` text highlighting, match count display (N/M), ancestor item visibility, collapse state save/restore, debounced input (150ms), Escape key to clear, full i18n support
- **Font Family Expansion**: Expanded body font selector from 3 buttons to a grouped dropdown with 13 font options — Sans-serif group (Microsoft YaHei, PingFang SC, Noto Sans SC, Helvetica Neue, Arial, Segoe UI), Serif group (General Serif, SimSun, Noto Serif SC, Georgia, Times New Roman), custom CSS font-family input, backward compatible with old values, consistent across all 3 settings UIs
- **Performance Optimization — Lazy Loading**: Heavy libraries (Mermaid 2.45MB, Viz.js 1.38MB, KaTeX 269KB, emoji-map 25KB) are now loaded on-demand via `loadScript()` instead of synchronous injection — initial script payload reduced from ~4.5MB to ~370KB (86% reduction)
- **Performance Optimization — Parallel Rendering**: Mermaid, PlantUML, Graphviz, and Math rendering tasks now execute concurrently via `Promise.all()` instead of sequential `await`
- **Performance Optimization — Content Detection**: Smart pre-scan of raw Markdown to skip loading libraries when their syntax is not present (e.g., no `` ```mermaid `` blocks → skip Mermaid loading)
- **Performance Optimization — highlightAuto Guard**: Code blocks exceeding 10,000 characters skip automatic language detection to prevent UI freezes

### Fixed
- **Font Family Setting**: Body font selection (system/serif/mono) now correctly applies to rendered content — previously the setting was saved but never applied to the DOM
- **Code Theme Preview**: Settings panel code highlight theme preview now updates immediately on theme switch

---

## [1.2.0] - 2026-04-09

### Added
- **Internationalization (i18n)**: Full Chinese/English bilingual support with language switcher in settings panel, popup, and options page
- **Image Lightbox**: Click-to-zoom fullscreen overlay with mouse wheel zoom (0.1x–20x), drag-to-pan, double-click reset, and keyboard shortcuts (`+`/`-`/`0`/`R`/`Esc`)
- **PlantUML Rendering**: Detect `plantuml`/`puml` code blocks, hex-encode and render via plantuml.com as `<img>`, with image lightbox integration
- **Graphviz Rendering**: Detect `dot`/`graphviz` code blocks, render locally via Viz.js WASM as SVG, with Mermaid-style lightbox (zoom controls)
- **GFM Extended Syntax**: `==highlight==`, `^superscript^`, `~subscript~`, `++underline++`, `:emoji:` shortcodes, and enhanced definition list inline rendering
- **File Change Detection**: Poll-based file modification detection (2s interval, `file://` only) with red pulse badge and click-to-refresh
- **Settings Panel Enhancements**: Panel mode (floating/embedded), document alignment (left/center/right), math formula reordering, GitHub & bug report links
- **Options Page Enhancements**: Panel mode, document alignment, PlantUML/Graphviz toggles, extended slider ranges (line height up to 2.4, width up to 1800px), bottom links
- **Color Text Syntax**: `{color:xxx}text{/color}` for inline colored text rendering
- **YAML Front Matter Rendering**: `.mdc` files with YAML front matter header are rendered with styled metadata display
- **Automated Test Framework**: Jest + jsdom with three-tier test architecture (unit / module / UI), 18 suites, 328 tests

### Changed
- Dark theme CSS filter adaptation for PlantUML and Graphviz diagrams
- Settings panel layout reorganized: language selector as dropdown inside appearance card, typography settings moved before code highlighting
- Task list completed items use fade effect instead of strikethrough

### Fixed
- Bold/italic text now has explicit color values in dark code highlight themes for readability
- Mermaid diagrams with custom light fill colors now have readable text in dark theme (forced dark text color)
- Mermaid diagram connection lines are now visible in dark theme
- Code block line numbers properly aligned (changed `.code-line` display from `inline-block` to `block`)
- Nested code block line numbers no longer have extra indentation (cross-line tag balancing in `wrapLines`)
- Eliminated extra blank line in code blocks caused by `display:block` + `join(\n)` double line breaks
- Settings button groups unified to segment style with outer border container and green selected state (popup, options, and content panel)
- Capsule button group browser default style reset (appearance/outline/font-family)
- Color text processing moved to post-DOMPurify phase to prevent `style` attribute stripping
- Inline settings panel language dropdown no longer stretches full width causing vertical label layout
- Reduced console noise by downgrading TOC pre-fetch empty result from `console.warn` to `console.log`

---

## [1.1.0] - 2026-03-15

### Added
- **Enhanced Settings Panel**: Full-screen card-style inline settings popup in content page
- **Popup Enhancements**: Code highlight theme selection, body font, line height, code line numbers, auto-detection toggles
- **Render Button**: Popup now includes a render button for manual rendering on `http://`/`https://` pages
- **Image Preview**: Click images to open in a popup preview overlay
- Consolidated all settings into the popup panel, removed separate "More Settings" button

### Changed
- Upgraded highlight.js from v9.16.2 to v11.11.1
- Changed `host_permissions` to `optional_host_permissions` for Chrome Web Store compliance — `file://` permission is now optional and user-granted
- Background script now includes permission check and request helper functions
- Added `CHECK_FILE_PERMISSION` / `REQUEST_FILE_PERMISSION` message handling
- `fetchDirectoryViaTab` now auto-checks permissions before execution
- Merged `DESCRIPTION_EN.md` and `DESCRIPTION_CN.md` into bilingual `DESCRIPTION.md`
- README restructured with English first, Chinese second
- Unified GitHub Issues links across description files

### Fixed
- HTML `<img>` tags now support click-to-preview in lightbox
- Optimized README image layout

---

## [1.0.0] - 2026-02-01

### Added
- **Markdown Rendering**: Full GFM (GitHub Flavored Markdown) support powered by Marked.js
- **Multiple Themes**: Light / Dark / Auto (follows system preference)
- **15 Code Highlight Themes**: Default Light/Dark Modern, GitHub, Monokai, VS 2015, Atom One Dark/Light, One Dark Pro, Dracula, Nord, Solarized Light/Dark, Tokyo Night
- **Mermaid Diagram Rendering**: Flowcharts, sequence diagrams, Gantt charts, class diagrams, state diagrams with theme-aware coloring and click-to-zoom overlay
- **KaTeX Math Formulas**: Inline (`$...$`) and block-level (`$$...$$`) LaTeX rendering with smart currency symbol detection
- **Table of Contents Navigation**: Auto-generated TOC tree with left/right sidebar, fold/expand, smooth scroll, real-time position tracking, URL hash navigation, drag-to-resize (180px–600px)
- **File Browser Sidebar**: Directory file listing (`file://` only), folder expand/collapse with lazy loading, breadcrumb navigation, sort by name/size/date, folders-first toggle, hidden files toggle
- **Enhanced Code Blocks**: 180+ language support, language label, one-click copy, optional line numbers, diff syntax highlighting
- **Typography Settings**: Font size (12–24px), line height (1.2–2.0), content width (600–1400px), body font selection
- **Extended Syntax**: GitHub-style alerts (`[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`, `[!BLANK]`), task lists, footnotes, definition lists, enhanced tables
- **Toolbar**: TOC toggle, theme switch, source view, settings, refresh, floating back-to-top button
- **Settings System**: Popup quick panel + Options advanced page, `storage.sync` cross-device sync, real-time push to all tabs, one-click reset
- **Supported Formats**: `.md`, `.mdc`, `.markdown`, `.mkd`, `.mdown`, `.mdtxt`, `.mdtext`
- Chrome Extension Manifest V3 architecture
