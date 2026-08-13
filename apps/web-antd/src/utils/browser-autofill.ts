/**
 * 阻止浏览器密码管理器对敏感字段（如二级密码）的干扰。
 *
 * 原理：Chrome/Edge 等浏览器的密码管理器会跳过 readonly 字段——
 * 既不自动填充，也不在提交时收集该字段并弹出「保存 / 更新密码」提示。
 * 让输入框初始为 readonly，用户 focus 时才移除 readonly，即可正常输入。
 *
 * 用法：
 * ```vue
 * <InputPassword
 *   v-model:value="password"
 *   autocomplete="new-password"
 *   readonly
 *   @focus="unlockPasswordInput"
 * />
 * ```
 */
export function unlockPasswordInput(e: FocusEvent) {
  const el = e.target as HTMLInputElement | null;
  if (el && el.readOnly) {
    el.removeAttribute('readonly');
  }
}
