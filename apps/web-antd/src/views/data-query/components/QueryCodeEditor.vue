<script setup lang="ts">
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{ label: string; modelValue: string; readonly?: boolean }>(),
  { readonly: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const gutter = ref<HTMLElement>();
const lines = computed(() => props.modelValue.split('\n').length);

function indent(event: KeyboardEvent) {
  if (props.readonly) return;
  const input = event.target as HTMLTextAreaElement;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  emit(
    'update:modelValue',
    `${props.modelValue.slice(0, start)}  ${props.modelValue.slice(end)}`,
  );
  requestAnimationFrame(() => {
    input.selectionStart = input.selectionEnd = start + 2;
  });
}
</script>

<template>
  <div class="query-code-editor">
    <div ref="gutter" class="query-code-gutter" aria-hidden="true">
      <div v-for="line in lines" :key="line">{{ line }}</div>
    </div>
    <textarea
      :aria-label="label"
      :value="modelValue"
      :readonly="readonly"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      wrap="off"
      @input="
        emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)
      "
      @scroll="
        gutter &&
        (gutter.scrollTop = ($event.target as HTMLTextAreaElement).scrollTop)
      "
      @keydown.tab.prevent="indent"
    ></textarea>
  </div>
</template>

<style scoped>
.query-code-editor {
  display: flex;
  height: 360px;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 24px;
}
.query-code-gutter {
  flex: 0 0 42px;
  padding: 14px 10px;
  overflow: hidden;
  color: hsl(var(--muted-foreground));
  text-align: right;
  background: hsl(var(--muted) / 40%);
  user-select: none;
}
textarea {
  flex: 1;
  width: 0;
  min-width: 0;
  padding: 14px;
  overflow: auto;
  color: hsl(var(--foreground));
  resize: none;
  outline: none;
  background: transparent;
  border: 0;
  tab-size: 2;
}
textarea:focus-visible {
  box-shadow: inset 0 0 0 2px hsl(var(--primary) / 40%);
}
</style>
