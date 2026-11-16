# 查询工作台与数据模型

Web 菜单位于「AI 接入」分组，由业务后端 `/menu/all` 下发：

| 页面 | 路径 | 功能 |
| --- | --- | --- |
| 查询工作台 | `/query/workbench` | 选择数据集与字段、编辑 GraphQL 和 JSON 变量、格式化、验证、执行、表格 / JSON 结果和复制 |
| 数据模型 | `/query/models` | 关系图 / 列表、字段搜索、字段类型与语义、可空性、筛选 / 排序 / 汇总能力、关联、范围限制和 SDL |

模型详情通过 `dataset`、`detail=1` 参数定位；模型与工作台可相互跳转，字段详情可带字段进入新查询。两页使用 `fullPathKey=false`，模型切换不新建标签页；离开后不缓存业务结果。工作台的字段勾选用于单个明细查询，复杂查询和汇总直接编辑 GraphQL。界面表格的分页仅浏览本次已返回结果，查询 `limit` / `offset` 在编辑器中调整。

## 接入与菜单

1. 在 `aio-life-server` 通过现有独立 Flyway 入口执行 `V20261111_01__query_workspace_menus.sql`，补充两个 Web 菜单；不修改已执行种子，不启用移动端菜单。随后重新登录或刷新导航。
2. 同步部署含结构化模型元数据的 Query 网关。页面从目录和单数据集描述接口获取模型，不在客户端维护另一套字段或关系白名单。
3. Vite 默认将 `/query-api` 代理到本机 `127.0.0.1:45680`。`VITE_GLOB_QUERY_URL` 是构建时配置，默认 `/query-api`。
4. 标准 Nginx 镜像只将 `/query-api/api/v1/` 代理到 `aio-life-query:45680`；Web 容器必须与 Query Compose 的 `aio-life-query` 服务加入同一可访问网络。Nginx 使用 Docker DNS 延迟解析，缺少 Query 网关时不阻止 Web 镜像启动。其他代理部署需提供等价的同源转发；不代理网关内部接口。

请求使用当前登录 Bearer，Query 的 `rscode: "0"` 与业务后端 `code: 0` 分别解包。沿用现有 Token 刷新和二级锁弹窗；REST 锁错误携带 `menuPath`，解锁后可重试。查询工作台、数据模型、MCP 入口与对应业务模块的二级锁共同保护只读查询，锁定任一查询页面会阻止通过其他查询入口绕过。

字段类型以实际 SDL 为准，例如日期和 ID 的 GraphQL 类型为 `String`，不虚构 `Date` / `ID` 标量；字段可空性和单位来自服务端模型。关联仅展示公开字段，不展示物理表、SQL、内部关联键和用户隔离键。查询结果中的 ID、金额和汇总字符串保持原值，不转为 JavaScript 数字。

## 本地验证

```bash
pnpm --filter @vben/web-antd typecheck
pnpm exec vitest run apps/web-antd/src/views/data-query/query-document.test.ts --dom
pnpm --filter @vben/web-antd build

# 先在独立终端启动开发服务器；无真实业务读写。
pnpm --filter @vben/web-antd exec vite --mode development --host 127.0.0.1 --port 5671 --strictPort
QUERY_WEB_ORIGIN=http://127.0.0.1:5671 node scripts/e2e/data-query.mjs
```

浏览器脚本需要已安装的 Playwright Chromium，使用公开模型快照和虚构数据，覆盖手机 / 平板 / 桌面、深浅主题、变量错误、查询验证、执行、空结果、单条、多条、失败重试、长文本和刷新布局稳定；截图保存在 `node_modules/.cache/data-query/`。快照仅供测试，不作为页面元数据来源，也不代表真实账号联调通过。
