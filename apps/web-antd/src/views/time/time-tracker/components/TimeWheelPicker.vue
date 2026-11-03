<script setup lang="ts">
import type { Dayjs } from 'dayjs';

import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

import { Popover } from 'ant-design-vue';
import dayjs from 'dayjs';

import { clampTimeSelection } from '../time-selection';

defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    disabled?: boolean;
    inputReadOnly?: boolean;
    label: string;
    max?: number;
    min?: number;
    showNow?: boolean;
    value?: Dayjs;
  }>(),
  { min: 0, max: 1439, value: undefined },
);
const emit = defineEmits<{
  'update:value': [value: Dayjs];
}>();
const open = ref(false);
// 滚轮和手输只更新草稿，确认后才写入父表单。
const selected = ref(0);
const inputText = computed(() =>
  open.value ? draftTime().format('HH:mm') : props.value?.format('HH:mm') || '',
);
const hourColumn = ref<HTMLElement>();
const minuteColumn = ref<HTMLElement>();
const hours = Array.from({ length: 24 }, (_, i) => i);
// 绝对分钟连续排列：09:59 的下一行就是 10:00，不把跨小时误判成跳选。
const minutes = Array.from({ length: 1440 }, (_, i) => i);
const rowHeight = 32;
const available = computed(() => props.min <= props.max && !props.disabled);
const nowMinute = ref(0);
let resizeObserver: ResizeObserver | undefined;
let scrollTimer: ReturnType<typeof setTimeout> | undefined;
let clockTimer: ReturnType<typeof setInterval> | undefined;

function isDisabled(value: number) {
  return !available.value || value < props.min || value > props.max;
}
function hourDisabled(hour: number) {
  return (
    !available.value || hour * 60 > props.max || hour * 60 + 59 < props.min
  );
}
function updateClock() {
  const now = dayjs();
  nowMinute.value = now.hour() * 60 + now.minute();
}
function alignColumns() {
  if (hourColumn.value)
    hourColumn.value.scrollTop = Math.floor(selected.value / 60) * rowHeight;
  if (minuteColumn.value)
    minuteColumn.value.scrollTop = selected.value * rowHeight;
}
function updateSelection(value: number) {
  selected.value = clampTimeSelection(value, props.min, props.max);
}
function draftTime() {
  return (props.value || dayjs()).startOf('day').add(selected.value, 'minute');
}
function confirmSelection() {
  if (isDisabled(selected.value)) return;
  emit('update:value', draftTime());
  open.value = false;
}
function select(value: number) {
  clearTimeout(scrollTimer);
  if (!available.value) return;
  updateSelection(value);
  alignColumns();
}
function selectHour(hour: number) {
  if (!hourDisabled(hour)) select(hour * 60 + (selected.value % 60));
}
function onScroll(field: 'hour' | 'minute', event: Event) {
  if (!open.value || !available.value) return;
  const column = event.target as HTMLElement;
  const expected =
    (field === 'hour' ? Math.floor(selected.value / 60) : selected.value) *
    rowHeight;
  // 另一列的联动定位不参与当前列的吸附计时。
  if (Math.abs(column.scrollTop - expected) < 1) return;
  clearTimeout(scrollTimer);
  const index = Math.round(column.scrollTop / rowHeight);
  const value = clampTimeSelection(
    field === 'hour' ? index * 60 + (selected.value % 60) : index,
    props.min,
    props.max,
  );
  if (value !== selected.value) updateSelection(value);
  if (field === 'minute' && hourColumn.value) {
    hourColumn.value.scrollTop = Math.floor(selected.value / 60) * rowHeight;
  } else if (field === 'hour' && minuteColumn.value) {
    minuteColumn.value.scrollTop = selected.value * rowHeight;
  }
  scrollTimer = setTimeout(() => {
    if (open.value) alignColumns();
  }, 100);
}
function onKey(field: 'hour' | 'minute', event: KeyboardEvent) {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
  event.preventDefault();
  select(
    selected.value +
      (event.key === 'ArrowUp' ? -1 : 1) * (field === 'hour' ? 60 : 1),
  );
}
function selectAndClose(value: number) {
  if (isDisabled(value)) return;
  select(value);
  confirmSelection();
}
async function changeInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const match = /^(\d{1,2}):(\d{2})$/.exec(input.value);
  if (match && Number(match[1]) < 24 && Number(match[2]) < 60) {
    const value = Number(match[1]) * 60 + Number(match[2]);
    if (!isDisabled(value)) {
      // 键盘聚焦后手输也要显示确认入口。
      if (!open.value) {
        open.value = true;
        await nextTick();
      }
      select(value);
    }
  }
  input.value = inputText.value;
}
function useNow() {
  updateClock();
  selectAndClose(nowMinute.value);
}
function cancelOnEscape(event: KeyboardEvent) {
  if (!open.value) return;
  event.stopPropagation();
  open.value = false;
}
watch(
  () => props.value,
  (value) => {
    if (!open.value) return;
    const next = clampTimeSelection(
      value ? value.hour() * 60 + value.minute() : props.min,
      props.min,
      props.max,
    );
    // 外部值变化时重置草稿，相同值不打断正在进行的滚动。
    if (next === selected.value) return;
    clearTimeout(scrollTimer);
    selected.value = next;
    alignColumns();
  },
  { immediate: true },
);
watch(open, async (visible) => {
  clearTimeout(scrollTimer);
  clearInterval(clockTimer);
  if (!visible) return;
  updateClock();
  clockTimer = setInterval(updateClock, 1000);
  selected.value = clampTimeSelection(
    props.value ? props.value.hour() * 60 + props.value.minute() : props.min,
    props.min,
    props.max,
  );
  await nextTick();
  alignColumns();
});
// Popover 内容延迟挂载时也要对齐滚轮。
watch(
  [hourColumn, minuteColumn],
  () => {
    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(() => {
      if (open.value) alignColumns();
    });
    for (const column of [hourColumn.value, minuteColumn.value]) {
      if (column) resizeObserver.observe(column);
    }
    alignColumns();
  },
  { flush: 'post' },
);
watch(
  () => [props.min, props.max, props.disabled],
  () => {
    if (!available.value) open.value = false;
    else if (open.value) select(selected.value);
  },
);
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  clearTimeout(scrollTimer);
  clearInterval(clockTimer);
});
</script>

