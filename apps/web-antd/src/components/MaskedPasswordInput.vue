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

/**
 * 密文态给组件挂类名。ant Input 带 suffix 时，组件 class 会落到外层
 * affix-wrapper span 上，由下方 :deep 规则选中内部原生 input 施加 CSS 遮罩。
 * 不用 :style / input-class-name：前者落在外层 span，后者被 ant Input 覆盖丢弃。
 */
const maskedClassName = computed(() =>
  visible.value ? undefined : 'masked-password-input',
);

const innerValue = computed({
  get: () => props.value,
  set: (v: string) => emit('update:value', v),
});
</script>

<template>
  <Input
    v-model:value="innerValue"
    autocapitalize="off"
    autocomplete="off"
    autocorrect="off"
    data-1p-ignore="true"
    data-bwignore="true"
    data-lpignore="true"
    :class="maskedClassName"
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
</template>

<style scoped>
/* 密文态：选中外层 affix-wrapper 里的原生 input，把字符渲染成圆点。
   不用 type="password"，浏览器密码管理器就不介入。 */
:deep(.ant-input-affix-wrapper.masked-password-input .ant-input) {
  -webkit-text-security: disc;
  text-security: disc;
}
</style>
