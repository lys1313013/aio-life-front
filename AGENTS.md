# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## 项目概述

AIO Life 是一个一站式生活管理系统，用于记录、追踪和分析个人生活数据。基于 **Vue Vben Admin v5.5.9** 的 **Ant Design Vue** 变体构建，采用 monorepo 架构。

## 技术栈

- **包管理器**: pnpm 10.22.0（monorepo + workspaces）
- **构建编排**: Turborepo
- **框架**: Vue 3 + TypeScript + Vite 7
- **UI 组件库**: Ant Design Vue 4.x
- **样式**: Tailwind CSS
- **图表**: ECharts
- **状态管理**: Pinia
- **测试**: Vitest（单元测试）、Playwright（端到端测试）
- **代码检查**: ESLint、Stylelint、Prettier、Commitlint、cspell
- **Git Hooks**: Lefthook

## 常用命令

```bash
pnpm run dev            # 启动开发服务器
pnpm run build          # 生产环境构建
pnpm run lint           # 代码检查
pnpm run format         # 代码格式化
pnpm run typecheck      # 类型检查
pnpm run check          # 全量检查（循环依赖、依赖、类型、拼写）
pnpm run test:unit      # 运行单元测试
pnpm run test:e2e       # 运行端到端测试
```

## Monorepo 目录结构

- `apps/web-antd/` — 主应用（Ant Design Vue 版）
- `packages/` — 共享包（stores、utils、locales、styles、types、icons）
- `packages/@core/` — 核心框架包（基础组件、UI kits、composables、preferences）
- `packages/effects/` — 效果包（layouts、plugins、hooks、request、access）
- `internal/` — 内部工具（vite-config、tailwind-config、tsconfig、lint-configs）
- `scripts/` — 构建/开发脚本

## 应用架构（`apps/web-antd/src/`）

### API 层（`api/core/`）

- 使用 `#/api/request` 中的 `requestClient`（基于 `@vben/request` 配置的请求客户端）
- API 函数均为具名 async 导出，读取使用 `requestClient.get()`，新增使用 `requestClient.post()`，更新使用 `requestClient.put()`，删除按接口使用 `requestClient.post()` 或 `requestClient.delete()`
- 响应格式：`{ rscode: '0', data: ... }`，成功码为 `'0'`
- 注意：后端返回的 ID 为 **string** 类型

### 路由（`router/routes/modules/`）

- 每个模块有独立的路由文件（如 `dashboard.ts`、`my-hub.ts`、`time-management.ts`）
- 路由使用懒加载：`component: () => import('#/views/...')`
- `#` 别名指向 `apps/web-antd/src/`

### 状态管理（`store/`）

- 使用 Pinia store 管理认证及业务状态（如 `password-vault.ts`）

## 编码规范

1. **适配暗色模式** — 避免将背景色和文字颜色硬编码为纯黑或纯白
2. **适配手机、平板和桌面端** — 所有页面需覆盖三类常见视口，不能只验证手机和电脑；需特别检查平板等中间宽度，避免移动端规则造成弹窗、抽屉、表单或内容区过宽、过疏及比例失衡
3. **遵守 ESLint 规则** — 遵循现有 lint 配置
4. **Loading 最小作用域** — 调用后端接口时必须有可感知的 loading 反馈，并尽可能绑定到实际受影响的最小 UI 单元（按钮、单行或若干行、卡片、局部容器）；只有页面首屏加载或整页数据不可用时才使用全局或整表 loading。局部增删改、排序成功后优先使用接口返回结果更新局部状态，避免无必要的整表或整页刷新；失败时可按数据一致性需要重新查询
5. **Loading 提示语** — 提示语应尽可能简洁、抽象；spinner 或按钮状态足以表达进度时不显示文字，确需文字时优先使用“加载中”“处理中”“保存中”等通用短语，避免“设备加载中”等重复业务对象的描述
6. **后端 ID 为 string** — 后端返回的 ID 类型为 string，不要当作 number 使用
7. **界面简洁、图标优先** — 图标已能清楚表达含义时，只展示图标，不再重复显示按钮文字、平台名称、状态文案或解释性说明。确需解释时，优先收进问号图标的按需提示中，不常驻展示文字。具体约定见下文
8. 确认弹窗尽可能在按钮旁边弹出
9. 编辑弹窗要上下居中（出一些场景要跟手外），编辑弹窗可以没有 title

