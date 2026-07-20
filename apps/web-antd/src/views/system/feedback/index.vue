<script setup lang="ts">
import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { FeedbackDetailVO } from '#/api/core/feedback';

import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, Drawer, message, Select, Tag, Textarea } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  adminReplyFeedback,
  adminUpdateFeedbackStatus,
  getAdminFeedbackDetail,
  queryAllFeedbacks,
  uploadFeedbackAttachment,
} from '#/api/core/feedback';
import ImageUpload from '#/components/ImageUpload.vue';
import { fetchAuthImageUrl } from '#/utils/file';

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待处理', value: 'PENDING' },
  { label: '处理中', value: 'PROCESSING' },
  { label: '已解决', value: 'RESOLVED' },
  { label: '已关闭', value: 'CLOSED' },
  { label: '已驳回', value: 'REJECTED' },
];

const statusColors: Record<string, string> = {
  PENDING: 'orange',
  PROCESSING: 'blue',
  RESOLVED: 'green',
  CLOSED: 'default',
  REJECTED: 'red',
};

const statusLabels: Record<string, string> = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  RESOLVED: '已解决',
  CLOSED: '已关闭',
  REJECTED: '已驳回',
};

const typeLabels: Record<string, string> = {
  BUG: '缺陷',
  SUGGESTION: '建议',
  QUESTION: '咨询',
  OTHER: '其他',
};

// ========== 表格 ==========
const formOptions: VbenFormProps = {
  collapsed: false,
  showCollapseButton: false,
  submitButtonOptions: {
    content: '查询',
  },
  schema: [
    {
      fieldName: 'status',
      component: 'Select',
      label: '状态',
      componentProps: {
        placeholder: '全部状态',
        options: statusOptions.filter((o) => o.value),
        allowClear: true,
      },
    },
    {
      fieldName: 'feedbackType',
      component: 'Select',
      label: '类型',
      componentProps: {
        placeholder: '全部类型',
        options: [
          { label: '缺陷', value: 'BUG' },
          { label: '建议', value: 'SUGGESTION' },
          { label: '咨询', value: 'QUESTION' },
          { label: '其他', value: 'OTHER' },
        ],
        allowClear: true,
      },
    },
    {
      fieldName: 'keyword',
      component: 'Input',
      label: '关键词',
      componentProps: {
        placeholder: '标题/内容搜索',
        allowClear: true,
      },
    },
  ],
};

const gridOptions: VxeGridProps = {
  toolbarConfig: {
    custom: false,
    refresh: true,
    zoom: true,
  },
  columns: [
    { type: 'seq', width: 60, title: '#', align: 'center' },
    { field: 'title', title: '标题', minWidth: 180 },
    { field: 'userName', title: '用户', width: 100, align: 'center' },
    {
      field: 'feedbackType',
      title: '类型',
      width: 80,
      align: 'center',
      slots: { default: 'typeSlot' },
    },
    {
      field: 'status',
      title: '状态',
      width: 90,
      align: 'center',
      slots: { default: 'statusSlot' },
    },
    { field: 'commentCount', title: '评论', width: 70, align: 'center' },
    { field: 'createTime', title: '提交时间', width: 160, align: 'center' },
    {
      title: '操作',
      width: 80,
      align: 'center',
      fixed: 'right',
      slots: { default: 'actionSlot' },
    },
  ],
  keepSource: true,
  pagerConfig: {
    enabled: true,
    pageSize: 20,
    pageSizes: [10, 20, 50],
  },
  proxyConfig: {
    autoLoad: true,
    ajax: {
      query: async ({ page }, formValues) => {
        const res = await queryAllFeedbacks({
          page: page.currentPage,
          pageSize: page.pageSize,
          status: formValues.status || undefined,
          feedbackType: formValues.feedbackType || undefined,
          keyword: formValues.keyword || undefined,
        });
        return { items: res.items || [], total: res.total || 0 };
      },
    },
  },
};

const [Grid, gridApi] = useVbenVxeGrid({ formOptions, gridOptions } as any);

// ========== 详情抽屉 ==========
const drawerVisible = ref(false);
const detail = ref<FeedbackDetailVO | null>(null);
const detailLoading = ref(false);
const imageUrlMap = ref<Record<string, string>>({});

// 回复
const replyContent = ref('');
const replyFileIds = ref<string[]>([]);
const replyLoading = ref(false);

// 状态变更
const newStatus = ref('');
const statusLoading = ref(false);

const openDetail = async (row: any) => {
  try {
    detailLoading.value = true;
    drawerVisible.value = true;
    detail.value = await getAdminFeedbackDetail(String(row.id));
    newStatus.value = detail.value?.status || '';
    // 预加载图片
    if (detail.value) {
      const allFileIds: string[] = [];
      if (detail.value.files) {
        allFileIds.push(...detail.value.files.map((f) => String(f.id)));
      }
      if (detail.value.comments) {
        for (const c of detail.value.comments) {
          if (c.files) {
            allFileIds.push(...c.files.map((f) => String(f.id)));
          }
        }
      }
      for (const fid of allFileIds) {
        if (!imageUrlMap.value[fid]) {
          const url = await fetchAuthImageUrl(fid);
          if (url) imageUrlMap.value[fid] = url;
        }
      }
    }
  } catch (error) {
    console.error('加载详情失败', error);
    message.error('加载详情失败');
  } finally {
    detailLoading.value = false;
  }
};

