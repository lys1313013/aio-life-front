<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { onMounted, onUnmounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { usePreferences } from '@vben/preferences';

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons-vue';
import {
  Badge,
  Button,
  Empty,
  FloatButton,
  Popconfirm,
  Spin,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteData, query } from '#/api/core/sysDictData';
import { query as queryDictType } from '#/api/core/sysDictType';

import FormModal from './form-modal.vue';

interface RowType {
  dictCode: string;
  dictName: string;
  dictType: string;
  dictValue: string;
  dictLabel: string;
  dictSort: number;
  status: string;
  remark: string;
  updateTime: string;
}

const { isMobile } = usePreferences();
const tableData = ref<RowType[]>([]);
const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
});
const loading = ref(false);
const hasMore = ref(true);

const dictOptions = ref<Array<{ label: string; value: string }>>([]);

async function loadDictOptions() {
  try {
    const res = await queryDictType({});
    dictOptions.value = res.items.map(
      (item: { dictName: string; dictType: string }) => ({
        label: item.dictName,
        value: item.dictType,
      }),
    );
  } catch (error) {
    console.error('加载字典选项失败:', error);
  }
}

onMounted(() => {
  loadDictOptions();
  if (isMobile.value) {
    window.addEventListener('scroll', handleScroll);
  }
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

const [FormModalComponent, formModalApi] = useVbenModal({
  connectedComponent: FormModal,
});

const formOptions: VbenFormProps = {
  // 默认展开
  collapsed: false,
  schema: [
    // 搜索区
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择字典类型',
        options: dictOptions, // 绑定字典类型选项
        allowClear: true, // 添加清除选项功能
        showSearch: true, // 支持输入查询
        optionFilterProp: 'label', // 按标签过滤
        fieldNames: { label: 'label', value: 'value' },
      },
      fieldName: 'dictType',
      label: '字典类型',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入展示值',
      },
      fieldName: 'dictLabel',
      label: '展示值',
    },
  ],
  // 控制表单是否显示折叠按钮
  showCollapseButton: false,
  submitButtonOptions: {
    content: '查询',
  },
  wrapperClass: isMobile.value ? 'mobile-form-wrapper' : '',
  submitOnChange: false, // 是否在字段值改变时提交表单
  submitOnEnter: true, // 按下回车时是否提交表单
  handleReset: (values) => {
    if (isMobile.value) {
      pagination.value.current = 1;
      tableData.value = [];
      hasMore.value = true;
    }
    gridApi.reload(values);
  },
  handleSubmit: (values) => {
    if (isMobile.value) {
      pagination.value.current = 1;
      tableData.value = [];
      hasMore.value = true;
    }
    gridApi.reload(values);
  },
};

const gridOptions: VxeGridProps<RowType> = {
  checkboxConfig: {
    highlight: true,
    labelField: 'name',
  },
  border: true, // 表格是否显示边框
  stripe: true, // 是否显示斑马纹
  columns: [
    { title: '序号', type: 'seq', width: 50 },
    { title: 'dictCode', visible: false },
    { field: 'dictName', title: '字典名称', sortable: true },
    { field: 'dictType', title: '字典标识', sortable: true },
    { field: 'dictValue', title: '实际值', sortable: true },
    { field: 'dictLabel', title: '展示值', sortable: true },
    { field: 'dictSort', title: '排序', sortable: true },
    { field: 'status', title: '状态', sortable: true },
    { field: 'remark', title: '备注', sortable: true },
    { field: 'updateTime', title: '修改时间', sortable: true },

    {
      field: 'action',
      slots: { default: 'action' },
      fixed: 'right',
      title: '操作',
      width: 120,
    },
  ],
  keepSource: true,
  pagerConfig: { pageSize: 10 },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        if (isMobile.value) {
          loading.value = true;
        }

        // 移动端模式下，从 formApi 直接获取当前最新的表单值
        const values = isMobile.value
          ? await gridApi.formApi.getValues()
          : formValues;
        
        console.log('Query Values:', values);

        const res = await query({
          page: isMobile.value ? pagination.value.current : page.currentPage,
          pageSize: page.pageSize,
          condition: {
            ...values,
          },
        });

        if (isMobile.value) {
          tableData.value =
            pagination.value.current === 1
              ? res.items
              : [...tableData.value, ...res.items];
          pagination.value.total = res.total;
          hasMore.value = tableData.value.length < res.total;
          loading.value = false;
        } else {
          tableData.value = res.items;
          pagination.value = {
            current: page.currentPage,
            pageSize: page.pageSize,
            total: res.total,
          };
        }
        return res;
      },
    },
  },
  toolbarConfig: {
    // 是否显示搜索表单控制按钮
    // @ts-ignore 正式环境时有完整的类型声明
    search: true,
  },
};