## 界面表达规范

- **能用图标说清楚，就不加文字**：新增、编辑、刷新、设置等含义明确的操作优先使用纯图标按钮；可辨识的平台图标旁不重复平台名称。账号、金额、日期等实际数据按需保留，不能把“减少文案”理解为隐藏用户需要的信息。
- **说明按需展开，优先问号提示**：不要默认增加副标题、引导语、操作说明、重复的状态标签或 Tooltip。确需补充解释时，优先在相关控件旁放置问号图标，通过悬停、键盘聚焦或点击展示简短提示；移动端需支持点击查看。已有图标和上下文足够清楚时，不再增加问号或提示。只有必须立即看到的信息（如输入错误、操作后果）才直接显示必要文字。
- **减少装饰和层级**：优先使用紧凑列表或简单布局，避免不必要的表格、嵌套卡片、边框和分隔线；用间距、对齐和轻量背景区分内容，留白应服务于阅读与操作。
- **图标保持一致且可辨识**：同类操作使用统一的图标语义、尺寸和风格；品牌图标保留正确的形状与配色，并检查深浅主题及小尺寸下的显示效果。
- **简洁不影响操作**：纯图标按钮保留足够的点击区域、键盘焦点和加载反馈；用不占视觉空间的 `aria-label` 提供操作名称，不因此增加可见文字。需要确认的操作在确认弹窗中清楚说明动作与对象，避免让用户猜测后果。

## 补充架构细节

以下内容涵盖多文件协作才能理解的架构要点。

### 请求客户端行为

`requestClient`（`apps/web-antd/src/api/request.ts`）已配置 `responseReturn: 'data'`，这意味着所有 API 调用返回的是 `{ rscode, data }` 中 `data` 字段的**直接值**，无需手动 `.data`。

关键行为：

- 请求头自动带 `Authorization: Bearer <token>` 和 `Accept-Language`
- token 过期自动刷新，失败后触发 re-authenticate（弹窗或直接登出）
- **全局错误拦截器自动提示**：`errorMessageResponseInterceptor` 对任何请求失败（`rscode != '0'` 或 HTTP 错误）自动 `message.error` 弹出后端错误信息（`result` 字段），无需业务代码再提示
  - 静默例外：`/dashboard/card`、`/message/unread-count` 两个接口及 `rscode === '2001'`（二级锁，由二级锁弹窗处理）
  - **禁止在 catch 里对 requestClient 的 API 调用再写 `message.error('删除失败')` 之类提示**，否则会与全局提示同时弹出两次。catch 块只需做状态回滚/重置等逻辑，或留空
  - catch 里仅允许对**非 API 错误**提示：本地校验、加解密、剪贴板、URL 解析等不走 requestClient 的异常
  - 同一个 try 块混合本地逻辑和 API 调用时，应拆分 try/catch，避免一个 catch 承接两类异常
- `baseRequestClient` 是未经拦截器包装的裸客户端，仅在需要原始响应时使用

### GET 请求自动重试

`requestClient` 内置 **GET 请求自动重试机制**（实现在 `request.ts` 响应拦截器链最前面）：

- **触发条件**：仅 GET 请求，且错误为网络错误 / 超时（无响应）或 HTTP 5xx
- **重试策略**：最多重试 2 次（共 3 次尝试），指数退避（300ms → 600ms）
- **不重试的情况**：POST/PUT/DELETE 等非 GET 请求（避免重复提交）、4xx 客户端错误、业务错误（`rscode != '0'`）、被取消的请求
- 重试全部失败后才会弹出全局错误提示，业务代码无需感知重试过程

### API 层编码模式

所有 API 函数位于 `apps/web-antd/src/api/core/`，按业务领域拆分文件（如 `honor.ts`、`time-tracker.ts`）。模式如下：

