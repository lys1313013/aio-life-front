<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import {
  Button,
  Modal,
  Form,
  FormItem,
  Input,
  DatePicker,
  Popconfirm,
  Empty,
  message,
  Dropdown,
  Menu,
  MenuItem
} from 'ant-design-vue';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  HeartFilled,
  ClockCircleFilled,
  StarFilled,
  GiftFilled,
  SmileFilled
} from '@ant-design/icons-vue';
import dayjs, { Dayjs } from 'dayjs';
import { useWindowSize } from '@vueuse/core';

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
  id?: string;
  title: string;
  date: Dayjs | undefined;
  note: string;
  color: string;
  icon: string;
}>({
  title: '',
  date: undefined,
  note: '',
  color: 'from-pink-400 to-rose-500',
  icon: '🎉'
});

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }]
};

const bgOptions = [
  { label: '浪漫粉', value: 'from-pink-400 to-rose-500' },
  { label: '清新蓝', value: 'from-cyan-400 to-blue-500' },
  { label: '活力橙', value: 'from-orange-400 to-red-500' },
  { label: '神秘紫', value: 'from-purple-400 to-indigo-500' },
  { label: '自然绿', value: 'from-emerald-400 to-teal-500' },
  { label: '暗夜黑', value: 'from-gray-700 to-gray-900' },
];

const emojiOptions = ['🎉', '🎂', '❤️', '💍', '🎓', '👶', '🏠', '🚗', '✈️', '💼', '💪', '🌟'];

// 加载数据
const loadData = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
      anniversaries.value = JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse anniversaries', e);
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
      icon: item.icon || '🎉'
    };
  } else {
    isEdit.value = false;
    formState.value = {
      title: '',
      date: dayjs(),
      note: '',
      color: bgOptions[0].value,
      icon: '🎉'
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
      const index = anniversaries.value.findIndex(a => a.id === formState.value.id);
      if (index !== -1) {
        anniversaries.value[index] = {
          ...anniversaries.value[index],
          title: formState.value.title,
          date: dateStr,
          type,
          note: formState.value.note,
          color: formState.value.color,
          icon: formState.value.icon
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
        icon: formState.value.icon
      });
    }
    saveData();
    modalVisible.value = false;
    message.success(isEdit.value ? '修改成功' : '添加成功');
  } catch (error) {
    // validation failed
  }
};

