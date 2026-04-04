<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import {
  CalendarOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import { Button, Empty, message, Modal, Spin } from 'ant-design-vue';

import { getByDictType } from '#/api/core/common';
import { query } from '#/api/core/performance';

import FormDrawerDemo from './form-drawer-demo.vue';

interface RowType {
  id: any;
  performanceName: string;
  performer: string;
  performanceType: string;
  performanceDate: string;
  venue: string;
  city: string;
  imageUrl: string;
  ticketPrice: string;
}

const loading = ref(false);
const dataSource = ref<RowType[]>([]);
const modalVisible = ref(false);
const currentRow = ref<null | RowType>(null);

const dictOptions = ref<Array<{ label: string; value: string }>>([]);

const loadDictOptions = async () => {
  try {
    const res = await getByDictType('performance_type');
    dictOptions.value = res.dictDetailList;
  } catch (error) {
    console.error('加载字典选项失败:', error);
  }
};

const getPerformanceTypeLabel = (value: string) => {
  const option = dictOptions.value.find((item) => item.value === value);
  return option ? option.label : value;
};

const fetchData = async () => {
  loading.value = true;
  try {
    const res = await query({
      page: 1,
      pageSize: 100,
    });
    dataSource.value = res.items || [];
  } catch (error) {
    console.error('加载数据失败:', error);
    message.error('加载数据失败');
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  await loadDictOptions();
  await fetchData();
});

const openFormDrawer = (row?: RowType) => {
  currentRow.value = row || null;
  modalVisible.value = true;
};

const closeFormModal = () => {
  modalVisible.value = false;
  currentRow.value = null;
};

const tableReload = () => {
  fetchData();
};

const getImageUrl = (coverUrl: string) => {
  if (!coverUrl) return '';
  if (coverUrl.includes('bilibili.com') || coverUrl.includes('hdslb.com')) {
    return `https://images.weserv.nl/?url=${encodeURIComponent(coverUrl)}&w=300&h=200&fit=cover`;
  }
  return coverUrl;
};

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.style.display = 'none';
};
</script>

<template>
  <div class="vp-raw min-h-full w-full bg-background/50 p-0 sm:p-4">
    <Spin :spinning="loading">
      <div class="px-2 py-4 sm:px-0">
        <div class="mb-4 flex justify-end">
          <Button type="primary" @click="openFormDrawer()">
            <template #icon><PlusOutlined /></template>
            <span class="hidden sm:inline">新增活动</span>
          </Button>
        </div>

        <div
          v-if="dataSource.length === 0 && !loading"
          class="py-12 text-center"
        >
          <Empty description="暂无活动记录" />
        </div>

        <div
          v-else
          class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        >
          <div
            v-for="(item, index) in dataSource"
            :key="index"
            class="group cursor-pointer overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
            @click="openFormDrawer(item)"
          >
            <div class="relative aspect-[16/10] overflow-hidden">
              <img
                v-if="item.imageUrl"
                :src="getImageUrl(item.imageUrl)"
                :alt="item.performanceName"
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                @error="handleImageError"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center"
              >
                <span class="text-4xl opacity-30">🎵</span>
              </div>

              <div
                class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
              ></div>

              <div
                class="absolute left-2 top-2 z-20 rounded px-2 py-1 text-xs font-bold shadow backdrop-blur-sm"
                :class="
                  item.performanceType === '1'
                    ? 'bg-primary/80 text-primary-foreground'
                    : 'bg-orange-500/80 text-white'
                "
              >
                {{ getPerformanceTypeLabel(item.performanceType) }}
              </div>

              <div class="absolute bottom-2 left-2 right-2 z-20">
                <h3
                  class="line-clamp-2 text-sm font-bold leading-tight text-white drop-shadow-lg sm:text-base"
                >
                  {{ item.performanceName }}
                </h3>
              </div>
            </div>

            <div class="p-3 sm:p-4">
              <div
                class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm"
              >
                <div v-if="item.performer" class="flex items-center gap-1.5">
                  <UserOutlined class="text-[10px]" />
                  <span class="max-w-[80px] truncate">{{
                    item.performer
                  }}</span>
                </div>
                <div
                  v-if="item.performanceDate"
                  class="flex items-center gap-1.5"
                >
                  <CalendarOutlined class="text-[10px]" />
                  <span>{{ item.performanceDate }}</span>
                </div>
                <div
                  v-if="item.city || item.venue"
                  class="flex items-center gap-1.5"
                >
                  <EnvironmentOutlined class="text-[10px]" />
                  <span class="max-w-[100px] truncate"
                    >{{ item.city
                    }}{{ item.venue ? ` · ${item.venue}` : '' }}</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Spin>

    <Modal
      v-model:open="modalVisible"
      :title="currentRow ? '编辑活动' : '新增活动'"
      :width="600"
      :footer="null"
      :destroy-on-close="true"
      @cancel="closeFormModal"
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
.line-clamp-2 {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