```ts
import { requestClient } from '#/api/request';

// 实体类型在此文件内定义并导出
export interface HonorRecordEntity { ... }

// 查询 → requestClient.get
export async function queryHonorRecords() {
  return await requestClient.get<HonorRecordEntity[]>('/honorRecords');
}

// 新增 → requestClient.post
export async function createHonorRecord(data: HonorRecordEntity) { ... }

// 更新 → requestClient.put
export async function updateHonorRecord(data: HonorRecordEntity) { ... }

// 删除 → requestClient.post（批量）或 delete
export async function deleteHonorRecords(idList: string[]) {
  return await requestClient.post<void>('/honorRecords/batchDelete', { idList });
}

// 上传 → requestClient.upload
export async function uploadHonorAttachment(file: File) {
  return await requestClient.upload<FileVO>('/honorRecords/upload-attachment', { file });
}
```

- `FileVO` 类型定义在 `api/core/common.ts`，各模块通过 `import type { FileVO } from './common'` 复用
- 注意：后端 ID 是 **string** 类型

### 接口出入参规范（新模块强制）

历史模块（Honor 等）直接复用 Entity 作为请求 / 响应对象，Entity 上标 `@TableField(exist = false)` 的瞬态字段承接 `fileIds` / `files` 等关联数据。**新模块不再沿用此做法**，应按如下拆分：

- **Entity**：纯表映射，不加瞬态字段；仅在持久化场景使用
- **`XxxRequest`**：请求 DTO，仅含业务入参字段（创建时不含 `id` / `createTime` 等系统字段；更新时按需携带 `id`）
- **`XxxVO`**：响应 VO，含 Entity 字段 + 关联数据（如 `files: FileVO[]`、`commentCount: number`、`userName: string`）
- **详情 VO**：字段多时可单独定义 `XxxDetailVO extends XxxVO`，携带嵌套列表（如 `comments: XxxCommentVO[]`）

前端 API 文件也要对应拆分类型：

```ts
// 类型定义
export interface FeedbackCreateRequest {
  title: string;
  content: string;
  feedbackType: 'BUG' | 'SUGGESTION' | 'QUESTION' | 'OTHER';
  fileIds?: string[];
}

export interface FeedbackVO {
  id: string;
  title: string;
  status: string;
  files: FileVO[];
  // ...
}

// 接口函数
export async function createFeedback(data: FeedbackCreateRequest) {
  return await requestClient.post<FeedbackVO>('/feedback', data);
}

export async function queryMyFeedbacks(params: {
  status?: string;
  page: number;
  size: number;
}) {
  return await requestClient.get<Page<FeedbackVO>>('/feedback/my', { params });
}
```

### 文件 / 附件处理模式

项目**没有**全局 `/file/upload` 接口。每个业务模块各自包装一个 `/<biz>/upload-attachment` 接口，内部统一调用后端 `IFileService.uploadAndSave(file, bizType, bucket, objectName, isPublic)`，文件元信息写入全局 `file` 表。

**统一三步走**：

1. **上传**：前端调 `/<biz>/upload-attachment` → 后端写 `file` 表，`biz_type` 按业务传（如 `honor_record`、`feedback`、`feedback_comment`），此时 `biz_id` 为空
2. **绑定**：业务记录创建 / 更新后，后端调 `fileService.bindBizId(fileIds, bizType, bizId)` 把文件与业务记录关联
3. **查询**：调 `fileService.getByBiz(bizType, bizId)` 反查该业务的所有文件

**前端约定**：

- 业务 API 文件提供 `uploadXxxAttachment(file: File): Promise<FileVO>` 函数，封装业务专属的上传接口
- 业务 Entity / 表单入参包含 `fileIds: string[]`（提交时传给后端用于绑定）
- 业务 Entity 响应包含 `files: FileVO[]`（查询时后端填充）
- 文件展示（尤其图片）需要鉴权时，用 `fetchAuthImageUrl(id)` 或 `useAuthImageUrl` composable

### 路由与权限

