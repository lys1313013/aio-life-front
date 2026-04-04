<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import {
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';
import { useWindowSize } from '@vueuse/core';
import {
  Button,
  DatePicker,
  Dropdown,
  Empty,
  Form,
  FormItem,
  Input,
  Menu,
  MenuItem,
  message,
  Modal,
} from 'ant-design-vue';
import dayjs, { Dayjs } from 'dayjs';

interface Anniversary {
  id: string;
  title: string;
  date: string; // ISO string
  type: 'anniversary' | 'countdown'; // 纪念日（正数） | 倒数日（倒数）
  note?: string;
  color?: string; // 渐变色 class
  icon?: string; // Emoji
}

const STORAGE_KEY = 'AIO_LIFE_ANNIVERSARIES';

const { width } = useWindowSize();
const isMobile = computed(() => width.value < 768);

const anniversaries = ref<Anniversary[]>([]);
const modalVisible = ref(false);
const isEdit = ref(false);
const formRef = ref();

const formState = ref<{
  color: string;
  date: Dayjs | undefined;
  icon: string;
  id?: string;
  note: string;
  title: string;
}>({
  title: '',
  date: undefined,
  note: '',
  color: 'from-pink-400 to-rose-500',
  icon: '🎉',
});

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
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

// 加载数据
const loadData = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      anniversaries.value = JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse anniversaries', error);
      anniversaries.value = [];
    }
  }
};

// 保存数据
const saveData = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(anniversaries.value));
};

onMounted(() => {
  loadData();
});

// 计算天数
const getDays = (dateStr: string) => {
  const target = dayjs(dateStr).startOf('day');
  const today = dayjs().startOf('day');
  const diff = target.diff(today, 'day');
  return diff;
};

// 格式化展示
const getDayLabel = (dateStr: string) => {
  const diff = getDays(dateStr);
  if (diff === 0) return '就是今天';
  if (diff > 0) return '还有';
  return '已经';
};

const getDayCount = (dateStr: string) => {
  return Math.abs(getDays(dateStr));
};

const openModal = (item?: Anniversary) => {
  if (item) {
    isEdit.value = true;
    formState.value = {
      id: item.id,
      title: item.title,
      date: dayjs(item.date),
      note: item.note || '',
      color: item.color || bgOptions[0].value,
      icon: item.icon || '🎉',
    };
  } else {
    isEdit.value = false;
    formState.value = {
      title: '',
      date: dayjs(),
      note: '',
      color: bgOptions[0].value,
      icon: '🎉',
    };
  }
  modalVisible.value = true;
};

const handleOk = async () => {
  try {
    await formRef.value.validate();
    const dateStr = formState.value.date!.format('YYYY-MM-DD');
    const type = dayjs(dateStr).isAfter(dayjs()) ? 'countdown' : 'anniversary';

    if (isEdit.value && formState.value.id) {
      const index = anniversaries.value.findIndex(
        (a) => a.id === formState.value.id,
      );
      if (index !== -1) {
        anniversaries.value[index] = {
          ...anniversaries.value[index],
          title: formState.value.title,
          date: dateStr,
          type,
          note: formState.value.note,
          color: formState.value.color,
          icon: formState.value.icon,
        };
      }
    } else {
      anniversaries.value.push({
        id: Date.now().toString(),
        title: formState.value.title,
        date: dateStr,
        type,
        note: formState.value.note,
        color: formState.value.color,
        icon: formState.value.icon,
      });
    }
    saveData();
    modalVisible.value = false;
    message.success(isEdit.value ? '修改成功' : '添加成功');
  } catch {
    // validation failed
  }
};

const handleDelete = (id: string) => {
  anniversaries.value = anniversaries.value.filter((a) => a.id !== id);
  saveData();
  message.success('删除成功');
};

const sortedAnniversaries = computed(() => {
  return [...anniversaries.value].sort((a, b) => {
    const diffA = Math.abs(getDays(a.date));
    const diffB = Math.abs(getDays(b.date));
    return diffA - diffB;
  });
});

const selectEmoji = (emoji: string) => {
  formState.value.icon = emoji;
};

const selectColor = (color: string) => {
  formState.value.color = color;
};
</script>

