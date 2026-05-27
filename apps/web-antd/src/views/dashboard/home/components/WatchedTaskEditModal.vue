<script lang="ts" setup>
import type { WatchedTaskDetail } from '#/api/core/dashboard';

import { ref, watch } from 'vue';

import { VbenIcon } from '@vben/common-ui';

import {
  Button as AButton,
  DatePicker as ADatePicker,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  Modal as AModal,
  Select as ASelect,
  SelectOption as ASelectOption,
  message,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  starTaskDetail,
  unstarTaskDetail,
  updateTaskDetail,
} from '#/api/core/todo';

const props = defineProps<{
  task: null | WatchedTaskDetail;
  visible: boolean;
}>();

const emit = defineEmits(['update:visible', 'success']);

const loading = ref(false);
const formState = ref<any>({
  content: '',
  priority: 10,
  timeRange: [] as any[],
  isStarred: 1, // 默认为关注状态
});

watch(
  () => props.visible,
  (val) => {
    if (val && props.task) {
      formState.value = {
        content: props.task.content,
        priority: props.task.priority || 10,
        timeRange:
          props.task.startTime && props.task.endTime
            ? [dayjs(props.task.startTime), dayjs(props.task.endTime)]
            : [],
        isStarred: props.task.isStarred ?? 1,
      };
    }
  },
);

const handleCancel = () => {
  emit('update:visible', false);
};

const handleOk = async () => {
  if (!props.task) return;
  if (!formState.value.content?.trim()) {
    message.warning('请输入明细内容');
    return;
  }

  try {
    loading.value = true;
    const [startTime, endTime] = formState.value.timeRange || [];
    await updateTaskDetail({
      id: props.task.id,
      taskId: props.task.taskId,
      content: formState.value.content,
      priority: formState.value.priority,
      startTime: startTime
        ? startTime.format('YYYY-MM-DD HH:mm:ss')
        : undefined,
      endTime: endTime ? endTime.format('YYYY-MM-DD HH:mm:ss') : undefined,
    });

    // 如果关注状态发生改变，则调用对应接口
    if (formState.value.isStarred !== (props.task.isStarred ?? 1)) {
      if (formState.value.isStarred === 1) {
        await starTaskDetail(props.task.id);
      } else {
        await unstarTaskDetail(props.task.id);
      }
    }

    message.success('更新成功');
    emit('success');
    emit('update:visible', false);
  } catch (error) {
    console.error('更新失败:', error);
  } finally {
    loading.value = false;
  }
};

const handleToggleStar = () => {
  formState.value.isStarred = formState.value.isStarred === 1 ? 0 : 1;
};
</script>

<template>
  <AModal
    :open="visible"
    :closable="false"
    :footer="null"
    centered
    @cancel="handleCancel"
    :confirm-loading="loading"
    class="watched-task-edit-modal"
  >
    <div class="relative pt-2">
      <div class="absolute right-0 top-0 z-10">
        <button
          type="button"
          @click="handleToggleStar"
          :title="formState.isStarred === 1 ? '取消关注' : '添加关注'"
          class="flex h-auto items-center justify-center p-0 outline-none transition-transform hover:scale-110"
        >
          <VbenIcon
            v-if="formState.isStarred === 1"
            icon="mdi:star"
            class="text-[22px] text-yellow-500"
          />
          <VbenIcon
            v-else
            icon="mdi:star-outline"
            class="text-[22px] text-muted-foreground"
          />
        </button>
      </div>

      <AForm layout="vertical" class="mt-4">
        <AFormItem label="内容" required>
          <AInput v-model:value="formState.content" placeholder="请输入内容" />
        </AFormItem>
        <AFormItem label="优先级">
          <ASelect v-model:value="formState.priority">
            <ASelectOption :value="1">高</ASelectOption>
            <ASelectOption :value="10">中</ASelectOption>
            <ASelectOption :value="20">低</ASelectOption>
          </ASelect>
        </AFormItem>
        <AFormItem label="起止时间">
          <ADatePicker.RangePicker
            v-model:value="formState.timeRange"
            show-time
            class="w-full"
          />
        </AFormItem>

        <div class="mt-6 flex justify-end gap-2">
          <AButton @click="handleCancel">取消</AButton>
          <AButton type="primary" @click="handleOk" :loading="loading">
            保存
          </AButton>
        </div>
      </AForm>
    </div>
  </AModal>
</template>

<style>
.watched-task-edit-modal .ant-modal-content {
  padding-top: 16px;
}
</style>
