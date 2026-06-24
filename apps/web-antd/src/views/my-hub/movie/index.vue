<script lang="ts" setup>
defineOptions({ name: 'Movie' });

import { onMounted, ref } from 'vue';

import { usePreferences } from '@vben/preferences';
import { getFilePreviewUrl } from '#/utils/file';

import { SearchOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Empty,
  Input,
  message,
  Modal,
  Select,
  Spin,
} from 'ant-design-vue';

import { MovieApi } from '#/api/movie';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';

import FormDrawerDemo from './form-drawer.vue';

const { isMobile } = usePreferences();

const modalVisible = ref(false);
const currentRow = ref<any>(null);
const loading = ref(false);
const hasMore = ref(true);
const records = ref<MovieApi.MovieVO[]>([]);
const total = ref(0);

const queryForm = ref({
  current: 1,
  size: 24, // 增加单页数据量以适应滚动加载
  title: '',
  type: undefined as number | undefined,
  status: undefined as number | undefined,
});

// 状态映射
const statusMap: Record<number, { color: string; label: string }> = {
  0: { label: '想看', color: 'default' },
  1: { label: '在看', color: 'processing' },
  2: { label: '看过', color: 'success' },
  3: { label: '搁置', color: 'warning' },
};

const loadData = async (isLoadMore = false) => {
  if (!isLoadMore) {
    loading.value = true;
    queryForm.value.current = 1;
    hasMore.value = true;
  }

  try {
    const res = await MovieApi.pageList(queryForm.value);
    const newRecords = (res as any).records || [];
    const totalCount = Number((res as any).total) || 0;
    total.value = totalCount;

    if (isLoadMore) {
      records.value = [...records.value, ...newRecords];
    } else {
      records.value = newRecords;
    }

    // 判断是否还有更多数据
    hasMore.value = records.value.length < totalCount;
  } catch (error) {
    console.error('Failed to load movie records', error);
    message.error('加载观影记录失败');
  } finally {
    loading.value = false;
  }
};

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  // 触底判断：滚动高度 + 视口高度 >= 实际内容高度 - 阈值（提前100px加载）
  if (
    target.scrollHeight - target.scrollTop - target.clientHeight < 100 &&
    !loading.value &&
    hasMore.value
  ) {
    loading.value = true;
    queryForm.value.current += 1;
    loadData(true);
  }
};

onMounted(() => {
  loadData();
});

const handleSearch = () => {
  loadData();
};

const openFormModal = (row?: any) => {
  currentRow.value = row;
  modalVisible.value = true;
};

const closeFormModal = () => {
  modalVisible.value = false;
  currentRow.value = null;
};

const tableReload = () => {
  loadData();
};
</script>