<template>
  <Popover
    v-model:open="open"
    trigger="click"
    placement="bottom"
    :arrow="false"
  >
    <template #content>
      <div
        class="time-wheel-panel"
        :style="{ '--time-wheel-row-height': `${rowHeight}px` }"
        role="dialog"
        :aria-label="`选择${label}`"
        data-enter-submit="ignore"
        @keydown.esc.stop="open = false"
      >
        <div class="time-wheel-columns">
          <div
            ref="hourColumn"
            class="time-wheel-column"
            role="listbox"
            aria-label="小时"
            tabindex="0"
            @scroll="onScroll('hour', $event)"
            @keydown="onKey('hour', $event)"
          >
            <button
              v-for="hour in hours"
              :key="hour"
              type="button"
              role="option"
              tabindex="-1"
              :aria-selected="Math.floor(selected / 60) === hour"
              :disabled="hourDisabled(hour)"
              @click="selectHour(hour)"
            >
              {{ String(hour).padStart(2, '0') }}
            </button>
          </div>
          <div
            ref="minuteColumn"
            class="time-wheel-column"
            role="listbox"
            aria-label="分钟"
            tabindex="0"
            @scroll="onScroll('minute', $event)"
            @keydown="onKey('minute', $event)"
          >
            <button
              v-for="minute in minutes"
              :key="minute"
              type="button"
              role="option"
              tabindex="-1"
              :aria-label="`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`"
              :aria-selected="selected === minute"
              :disabled="isDisabled(minute)"
              @click="select(minute)"
            >
              {{ String(minute % 60).padStart(2, '0') }}
            </button>
          </div>
        </div>
        <div class="time-wheel-toolbar">
          <button type="button" @click="open = false">取消</button>
          <button
            v-if="showNow"
            type="button"
            :aria-label="`${label}设为此刻`"
            :disabled="isDisabled(nowMinute)"
            @click="useNow"
          >
            此刻
          </button>
          <button
            type="button"
            :disabled="isDisabled(selected)"
            @click="confirmSelection"
          >
            确认
          </button>
        </div>
      </div>
    </template>
    <input
      v-bind="$attrs"
      :value="inputText"
      :aria-label="label"
      :readonly="inputReadOnly"
      :disabled="!available"
      aria-haspopup="dialog"
      :aria-expanded="open"
      inputmode="numeric"
      data-enter-submit="ignore"
      @change="changeInput"
      @keydown.enter.prevent
      @keydown.esc="cancelOnEscape"
    />
  </Popover>
</template>

<style scoped>
.time-wheel-panel {
  width: 224px;
  color: hsl(var(--foreground));
}

.time-wheel-toolbar {
  display: flex;
  justify-content: space-between;
}

.time-wheel-toolbar button {
  min-width: 44px;
  height: 44px;
  color: hsl(var(--primary));
}

.time-wheel-toolbar button:first-child {
  color: hsl(var(--muted-foreground));
}

.time-wheel-columns {
  position: relative;
  display: flex;
}

.time-wheel-column {
  z-index: 1;
  width: 50%;
  height: calc(var(--time-wheel-row-height) * 7);
  padding-block: calc(var(--time-wheel-row-height) * 3);
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.time-wheel-column::-webkit-scrollbar {
  display: none;
}

.time-wheel-column button {
  display: block;
  width: 100%;
  height: var(--time-wheel-row-height);
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}

.time-wheel-column button[aria-selected='true'] {
  color: hsl(var(--primary));
  font-weight: 600;
}

.time-wheel-panel button:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.time-wheel-column:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: -2px;
}
</style>
