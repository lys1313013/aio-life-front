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

## 自定义运动图标

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

健身房动作图标为项目原创 SVG，采用人物姿势与器械轮廓，继承 `currentColor`。

| 动作 | 图标 |
| --- | --- |
| 高位下拉 | `svg:lat-pulldown` |
| 坐姿划船 | `svg:seated-row` |
| 哑铃推举 | `svg:dumbbell-shoulder-press` |
| 哑铃侧平举 | `svg:dumbbell-lateral-raise` |
| 绳索面拉 | `svg:cable-face-pull` |
| 腿举 | `svg:leg-press` |
| 腿屈伸 | `svg:leg-extension` |
| 腿弯举 | `svg:leg-curl` |
| 罗马尼亚硬拉 | `svg:romanian-deadlift` |
| 臀推 | `svg:hip-thrust` |
| 绳索下压 | `svg:cable-triceps-pushdown` |
| 椭圆机 | `svg:elliptical-trainer` |

新增图标已加入运动预设；移动端通过 `npm run icons:sync` 同步，不复制或手改生成目录。

动作图标审校要点：罗马尼亚硬拉突出髋后移、轻屈膝和直臂下垂；臀推突出上背靠凳、抬髋后的肩髋膝连线及骨盆处负重；面拉把手拉向面部、肘后移；椭圆机突出站姿、长踏板和活动扶手，不绘制车座。腿弯举使用俯卧变式，腿屈伸使用坐姿伸膝轮廓。器械线条避免穿过躯干，拉索与握持点、脚与踏板应连接。

姿势参考：[NSCA 罗马尼亚硬拉](https://dxpprod.nsca.com/education/articles/kinetic-select/romanian-deadlift-rdl/)、[NASM 面拉](https://www.nasm.org/resource-center/exercise-library/face-pull)、[StrengthLog 臀推](https://www.strengthlog.com/hip-thrust/)。SVG 为原创概括图形，不复制参考图。以 20–24px 分类识别为主，16px 需结合名称；静态小图不用于表达完整动作过程，也不能单独区分所有动作变式。


## 微信读书品牌图标

菜单图标填写 `svg:weread`，显示固定蓝底白色细节，不随菜单文字或主题变色。图形沿用 Simple Icons 的 WeRead 图标。
