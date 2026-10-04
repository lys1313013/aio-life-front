<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import {
  CalendarOutlined,
  EnvironmentOutlined,
  PictureOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import { Empty } from 'ant-design-vue';

import { getByDictType } from '#/api/core/common';
import { queryPerformances } from '#/api/core/performance';
import { AppModal as Modal } from '#/components/app-modal';
import AuthImage from '#/components/AuthImage.vue';
import ContentLoading from '#/components/ContentLoading.vue';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';

import FormDrawerDemo from './form-drawer-demo.vue';

interface RowType {
  id: string;
  performanceName: string;
  performer: string;
  performanceType: string;
  performanceDate: string;
  venue: string;
  city: string;
  ticketPrice: string;
  files?: Array<{ id: string }>;
}

const loading = ref(false);
const dataSource = ref<RowType[]>([]);
const modalVisible = ref(false);
const formBusy = ref(false);
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
    const res = await queryPerformances({
      page: 1,
      pageSize: 100,
    });
    dataSource.value = res.items || [];
  } catch (error) {
    // 全局拦截器已提示
    console.error('加载数据失败:', error);
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
  if (formBusy.value) return;
  modalVisible.value = false;
};

const tableReload = () => {
  fetchData();
};
</script>

<template>
  <div class="vp-raw min-h-full w-full bg-background/50 p-0 sm:p-4">
    <ContentLoading v-if="loading" min-height="calc(100vh - 160px)" />
    <template v-else>
      <div class="px-2 py-4 sm:px-0">
        <div
          v-if="dataSource.length === 0 && !loading"
          class="py-12 text-center"
        >
          <Empty description="暂无活动记录" />
        </div>

        <div
          v-else
          class="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
        >
          <button
            v-for="item in dataSource"
            :key="item.id"
            type="button"
            :aria-label="`编辑活动：${item.performanceName}`"
            class="group min-w-0 self-start rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            @click="openFormDrawer(item)"
          >
            <div
              class="aspect-[2/3] overflow-hidden rounded-lg bg-secondary/50 transition-shadow duration-200 group-hover:shadow-md"
            >
              <AuthImage
                v-if="item.files && item.files.length > 0"
                :file-id="item.files[0]?.id"
                :alt="item.performanceName"
                class="h-full w-full object-contain"
              />
              <div
                v-else
                class="flex h-full w-full items-center justify-center text-muted-foreground/40"
              >
                <PictureOutlined class="text-3xl" />
              </div>
            </div>

            <div class="pt-2.5">
              <h3
                class="line-clamp-2 text-sm font-semibold leading-5 text-foreground"
                :title="item.performanceName"
              >
                {{ item.performanceName }}
              </h3>
              <div
                class="mt-1.5 flex flex-col gap-1 text-xs leading-5 text-muted-foreground"
              >
                <div class="flex min-w-0 items-center gap-1.5">
                  <template v-if="item.performer">
                    <UserOutlined class="shrink-0 text-[10px]" />
                    <span class="truncate">{{ item.performer }}</span>
                  </template>
                  <span
                    v-if="item.performanceType"
                    class="ml-auto shrink-0 text-[11px]"
                    >{{ getPerformanceTypeLabel(item.performanceType) }}</span
                  >
                </div>
                <div
                  v-if="item.performanceDate"
                  class="flex items-center gap-1.5"
                >
                  <CalendarOutlined class="shrink-0 text-[10px]" />
                  <span>{{ item.performanceDate }}</span>
                </div>
                <div
                  v-if="item.city || item.venue"
                  class="flex min-w-0 items-center gap-1.5"
                >
                  <EnvironmentOutlined class="shrink-0 text-[10px]" />
                  <span
                    class="truncate"
                    :title="[item.city, item.venue].filter(Boolean).join(' · ')"
                    >{{ item.city
                    }}{{ item.venue ? ` · ${item.venue}` : '' }}</span
                  >
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </template>

    <GlobalFloatBtn @click="openFormDrawer()" />

    <Modal
      v-model:open="modalVisible"
      centered
      :width="640"
      :closable="false"
      :aria-label="currentRow ? '编辑活动' : '新增活动'"
      :busy="formBusy"
      :footer="null"
      :destroy-on-close="true"
      @cancel="closeFormModal"
    >
      <FormDrawerDemo
        :values="currentRow"
        @busy-change="formBusy = $event"
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
