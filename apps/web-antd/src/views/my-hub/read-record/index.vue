<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { SearchOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Modal,
  Spin,
  Empty,
  Input,
  Select,
  message
} from 'ant-design-vue';

import { ReadRecordApi } from '#/api/readRecord';
import FormDrawerDemo from './form-drawer.vue';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';
import { usePreferences } from '@vben/preferences';

const { isMobile } = usePreferences();

const modalVisible = ref(false);
const currentRow = ref<any>(null);
const loading = ref(false);
const hasMore = ref(true);
const records = ref<ReadRecordApi.ReadRecordVO[]>([]);
const total = ref(0);

const queryForm = ref({
  current: 1,
  size: 24, // 增加单页数据量以适应滚动加载
  title: '',
  type: undefined as number | undefined,
  status: undefined as number | undefined,
});

// 状态映射
const statusMap: Record<number, { label: string; color: string }> = {
  0: { label: '未开始', color: 'default' },
  1: { label: '阅读中', color: 'processing' },
  2: { label: '已完成', color: 'success' },
  3: { label: '搁置', color: 'warning' },
};

const loadData = async (isLoadMore = false) => {
  if (!isLoadMore) {
    loading.value = true;
    queryForm.value.current = 1;
    hasMore.value = true;
  }

  try {
    const res = await ReadRecordApi.pageList(queryForm.value);
    // 假设返回结构为 { records: [], total: number }，如果不同请根据实际调整
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
    console.error('Failed to load read records', error);
    message.error('加载阅读记录失败');
  } finally {
    loading.value = false;
  }
};

const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement;
  // 触底判断：滚动高度 + 视口高度 >= 实际内容高度 - 阈值（提前100px加载）
  if (target.scrollHeight - target.scrollTop - target.clientHeight < 100) {
    if (!loading.value && hasMore.value) {
      loading.value = true;
      queryForm.value.current += 1;
      loadData(true);
    }
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
            placeholder="搜索标题或作者"
            allow-clear
            class="w-full md:w-64"
            @pressEnter="handleSearch"
          >
            <template #prefix><SearchOutlined class="text-gray-400" /></template>
          </Input>
          <Select
            v-model:value="queryForm.type"
            placeholder="内容类型"
            allow-clear
            class="w-full md:w-32"
            @change="handleSearch"
          >
            <Select.Option :value="1">书籍</Select.Option>
            <Select.Option :value="2">文章/网页</Select.Option>
          </Select>
          <Select
            v-model:value="queryForm.status"
            placeholder="阅读状态"
            allow-clear
            class="w-full md:w-32"
            @change="handleSearch"
          >
            <Select.Option :value="0">未开始</Select.Option>
            <Select.Option :value="1">阅读中</Select.Option>
            <Select.Option :value="2">已完成</Select.Option>
            <Select.Option :value="3">搁置</Select.Option>
          </Select>
          <Button type="primary" ghost @click="handleSearch">搜索</Button>

          <div class="ml-auto flex items-center text-sm text-gray-500">
            共 {{ total }} 条记录
          </div>
        </div>
      </div>

      <!-- 书架网格 -->
      <div
        class="overflow-y-auto h-[calc(100vh-200px)] pb-10 flex flex-col"
        @scroll="handleScroll"
      >
        <Spin :spinning="loading && records.length === 0" size="large" tip="加载中...">
          <div
            v-if="!loading && records.length === 0"
          class="mt-20 flex flex-col items-center justify-center"
        >
          <Empty description="空空如也，快去添加阅读记录吧" />
        </div>

        <!-- 书籍网格 -->
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
            <div class="relative w-full aspect-[3/4] overflow-hidden rounded shadow-sm border border-gray-100 dark:border-gray-800 transition-shadow duration-300 hover:shadow-md">
                <img
                  v-if="item.coverImg"
                  :src="item.coverImg"
                  class="h-full w-full object-cover"
                />
              <div v-else class="flex h-full w-full flex-col items-center justify-center p-4 text-center bg-gray-50 dark:bg-gray-800">
                <span class="mb-2 text-2xl text-gray-300 drop-shadow-sm dark:text-gray-600">📖</span>
                <span class="text-[10px] font-medium text-gray-400 dark:text-gray-500 line-clamp-2 leading-tight px-1">{{ item.title }}</span>
              </div>

              <!-- 状态角标 (右上方) -->
              <div v-if="item.status !== undefined && item.status !== null" class="absolute right-0 top-0 px-1.5 py-0.5 text-[9px] font-medium text-white shadow-sm rounded-bl rounded-tr-md z-10" :class="[
                item.status === 0 ? 'bg-gray-400' : '',
                item.status === 1 ? 'bg-blue-500' : '',
                item.status === 2 ? 'bg-green-500' : '',
                item.status === 3 ? 'bg-orange-500' : '',
              ]">
                {{ statusMap[item.status]?.label || '未知' }}
              </div>
            </div>

            <!-- 极简标题信息 -->
              <div class="mt-2 w-full px-1 text-center">
                <div class="truncate text-[13px] font-medium text-gray-800 dark:text-gray-200 leading-tight" :title="item.title">{{ item.title }}</div>
                <div v-if="item.author" class="mt-0.5 truncate text-[11px] text-gray-400" :title="item.author">{{ item.author }}</div>
              </div>
            </div>
          </div>
        </Spin>

        <!-- 撑开底部空间的占位元素 -->
        <div v-if="records.length > 0" class="flex-grow"></div>

        <!-- 加载更多提示 -->
        <div v-if="records.length > 0 && loading" class="py-4 text-center text-sm text-gray-400 mt-auto shrink-0">
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
