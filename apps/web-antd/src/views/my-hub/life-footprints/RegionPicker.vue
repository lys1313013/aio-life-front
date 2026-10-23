<script setup lang="ts">
import type { SystemRegion } from '#/api/core/system-region';

import { onBeforeUnmount, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Select } from 'ant-design-vue';

import { getRegionChildren, getRegionPath } from '#/api/core/system-region';

const props = defineProps<{ disabled?: boolean; value?: null | string }>();
const emit = defineEmits<{
  change: [path: SystemRegion[]];
  restored: [path: SystemRegion[]];
  'update:value': [value: null | string];
}>();
const labels = ['省份', '市', '区县', '乡镇 / 街道'];
const options = ref<SystemRegion[][]>([[], [], [], []]);
const selected = ref<SystemRegion[]>([]);
const busy = ref<boolean[]>([false, false, false, false]);
const failed = ref(false);
let revision = 0;
onBeforeUnmount(() => revision++);
async function restore() {
  const current = ++revision;
  failed.value = false;
  busy.value = [true, true, true, true];
  try {
    const path = props.value ? await getRegionPath(props.value) : [];
    const lists = await Promise.all([
      getRegionChildren(),
      ...path
        .slice(0, 3)
        .map((item) =>
          item.hasChildren ? getRegionChildren(item.code) : Promise.resolve([]),
        ),
    ]);
    if (current !== revision) return;
    selected.value = path;
    options.value = Array.from({ length: 4 }, (_, i) => lists[i] || []);
    emit('restored', path);
  } catch {
    if (current === revision) failed.value = true;
  } finally {
    if (current === revision) busy.value = [false, false, false, false];
  }
}
async function choose(level: number, code: unknown) {
  const item = options.value[level]?.find((item) => item.code === code);
  const current = ++revision;
  selected.value = [...selected.value.slice(0, level), ...(item ? [item] : [])];
  options.value = options.value.map((items, index) =>
    index > level ? [] : items,
  );
  busy.value = [false, false, false, false];
  failed.value = false;
  emit('update:value', selected.value.at(-1)?.code || null);
  emit('change', selected.value);
  if (!item?.hasChildren || level >= 3) return;
  busy.value[level + 1] = true;
  try {
    const list = await getRegionChildren(item.code);
    if (current !== revision) return;
    options.value[level + 1] = list;
    // 省下只有一个市时直接选中，沿用手选流程加载区县。
    if (level === 0 && list.length === 1) await choose(1, list[0]!.code);
  } catch {
    if (current === revision) failed.value = true;
  } finally {
    if (current === revision) busy.value[level + 1] = false;
  }
}
watch(
  () => props.value,
  (value) => {
    if (
      (selected.value.at(-1)?.code || null) !== (value || null) ||
      options.value[0]?.length === 0
    )
      void restore();
  },
  { immediate: true },
);
</script>

<template>
  <div class="region-picker" data-enter-submit="ignore">
    <div class="region-levels">
      <label
        v-for="(label, index) in labels"
        :key="`label-${index}`"
        :for="`footprint-region-${index}`"
        class="sr-only"
        >{{ label }}</label
      >
      <Select
        v-for="(label, index) in labels"
        :key="label"
        :id="`footprint-region-${index}`"
        :aria-label="label"
        :placeholder="label"
        :value="selected[index]?.code"
        :options="
          options[index]?.map((item) => ({
            value: item.code,
            label: item.name,
          }))
        "
        :loading="busy[index]"
        :disabled="
          disabled ||
          busy[index] ||
          (index > 0 && !selected[index - 1]?.hasChildren)
        "
        allow-clear
        show-search
        option-filter-prop="label"
        @update:value="choose(index, $event)"
      />
    </div>
    <div v-if="failed" class="region-error" role="status">
      <span>地区读取失败</span>
      <Button type="text" size="small" aria-label="重试地区" @click="restore">
        <IconifyIcon icon="mdi:refresh" />
      </Button>
    </div>
  </div>
</template>

<style scoped>
.region-levels {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.region-levels :deep(.ant-select) {
  min-width: 0;
}

.region-error {
  display: flex;
  align-items: center;
  gap: 4px;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}
</style>
