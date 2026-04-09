# Agent Progress — Markdown Viewer Enhanced

> 本文件用于跨会话记忆。每次会话结束时更新，下次会话启动时读取。
> 灵感来源：Anthropic "Effective Harnesses for Long-Running Agents"

---

## 最近更新

- **2026-04-09**: OpenSpec Harness Kit 升级至最新版（从 openspec-harness-kit 源码整合）
  - 升级 `project-continuity.mdc`：新增 H0 变更类型分流、H3.3 测试用例补全、H3.5 运行时 Bug 诊断策略、规则 6 文档同步纪律、连续 Hotfix 合并策略、环境确认步骤
  - 升级 `openspec-apply-change/SKILL.md`：新增 Step 9.3 运行时诊断、Step 9.4 文档同步检查
  - 升级 `commands/opsx/apply.md`：新增命令执行策略声明、运行时诊断和文档同步步骤
  - 升级 `auto-test/SKILL.md` 至 v2.0：支持 Subagent 委托模式、三层测试模型
  - 新增 `agents/auto-test.md`：独立测试 subagent，支持 Task() 委托
  - 新增 `.codebuddy/memory/` 开发日志目录
- **2026-04-09**: 初始化 OpenSpec Harness Kit

---

## 项目概要

| 维度 | 信息 |
|------|------|
| **项目名** | Markdown Viewer Enhanced |
| **定位** | Chrome 浏览器扩展 — 增强 Markdown 渲染，支持 Mermaid 图表、语法高亮、TOC 导航、多主题等 |
| **技术栈** | Chrome Extension (Manifest V3), 原生 JavaScript, HTML, CSS |
| **依赖库** | marked.js, mermaid.js, highlight.js, KaTeX, DOMPurify, marked-footnote |
| **构建工具** | 无（纯前端扩展，直接加载到 Chrome） |
| **开发模式** | AI 辅助，使用 OpenSpec 工作流驱动 |

---

## 已完成的变更 (Archived)

<!-- 每完成一个变更，在这里添加记录 -->
<!-- 格式示例：
### 1. change-name (YYYY-MM-DD) ✅
- N 个任务全部完成
- 产出：描述主要新增/修改的文件
- 对应 specs：列出涉及的能力模块
-->

---

## 待实施的变更 (Active)

<!-- 列出计划中的变更，按优先级排序 -->

| 变更名 | 描述 | 建议优先级 |
|--------|------|-----------|
| （暂无） | — | — |

---

## 已积累的 Specs

<!-- 列出 openspec/specs/ 下的能力模块 -->

| Spec | 来源 | 说明 |
|------|------|------|
<!-- 暂无 -->

---

## 项目目录结构要点

```
markdown_viewer_enhanced/
├── manifest.json                   # Chrome 扩展清单 (Manifest V3)
├── background.js                   # Service Worker 后台脚本
├── content/                        # 内容脚本
│   └── content.js                  # 核心 Markdown 渲染逻辑
├── popup/                          # 弹出窗口
│   ├── popup.html
│   └── popup.js
├── options/                        # 设置页面
│   ├── options.html
│   └── options.js
├── styles/                         # 样式文件
│   ├── content.css                 # 主内容样式
│   ├── github-markdown.css         # GitHub 风格 Markdown
│   ├── themes.css                  # 主题定义
│   └── highlight-themes.css        # 代码高亮主题
├── libs/                           # 第三方库
│   ├── marked.min.js               # Markdown 解析器
│   ├── mermaid.min.js              # Mermaid 图表
│   ├── highlight.min.js            # 代码语法高亮
│   ├── katex.min.js                # 数学公式渲染
│   └── purify.min.js               # DOM 净化
├── icons/                          # 扩展图标
├── image/                          # 截图等图片资源
├── openspec/                       # OpenSpec 工作流
│   ├── changes/                    # 活跃 + 归档的变更
│   │   └── archive/                # 已归档
│   └── specs/                      # 能力规格库
├── AGENT-PROGRESS.md               # 跨会话记忆
└── .codebuddy/                     # AI 工作流配置
    ├── agents/                     # Agent 定义（subagent 委托）
    │   └── auto-test.md            # 测试 subagent
    ├── commands/opsx/              # OpenSpec 命令
    ├── memory/                     # 开发日志（按日期记录）
    ├── rules/                      # 全局规则
    └── skills/                     # 技能定义
```

---

## 已知问题与注意事项

1. 本项目为 Chrome 扩展，无构建步骤，无测试框架。测试需手动加载扩展到 Chrome 验证。
2. `content/content.js` 是核心文件（125KB+），修改时需注意性能影响。
3. **⚠️ 工作模式**: 全自动 harness 模式 — 收到"实现功能"指令后一路执行到底（propose → apply → build → impact → test → push），不在中间环节暂停等待确认。只在遇到错误/失败时才刹车报告。

---

## 下次会话建议

- 可以考虑为项目添加自动化测试框架（如 Jest + Puppeteer）
- 使用全自动模式：直接说"实现 XXX 功能"即可，AI 会自动走完 propose → apply → pipeline
