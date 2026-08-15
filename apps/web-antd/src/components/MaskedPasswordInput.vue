<script setup lang="ts">
import { computed, ref } from 'vue';

import { EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons-vue';
import { Input } from 'ant-design-vue';

defineOptions({ name: 'MaskedPasswordInput' });

/**
 * 手写密码输入框：用 `type="text"` + CSS 遮罩（-webkit-text-security / text-security）
 * 代替 `type="password"`，把字符渲染成圆点。
 *
 * 浏览器密码管理器只识别 `type="password"` 或带 password 语义 autocomplete 的字段，
 * 本组件是 text 字段 + autocomplete="off"，因此 Chrome/Edge 等完全不介入：
 * 不会自动填充、不会弹「保存密码」、也不会在改密表单里弹「更新密码」。
 * 同时加了 data-lpignore / data-1p-ignore / data-bwignore 让 LastPass / 1Password /
 * Bitwarden 也跳过该字段。
 */

const props = withDefaults(
  defineProps<{
    /** 禁用态 */
    disabled?: boolean;
    /** 占位文案 */
    placeholder?: string;
    /** 输入值（v-model:value） */
    value?: string;
  }>(),
  { disabled: false, placeholder: '', value: '' },
);

const emit = defineEmits<{
  (e: 'update:value', value: string): void;
  (e: 'keydown', ev: KeyboardEvent): void;
}>();

/** 明文 / 密文切换 */
const visible = ref(false);

const innerValue = computed({
  get: () => props.value,
  set: (v: string) => emit('update:value', v),
});
</script>

<template>
  <!--
    遮罩类必须挂在组件自有的包裹 div 上，不能直接挂在 <Input> 上：
    ant Input 会把 class 落到 affix-wrapper 根节点，而 scoped :deep 编译后是
    [data-v-x] .xxx 后代选择器 —— 根节点自身带 data-v 却没有带 data-v 的祖先，
    选择器永远匹配不上，遮罩失效（明文显示）。包裹 div 带本组件 data-v，
    保证选择器命中内部原生 input。
  -->
  <div class="masked-password-input" :class="{ 'is-plain': visible }">
    <Input
      v-model:value="innerValue"
      autocapitalize="off"
      autocomplete="off"
      autocorrect="off"
      data-1p-ignore="true"
      data-bwignore="true"
      data-lpignore="true"
      :disabled="disabled"
      name="secondary-password"
      :placeholder="placeholder"
      spellcheck="false"
      type="text"
      @keydown="emit('keydown', $event)"
    >
      <template #suffix>
        <span
          role="button"
          :aria-label="visible ? '隐藏密码' : '显示密码'"
          class="cursor-pointer text-sm text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          @mousedown.prevent
          @click="visible = !visible"
        >
          <EyeInvisibleOutlined v-if="visible" />
          <EyeOutlined v-else />
        </span>
      </template>
    </Input>
  </div>
</template>

<style scoped>
/* 密文态：选中包裹层里的原生 input，把字符渲染成圆点。
   不用 type="password"，浏览器密码管理器就不介入。 */
.masked-password-input:not(.is-plain) :deep(.ant-input) {
  -webkit-text-security: disc;
  text-security: disc;
}
</style>
