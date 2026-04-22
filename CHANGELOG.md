# Changelog

All notable changes to **Markdown Viewer Enhanced** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

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
