# 移动端/iPad 图片加载 401 问题

## 现象

桌面端浏览器图片正常显示，手机浏览器（Safari / Chrome）和 iPad 上图片不展示。浏览器控制台报错：

```
Failed to load resource: the server responded with a status of 401 (Unauthorized)
GET http://localhost:5666/api/file/preview/xxx
```

## 原因

图片通过 `<img>` 标签（或 Ant Design Vue 的 `<Image>` 组件）加载时，走的是**浏览器原生请求**，不会携带 `Authorization: Bearer <token>` 认证头。

而后端 `/api/file/preview/{fileId}` 接口要求认证。桌面端之所以能显示，是因为 Vite 开发服务器在代理请求时转发了同域 session cookie；手机/iPad 访问的是局域网 IP（如 `192.168.x.x:5666`），cookie 域名不匹配，代理请求不带认证信息，后端返回 401。

本质上：**API 请求通过 `requestClient` 自动附加 Bearer token，但 `<img>` 标签发起的图片请求是裸请求，没有任何认证信息。**

## 解决方案

不再直接使用 `/api/file/preview/{fileId}` 作为 `<img>` 的 `src`，而是在组件中通过带认证头的 `fetch` 下载图片，转为 blob URL 后使用。

### Web 端（Vue 3 + Vite）

**工具层** — `apps/web-antd/src/utils/file.ts`：

```ts
// 原有：生成 API 路径（仅用于 fetchAuthImageUrl 内部）
export const getFilePreviewUrl = (fileId) => `${baseUrl}/file/preview/${fileId}`;

// 新增：带认证头下载，缓存 blob URL
export async function fetchAuthImageUrl(fileId): Promise<string> {
  const url = getFilePreviewUrl(fileId);
  const token = useAccessStore().accessToken;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
```

**组件层** — 两种使用方式：

| 场景 | 方式 | 文件 |
|------|------|------|
| 单个图片、不在 v-for 中 | 用 `useAuthImageUrl(fileId)` 组合式函数 | `composables/useAuthImageUrl.ts` |
| v-for 循环中 | 用 `<AuthImage :file-id="item.fileId" />` 组件 | `components/AuthImage.vue` |
| Options API 组件 | 在 data 中维护 `authImageUrls` 字典，调用 `fetchAuthImageUrl` 预加载 | `device/index.vue` |

### Uni-app 端

**工具层** — `apps/mobile-uniapp/src/utils/file.ts`：

```ts
// 使用 uni.request 带 token 下载，返回 base64 data URL
export async function fetchAuthImageUrl(fileId): Promise<string> {
  const token = useUserStore().token;
  const res = await uni.request({
    url: getFilePreviewUrl(fileId),
    header: { Authorization: `Bearer ${token}` },
    responseType: 'arraybuffer',
  });
  const base64 = uni.arrayBufferToBase64(res.data);
  return `data:${res.header['content-type']};base64,${base64}`;
}
```

页面中在 `loadData` 后预加载所有图片，并用响应式字典 `authImageUrls` 存储，模板中通过 `getAuthImageUrl(fileId)` 获取。

### 涉及页面

- 衣柜、设备墙、荣誉、观影、阅读、时迹关联记录、关系图谱

## 注意事项

1. **blob URL 内存管理**：`fetchAuthImageUrl` 内置模块级缓存（Map），同一 fileId 只下载一次。页面刷新后缓存自动释放。
2. **Upload 组件的预览**：表单中的 Upload 组件通过设置 `fileList[].url` 使用 blob URL，编辑已有记录时需异步设置。
3. **不要回退**：新增图片相关功能时，始终使用 `fetchAuthImageUrl` 或 `useAuthImageUrl`，不要直接用 `getFilePreviewUrl` 作为 img src。
