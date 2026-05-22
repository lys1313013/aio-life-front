# 编程看板新增 CSDN 及整体抽象重构计划

## 1. 概述 (Summary)
在“编程看板”中新增 CSDN 数据展示模块。为了解决当前 `github` 和 `leetcode` 页面代码结构冗余的问题，将提取高度抽象的通用 UI 组件（统计卡片、列表布局等）。CSDN 的数据将通过后端代理接口获取，以规避前端跨域及反爬策略。看板主要展示 CSDN 的用户数据统计和近期文章列表。

## 2. 现状分析 (Current State Analysis)
- 当前 `apps/web-antd/src/views/coding/github/index.vue` 和 `leetcode/index.vue` 中存在大量重复的页面布局、卡片（Card）和骨架屏（Skeleton）代码。
- 账号绑定页面 (`views/_core/profile/user-bind.vue`) 目前仅支持 GitHub、LeetCode 和扇贝单词，暂不支持 CSDN。
- 各个平台的数据获取逻辑直接耦合在视图层，导致代码臃肿。

## 3. 拟议更改 (Proposed Changes)

### 3.1 提取高复用度通用组件 (views/coding/components/)
新建一系列通用展示组件，供 Github、LeetCode 和 CSDN 共享：
- **`CodingDashboardLayout.vue`**: 通用页面级骨架布局。接收 `loading`、`error` 状态，统一处理占位屏及错误提示。
- **`StatCard.vue`**: 数据指标卡片组件。支持传入 `title`（指标名）、`value`（核心数据）、`icon`（图标配置/颜色）、以及 `subValue`（附加信息）。
- **`DataListCard.vue`**: 通用列表/表格卡片组件。用于展示“最近动态”、“最近文章”等数据，统一封装外层 Card 和滚动条样式。

### 3.2 新增 CSDN 数据 API 定义
在 `apps/web-antd/src/api/core/` 下新建 `csdn.ts`：
- 定义通过后端获取数据的接口方法（约定路径例如 `/api/csdn/stats` 和 `/api/csdn/articles`）。
- 定义数据结构：
  - `CsdnStats`: 包含访问量、原创数、排名、粉丝数、获赞数等。
  - `CsdnArticle`: 包含文章标题、链接、发布时间、阅读量等。

### 3.3 新增 CSDN 看板页面
在 `apps/web-antd/src/views/coding/csdn/index.vue` 下创建页面：
- 引入抽象出的 `CodingDashboardLayout`、`StatCard` 和 `DataListCard`。
- 在 `onMounted` 或账号信息加载后，调用 `csdn.ts` 中定义的接口。
- 展示两部分内容：
  1. **用户数据统计网格**：展示总阅读量、原创数、全站排名、粉丝数、获赞数。
  2. **近期文章列表**：列表呈现最新博文及关键指标。

### 3.4 改造 Github 与 LeetCode 页面
重构 `views/coding/github/index.vue` 和 `views/coding/leetcode/index.vue`：
- 移除各自文件内部手写的卡片和骨架屏模板。
- 接入新的 `StatCard` 和 `CodingDashboardLayout`。
- 保持原有的业务数据获取逻辑和贡献图 (`ContributionGraph`) 不变。

### 3.5 修改账号绑定逻辑
修改 `apps/web-antd/src/views/_core/profile/user-bind.vue`：
- 在 `platformOptions` 中增加 `{ label: 'CSDN', value: 'csdn' }`。

## 4. 假设与决策 (Assumptions & Decisions)
- **数据来源**：遵照用户选择，CSDN 数据获取由**后端代理**实现，前端只负责定义并调用约定的 API。
- **CSDN 贡献图**：遵照用户选择，CSDN 不展示按天提交的热力贡献图，仅展示核心统计和文章列表。
- **样式统一**：所有图标颜色、边距和文字大小均通过 `StatCard` 等通用组件统一规范，以适配夜间模式并提升移动端兼容性。

## 5. 验证步骤 (Verification steps)
1. **代码检查**：执行 `pnpm run lint` 和 `pnpm run typecheck`，确保组件抽离后 TypeScript 类型和代码风格正常。
2. **回归测试**：在本地开发环境打开 Github 和 LeetCode 看板，确认重构后的样式无异常，加载状态、骨架屏及数据呈现与重构前一致。
3. **功能验证**：
   - 在“账号绑定”中添加 CSDN 用户名。
   - 访问 CSDN 看板，检查 API 调用（F12 Network）是否正确发送到约定路径。
   - 检查界面是否正确渲染出用户数据统计卡片和近期文章列表。