const handleDelete = (id: string) => {
  anniversaries.value = anniversaries.value.filter(a => a.id !== id);
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
  <div class="min-h-screen p-4 md:p-8 bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-end mb-8 animate-fade-in-down">
        <div>
          <h1 class="text-3xl font-extrabold text-gray-800 dark:text-gray-100 tracking-tight">
            <span class="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
              时光
            </span>
            纪念册
          </h1>
          <p class="text-gray-500 dark:text-gray-400 mt-1 text-sm md:text-base">记录每一个值得铭记的瞬间</p>
        </div>
        <Button 
          type="primary" 
          shape="round" 
          size="large"
          class="shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 bg-gradient-to-r from-pink-500 to-violet-500 border-none"
          @click="openModal()"
        >
          <template #icon><PlusOutlined /></template>
          新建纪念日
        </Button>
      </div>

      <div v-if="sortedAnniversaries.length === 0" class="flex flex-col items-center justify-center mt-32 opacity-0 animate-fade-in" style="animation-delay: 0.2s; animation-fill-mode: forwards;">
        <div class="text-6xl mb-4 animate-bounce">🎈</div>
        <Empty description="暂无纪念日，开始记录你的美好时光吧" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div
          v-for="(item, index) in sortedAnniversaries"
          :key="item.id"
          class="group relative overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 opacity-0 animate-scale-in"
          :style="{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }"
        >
          <!-- 背景 -->
          <div :class="`absolute inset-0 bg-gradient-to-br ${item.color || 'from-pink-400 to-rose-500'} opacity-90 transition-opacity duration-300`"></div>
          
          <!-- 装饰圆圈 -->
          <div class="absolute -top-10 -right-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div class="absolute -bottom-10 -left-10 w-24 h-24 bg-black opacity-5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>

          <!-- 内容容器 -->
          <div class="relative p-6 h-full flex flex-col justify-between text-white">
            <div class="flex justify-between items-start">
              <div class="text-4xl filter drop-shadow-md transform group-hover:scale-110 transition-transform duration-300 origin-top-left">
                {{ item.icon || '🎉' }}
              </div>
              
              <Dropdown :trigger="['click']">
                <div class="cursor-pointer p-2 rounded-full hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100">
                  <MoreOutlined class="text-xl text-white" />
                </div>
                <template #overlay>
                  <Menu>
                    <MenuItem key="edit" @click="openModal(item)">
                      <EditOutlined /> 编辑
                    </MenuItem>
                    <MenuItem key="delete" @click="handleDelete(item.id)" class="text-red-500">
                      <DeleteOutlined /> 删除
                    </MenuItem>
                  </Menu>
                </template>
              </Dropdown>
            </div>

            <div class="mt-6 text-center">
              <div class="text-sm font-medium opacity-90 mb-1 tracking-wider uppercase">
                {{ getDayLabel(item.date) }}
              </div>
              <div class="text-6xl font-black tracking-tighter tabular-nums leading-none filter drop-shadow-lg">
                {{ getDayCount(item.date) }}
                <span class="text-lg font-normal opacity-80 align-baseline ml-1">天</span>
              </div>
            </div>

            <div class="mt-8">
              <h3 class="text-xl font-bold truncate tracking-wide leading-tight mb-1" :title="item.title">
                {{ item.title }}
              </h3>
              <div class="flex items-center justify-between text-sm opacity-80">
                <span class="flex items-center gap-1 font-medium bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-sm">
                   {{ item.date }}
                </span>
                <span v-if="item.note" class="truncate max-w-[50%]" :title="item.note">
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
        :bodyStyle="{ padding: '0' }"
      >
        <div class="relative overflow-hidden bg-white dark:bg-gray-800 rounded-lg">
           <div :class="`h-24 bg-gradient-to-r ${formState.color} flex items-center justify-center relative transition-colors duration-500`">
              <div class="text-5xl transform translate-y-8 filter drop-shadow-lg animate-bounce-slow">
                  {{ formState.icon }}
              </div>
              <button 
                class="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                @click="modalVisible = false"
              >
                  ✕
              </button>
           </div>

           <div class="px-6 pt-12 pb-6">
              <h2 class="text-2xl font-bold text-center mb-6 text-gray-800 dark:text-gray-100">
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
                    class="rounded-xl py-2 px-4 border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all text-lg font-medium text-center"
                    :bordered="false"
                    style="background: #f3f4f6;"
                  />
                </FormItem>

                <FormItem name="date" class="mb-6">
                  <DatePicker 
                    v-model:value="formState.date" 
                    class="w-full rounded-xl py-2 border-none bg-gray-100 dark:bg-gray-700" 
                    :bordered="false"
                    style="background: #f3f4f6;"
                    placeholder="选择日期"
                  />
                </FormItem>

                <!-- Emoji 选择 -->
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-500 mb-2">选择图标</label>
                    <div class="flex flex-wrap gap-2 justify-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                        <button 
                            v-for="emoji in emojiOptions" 
                            :key="emoji"
                            @click="selectEmoji(emoji)"
                            class="text-2xl hover:scale-125 transition-transform p-1 rounded-lg hover:bg-white dark:hover:bg-gray-600"
                            :class="{ 'bg-white shadow-sm scale-110': formState.icon === emoji }"
                        >
                            {{ emoji }}
                        </button>
                    </div>
                </div>

                <!-- 颜色选择 -->
                <div class="mb-6">
                    <label class="block text-sm font-medium text-gray-500 mb-2">选择主题色</label>
                    <div class="flex flex-wrap gap-3 justify-center">
                        <button 
                            v-for="opt in bgOptions" 
                            :key="opt.value"
                            @click="selectColor(opt.value)"
                            :class="`w-8 h-8 rounded-full bg-gradient-to-br ${opt.value} ring-2 ring-offset-2 transition-all transform hover:scale-110`"
                            :style="{ '--tw-ring-color': formState.color === opt.value ? '#3b82f6' : 'transparent' }"
                        ></button>
                    </div>
                </div>

                <FormItem name="note">
                  <Input.TextArea 
                    v-model:value="formState.note" 
                    placeholder="写下这一刻的心情..." 
                    :rows="2" 
                    class="rounded-xl border-none bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    style="resize: none;"
                  />
                </FormItem>

                <div class="flex gap-4 mt-8">
                     <Button 
                        class="flex-1 h-10 rounded-xl border-gray-200 hover:border-gray-300 text-gray-500"
                        @click="modalVisible = false"
                     >
                        取消
                     </Button>
                     <Button 
                        type="primary" 
                        class="flex-1 h-10 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 border-none hover:opacity-90 shadow-lg shadow-pink-500/30"
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
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translate3d(0, -20px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { 
      opacity: 0;
      transform: scale(0.9); 
  }
  to { 
      opacity: 1;
      transform: scale(1); 
  }
}

@keyframes bounceSlow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.animate-fade-in-down {
  animation: fadeInDown 0.8s ease-out;
}

.animate-fade-in {
  animation: fadeIn 0.8s ease-out;
}

.animate-scale-in {
  animation: scaleIn 0.5s ease-out backwards;
}

.animate-bounce-slow {
    animation: bounceSlow 3s infinite ease-in-out;
}
</style>
