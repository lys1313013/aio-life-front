# @vben/icons

用于多个 `app` 公用的图标文件，继承了 `@vben-core/icons` 的所有能力。业务上有通用图标可以放在这里。

## 用法

### 添加依赖

```bash
# 进入目标应用目录，例如 apps/xxxx-app
# cd apps/xxxx-app
pnpm add @vben/icons
```

### 使用

```ts
import { X } from '@vben/icons';
```

# 自定义运动图标

健腹轮图标：`svg:ab-wheel`。SVG 使用 `currentColor`，可随文字颜色适配主题。

在运动分类的图标配置中填写 `svg:ab-wheel`，或在 Vue 中使用：

```vue
<script setup lang="ts">
import { SvgAbWheelIcon } from '@vben/icons';
</script>

<template>
  <SvgAbWheelIcon class="size-6" />
</template>
```

也可以通过 `createIconifyIcon('svg:ab-wheel')` 创建组件。
