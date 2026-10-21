<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import type { Detail } from '#/api/core/todo';

import { computed, ref, watch } from 'vue';

import {
  CalendarOutlined,
  DeleteOutlined,
  FlagOutlined,
  HolderOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import {
  Button as AButton,
  Checkbox as ACheckbox,
  DatePicker as ADatePicker,
  Dropdown as ADropdown,
  Menu as AMenu,
  MenuItem as AMenuItem,
  Popconfirm as APopconfirm,
  Popover as APopover,
  Spin as ASpin,
  Textarea as ATextarea,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import HomePinButton from '#/components/HomePinButton.vue';

const props = defineProps<{
  detail: Detail;
  hasError: boolean;
  pinning: boolean;
  saving: boolean;
  sorting: boolean;
}>();
const emit = defineEmits<{
  remove: [];
  save: [patch?: Partial<Detail>];
  togglePin: [];
}>();
const content = ref(props.detail.content);
watch(
  () => props.detail.content,
  (value) => {
    content.value = value;
  },
);
const priorities = [
  { value: 1, label: '高', className: 'priority-high' },
  { value: 10, label: '中', className: 'priority-medium' },
  { value: 20, label: '低', className: 'priority-low' },
];
const priorityInfo = (value: number) =>
  priorities.find((priority) => priority.value === value) ?? priorities[2]!;
const timeValue = computed<[Dayjs, Dayjs] | undefined>(() =>
  props.detail.startTime && props.detail.endTime
    ? [dayjs(props.detail.startTime), dayjs(props.detail.endTime)]
    : undefined,
);
const timeLabel = computed(() =>
  [props.detail.startTime, props.detail.endTime]
    .filter(Boolean)
    .map((value) => dayjs(value).format('MM-DD HH:mm'))
    .join(' → '),
);
function onTimeChange(range: [Dayjs, Dayjs] | [string, string]) {
  if (!range) return;
  emit('save', {
    content: content.value,
    startTime: dayjs(range[0]).format('YYYY-MM-DD HH:mm:ss'),
    endTime: dayjs(range[1]).format('YYYY-MM-DD HH:mm:ss'),
  });
}
</script>

<template>
  <div
    class="detail-item home-pin-surface"
    :class="{ completed: detail.isCompleted === 1 }"
  >
    <HolderOutlined
      v-if="detail.isCompleted !== 1"
      class="drag-handle"
      aria-label="拖动排序"
    />
    <ACheckbox
      class="detail-check"
      :checked="detail.isCompleted === 1"
      :disabled="saving || sorting"
      :aria-label="`${detail.isCompleted === 1 ? '恢复' : '完成'}明细：${detail.content}`"
      @update:checked="
        (checked) => emit('save', { content, isCompleted: checked ? 1 : 0 })
      "
    />
    <div class="detail-content">
      <ATextarea
        v-model:value="content"
        :bordered="false"
        :auto-size="{ minRows: 1 }"
        :disabled="saving"
        aria-label="明细内容"
        placeholder="明细内容"
        class="detail-input"
        @blur="emit('save', { content })"
      />
      <div class="detail-toolbar">
        <ADropdown :trigger="['click']" :disabled="saving">
          <AButton
            type="text"
            size="small"
            :class="priorityInfo(detail.priority).className"
            :aria-label="`明细优先级：${priorityInfo(detail.priority).label}`"
          >
            <template #icon><FlagOutlined /></template>
            {{ priorityInfo(detail.priority).label }}
          </AButton>
          <template #overlay>
            <AMenu
              @click="
                ({ key }) => emit('save', { content, priority: Number(key) })
              "
            >
              <AMenuItem v-for="priority in priorities" :key="priority.value">
                <FlagOutlined :class="priority.className" />
                {{ priority.label }}优先级
              </AMenuItem>
            </AMenu>
          </template>
        </ADropdown>
        <APopover
          trigger="click"
          placement="bottomRight"
          :overlay-style="{ maxWidth: 'calc(100vw - 24px)' }"
        >
          <AButton
            type="text"
            size="small"
            :disabled="saving"
            :class="{
              'has-time': detail.startTime || detail.endTime,
            }"
            :aria-label="`明细起止时间${timeLabel ? `：${timeLabel}` : ''}`"
            class="detail-time"
          >
            <template #icon><CalendarOutlined /></template>
            <span v-if="detail.startTime || detail.endTime">{{
              timeLabel
            }}</span>
          </AButton>
          <template #content>
            <div class="time-popover">
              <span>起止时间</span>
              <ADatePicker.RangePicker
                show-time
                :allow-clear="false"
                :value="timeValue"
                format="MM-DD HH:mm"
                :disabled="saving"
                @change="onTimeChange"
              />
            </div>
          </template>
        </APopover>
        <div class="row-actions">
          <ASpin v-if="saving" size="small" aria-label="保存明细中" />
          <AButton
            v-else-if="hasError"
            type="text"
            size="small"
            danger
            aria-label="重试保存明细"
            @click="emit('save', { content })"
          >
            <template #icon><ReloadOutlined /></template>
          </AButton>
          <HomePinButton
            :pinned="detail.isStarred === 1"
            :loading="pinning"
            :disabled="saving"
            reveal-on-hover
            @toggle="emit('togglePin')"
          />
          <APopconfirm
            title="删除这条明细？"
            ok-text="删除"
            cancel-text="取消"
            @confirm="emit('remove')"
          >
            <AButton
              type="text"
              size="small"
              danger
              :disabled="saving"
              aria-label="删除明细"
              class="detail-delete"
            >
              <template #icon><DeleteOutlined /></template>
            </AButton>
          </APopconfirm>
        </div>
      </div>
      <span v-if="hasError" class="save-error" role="alert">{{
        content.trim() ? '修改未保存，请重试' : '明细内容不能为空'
      }}</span>
    </div>
  </div>
</template>

<style scoped>
.detail-item {
  position: relative;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 8px;
  margin: 0 -8px;
  border-radius: 10px;
  transition: background 0.15s ease;
}

.drag-handle {
  position: absolute;
  top: 20px;
  left: -14px;
  color: var(--task-color-text-quaternary);
  cursor: grab;
  opacity: 0;
}

.detail-check {
  margin-top: 5px;
}

.detail-content {
  flex: 1;
  min-width: 0;
}

.detail-input:focus {
  box-shadow: none;
}

.detail-input {
  padding: 0;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.detail-toolbar {
  display: flex;
  flex-wrap: wrap;
  min-height: 32px;
  margin-top: 4px;
  gap: 6px;
  align-items: center;
}

.detail-time {
  max-width: 100%;
  color: var(--task-color-text-quaternary);
}

.detail-time.has-time {
  height: auto;
  min-height: 24px;
  color: var(--task-color-text-secondary);
  white-space: normal;
}

.row-actions {
  display: flex;
  gap: 2px;
  align-items: center;
  margin-left: auto;
}

.detail-delete {
  opacity: 0;
}

.detail-item:hover .drag-handle,
.detail-item:focus-within .drag-handle,
.home-pin-surface:hover .detail-delete,
.home-pin-surface:focus-within .detail-delete,
.detail-delete:focus-visible {
  opacity: 1;
}

.time-popover {
  display: flex;
  gap: 8px;
  flex-direction: column;
  width: min(340px, calc(100vw - 56px));
  font-size: 12px;
  color: var(--task-color-text-secondary);
}

.detail-item:hover,
.detail-item:focus-within {
  background: var(--task-color-fill-quaternary);
}

.detail-toolbar :deep(.ant-btn-sm) {
  padding-inline: 6px;
  font-size: 12px;
}

.priority-high {
  color: var(--task-color-error-text);
}

.priority-medium {
  color: var(--task-color-warning-text);
}

.priority-low {
  color: var(--task-color-text-tertiary);
}

.save-error {
  font-size: 12px;
  color: var(--task-color-error-text);
}

.completed .detail-input {
  color: var(--task-color-text-quaternary);
  text-decoration: line-through;
}

@media (hover: none) {
  .drag-handle,
  .detail-delete {
    opacity: 1;
  }
}

@media (pointer: coarse) {
  .detail-toolbar :deep(.ant-btn) {
    min-width: 32px;
    min-height: 32px;
  }
}
</style>
