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
- API 函数均为具名 async 导出，CRUD 操作使用 `requestClient.post()`，读取使用 `requestClient.get()`
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
