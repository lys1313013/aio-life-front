# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 补充架构细节

以下内容是对 `AGENTS.md` 的补充，涵盖多文件协作才能理解的架构要点。

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
export async function deleteHonorRecords(idList: number[]) {
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

export async function queryMyFeedbacks(params: { status?: string; page: number; size: number }) {
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
- `backTop: false` — 禁用返回顶部按钮
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

| 用途 | 类名 |
|---|---|
| 页面背景 | `bg-background/50` |
| 卡片背景 | `bg-card` |
| 卡片文字 | `text-card-foreground` |
| 次要文字 | `text-muted-foreground` |
| 次要背景 | `bg-secondary` |
| 边框 | `border-border` |

### 移动端适配

所有页面必须支持移动端。常见做法：
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
