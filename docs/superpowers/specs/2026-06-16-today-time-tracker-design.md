# 今日时迹卡片设计规格说明书 (Design Spec)

## 1. 目标与背景 (Context & Goals)
当前首页的“今日时迹”卡片 (`AnalyticsTimeTracker`) 仅展示一个 ECharts 饼图，视觉上显得比较空旷。
**目标**：采用“饼图 + 最新记录列表”的组合布局（选项 B），在左侧展示原有饼图，在右侧展示当天最新的 3-5 条具体时迹记录，使用户不仅能看到时间分配比例，还能快速回顾自己刚刚做了什么。

## 2. 方案概述 (Architecture & Approach)
在 `apps/web-antd/src/views/dashboard/home/analytics-time-tracker.vue` 中进行修改：
1.  **数据层**：当前组件已经通过 `query({ condition: { date: today } })` 获取了当天的所有记录 (`recordsRes.items`)。我们将对这些记录进行排序（按结束时间或开始时间倒序），截取前 3-5 条作为“最新记录”数据源。
2.  **视图层**：
    *   将最外层容器修改为 Flex 布局（横向排列）。
    *   **左侧 (饼图区)**：占据部分空间（例如 50% 或固定宽度），保留现有的 ECharts 饼图渲染逻辑。根据空间变化，可能需要微调饼图的 `radius` 和 `center` 属性，使其在变窄的区域内居中显示。
    *   **右侧 (列表区)**：占据剩余空间，使用 Vue 模板渲染一个列表。列表项展示：时间段（格式化为 `HH:mm - HH:mm`）、分类名称、甚至可以加上分类对应的颜色标识（小圆点）。如果无记录，则显示“暂无最新记录”的占位提示。
3.  **样式层**：使用 Tailwind CSS 进行布局，确保响应式适配。在极小屏幕下（移动端），可以考虑将 Flex 布局从横向（`flex-row`）切换为纵向（`flex-col`），或者仅仅在 PC 端展示右侧列表。由于这是首页卡片，需要遵守 `style.md` 中的规范（适配移动端和夜间模式）。

## 3. 详细设计 (Detailed Design)

### 3.1 数据处理
*   在 `loadData` 方法中，解析 `records` 后，增加一段逻辑：
    ```typescript
    // 对 records 按开始时间或结束时间降序排列
    const sortedRecords = [...records].sort((a, b) => b.startTime - a.startTime);
    // 截取前 5 条
    recentRecords.value = sortedRecords.slice(0, 5).map(record => {
      // 需要关联 category 信息，以获取名称和颜色
      const category = categories.find(c => c.id === record.categoryId);
      return {
        ...record,
        categoryName: category?.name || '未知',
        categoryColor: category?.color || '#ccc',
        // 时间格式化 (假设 startTime 和 endTime 是 Unix 时间戳或可被 dayjs 解析的字符串)
        timeRangeStr: `${dayjs(record.startTime).format('HH:mm')} - ${dayjs(record.endTime).format('HH:mm')}`
      };
    });
    ```
*   需引入 `ref` 定义 `recentRecords` 并在模板中使用。

### 3.2 布局调整 (模板部分)
```html
<template>
  <div v-loading="loading" class="flex h-full min-h-[240px] w-full flex-col sm:flex-row sm:min-h-[220px] lg:min-h-[180px]">
    <!-- 左侧饼图 -->
    <div class="flex-1 sm:w-1/2 relative min-h-[180px]">
      <EchartsUI ref="chartRef" />
    </div>
    <!-- 右侧最新记录列表 -->
    <div class="flex-1 sm:w-1/2 flex flex-col p-2 overflow-y-auto border-t sm:border-t-0 sm:border-l border-border mt-2 sm:mt-0">
      <div class="text-sm font-semibold mb-2 text-foreground">最近记录</div>
      <div v-if="recentRecords.length > 0" class="flex flex-col gap-2">
        <div v-for="record in recentRecords" :key="record.id" class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: record.categoryColor }"></span>
            <span class="text-muted-foreground">{{ record.timeRangeStr }}</span>
          </div>
          <span class="text-foreground truncate max-w-[100px]">{{ record.categoryName }}</span>
        </div>
      </div>
      <div v-else class="text-xs text-muted-foreground flex items-center justify-center h-full">
        暂无记录
      </div>
    </div>
  </div>
</template>
```
*(注：具体 Tailwind 类名需结合实际效果微调，特别是边界颜色、间距等，以契合现有主题。)*

### 3.3 ECharts 配置调整
由于容器宽度变窄，饼图的配置需要调整：
*   `radius`: 可能需要稍微缩小，例如 `['25%', '50%']`。
*   `center`: 调整为 `['50%', '50%']` 居中。
*   `label`: 可能需要简化或隐藏，避免文字重叠。由于右侧已有图例性质的列表，饼图上可以只显示主要类别或不显示指引线，具体视渲染效果而定。

## 4. 边界条件与错误处理 (Edge Cases)
*   **移动端适配**：使用 `flex-col sm:flex-row` 确保在手机上饼图在上方，列表在下方；PC 端左右并排。
*   **空数据状态**：虽然外层 `home/index.vue` 已经判断了 `timeTrackerHasData`，但如果今天只有 1 条几分钟的记录，饼图渲染占位，右侧列表也需正常显示该条记录。
*   **暗黑模式**：使用 Tailwind 的语义化颜色（如 `text-foreground`, `border-border`），确保在暗黑模式下表现正常。
*   **长文本截断**：活动分类名称可能过长，右侧列表需使用 `truncate` 防止布局被撑破。

## 5. 测试与验证 (Testing)
1.  进入首页，查看今日时迹卡片，确认左右/上下布局生效。
2.  确认右侧列表中展示的记录不超过 5 条，且按时间倒序排列，时间格式化正确，颜色圆点与分类颜色匹配。
3.  调整浏览器窗口大小，验证响应式布局（移动端变为上下排布）。
4.  切换夜间模式，验证文字和边框颜色是否正常。