function handleScroll() {
  if (!isMobile.value || loading.value || !hasMore.value) return;

  const scrollHeight = document.documentElement.scrollHeight;
  const scrollTop = document.documentElement.scrollTop;
  const clientHeight = document.documentElement.clientHeight;

  if (scrollTop + clientHeight >= scrollHeight - 50) {
    pagination.value.current++;
    gridApi.reload();
  }
}

function openFormModal(row: RowType) {
  formModalApi
    .setData({
      // 表单值
      values: row,
    })
    .open();
}

function openAddFormModal() {
  formModalApi
    .setData({
      // 表单值
      values: { status: '0' },
    })
    .open();
}

// 显式指定泛型参数，避免 TS 深度实例化
const [Grid, gridApi] = useVbenVxeGrid<RowType>({
  formOptions: formOptions as any,
  gridOptions: gridOptions as any,
});

const deleteRow = async (row: RowType) => {
  try {
    await deleteData({
      dictCode: row.dictCode,
    });
    gridApi.reload();
  } catch (error) {
    console.error('捕获异常：', error);
  }
};

const tableReload = () => {
  if (isMobile.value) {
    pagination.value.current = 1;
    tableData.value = [];
    hasMore.value = true;
  }
  gridApi.reload();
};

let longPressTimer: any = null;
let isLongPress = false;
let isMoving = false;
const activeDeleteId = ref<string | null>(null);

function handleTouchStart(item: RowType) {
  isLongPress = false;
  isMoving = false;
  longPressTimer = setTimeout(() => {
    if (!isMoving) {
      isLongPress = true;
      activeDeleteId.value = item.dictCode;
    }
  }, 600); // 600ms 长按触发
}

function handleTouchEnd(item: RowType) {
  clearTimeout(longPressTimer);
  if (!isLongPress && !isMoving) {
    // 如果点击了其他地方，隐藏当前的删除按钮
    if (activeDeleteId.value) {
      activeDeleteId.value = null;
      return;
    }
    // 如果既不是长按也不是滑动，则认为是点击，触发编辑
    openFormModal(item);
  }
}

function handleTouchMove() {
  isMoving = true;
  clearTimeout(longPressTimer);
}

function handleDelete(item: RowType) {
  deleteRow(item);
  activeDeleteId.value = null;
}
</script>

