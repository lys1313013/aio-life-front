<script setup lang="ts">
import type { AnniversaryRecord } from '#/api/my-hub/anniversary';

import { ref } from 'vue';

import { DatePicker, Form, FormItem, Input, Switch } from 'ant-design-vue';
import dayjs, { Dayjs } from 'dayjs';

import {
  createAnniversaryRecord,
  deleteAnniversaryRecords,
  updateAnniversaryRecord,
} from '#/api/my-hub/anniversary';
import {
  AppModalDelete,
  AppModalFooter,
  AppModal as Modal,
} from '#/components/app-modal';

const emit = defineEmits<{
  deleted: [id: string];
  saved: [record: AnniversaryRecord];
}>();
const modalVisible = ref(false);
const isEdit = ref(false);
const originalDate = ref<string>();
const originalType = ref<AnniversaryRecord['type']>();
const formRef = ref();
const submitLoading = ref(false);

const formState = ref<{
  color: string;
  icon: string;
  id?: string;
  isPinned: 0 | 1;
  note: string;
  targetDate: Dayjs | undefined;
  title: string;
}>({
  isPinned: 0,
  title: '',
  targetDate: undefined,
  note: '',
  color: 'from-pink-400 to-rose-500',
  icon: '🎉',
});

const rules: Record<string, any> = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  targetDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
};

const bgOptions = [
  { label: '浪漫粉', value: 'from-pink-400 to-rose-500' },
  { label: '清新蓝', value: 'from-cyan-400 to-blue-500' },
  { label: '活力橙', value: 'from-orange-400 to-red-500' },
  { label: '神秘紫', value: 'from-purple-400 to-indigo-500' },
  { label: '自然绿', value: 'from-emerald-400 to-teal-500' },
  { label: '暗夜黑', value: 'from-gray-700 to-gray-900' },
];

const emojiOptions = [
  '🎉',
  '🎂',
  '❤️',
  '💍',
  '🎓',
  '👶',
  '🏠',
  '🚗',
  '✈️',
  '💼',
  '💪',
  '🌟',
];

const openModal = (item?: AnniversaryRecord, defaultPinned = false) => {
  originalDate.value = item?.targetDate;
  originalType.value = item?.type;
  if (item) {
    isEdit.value = true;
    formState.value = {
      id: item.id,
      isPinned: item.isPinned === 1 ? 1 : 0,
      title: item.title,
      targetDate: dayjs(item.targetDate),
      note: item.note || '',
      color: item.color || bgOptions[0]?.value || 'from-pink-400 to-rose-500',
      icon: item.icon || '🎉',
    };
  } else {
    isEdit.value = false;
    formState.value = {
      isPinned: defaultPinned ? 1 : 0,
      title: '',
      targetDate: dayjs(),
      note: '',
      color: bgOptions[0]?.value || 'from-pink-400 to-rose-500',
      icon: '🎉',
    };
  }
  modalVisible.value = true;
};

const handleOk = async () => {
  if (submitLoading.value) return;
  try {
    await formRef.value.validate();
    const dateStr = formState.value.targetDate!.format('YYYY-MM-DD');
    const type: AnniversaryRecord['type'] =
      dateStr === originalDate.value && originalType.value
        ? originalType.value
        : dayjs(dateStr).isAfter(dayjs())
          ? 'countdown'
          : 'anniversary';

    submitLoading.value = true;
    const payload = {
      id: formState.value.id,
      isPinned: formState.value.isPinned,
      title: formState.value.title,
      targetDate: dateStr,
      type,
      note: formState.value.note,
      color: formState.value.color,
      icon: formState.value.icon,
    };
    const saved =
      isEdit.value && formState.value.id
        ? await updateAnniversaryRecord(payload)
        : await createAnniversaryRecord(payload);
    emit('saved', saved);
    modalVisible.value = false;
  } catch (error) {
    console.error(error);
  } finally {
    submitLoading.value = false;
  }
};