<template>
  <div class="min-h-screen p-4 transition-colors duration-300 md:p-8">
    <div class="mx-auto max-w-7xl">
      <!-- 搜索过滤 -->
      <div class="mb-6 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
        <div class="flex flex-wrap gap-4">
          <Input
            v-model:value="queryForm.title"
            placeholder="搜索影视名称或导演"
            allow-clear
            class="w-full md:w-64"
            @press-enter="handleSearch"
          >
            <template #prefix>
              <SearchOutlined class="text-gray-400" />
            </template>
          </Input>
          <Select
            v-model:value="queryForm.type"
            placeholder="内容类型"
            allow-clear
            class="w-full md:w-32"
            @change="handleSearch"
          >
            <Select.Option :value="1">电影</Select.Option>
            <Select.Option :value="2">剧集</Select.Option>
            <Select.Option :value="3">动漫</Select.Option>
            <Select.Option :value="4">纪录片</Select.Option>
            <Select.Option :value="5">其他</Select.Option>
          </Select>
          <Select
            v-model:value="queryForm.status"
            placeholder="观看状态"
            allow-clear
            class="w-full md:w-32"
            @change="handleSearch"
          >
            <Select.Option :value="0">想看</Select.Option>
            <Select.Option :value="1">在看</Select.Option>
            <Select.Option :value="2">看过</Select.Option>
            <Select.Option :value="3">搁置</Select.Option>
          </Select>
          <Button type="primary" ghost @click="handleSearch">搜索</Button>

          <div class="ml-auto flex items-center text-sm text-gray-500">
            共 {{ total }} 条记录
          </div>
        </div>
      </div>

      <!-- 影视网格 -->
      <div
        class="flex h-[calc(100vh-200px)] flex-col overflow-y-auto pb-10"
        @scroll="handleScroll"
      >
        <Spin
          :spinning="loading && records.length === 0"
          size="large"
          tip="加载中..."
        >
          <div
            v-if="!loading && records.length === 0"
            class="mt-20 flex flex-col items-center justify-center"
          >
            <Empty description="空空如也，快去添加观影记录吧" />
          </div>

          <!-- 影视网格 -->
          <div
            v-if="records.length > 0"
            class="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10"
          >
            <div
              v-for="item in records"
              :key="item.id"
              class="group relative flex cursor-pointer flex-col items-center"
              @click="openFormModal(item)"
            >
              <!-- 封面图部分 -->
              <div
                class="relative aspect-[3/4] w-full overflow-hidden rounded border border-gray-100 shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-gray-800"
              >
                  <img
                    v-if="item.fileId"
                    :src="getFilePreviewUrl(item.fileId)"
                    class="h-full w-full object-cover"
                  />
                <div
                  v-else
                  class="flex h-full w-full flex-col items-center justify-center bg-gray-50 p-4 text-center dark:bg-gray-800"
                >
                  <span
                    class="mb-2 text-2xl text-gray-300 drop-shadow-sm dark:text-gray-600"
                    >🎬</span
                  >
                  <span
                    class="line-clamp-2 px-1 text-[10px] font-medium leading-tight text-gray-400 dark:text-gray-500"
                    >{{ item.title }}</span
                  >
                </div>

                <!-- 状态角标 (右上方) -->
                <div
                  v-if="item.status !== undefined && item.status !== null"
                  class="absolute right-0 top-0 z-10 rounded-bl rounded-tr-md px-1.5 py-0.5 text-[9px] font-medium text-white shadow-sm"
                  :class="[
                    item.status === 0 ? 'bg-gray-400' : '',
                    item.status === 1 ? 'bg-blue-500' : '',
                    item.status === 2 ? 'bg-green-500' : '',
                    item.status === 3 ? 'bg-orange-500' : '',
                  ]"
                >
                  {{ statusMap[item.status]?.label || '未知' }}
                </div>
              </div>

              <!-- 极简标题信息 -->
              <div class="mt-2 w-full px-1 text-center">
                <div
                  class="truncate text-[13px] font-medium leading-tight text-gray-800 dark:text-gray-200"
                  :title="item.title"
                >
                  {{ item.title }}
                </div>
                <div
                  v-if="item.finishTime"
                  class="mt-0.5 truncate text-[11px] text-gray-400"
                  :title="item.finishTime"
                >
                  {{ item.finishTime.split(' ')[0] }}
                </div>
              </div>
            </div>
          </div>
        </Spin>

        <!-- 撑开底部空间的占位元素 -->
        <div v-if="records.length > 0" class="flex-grow"></div>

        <!-- 加载更多提示 -->
        <div
          v-if="records.length > 0 && loading"
          class="mt-auto shrink-0 py-4 text-center text-sm text-gray-400"
        >
          <span>正在加载更多...</span>
        </div>
      </div>
    </div>

    <!-- 悬浮新增按钮 -->
    <GlobalFloatBtn @click="openFormModal()" />

    <!-- 表单模态框 -->
    <Modal
      v-model:open="modalVisible"
      :width="isMobile ? '90%' : 500"
      :footer="null"
      :closable="false"
      :destroy-on-close="true"
      centered
    >
      <FormDrawerDemo
        :values="currentRow"
        @table-reload="tableReload"
        @close="closeFormModal"
      />
    </Modal>
  </div>
</template>

<style scoped>
/* 可以在此添加需要的样式调整 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
</style>
