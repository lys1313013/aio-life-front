# 应用弹窗

业务弹窗统一从 `#/components/app-modal` 导入。外壳共享 `modal.css`：无可见标题和右上角关闭按钮、居中、20px 圆角、模糊遮罩、固定底部操作区、主题变量和窄屏边距。`title` 保留为无障碍名称。

## 页面直接维护表单

```vue
<AppModal
  v-model:open="visible"
  title="编辑记录"
  :confirm-loading="saving"
  @ok="save"
>
  <Form />
  <template #footer-leading>
    <AppModalDelete v-if="record.id" :action="remove" :disabled="saving" />
  </template>
</AppModal>
```

默认底部为取消、保存，点击遮罩可关闭弹窗；仅笔记编辑弹窗显式设置 `:mask-closable="false"`。`ok-text`、`cancel-text`、`ok-button-props`、`cancel-button-props` 可覆盖；保存由业务代码校验并请求接口，成功后关闭。`busy` 或 `confirm-loading` 为真时禁止重复提交和用户关闭。保留 `destroy-on-close`、宽度和其他 Ant Modal 属性的透传；不改变原有数据回填和销毁策略。

## 独立表单组件

父级使用 `:footer="null"`，表单末尾放 `AppModalFooter`：

```vue
<AppModalFooter
  :confirm-loading="saving"
  @cancel="emit('close')"
  @confirm="save"
>
  <template #leading><AppModalDelete v-if="id" :action="remove" /></template>
</AppModalFooter>
```

`AppModalFooter` 将按钮区传送到最近弹窗的固定底部，原组件仍持有事件和状态。普通保存按钮不要使用 `html-type="submit"` 依赖祖先表单，改为在 `@confirm` 调用已有的校验/提交方法。离开弹窗后不会留下按钮，嵌套弹窗互不影响。自定义底部内容可放默认插槽；只需定制按钮区可使用 `AppModalActions`。

`AppModalDelete` 接收异步 `action`，按钮旁确认，等待期间显示 loading 并锁定所在弹窗。业务层仍负责接口错误和成功后的局部数据更新。

详情和选择器使用 `:footer="null"` 且不注册子表单按钮区时，会自动显示“关闭”，避免隐藏 × 后没有退出入口。点选即关闭的选择器可显式使用 `:footer="false"` 隐藏整个底部区域，保留点击遮罩和 Escape 退出。特殊工具按钮放 `toolbar` 插槽；不要重复添加可见标题。

## 表单与 Vben 适配

弹窗 schema 表单使用 `#/adapter/form` 的 `useAppForm`，默认纵向标签、统一间距和控件大小；`columns: 2` 启用双列，480px 以下单列，字段 `formItemClass: 'app-form-full'` 跨整行。页面查询表单继续使用 `useVbenForm`。

Vben 和命令式提示/确认弹窗也默认允许点击遮罩关闭，业务页面不应额外禁用；提交期间仍由 `lock()` 阻止关闭。已有 Vben 弹窗统一从 `#/adapter/modal` 导入 `useVbenModal`。适配层保留 connectedComponent、setData、open、close、lock/unlock 和生命周期，仅设置统一默认外观及共享样式；无需修改 Vben 核心包。提交时先 `validate()` 并检查 `valid`，用 `modalApi.lock()` / `unlock()` 包住异步请求；`submitForm()` 本身不能当作校验失败会抛错的保证。

命令式确认/提示从 `#/adapter/modal-dialog` 导入 `appDialog`。保留确认标题、按钮语义和 Promise 生命周期，共享圆角、遮罩等视觉规范。不要把确认信息隐藏；新删除入口优先使用按钮旁的 `AppModalDelete`。

## 验证

- 公共组件测试覆盖关闭、等待期间禁止操作、嵌套表单按钮区挂载/卸载以及详情关闭入口。
- 修改公共样式需查看活动（schema）、荣誉（Ant 表单）、字典类型或收入（Vben）及含长内容/嵌套选择器的弹窗。
- 检查手机、平板、桌面和暗色；浏览器检查不直接提交或删除现有业务数据。

底部操作区使用透明背景，与弹窗主体保持一致，不单独铺灰色底色。
