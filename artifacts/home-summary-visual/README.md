# Web 首页摘要卡动态验收

测试使用真实 Web 登录、菜单、首页、设置、MemoEditorModal 和 FinanceEntryModal；HTTP 被 Playwright fixture 替换，未注入 Vue 状态，也未操作真实账号或线上数据。

运行：在 Web 仓库执行 `node artifacts/home-summary-visual/check.mjs`，开发服务使用 `http://127.0.0.1:5666`。`FAST=1` 可只重跑桌面深色的主体场景，初始加载补验仍覆盖全部六组合。

已通过：
- 390 / 820 / 1440 px × 浅色 / 深色，多条及长标题、单条、空态、首次骨架、已有内容刷新、刷新失败，检查卡片高度与下游位置、无横向溢出。
- 六组合重新挂载的 loading → 空态 / 单条、首次失败 → 点击重试恢复。
- 笔记 GET /memo/9007199254740993 详情后真实表单改标题，再 PUT 保留正文和 hiddenContent=true。
- 支出 88.50：真实交易金额输入、记账金额联动、选择类型与支付方式 → POST /expense。
- 收入 123.45：点击切换收入、真实输入金额、选择类型 → POST /income。
- 上述写入后刷新财务摘要，页面实际显示收入 12,469.12、支出 2,434.17、结余 10,034.95。
- 个人中心四卡开关逐个关闭再打开，验证 UI aria-checked 变化与 PUT 请求。
- 浏览器 pageerror 为空。

证据：`geometry-six-combinations.json` 是初轮六组合主场景结果；`geometry.json` 是最后的交互复验及 11 个写请求；`first-load-transitions.json` 是 12 个初始加载场景；截图文件按宽度和主题命名。手机未知行数首屏按三条预留，空/单条加载后自然收缩；已有内容刷新和失败无高度变化。平板卡片 250 px、桌面 280 px。

边界：这是 Web 浏览器与 fixture 的客户端集成验证，不代表真实后端接口、线上数据、部署或移动端验证。