const handleReply = async () => {
  if (!detail.value) return;
  if (!replyContent.value.trim()) {
    message.warning('请输入回复内容');
    return;
  }
  try {
    replyLoading.value = true;
    await adminReplyFeedback(detail.value.id, {
      content: replyContent.value,
      fileIds: replyFileIds.value.length > 0 ? replyFileIds.value : undefined,
    });
    message.success('回复成功');
    replyContent.value = '';
    replyFileIds.value = [];
    // 刷新详情
    await openDetail(detail.value);
  } catch (error) {
    console.error('回复失败', error);
    message.error('回复失败');
  } finally {
    replyLoading.value = false;
  }
};

const handleChangeStatus = async () => {
  if (!detail.value) return;
  if (!newStatus.value) {
    message.warning('请选择状态');
    return;
  }
  try {
    statusLoading.value = true;
    await adminUpdateFeedbackStatus(detail.value.id, newStatus.value);
    message.success('状态已更新');
    detail.value.status = newStatus.value;
    gridApi.query();
  } catch (error) {
    console.error('状态更新失败', error);
    message.error('状态更新失败');
  } finally {
    statusLoading.value = false;
  }
};

const getImageUrl = (fileId: number | string) => {
  return imageUrlMap.value[String(fileId)] || '';
};
</script>

<template>
  <Page auto-content-height>
    <div class="flex h-full flex-col space-y-4">
      <div class="flex-1 overflow-hidden">
        <Grid>
          <!-- 类型插槽 -->
          <template #typeSlot="{ row }">
            <Tag>{{ typeLabels[row.feedbackType] || row.feedbackType }}</Tag>
          </template>

          <!-- 状态插槽 -->
          <template #statusSlot="{ row }">
            <Tag :color="statusColors[row.status]">
              {{ statusLabels[row.status] || row.status }}
            </Tag>
          </template>

          <!-- 操作插槽 -->
          <template #actionSlot="{ row }">
            <Button type="link" size="small" @click="openDetail(row)">
              查看
            </Button>
          </template>
        </Grid>
      </div>
    </div>

    <!-- 详情抽屉 -->
    <Drawer
      v-model:open="drawerVisible"
      title="反馈详情"
      :width="640"
      :destroy-on-close="true"
    >
      <div v-if="detail">
        <!-- 头部 -->
        <div class="mb-4 border-b border-border pb-4">
          <h3 class="mb-2 text-lg font-bold">{{ detail.title }}</h3>
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <Tag :color="statusColors[detail.status]">
              {{ statusLabels[detail.status] }}
            </Tag>
            <Tag>{{ typeLabels[detail.feedbackType] }}</Tag>
            <span class="text-gray-500">用户：{{ detail.userName }}</span>
            <span class="text-gray-500">{{ detail.createTime }}</span>
          </div>
        </div>

        <!-- 内容 -->
        <div class="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/30">
          <div class="whitespace-pre-wrap text-sm">{{ detail.content }}</div>
          <div
            v-if="detail.files && detail.files.length > 0"
            class="mt-3 flex flex-wrap gap-2"
          >
            <img
              v-for="f in detail.files"
              :key="f.id"
              :src="getImageUrl(f.id)"
              class="h-20 w-20 rounded object-cover"
            />
          </div>
        </div>

        <!-- 状态变更 -->
        <div class="mb-4 rounded-lg border border-border p-3">
          <div class="mb-2 text-sm font-medium">变更状态</div>
          <div class="flex items-center gap-2">
            <Select
              v-model:value="newStatus"
              class="flex-1"
              placeholder="选择状态"
            >
              <Select.Option
                v-for="opt in statusOptions.filter((o) => o.value)"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </Select.Option>
            </Select>
            <Button
              type="primary"
              :loading="statusLoading"
              @click="handleChangeStatus"
            >
              更新
            </Button>
          </div>
        </div>

        <!-- 评论时间线 -->
        <div class="mb-4">
          <h4 class="mb-3 font-semibold">评论记录</h4>
          <div
            v-if="!detail.comments || detail.comments.length === 0"
            class="py-4 text-center text-sm text-gray-400"
          >
            暂无评论
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="comment in detail.comments"
              :key="comment.id"
              class="rounded-lg border border-border p-3"
              :class="
                comment.roleType === 'ADMIN'
                  ? 'bg-blue-50/50 dark:bg-blue-900/10'
                  : ''
              "
            >
              <div class="mb-1 flex items-center gap-2 text-sm">
                <span class="font-medium">{{ comment.userName }}</span>
                <Tag
                  v-if="comment.roleType === 'ADMIN'"
                  color="blue"
                  class="m-0 text-xs"
                >
                  管理员
                </Tag>
                <span class="ml-auto text-xs text-gray-400">{{
                  comment.createTime
                }}</span>
              </div>
              <div class="whitespace-pre-wrap text-sm">
                {{ comment.content }}
              </div>
              <div
                v-if="comment.files && comment.files.length > 0"
                class="mt-2 flex flex-wrap gap-2"
              >
                <img
                  v-for="f in comment.files"
                  :key="f.id"
                  :src="getImageUrl(f.id)"
                  class="h-16 w-16 rounded object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 回复输入 -->
        <div class="border-t border-border pt-4">
          <h4 class="mb-2 text-sm font-medium">管理员回复</h4>
          <Textarea
            v-model:value="replyContent"
            placeholder="输入回复内容..."
            :rows="3"
            class="mb-2"
          />
          <ImageUpload
            v-model:file-ids="replyFileIds"
            :upload-fn="uploadFeedbackAttachment"
            :max-count="5"
          />
          <div class="mt-2 flex justify-end">
            <Button type="primary" :loading="replyLoading" @click="handleReply">
              发送回复
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  </Page>
</template>
