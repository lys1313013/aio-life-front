# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 补充架构细节

以下内容是对 `AGENTS.md` 的补充，涵盖多文件协作才能理解的架构要点。

### 请求客户端行为

`requestClient`（`apps/web-antd/src/api/request.ts`）已配置 `responseReturn: 'data'`，这意味着所有 API 调用返回的是 `{ rscode, data }` 中 `data` 字段的**直接值**，无需手动 `.data`。

关键行为：
- 请求头自动带 `Authorization: Bearer <token>` 和 `Accept-Language`
- token 过期自动刷新，失败后触发 re-authenticate（弹窗或直接登出）
- 全局错误拦截器会 `message.error` 提示，但 `/dashboard/card` 和 `/message/unread-count` 两个接口**静默忽略错误**
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