<template>
  <div
    class="min-h-screen bg-gray-50 p-4 transition-colors duration-300 md:p-8 dark:bg-gray-950"
  >
    <div class="mx-auto max-w-7xl">
      <div class="animate-fade-in-down mb-8 flex items-end justify-between">
        <div>
          <h1
            class="text-3xl font-extrabold tracking-tight text-gray-800 dark:text-gray-100"
          >
            <span
              class="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent"
            >
              时光
            </span>
            纪念册
          </h1>
          <p class="mt-1 text-sm text-gray-500 md:text-base dark:text-gray-400">
            记录每一个值得铭记的瞬间（未完成）
          </p>
        </div>
        <Button
          type="primary"
          shape="round"
          size="large"
          class="transform border-none bg-gradient-to-r from-pink-500 to-violet-500 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
          @click="openModal()"
        >
          <template #icon><PlusOutlined /></template>
          新建纪念日
        </Button>
      </div>

      <div
        v-if="sortedAnniversaries.length === 0"
        class="animate-fade-in mt-32 flex flex-col items-center justify-center opacity-0"
        style="animation-delay: 0.2s; animation-fill-mode: forwards"
      >
        <div class="mb-4 animate-bounce text-6xl">🎈</div>
        <Empty description="暂无纪念日，开始记录你的美好时光吧" />
      </div>

      <div
        class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <div
          v-for="(item, index) in sortedAnniversaries"
          :key="item.id"
          class="animate-scale-in group relative transform overflow-hidden rounded-3xl opacity-0 shadow-lg transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl"
          :style="{
            animationDelay: `${index * 0.1}s`,
            animationFillMode: 'forwards',
          }"
        >
          <!-- 背景 -->
          <div
            :class="`absolute inset-0 bg-gradient-to-br ${item.color || 'from-pink-400 to-rose-500'} opacity-90 transition-opacity duration-300`"
          ></div>

          <!-- 装饰圆圈 -->
          <div
            class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl transition-transform duration-700 group-hover:scale-150"
          ></div>
          <div
            class="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-black opacity-5 blur-xl transition-transform duration-700 group-hover:scale-150"
          ></div>

          <!-- 内容容器 -->
          <div
            class="relative flex h-full flex-col justify-between p-6 text-white"
          >
            <div class="flex items-start justify-between">
              <div
                class="origin-top-left transform text-4xl drop-shadow-md filter transition-transform duration-300 group-hover:scale-110"
              >
                {{ item.icon || '🎉' }}
              </div>

              <Dropdown :trigger="['click']">
                <div
                  class="cursor-pointer rounded-full p-2 opacity-0 transition-colors hover:bg-white/20 group-hover:opacity-100"
                >
                  <MoreOutlined class="text-xl text-white" />
                </div>
                <template #overlay>
                  <Menu>
                    <MenuItem key="edit" @click="openModal(item)">
                      <EditOutlined /> 编辑
                    </MenuItem>
                    <MenuItem
                      key="delete"
                      @click="handleDelete(item.id)"
                      class="text-red-500"
                    >
                      <DeleteOutlined /> 删除
                    </MenuItem>
                  </Menu>
                </template>
              </Dropdown>
            </div>

            <div class="mt-6 text-center">
              <div
                class="mb-1 text-sm font-medium uppercase tracking-wider opacity-90"
              >
                {{ getDayLabel(item.date) }}
              </div>
              <div
                class="text-6xl font-black tabular-nums leading-none tracking-tighter drop-shadow-lg filter"
              >
                {{ getDayCount(item.date) }}
                <span class="ml-1 align-baseline text-lg font-normal opacity-80"
                  >天</span
                >
              </div>
            </div>

            <div class="mt-8">
              <h3
                class="mb-1 truncate text-xl font-bold leading-tight tracking-wide"
                :title="item.title"
              >
                {{ item.title }}
              </h3>
              <div class="flex items-center justify-between text-sm opacity-80">
                <span
                  class="flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 font-medium backdrop-blur-sm"
                >
                  {{ item.date }}
                </span>
                <span
                  v-if="item.note"
                  class="max-w-[50%] truncate"
                  :title="item.note"
                >
                  {{ item.note }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        v-model:open="modalVisible"
        :title="null"
        :footer="null"
        width="420px"
        class="custom-modal"
        :body-style="{ padding: '0' }"
      >
        <div
          class="relative overflow-hidden rounded-lg bg-white dark:bg-gray-800"
        >
          <div
            :class="`h-24 bg-gradient-to-r ${formState.color} relative flex items-center justify-center transition-colors duration-500`"
          >
            <div
              class="animate-bounce-slow translate-y-8 transform text-5xl drop-shadow-lg filter"
            >
              {{ formState.icon }}
            </div>
            <button
              class="absolute right-4 top-4 text-white/80 transition-colors hover:text-white"
              @click="modalVisible = false"
            >
              ✕
            </button>
          </div>

          <div class="px-6 pb-6 pt-12">
            <h2
              class="mb-6 text-center text-2xl font-bold text-gray-800 dark:text-gray-100"
            >
              {{ isEdit ? '编辑纪念日' : '新建纪念日' }}
            </h2>

            <Form
              ref="formRef"
              :model="formState"
              :rules="rules"
              layout="vertical"
            >
              <FormItem name="title" class="mb-4">
                <Input
                  v-model:value="formState.title"
                  placeholder="给这个日子起个名字"
                  class="rounded-xl border-gray-200 px-4 py-2 text-center text-lg font-medium transition-all focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                  :bordered="false"
                  style="background: #f3f4f6"
                />
              </FormItem>

              <FormItem name="date" class="mb-6">
                <DatePicker
                  v-model:value="formState.date"
                  class="w-full rounded-xl border-none bg-gray-100 py-2 dark:bg-gray-700"
                  :bordered="false"
                  style="background: #f3f4f6"
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
                    @click="selectColor(opt.value)"
                    :class="`h-8 w-8 rounded-full bg-gradient-to-br ${opt.value} transform ring-2 ring-offset-2 transition-all hover:scale-110`"
                    :style="{
                      '--tw-ring-color':
                        formState.color === opt.value
                          ? '#3b82f6'
                          : 'transparent',
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

              <div class="mt-8 flex gap-4">
                <Button
                  class="h-10 flex-1 rounded-xl border-gray-200 text-gray-500 hover:border-gray-300"
                  @click="modalVisible = false"
                >
                  取消
                </Button>
                <Button
                  type="primary"
                  class="h-10 flex-1 rounded-xl border-none bg-gradient-to-r from-pink-500 to-violet-500 shadow-lg shadow-pink-500/30 hover:opacity-90"
                  @click="handleOk"
                >
                  保存
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </Modal>
    </div>
  </div>
</template>

<style scoped>
@keyframes fade-in-down {
  from {
    opacity: 0;
    transform: translate3d(0, -20px, 0);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes scale-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes bounce-slow {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-5px);
  }
}

.animate-fade-in-down {
  animation: fade-in-down 0.8s ease-out;
}

.animate-fade-in {
  animation: fade-in 0.8s ease-out;
}

.animate-scale-in {
  animation: scale-in 0.5s ease-out backwards;
}

.animate-bounce-slow {
  animation: bounce-slow 3s infinite ease-in-out;
}
</style>
