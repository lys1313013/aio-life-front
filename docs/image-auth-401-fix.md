# 私有图片鉴权与缓存

## 问题与边界

`img`／Ant Design Vue `Image` 发起浏览器原生请求，不会继承 `requestClient` 的 `Authorization` 请求头。私有 `/api/file/preview/{id}` 直接作为 `src` 时可能返回 401；某台设备因 Cookie 或代理配置能显示，不代表跨设备鉴权正确。

先区分公开资源与私有文件。头像等公开资源按后端返回的公开地址加载；私有图片通过带 Bearer 的下载入口取得本地地址。不能把 Token 拼入 URL，也不能通过放开私有预览权限解决显示问题。

## Web 使用方式

| 场景 | 入口 |
| --- | --- |
| 单张响应式图片 | [useAuthImageUrl](../apps/web-antd/src/composables/useAuthImageUrl.ts) |
| 列表图片 | [AuthImage](../apps/web-antd/src/components/AuthImage.vue) |
| 上传控件预览或其他业务 | [fetchAuthImageUrl](../apps/web-antd/src/utils/file.ts) |

```ts
import { useAuthImageUrl } from '#/composables/useAuthImageUrl';

const { blobUrl, loading, error } = useAuthImageUrl(() => record.value?.fileId);
```

`fetchAuthImageUrl` 检查 HTTP 状态后生成 Blob URL；按文件 ID 合并进行中的请求，缓存最多 100 项，淘汰与 `clearImageCache` 会回收 URL。不要在组件中复制精简版下载函数，也不要另建无界缓存或自行回收仍由公共缓存持有的地址。文件变化需要更新预览时调用公共缓存清理入口。

图片调用提供局部 loading 和失败重试；记录切换或组件卸载后，过期下载结果不能覆盖新记录。文件 ID 保持字符串，不能转换为数字。

## 独立移动端

旧的 `apps/mobile-uniapp` 路径已不适用。现有客户端位于独立 `aio-life-mobile` 仓库，通过 `src/services/attachments.ts` 的 `authFileUrl(id)` 使用 `uni.downloadFile`，在请求头携带 Bearer，返回临时文件路径；完成后检查账号仍为发起下载的账号，401 清理会话。

移动端规则见[开发规范](../../aio-life-mobile/AGENTS.md)和[功能与接口](../../aio-life-mobile/docs/功能与接口.md)；独立克隆 Web 时可查看[移动仓库](https://github.com/lys1313013/aio-life-mobile)。Web Blob 缓存不等于移动端临时文件缓存，不能将浏览器实现直接复制到 App。