路由文件在 `apps/web-antd/src/router/routes/modules/`，按业务模块拆分。meta 常用字段：

- `keepAlive: true` — 页面缓存，离开不销毁
- `maxIdleTime` — 配合 keepAlive，超时后销毁缓存（单位秒）
- `authority: ['admin']` — 权限控制，对应后端返回的 accessCodes
- `order` — 菜单排序
- `icon` — 使用 MDI 图标名（`mdi:xxx`）或 Iconify 格式

### 视图开发模式

标准页面结构可参考 `views/my-hub/honor/index.vue`：

```
<script setup lang="ts">
// 1. 类型导入
import type { HonorRecordEntity } from '#/api/core/honor';

// 2. 框架导入（vue, ant-design-vue, dayjs 等）
// 3. API 函数导入
// 4. 组件导入（GlobalFloatBtn, ImageUpload 等）
// 5. 常量/工具导入

// 6. 状态定义（ref）
// 7. 计算属性（computed）
// 8. 数据加载函数（async loadData）
// 9. onMounted 调用 loadData
// 10. 增删改查方法
</script>
```

- Ant Design Vue 组件**逐个具名导入**，非全局注册
- 时间处理统一用 **dayjs**（非 moment）
- 表单验证用 `ant-design-vue/es/form` 的 `Rule` 类型
- 全局浮动按钮：`<GlobalFloatBtn @click="handleAdd" />`
- 文件上传：`<ImageUpload v-model:file-ids="..." :upload-fn="uploadXxxAttachment" />`，uploadFn 签名为 `(file: File) => Promise<FileVO>`
- 图片显示需要鉴权：用 `fetchAuthImageUrl(id)` 获取带 token 的 blob URL（`utils/file.ts`），或直接使用 `useAuthImageUrl` composable

### Loading 与刷新范围

- 所有后端接口调用都要提供可感知的 loading 反馈，但 loading 默认只覆盖实际受影响的最小范围，不能因为一个局部操作阻塞整个页面
- 单个提交操作使用按钮 loading；单行操作使用该行 loading；批量或拖拽排序使用受影响行集合；卡片或局部列表请求使用对应容器 loading
- 只有页面首屏加载、路由级初始化，或整页数据在请求完成前确实不可用时，才使用全局或整表 loading
- 局部新增、修改、删除、排序成功后，优先让接口返回必要的最新数据并直接更新前端局部状态；不要为了同步展示而无条件重新查询整表或刷新整页
- 请求失败且本地状态无法可靠回滚时，可以重新查询受影响的数据范围；确实无法缩小范围时才退化为整表刷新
- 多个请求可能并发时，不要用一个页面级布尔值混合控制无关区域；按操作、记录 ID 集合或请求计数分别维护 loading 状态

### 暗色模式适配

使用 Tailwind CSS 语义化颜色变量，**不可**硬编码 `#fff` / `#000`：

| 用途     | 类名                    |
| -------- | ----------------------- |
| 页面背景 | `bg-background/50`      |
| 卡片背景 | `bg-card`               |
| 卡片文字 | `text-card-foreground`  |
| 次要文字 | `text-muted-foreground` |
| 次要背景 | `bg-secondary`          |
| 边框     | `border-border`         |

### 响应式适配

所有页面必须支持手机、平板和桌面端，并验证中间宽度下的布局。常见做法：

- 使用 Tailwind 响应式断点：`grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- 过滤器区域用 `flex-wrap`
- 弹窗宽度用百分比或固定 `600px`（移动端 Ant Design Vue 会自动处理）

### 关键依赖

- **dayjs** — 时间处理（非 moment）
- **ECharts** — 图表（通过 vue-echarts 或直接用）
- **d3 / force-graph** — 关系图谱
- **marked** — Markdown 渲染
- **gm-crypto** — 密码管理器加密
- **xe-utils / xlsx** — 表格导出

### 运行单个测试

```bash
pnpm run test:unit -- --run --reporter=verbose path/to/test.test.ts
# 或 watch 模式
pnpm run test:unit path/to/test.test.ts
```