<template>
  <div class="vp-raw w-full p-4">
    <FormModalComponent @table-reload="tableReload" />

    <!-- 桌面端展示表格，移动端通过 CSS 隐藏表格部分以保留搜索表单 -->
    <Grid :class="{ 'mobile-grid': isMobile }">
      <template #toolbar-tools>
        <Button class="mr-2" type="primary" @click="openAddFormModal">
          新增
        </Button>
      </template>
      <template #action="{ row }">
        <Tooltip title="编辑">
          <Button type="link" size="small" @click="openFormModal(row)">
            <template #icon><EditOutlined /></template>
          </Button>
        </Tooltip>
        <Popconfirm
          title="是否确认删除?"
          ok-text="是"
          cancel-text="否"
          @confirm="deleteRow(row)"
        >
          <Tooltip title="删除">
            <Button type="link" size="small" danger>
              <template #icon><DeleteOutlined /></template>
            </Button>
          </Tooltip>
        </Popconfirm>
      </template>
    </Grid>

    <!-- 移动端展示卡片列表 -->
    <div v-if="isMobile" class="mobile-card-list mt-4 pb-20">
      <div
        v-if="tableData.length > 0"
        class="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-[#171717]"
      >
        <div
          v-for="(item, index) in tableData"
          :key="item.dictCode"
          class="active:scale-[0.98] relative cursor-pointer p-5 transition-transform duration-100"
          :class="{
            'border-t border-zinc-100 dark:border-zinc-800/50': index !== 0,
          }"
          @touchstart="handleTouchStart(item)"
          @touchend="handleTouchEnd(item)"
          @touchmove="handleTouchMove"
        >
          <!-- 删除按钮遮罩层 -->
          <div
            v-if="activeDeleteId === item.dictCode"
            class="absolute inset-0 z-10 flex items-center justify-center bg-black/5 backdrop-blur-[2px] transition-all duration-200"
            @touchstart.stop="() => {}"
            @click.stop="activeDeleteId = null"
          >
            <Popconfirm
              title="确定要删除此项吗？"
              ok-text="确定"
              cancel-text="取消"
              placement="top"
              @confirm="handleDelete(item)"
              @cancel="activeDeleteId = null"
            >
              <Button
                type="primary"
                danger
                shape="round"
                size="large"
                class="!flex !items-center !gap-2 shadow-lg scale-110"
                @touchstart.stop="() => {}"
                @click.stop="() => {}"
              >
                <template #icon><DeleteOutlined /></template>
                删除
              </Button>
            </Popconfirm>
          </div>

          <div class="mb-4 flex items-start justify-between">
            <div class="flex flex-col gap-1.5">
              <span
                class="text-[20px] font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-100"
              >
                {{ item.dictLabel }}
              </span>
            </div>
            <div class="flex flex-col items-end gap-2 pt-1">
              <span
                class="rounded-full bg-blue-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-blue-600 ring-1 ring-inset ring-blue-500/10 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20"
              >
                {{ item.dictName || '未知字典' }}
              </span>
              <div class="flex items-center gap-2">
                <span
                  class="text-[11px] font-medium text-zinc-400 dark:text-zinc-500"
                >
                  排序 #{{ item.dictSort }}
                </span>
                <div class="h-2.5 w-[1px] bg-zinc-200 dark:bg-zinc-700"></div>
                <div class="flex items-center gap-1.5">
                  <div
                    class="h-1.5 w-1.5 rounded-full"
                    :class="
                      item.status === '0' ? 'bg-emerald-500' : 'bg-rose-500'
                    "
                  ></div>
                  <span
                    class="text-[11px] font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    {{ item.status === '0' ? '正常' : '停用' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="item.remark" class="card-content">
            <div
              class="relative overflow-hidden rounded-xl bg-zinc-50/50 p-3 dark:bg-zinc-800/30"
            >
              <div
                class="absolute left-0 top-0 h-full w-1 bg-zinc-200 dark:bg-zinc-700"
              ></div>
              <span
                class="text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400"
              >
                {{ item.remark }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="flex justify-center py-4">
        <Spin size="small" tip="加载中..." />
      </div>

      <!-- 加载完毕 -->
      <div
        v-if="!hasMore && tableData.length > 0"
        class="py-6 text-center text-xs text-zinc-400"
      >
        没有更多数据了
      </div>

      <Empty
        v-if="!loading && tableData.length === 0"
        class="!m-0 rounded-lg bg-white py-10 dark:bg-[#171717]"
      />

      <!-- 移动端悬浮按钮 -->
      <FloatButton
        type="primary"
        :style="{ right: '25px', bottom: '25px' }"
        @click="openAddFormModal"
      >
        <template #icon>
          <PlusOutlined />
        </template>
      </FloatButton>

      <FloatButton.BackTop
        :visibility-height="400"
        :style="{ right: '24px', bottom: '24px' }"
      >
        <template #icon>
          <VerticalAlignTopOutlined />
        </template>
      </FloatButton.BackTop>
    </div>
  </div>
</template>

<style scoped>
.mobile-card-list {
  @apply flex flex-col;
}
.card-content {
  @apply text-sm;
}

.mobile-card {
  background-color: #fff;
}

:deep(.dark) .mobile-card {
  background-color: #171717;
}

/* 移动端样式覆盖：隐藏表格主体、分页以及所有辅助组件（如滚动条、边框线等） */
:deep(.mobile-grid .vxe-table--render-wrapper),
:deep(.mobile-grid .vxe-table--main-wrapper),
:deep(.mobile-grid .vxe-table--scroll-x-handle),
:deep(.mobile-grid .vxe-table--scroll-y-handle),
:deep(.mobile-grid .vxe-table--fixed-left-wrapper),
:deep(.mobile-grid .vxe-table--fixed-right-wrapper),
:deep(.mobile-grid .vxe-table--border-line),
:deep(.mobile-grid .vxe-toolbar),
:deep(.mobile-grid .vxe-pager),
:deep(.mobile-grid .vben-vxe-grid__grid-wrapper),
:deep(.mobile-grid .vxe-grid--main-wrapper),
:deep(.mobile-grid .vxe-grid--layout-wrapper),
:deep(.mobile-grid .vxe-table) {
  display: none !important;
  height: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
}

/* 允许 Header 显示（因为搜索框在这里），但重置其最小高度 */
:deep(.mobile-grid .vxe-grid--layout-header-wrapper) {
  display: block !important;
  height: auto !important;
  min-height: 0 !important;
  padding: 0 !important;
}

/* 强制消除搜索框下方的所有间隙 */
:deep(.mobile-grid .vxe-grid) {
  min-height: 0 !important;
  background: transparent !important;
  padding-bottom: 0 !important;
}

:deep(.mobile-grid .vben-vxe-grid) {
  border: none !important;
  padding: 0 !important;
  margin-bottom: 0 !important;
  background: transparent !important;
  min-height: 0 !important;
}

/* 隐藏那个奇怪的背景分隔条 */
:deep(.mobile-grid .bg-background-deep) {
  display: none !important;
}

/* 统一移动端搜索表单容器上下间距，消除 pb-8 等带来的不一致 */
:deep(.mobile-grid .relative.rounded.py-3) {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

/* 移动端搜索区域优化 */
:deep(.mobile-form-wrapper) {
  @apply !mb-4 !p-0;
}

:deep(.mobile-form-wrapper .ant-form) {
  @apply rounded-xl border border-zinc-100 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-[#171717];
}

:deep(.mobile-form-wrapper .ant-form-item) {
  @apply mb-2 !mr-0 flex-row items-center justify-between;
}

:deep(.mobile-form-wrapper .ant-form-item-label) {
  @apply flex-shrink-0 !pb-0;
}

:deep(.mobile-form-wrapper .ant-form-item-control) {
  @apply flex-grow-0;
}

:deep(.mobile-form-wrapper .ant-form-item-control-input-content) {
  @apply flex justify-end;
}

:deep(.mobile-form-wrapper .ant-input),
:deep(.mobile-form-wrapper .ant-select-selector) {
  @apply !w-48 !rounded-lg;
}

:deep(.mobile-form-wrapper .vben-form-actions) {
  @apply !mt-1 flex w-full gap-3 border-t border-zinc-100 pt-2 dark:border-zinc-800;
}

:deep(.mobile-form-wrapper .vben-form-actions > button) {
  @apply !h-10 flex-1 !rounded-lg;
}

/* 移除卡片标题下的横线 */
:deep(.mobile-card .ant-card-head) {
  border-bottom: none !important;
  min-height: 40px;
}
</style>
