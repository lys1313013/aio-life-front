# 图标本地化

配置入口为 `scripts/icons/local-icons.config.json`。

- `collections`：整集本地化，分别打包，首次打开选择器或展示该集合未预置的图标时按需加载。集合自动加入各业务页面的选择器。
- `icons`：需要首屏直接可用的图标名称，生成精简基础包，包含别名依赖。初始清单来自 2026-09-26 的数据库只读盘点，共 70 个外部图标。
- 自定义 `svg:*` 继续由现有 SVG 注册逻辑处理。其他集合仍允许在线选择，不保证之后新增的在线图标离线可用。

## 新增单个图标或集合

1. 在 `icons` 添加完整名称（如 `mdi:run`），或在 `collections` 添加集合前缀（如 `tabler`）。集合必须存在于固定版本的 `@iconify/json` 中。
2. 执行 `pnpm icons:generate`。脚本校验名称、递归保留别名依赖、去重、保留来源许可信息，并打印原始和 gzip 体积。名称校验失败时不会覆写已有资源。
3. 执行 `pnpm icons:check`，确认生成资源与配置和依赖版本一致。提交配置与 `packages/@core/base/icons/src/local-icons/generated/`，构建发布后生效。根目录 `pnpm build` 自动执行此检查。

请勿手工编辑生成目录。只有构建后的本地资源被部署，浏览器才获得新增图标；数据库写入一个图标名称不会自动修改静态资源。`@iconify/json` 仅用于构建工具，不在运行时请求 npm 或第三方目录。

## 只读检查数据库覆盖

```bash
# Python 3.9+，首次使用安装依赖（可在虚拟环境中运行）
python3 -m pip install PyMySQL
pnpm icons:check-db
# 自定义配置文件；现有环境变量仍优先
pnpm icons:check-db --env-file /path/to/.env
```

默认读取前端仓库上一级 `.env`，使用 `AIO_LIFE_DB_URL`（host:port）、`AIO_LIFE_DB_PASSWORD`，可选 `AIO_LIFE_DB_USERNAME`（默认 aio_life）、`AIO_LIFE_DB_NAME`（默认 aio_life）。脚本不输出密码或连接地址。

检查使用数据库只读事务，覆盖所有名称含 `icon` 的字段，以及 `sys_menu.meta.icon`，排除逻辑删除记录；按实际生成资源核对名称，识别本地 SVG，跳过 Emoji、衣柜内部标识等非 Iconify 值。不扫描任意业务文本中的潜在图标，也不修改数据库或配置。

退出码：0 表示已全部覆盖；1 表示存在遗漏（输出名称及来源字段）；2 表示执行失败。将遗漏图标加入清单后重新生成即可。该检查需要显式执行，不会在普通构建中连接数据库。
