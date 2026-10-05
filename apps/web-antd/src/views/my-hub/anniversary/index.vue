<script lang="ts" setup>
import type { AnniversaryRecord } from '#/api/my-hub/anniversary';

import { computed, onMounted, ref } from 'vue';

import {
  DeleteOutlined,
  EditOutlined,
  LoadingOutlined,
  MoreOutlined,
  PushpinFilled,
  PushpinOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Dropdown,
  Empty,
  Menu,
  MenuItem,
  message,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  deleteAnniversaryRecords,
  getAnniversaryRecords,
  setAnniversaryPinned,
} from '#/api/my-hub/anniversary';
import ContentLoading from '#/components/ContentLoading.vue';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';

import AnniversaryEditor from './AnniversaryEditor.vue';

const editorRef = ref<InstanceType<typeof AnniversaryEditor>>();
const pinLoading = ref(new Set<string>());
const loading = ref(false);
const anniversaries = ref<AnniversaryRecord[]>([]);
// 加载数据
const loadData = async () => {
  try {
    loading.value = true;
    anniversaries.value = await getAnniversaryRecords();
  } catch (error) {
    console.error('Failed to load anniversaries', error);
  } finally {
    loading.value = false;
  }
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

const openModal = (item?: AnniversaryRecord) => editorRef.value?.open(item);
const handleSaved = (record: AnniversaryRecord) => {
  const index = anniversaries.value.findIndex((item) => item.id === record.id);
  if (index === -1) {
    anniversaries.value.unshift(record);
  } else {
    anniversaries.value.splice(index, 1, record);
  }
};
const handleDeleted = (id: string) => {
  anniversaries.value = anniversaries.value.filter((item) => item.id !== id);
};
const handlePin = async (item: AnniversaryRecord) => {
  if (!item.id || pinLoading.value.has(item.id)) return;
  pinLoading.value.add(item.id);
  try {
    handleSaved(
      await setAnniversaryPinned(item.id, item.isPinned === 1 ? 0 : 1),
    );
  } finally {
    pinLoading.value.delete(item.id);
  }
};

const handleDelete = async (id: string) => {
  try {
    await deleteAnniversaryRecords([id]);
    message.success('删除成功');
    handleDeleted(id);
  } catch (error) {
    console.error('Delete failed', error);
  }
};

const sortedAnniversaries = computed(() => {
  return [...anniversaries.value].sort((a, b) => {
    const diffA = Math.abs(getDays(a.targetDate));
    const diffB = Math.abs(getDays(b.targetDate));
    return diffA - diffB;
  });
});
</script>

<template>
  <div
    class="min-h-screen bg-gray-50 p-4 transition-colors duration-300 md:p-8 dark:bg-gray-950"
  >
    <div class="mx-auto max-w-7xl">
      <ContentLoading v-if="loading" min-height="calc(100vh - 160px)" />
      <template v-else>
        <div
          v-if="!loading && sortedAnniversaries.length === 0"
          class="animate-fade-in mt-32 flex flex-col items-center justify-center opacity-0"
          style="animation-delay: 0.2s; animation-fill-mode: forwards"
        >
          <div class="mb-4 animate-bounce text-6xl">🎈</div>
          <Empty description="暂无纪念日，开始记录你的美好时光吧" />
        </div>

        <div
          v-if="!loading && sortedAnniversaries.length > 0"
          class="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4"
        >
          <div
            v-for="(item, index) in sortedAnniversaries"
            :key="item.id"
            class="animate-scale-in group relative transform overflow-hidden rounded-2xl opacity-0 shadow-lg transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl md:rounded-3xl"
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
              class="relative flex h-full flex-col justify-between p-3 text-white md:p-6"
            >
              <div class="flex items-start justify-between">
                <div
                  class="origin-top-left transform text-3xl drop-shadow-md filter transition-transform duration-300 group-hover:scale-110 md:text-4xl"
                >
                  {{ item.icon || '🎉' }}
                </div>

                <Dropdown :trigger="['click']">
                  <Button
                    type="text"
                    class="!h-11 !w-11 !rounded-full !text-white hover:!bg-white/20"
                    :aria-label="`更多操作：${item.title}`"
                    aria-haspopup="menu"
                    :loading="pinLoading.has(item.id!)"
                  >
                    <template #icon>
                      <MoreOutlined class="text-xl" />
                    </template>
                  </Button>
                  <template #overlay>
                    <Menu>
                      <MenuItem
                        key="pin"
                        :disabled="pinLoading.has(item.id!)"
                        @click="handlePin(item)"
                      >
                        <LoadingOutlined v-if="pinLoading.has(item.id!)" spin />
                        <PushpinFilled v-else-if="item.isPinned === 1" />
                        <PushpinOutlined v-else />
                        {{
                          item.isPinned === 1 ? '取消固定到首页' : '固定到首页'
                        }}
                      </MenuItem>
                      <MenuItem key="edit" @click="openModal(item)">
                        <EditOutlined /> 编辑
                      </MenuItem>
                      <MenuItem
                        key="delete"
                        @click="handleDelete(item.id!)"
                        class="text-red-500"
                      >
                        <DeleteOutlined /> 删除
                      </MenuItem>
                    </Menu>
                  </template>
                </Dropdown>
              </div>

              <div class="mt-4 text-center md:mt-6">
                <div
                  class="mb-1 text-xs font-medium uppercase tracking-wider opacity-90 md:text-sm"
                >
                  {{ getDayLabel(item.targetDate) }}
                </div>
                <div
                  class="text-3xl font-black tabular-nums leading-none tracking-tighter drop-shadow-lg filter sm:text-4xl md:text-6xl"
                >
                  {{ getDayCount(item.targetDate) }}
                  <span
                    class="ml-0.5 align-baseline text-sm font-normal opacity-80 md:ml-1 md:text-lg"
                    >天</span
                  >
                </div>
              </div>

              <div class="mt-5 md:mt-8">
                <h3
                  class="mb-1 truncate text-base font-bold leading-tight tracking-wide md:text-xl"
                  :title="item.title"
                >
                  {{ item.title }}
                </h3>
                <div
                  class="flex items-center justify-between text-xs opacity-80 md:text-sm"
                >
                  <span
                    class="flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 font-medium backdrop-blur-sm md:px-2"
                  >
                    {{ item.targetDate }}
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
      </template>

      <AnniversaryEditor
        ref="editorRef"
        @saved="handleSaved"
        @deleted="handleDeleted"
      />

      <GlobalFloatBtn @click="openModal()" />
    </div>
  </div>
</template>

<style scoped>
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