const selectEmoji = (emoji: string) => {
  formState.value.icon = emoji;
};

const selectColor = (color: string) => {
  formState.value.color = color;
};

const handleDelete = async () => {
  const id = formState.value.id;
  if (!id) return;
  await deleteAnniversaryRecords([id]);
  modalVisible.value = false;
  emit('deleted', id);
};
defineExpose({ open: openModal });
</script>
<template>
  <Modal
    v-model:open="modalVisible"
    :title="null"
    :footer="null"
    @ok="handleOk"
    width="420px"
  >
    <div class="relative">
      <div
        :class="`h-24 bg-gradient-to-r ${formState.color} relative flex items-center justify-center transition-colors duration-500`"
      >
        <div
          class="animate-bounce-slow translate-y-8 transform text-5xl drop-shadow-lg filter"
        >
          {{ formState.icon }}
        </div>
      </div>

      <div class="pt-12">
        <Form ref="formRef" :model="formState" :rules="rules" layout="vertical">
          <FormItem name="title" class="mb-4">
            <Input
              v-model:value="formState.title"
              placeholder="给这个日子起个名字"
              class="rounded-xl border-border bg-secondary px-4 py-2 text-center text-lg font-medium transition-all focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
              :bordered="false"
            />
          </FormItem>

          <FormItem name="targetDate" class="mb-6">
            <DatePicker
              v-model:value="formState.targetDate"
              class="w-full rounded-xl border-none bg-gray-100 py-2 dark:bg-gray-700"
              :bordered="false"
              placeholder="选择日期"
            />
          </FormItem>

          <!-- Emoji 选择 -->
          <div class="mb-4">
            <label class="mb-2 block text-sm font-medium text-gray-500"
              >选择图标</label
            >
            <div
              class="flex flex-wrap justify-center gap-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-700/50"
            >
              <button
                v-for="emoji in emojiOptions"
                :key="emoji"
                type="button"
                @click="selectEmoji(emoji)"
                class="rounded-lg p-1 text-2xl transition-transform hover:scale-125 hover:bg-white dark:hover:bg-gray-600"
                :class="{
                  'scale-110 bg-white shadow-sm': formState.icon === emoji,
                }"
              >
                {{ emoji }}
              </button>
            </div>
          </div>

          <!-- 颜色选择 -->
          <div class="mb-6">
            <label class="mb-2 block text-sm font-medium text-gray-500"
              >选择主题色</label
            >
            <div class="flex flex-wrap justify-center gap-3">
              <button
                v-for="opt in bgOptions"
                :key="opt.value"
                type="button"
                :aria-label="opt.label"
                @click="selectColor(opt.value)"
                :class="`h-8 w-8 rounded-full bg-gradient-to-br ${opt.value} transform ring-2 ring-offset-2 transition-all hover:scale-110`"
                :style="{
                  '--tw-ring-color':
                    formState.color === opt.value ? '#3b82f6' : 'transparent',
                }"
              ></button>
            </div>
          </div>

          <FormItem name="note">
            <Input.TextArea
              v-model:value="formState.note"
              placeholder="写下这一刻的心情..."
              :rows="2"
              class="rounded-xl border-none bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              style="resize: none"
            />
          </FormItem>

          <FormItem label="添加到首页" name="isPinned">
            <Switch
              v-model:checked="formState.isPinned"
              :checked-value="1"
              :un-checked-value="0"
            />
          </FormItem>
          <AppModalFooter
            :confirm-loading="submitLoading"
            @cancel="modalVisible = false"
            @confirm="handleOk"
          >
            <template #leading>
              <AppModalDelete
                v-if="formState.id"
                :disabled="submitLoading"
                title="确定删除这个纪念日吗？"
                :action="handleDelete"
              />
            </template>
          </AppModalFooter>
        </Form>
      </div>
    </div>
  </Modal>
</template>
