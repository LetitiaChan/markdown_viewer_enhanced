/**
 * Markdown Viewer Enhanced - English Language Pack (en)
 */
(function () {
  'use strict';

  const en = {
    // ========== Toolbar ==========
    'toolbar.toc': '📑 TOC',
    'toolbar.toc.title': 'Toggle TOC',
    'toolbar.theme': '🌓 Theme',
    'toolbar.theme.title': 'Toggle theme',
    'toolbar.source': '📝 Source',
    'toolbar.source.title': 'View source',
    'toolbar.preview': '📄 Preview',
    'toolbar.settings': '⚙️ Settings',
    'toolbar.settings.title': 'Settings',
    'toolbar.refresh': '🔃 Refresh',
    'toolbar.refresh.title': 'Refresh',

    // ========== Sidebar ==========
    'sidebar.files.title': 'File Browser',
    'sidebar.toc.title': 'Table of Contents',
    'sidebar.menu.title': 'More actions',
    'sidebar.close.title': 'Close sidebar',
    'sidebar.backToTop.title': 'Back to top',
    'sidebar.toc.toggle.title': 'Collapse/Expand',

    // ========== Sidebar Menu ==========
    'menu.toc.collapseAll': 'Collapse All',
    'menu.toc.expandAll': 'Expand All',
    'menu.files.refresh': 'Refresh',
    'menu.files.collapseAll': 'Collapse All',
    'menu.files.sortGroup': 'Sort Order',
    'menu.files.sortByName': 'By Name',
    'menu.files.sortBySize': 'By Size',
    'menu.files.sortByModified': 'By Modified Date',
    'menu.files.sortAsc': 'Ascending',
    'menu.files.sortDesc': 'Descending',
    'menu.files.foldersFirst': 'Folders First',
    'menu.files.showHidden': 'Show Hidden Files',

    // ========== File Browser ==========
    'fileTree.loading': 'Loading...',
    'fileTree.empty': 'No files',
    'fileTree.noMarkdown': 'No Markdown files in this directory',
    'fileTree.emptyFolder': 'Empty folder',
    'fileTree.loadFailed': 'Load failed',

    // ========== Code Copy ==========
    'code.copy': '📋 Copy',
    'code.copy.title': 'Copy code',
    'code.copied': '✅ Copied',
    'code.mermaidCopy.title': 'Copy Mermaid source',

    // ========== Image Preview ==========
    'imagePreview.close': '✕ Close',

    // ========== Mermaid Preview ==========
    'mermaid.close': '✕ Close',
    'mermaid.zoomOut.title': 'Zoom out',
    'mermaid.zoomIn.title': 'Zoom in',
    'mermaid.zoomReset': '↺ Reset',
    'mermaid.zoomReset.title': 'Reset',
    'mermaid.zoomFit': '⊡ Fit',
    'mermaid.zoomFit.title': 'Fit to window',

    // ========== GitHub Alert ==========
    'alert.note': 'Note',
    'alert.tip': 'Tip',
    'alert.important': 'Important',
    'alert.warning': 'Warning',
    'alert.caution': 'Caution',

    // ========== Error Messages ==========
    'error.renderFailed': 'Render failed',
    'error.parseFailed': '⚠️ Markdown parse failed',
    'error.unknown': 'Unknown error',

    // ========== Inline Settings Panel ==========
    'settings.title': '⚙️ Settings',
    'settings.desc': 'Customize appearance and behavior',
    'settings.tip': '✨ Changes take effect immediately',
    'settings.autoSave': '🔖 Settings auto-saved',
    'settings.resetDefault': 'Reset',

    // Appearance
    'settings.appearance.title': 'Appearance',
    'settings.appearance.desc': 'Choose the overall interface style',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.theme.auto': 'System',

    // Code Highlight
    'settings.codeTheme.title': 'Code Highlight Theme',
    'settings.codeTheme.desc': 'Choose the highlight color scheme for code blocks',
    'settings.codeTheme.groupLight': '🔆 Light',
    'settings.codeTheme.groupDark': '🌙 Dark',
    'settings.codeTheme.groupAuto': '🔄 Auto',
    'settings.codeTheme.followPage': 'Follow Page Theme',

    // Typography
    'settings.typography.title': 'Typography',
    'settings.typography.desc': 'Adjust reading experience',
    'settings.font.title': 'Body Font',
    'settings.font.desc': 'Choose the display font for Markdown body',
    'settings.font.system': 'System',
    'settings.font.serif': 'Serif',
    'settings.font.mono': 'Monospace',
    'settings.fontSize.title': 'Font Size',
    'settings.fontSize.desc': 'Adjust body font size (12px - 24px)',
    'settings.lineHeight.title': 'Line Height',
    'settings.lineHeight.desc': 'Adjust paragraph line height (1.2 - 2.0)',
    'settings.lineHeight.compact': 'Compact',
    'settings.lineHeight.loose': 'Loose',
    'settings.maxWidth.title': 'Max Content Width',
    'settings.maxWidth.desc': 'Adjust max width of content area (600px - 1400px)',
    'settings.maxWidth.narrow': 'Narrow',
    'settings.maxWidth.wide': 'Wide',

    // Features
    'settings.features.title': 'Features',
    'settings.features.desc': 'Enable or disable features',
    'settings.showToc': 'Show TOC',
    'settings.tocPosition': 'TOC Position',
    'settings.tocPosition.left': 'Left',
    'settings.tocPosition.right': 'Right',
    'settings.mermaid': 'Mermaid Diagrams',
    'settings.mathJax': 'Math Rendering',
    'settings.lineNumbers': 'Show Line Numbers',
    'settings.autoDetect': 'Auto-detect Markdown',

    // Language
    'settings.language.title': 'Language',
    'settings.language.desc': 'Choose interface language',

    // ========== Options Page ==========
    'options.title': 'Markdown Viewer Enhanced - Settings',
    'options.headerDesc': 'Render Markdown in your browser with Mermaid diagrams, syntax highlighting, and TOC navigation',
    'options.tip': 'Settings are <strong>auto-saved</strong> and applied to open Markdown pages immediately.',
    'options.theme.light': 'Light Theme',
    'options.theme.dark': 'Dark Theme',
    'options.theme.auto': 'System',
    'options.theme.modeLabel': 'Theme Mode',
    'options.theme.modeDesc': 'Switch between light and dark styles',
    'options.codeTheme.title': 'Code Highlight Theme',
    'options.codeTheme.desc': 'Choose the highlight color scheme for code blocks',
    'options.font.title': 'Body Font',
    'options.font.desc': 'Choose the display font for Markdown body',
    'options.font.system': 'System',
    'options.font.serif': 'Serif',
    'options.font.mono': 'Monospace',
    'options.fontSize.title': 'Font Size',
    'options.fontSize.desc': 'Adjust body font size (12px - 24px)',
    'options.lineHeight.title': 'Line Height',
    'options.lineHeight.desc': 'Adjust paragraph line height (1.2 - 2.0)',
    'options.lineHeight.compact': 'Compact',
    'options.lineHeight.loose': 'Loose',
    'options.maxWidth.title': 'Max Content Width',
    'options.maxWidth.desc': 'Adjust max width of content area (600px - 1400px)',
    'options.maxWidth.narrow': 'Narrow',
    'options.maxWidth.wide': 'Wide',
    'options.preview.title': 'Typography Preview',
    'options.preview.text1': 'This is a preview text to demonstrate the current typography settings. The quick brown fox jumps over the lazy dog.',
    'options.preview.text2': 'Supports rendering <code>Mermaid</code> diagrams and code highlighting for an enhanced Markdown reading experience.',
    'options.showToc.title': 'Show TOC Navigation',
    'options.showToc.desc': 'Display a table of contents in the sidebar for quick navigation',
    'options.tocPosition.title': 'TOC Position',
    'options.tocPosition.desc': 'Choose the position of the TOC sidebar',
    'options.tocPosition.left': '📍 Left',
    'options.tocPosition.right': '📍 Right',
    'options.mermaid.title': 'Mermaid Diagrams',
    'options.mermaid.desc': 'Enable Mermaid syntax rendering for flowcharts, sequence diagrams, Gantt charts, etc.',
    'options.mathJax.title': 'Math Rendering',
    'options.mathJax.desc': 'Enable KaTeX to render LaTeX math formulas (experimental)',
    'options.lineNumbers.title': 'Show Line Numbers',
    'options.lineNumbers.desc': 'Display line numbers on the left side of code blocks',
    'options.autoDetect.title': 'Auto-detect Markdown',
    'options.autoDetect.desc': 'Automatically detect and render .md / .markdown files',
    'options.shortcuts.title': 'Shortcuts',
    'options.shortcuts.toggleToc': 'Toggle TOC sidebar',
    'options.shortcuts.toggleTocDesc': 'Click toolbar <span class="kbd">📑 TOC</span> button',
    'options.shortcuts.toggleTheme': 'Toggle theme',
    'options.shortcuts.toggleThemeDesc': 'Click toolbar <span class="kbd">🌓 Theme</span> button',
    'options.shortcuts.viewSource': 'View Markdown source',
    'options.shortcuts.viewSourceDesc': 'Click toolbar <span class="kbd">📝 Source</span> button',
    'options.shortcuts.refresh': 'Refresh page',
    'options.shortcuts.refreshDesc': 'Click toolbar <span class="kbd">🔃 Refresh</span> button',
    'options.shortcuts.closePreview': 'Close image preview',
    'options.shortcuts.closePreviewDesc': '<span class="kbd">Esc</span>',
    'options.resetBtn': '🔄 Reset All Settings',
    'options.github': 'Star & Feedback',
    'options.saved': '✅ Settings saved',
    'options.resetConfirm': 'Are you sure you want to reset all settings to defaults? This cannot be undone.',
    'options.resetDone': '✅ Settings reset to defaults',
    'options.language.title': 'Interface Language',
    'options.language.desc': 'Choose the display language of the extension',

    // ========== Popup ==========
    'popup.subtitle': 'Markdown Reader Extension',
    'popup.detecting': 'Detecting...',
    'popup.isMarkdown': 'Current page is a Markdown file ✓',
    'popup.notMarkdown': 'Current page is not a Markdown file',
    'popup.detectFailed': 'Detection failed',
    'popup.cannotDetect': 'Cannot detect current page',
    'popup.renderBtn': '▶ Render Markdown',
    'popup.renderHint': 'Click to render the current page as Markdown',
    'popup.rendering': '⏳ Rendering...',
    'popup.renderDone': '✅ Render complete',
    'popup.renderFailed': '❌ Render failed, please retry',
    'popup.renderError': '❌ Render failed',
    'popup.themeSection': '🎨 Theme',
    'popup.theme.light': 'Light',
    'popup.theme.dark': 'Dark',
    'popup.theme.auto': 'System',
    'popup.codeTheme': 'Code Theme',
    'popup.codeTheme.groupLight': '🔆 Light',
    'popup.codeTheme.groupDark': '🌙 Dark',
    'popup.codeTheme.groupAuto': '🔄 Auto',
    'popup.codeTheme.followPage': 'Follow Page Theme',
    'popup.typographySection': '📐 Typography',
    'popup.font': 'Body Font',
    'popup.font.default': 'Default',
    'popup.font.serif': 'Serif',
    'popup.font.mono': 'Mono',
    'popup.fontSize': 'Font Size',
    'popup.lineHeight': 'Line Height',
    'popup.lineHeight.compact': 'Compact',
    'popup.lineHeight.loose': 'Loose',
    'popup.contentWidth': 'Content Width',
    'popup.contentWidth.narrow': 'Narrow',
    'popup.contentWidth.wide': 'Wide',
    'popup.featuresSection': '⚙️ Features',
    'popup.showToc': 'Show TOC',
    'popup.tocPosition': 'TOC Position',
    'popup.tocPosition.left': 'Left',
    'popup.tocPosition.right': 'Right',
    'popup.mermaid': 'Mermaid Diagrams',
    'popup.mathJax': 'Math Rendering',
    'popup.lineNumbers': 'Show Line Numbers',
    'popup.autoDetect': 'Auto-detect Markdown',
    'popup.resetBtn': '🔄 Reset',
    'popup.refreshBtn': '🔃 Refresh Page',
    'popup.language': 'Language',
  };

  // Export
  if (typeof window !== 'undefined') {
    window.__I18N_EN__ = en;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = en;
  }
})();
