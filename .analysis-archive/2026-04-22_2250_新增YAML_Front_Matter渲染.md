<analysis>
context: 
  - .mdc 文件已在 manifest.json 中注册（第35行 "file:///*/*.mdc"）
  - content.js 中没有任何 YAML Front Matter 的处理逻辑
  - 样式文件中没有 front-matter 相关样式
  - markdown 渲染流程：getRawContent() → preprocessMath() → marked.parse() → DOMPurify → postprocessColorText()
  - 有两个渲染入口：init()（第3845行附近）和 reRenderContent()（第3510行附近）
  - 代码块 HTML 结构：<div class="code-block"><div class="code-header"><span class="code-lang">LANG</span><button class="code-copy-btn">...</button></div><pre><code>...</code></pre></div>
  - 代码块标题栏样式：.code-header 有 background: #f1f3f5, border-bottom, padding: 6px 12px, font-size: 12px
  - 暗色主题：.theme-dark .code-header 有 background: #2d2d2d
  - 截图中期望的渲染效果：齿轮图标 ⚙ + "YAML Front Matter" 标题栏（灰色背景），下方是 YAML 内容（带语法高亮）
  - YAML Front Matter 格式：文件开头以 --- 开始，以 --- 结束，中间是 YAML 内容

needs: 
  - 在 markdown 渲染前检测并提取 YAML Front Matter
  - 将提取的 YAML Front Matter 渲染为特殊样式块：带齿轮图标的标题栏 + YAML 语法高亮的内容区域
  - 从 markdown 源码中移除 YAML Front Matter，避免被 marked.js 当作普通内容渲染
  - 将渲染后的 YAML Front Matter HTML 插入到最终 HTML 的最前面
  - 支持亮色和暗色主题

key_challenges:
  - YAML Front Matter 必须在 marked.parse() 之前提取，否则 --- 会被 marked 解析为 <hr> 标签
  - 需要在 init() 和 reRenderContent() 两个渲染入口都添加预处理逻辑
  - YAML 内容需要用 hljs 进行语法高亮（如果可用）
  - 样式需要与现有代码块样式保持视觉一致性

confidence: HIGH

approach: 
  方案：在 marked.parse() 之前添加 YAML Front Matter 预处理函数 preprocessFrontMatter()
  
  三维评分：
  - 可维护性: 5/5 — 独立的预处理函数，与现有代码块渲染模式一致
  - 健壮性: 5/5 — 正则匹配严格限定在文件开头，不会误匹配文档中间的 ---
  - 可扩展性: 5/5 — 未来可以扩展为解析 YAML 键值对并显示为结构化表格

edge_cases:
  - 文件没有 YAML Front Matter：preprocessFrontMatter 返回原始 markdown，frontMatterHtml 为空
  - YAML Front Matter 中包含特殊 HTML 字符（如 < > &）：需要 escapeHtml 处理
  - YAML Front Matter 后紧跟内容（无空行）：正则需要处理 --- 后可能没有换行的情况
  - 文件内容以 BOM 开头：需要 trim 处理
  - --- 出现在文档中间（如 markdown 分隔线）：正则限定 ^ 开头，不会误匹配
  - hljs 不可用时：降级为纯文本显示（escapeHtml）
  - DOMPurify 清理时不要过滤掉 front-matter-block 的 HTML

affected_scope:
  - f:\github\markdown_viewer_enhanced\content\content.js（新增 preprocessFrontMatter 函数，修改 init() 和 reRenderContent()）
  - f:\github\markdown_viewer_enhanced\styles\content.css（新增 .front-matter-block 样式）
  - f:\github\markdown_viewer_enhanced\tests\ui\front-matter.test.js（新增测试用例）

execution_plan:
  - step_1: 在 content.js 中新增 preprocessFrontMatter(markdown) 函数，放在 preprocessMath 函数附近。函数用正则提取文件开头的 YAML Front Matter，生成带 hljs 高亮的 HTML 块，返回 { frontMatterHtml, remainingMarkdown }
  - step_2: 修改 content.js 的 init() 函数，在 preprocessMath 之前调用 preprocessFrontMatter，将 frontMatterHtml 保存，将 remainingMarkdown 传给后续流程。在 marked.parse 之后将 frontMatterHtml 插入到 htmlContent 最前面
  - step_3: 修改 content.js 的 reRenderContent() 函数，添加相同的 preprocessFrontMatter 逻辑
  - step_4: 在 content.css 中添加 .front-matter-block 及其子元素的样式（亮色 + 暗色主题）
  - step_5: 运行全量测试确认不破坏现有功能
  - step_6: 新增 tests/ui/front-matter.test.js 测试用例（Tier 1-3）
  - step_7: Git commit + push

degradation_check:
  - 方案是否是三维评估综合最优的？ → YES
  - 是否遗漏了已知边界条件？ → NO
  - 是否因改动量大而想缩减方案？ → NO
  - 是否打算跳过某些文件？ → NO
  - execution_plan是否覆盖affected_scope所有文件？ → YES
  - context是否充分？ → YES
  - 是否有发现了但被判断为"无关紧要"而跳过的问题？ → NO
  - execution_plan中是否有步骤计划使用 shell 命令修改源代码？ → NO
</analysis>
