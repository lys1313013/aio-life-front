<script setup lang="ts">
import type { Rule } from 'ant-design-vue/es/form';

import type { FeedbackDetailVO, FeedbackVO } from '#/api/core/feedback';

import { onMounted, ref } from 'vue';

import {
  ClockCircleOutlined,
  CommentOutlined,
  MessageOutlined,
} from '@ant-design/icons-vue';
import {
  Badge as ABadge,
  Button as AButton,
  Drawer as ADrawer,
  Empty as AEmpty,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  Modal as AModal,
  Popconfirm as APopconfirm,
  Select as ASelect,
  SelectOption as ASelectOption,
  Spin as ASpin,
  Tag as ATag,
  Textarea as ATextarea,
  message,
} from 'ant-design-vue';

import {
  addFeedbackComment,
  cancelFeedback,
  createFeedback,
  getMyFeedbackDetail,
  queryMyFeedbacks,
  uploadFeedbackAttachment,
} from '#/api/core/feedback';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';
import ImageUpload from '#/components/ImageUpload.vue';
import { fetchAuthImageUrl } from '#/utils/file';

// ========== 状态 ==========
const loading = ref(false);
const feedbacks = ref<FeedbackVO[]>([]);
const activeTab = ref<string>('');

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

const typeColors: Record<string, string> = {
  BUG: 'red',
  SUGGESTION: 'cyan',
  QUESTION: 'blue',
  OTHER: 'default',
};

// ========== 提交弹窗 ==========
const createModalVisible = ref(false);
const submitLoading = ref(false);
const formRef = ref();
const formState = ref({
  title: '',
  content: '',
  feedbackType: 'BUG',
  fileIds: [] as string[],
});

const rules: Record<string, Rule[]> = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
};

// ========== 详情抽屉 ==========
const drawerVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<FeedbackDetailVO | null>(null);

// 评论输入
const commentContent = ref('');
const commentFileIds = ref<string[]>([]);
const commentLoading = ref(false);

// 图片 URL 缓存
const imageUrlMap = ref<Record<string, string>>({});

// ========== 加载数据 ==========
const loadData = async () => {
  try {
    loading.value = true;
    const res = await queryMyFeedbacks({
      status: activeTab.value || undefined,
      page: 1,
      pageSize: 50,
    });
    feedbacks.value = res.items || [];
    // 预加载图片 URL
    await preloadImages(feedbacks.value);
  } catch (error) {
    console.error('加载反馈列表失败', error);
  } finally {
    loading.value = false;
  }
};

const preloadImages = async (items: FeedbackVO[]) => {
  const promises: Promise<void>[] = [];
  for (const item of items) {
    if (item.files) {
      for (const f of item.files) {
        if (!imageUrlMap.value[f.id]) {
          promises.push(
            fetchAuthImageUrl(f.id).then((url) => {
              if (url) imageUrlMap.value[f.id] = url;
            }),
          );
        }
      }
    }
  }
  await Promise.all(promises);
};

const loadDetail = async (id: string) => {
  try {
    detailLoading.value = true;
    detail.value = await getMyFeedbackDetail(id);
    drawerVisible.value = true;
    // 预加载详情中的图片
    if (detail.value) {
      const allItems: FeedbackVO[] = [detail.value];
      if (detail.value.comments) {
        for (const c of detail.value.comments) {
          allItems.push(c as any);
        }
      }
      await preloadImages(allItems);
    }
  } catch (error) {
    console.error('加载反馈详情失败', error);
    message.error('加载详情失败');
  } finally {
    detailLoading.value = false;
  }
};

onMounted(() => {
  loadData();
});

// ========== 操作 ==========
const handleAdd = () => {
  formState.value = {
    title: '',
    content: '',
    feedbackType: 'BUG',
    fileIds: [],
  };
  createModalVisible.value = true;
};

const handleCreate = async () => {
  try {
    await formRef.value.validate();
    submitLoading.value = true;
    await createFeedback(formState.value);
    message.success('提交成功');
    createModalVisible.value = false;
    loadData();
  } catch (error) {
    console.error('提交失败', error);
  } finally {
    submitLoading.value = false;
  }
};

const handleCancel = async (id: string) => {
  try {
    await cancelFeedback(id);
    message.success('已撤销');
    loadData();
    if (detail.value?.id === id) {
      drawerVisible.value = false;
    }
  } catch (error) {
    console.error('撤销失败', error);
    message.error('撤销失败');
  }
};

const handleTabChange = (key: string) => {
  activeTab.value = key;
  loadData();
};

const handleAddComment = async () => {
  if (!detail.value) return;
  if (!commentContent.value.trim()) {
    message.warning('请输入评论内容');
    return;
  }
  try {
    commentLoading.value = true;
    await addFeedbackComment(detail.value.id, {
      content: commentContent.value,
      fileIds:
        commentFileIds.value.length > 0 ? commentFileIds.value : undefined,
    });
    message.success('评论成功');
    commentContent.value = '';
    commentFileIds.value = [];
    // 刷新详情
    await loadDetail(detail.value.id);
  } catch (error) {
    console.error('评论失败', error);
    message.error('评论失败');
  } finally {
    commentLoading.value = false;
  }
};

const getImageUrl = (fileId: number | string) => {
  return imageUrlMap.value[String(fileId)] || '';
};
</script>

<template>
  <div class="min-h-full bg-background/50 p-4">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-xl font-bold text-card-foreground">反馈中心</h2>
      <p class="text-muted-foreground">提交问题、建议或咨询，追踪处理进度</p>
    </div>

    <!-- Status Tabs -->
    <div class="mb-6 rounded-xl border border-border bg-card p-2 shadow-sm">
      <div class="flex flex-wrap gap-2">
        <AButton
          v-for="opt in statusOptions"
          :key="opt.value"
          :type="activeTab === opt.value ? 'primary' : 'default'"
          size="small"
          @click="handleTabChange(opt.value)"
        >
          {{ opt.label }}
        </AButton>
      </div>
    </div>

    <!-- List -->
    <ASpin :spinning="loading">
      <div v-if="feedbacks.length === 0 && !loading" class="py-20">
        <AEmpty description="暂无反馈记录">
          <AButton type="primary" @click="handleAdd">提交反馈</AButton>
        </AEmpty>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="item in feedbacks"
          :key="item.id"
          class="apple-card cursor-pointer rounded-xl border border-border bg-card p-4"
          @click="loadDetail(item.id)"
        >
          <div class="mb-2 flex items-start justify-between gap-2">
            <h3
              class="line-clamp-1 text-base font-semibold text-card-foreground"
            >
              {{ item.title }}
            </h3>
            <div class="flex shrink-0 items-center gap-1.5">
              <ATag :color="typeColors[item.feedbackType]" class="m-0 text-xs">
                {{ typeLabels[item.feedbackType] || item.feedbackType }}
              </ATag>
              <ATag :color="statusColors[item.status]" class="m-0 text-xs">
                {{ statusLabels[item.status] || item.status }}
              </ATag>
            </div>
          </div>

          <p class="mb-3 line-clamp-2 text-sm text-muted-foreground">
            {{ item.summary }}
          </p>

          <div class="flex items-center gap-4 text-xs text-muted-foreground">
            <span class="flex items-center gap-1">
              <ClockCircleOutlined />
              {{ item.createTime }}
            </span>
            <span class="flex items-center gap-1">
              <CommentOutlined />
              {{ item.commentCount }} 条评论
            </span>
            <span
              v-if="item.files && item.files.length > 0"
              class="flex items-center gap-1"
            >
              📎 {{ item.files.length }} 张图
            </span>
          </div>
        </div>
      </div>
    </ASpin>

    <!-- 创建弹窗 -->
    <AModal
      v-model:open="createModalVisible"
      title="提交反馈"
      :confirm-loading="submitLoading"
      @ok="handleCreate"
      width="600px"
    >
      <template #footer>
        <div class="flex justify-end gap-2">
          <AButton @click="createModalVisible = false">取消</AButton>
          <AButton
            type="primary"
            :loading="submitLoading"
            @click="handleCreate"
          >
            提交
          </AButton>
        </div>
      </template>
      <AForm ref="formRef" :model="formState" :rules="rules" layout="vertical">
        <AFormItem label="类型" name="feedbackType">
          <ASelect v-model:value="formState.feedbackType">
            <ASelectOption value="BUG">缺陷</ASelectOption>
            <ASelectOption value="SUGGESTION">建议</ASelectOption>
            <ASelectOption value="QUESTION">咨询</ASelectOption>
            <ASelectOption value="OTHER">其他</ASelectOption>
          </ASelect>
        </AFormItem>
        <AFormItem label="标题" name="title">
          <AInput
            v-model:value="formState.title"
            placeholder="简要描述问题"
            :maxlength="200"
          />
        </AFormItem>
        <AFormItem label="内容" name="content">
          <ATextarea
            v-model:value="formState.content"
            placeholder="详细描述"
            :rows="6"
          />
        </AFormItem>
        <AFormItem label="截图（可选）" name="fileIds">
          <ImageUpload
            v-model:file-ids="formState.fileIds"
            :upload-fn="uploadFeedbackAttachment"
            :max-count="9"
          />
        </AFormItem>
      </AForm>
    </AModal>

    <!-- 详情抽屉 -->
    <ADrawer
      v-model:open="drawerVisible"
      title="反馈详情"
      width="600px"
      :destroy-on-close="true"
    >
      <ASpin :spinning="detailLoading">
        <div v-if="detail">
          <!-- 头部信息 -->
          <div class="mb-4">
            <h3 class="mb-2 text-lg font-bold text-card-foreground">
              {{ detail.title }}
            </h3>
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <ATag :color="typeColors[detail.feedbackType]">
                {{ typeLabels[detail.feedbackType] || detail.feedbackType }}
              </ATag>
              <ATag :color="statusColors[detail.status]">
                {{ statusLabels[detail.status] || detail.status }}
              </ATag>
              <span class="text-muted-foreground">{{ detail.createTime }}</span>
            </div>
          </div>

          <!-- 原始内容 -->
          <div class="mb-4 rounded-lg border border-border bg-secondary/30 p-4">
            <div class="whitespace-pre-wrap text-sm text-card-foreground">
              {{ detail.content }}
            </div>
            <!-- 附件 -->
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

          <!-- 评论时间线 -->
          <div class="mb-4">
            <h4
              class="mb-3 flex items-center gap-2 font-semibold text-card-foreground"
            >
              <MessageOutlined /> 评论 ({{ detail.commentCount }})
            </h4>

            <div
              v-if="!detail.comments || detail.comments.length === 0"
              class="py-4 text-center text-sm text-muted-foreground"
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
                  <ABadge
                    :status="
                      comment.roleType === 'ADMIN' ? 'processing' : 'default'
                    "
                  />
                  <span class="font-medium text-card-foreground">{{
                    comment.userName
                  }}</span>
                  <ATag
                    v-if="comment.roleType === 'ADMIN'"
                    color="blue"
                    class="m-0 text-xs"
                  >
                    管理员
                  </ATag>
                  <span class="ml-auto text-xs text-muted-foreground">{{
                    comment.createTime
                  }}</span>
                </div>
                <div class="whitespace-pre-wrap text-sm text-card-foreground">
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

          <!-- 追加评论 -->
          <div class="border-t border-border pt-4">
            <h4 class="mb-2 text-sm font-medium text-card-foreground">
              追加评论
            </h4>
            <ATextarea
              v-model:value="commentContent"
              placeholder="输入评论内容..."
              :rows="3"
              class="mb-2"
            />
            <ImageUpload
              v-model:file-ids="commentFileIds"
              :upload-fn="uploadFeedbackAttachment"
              :max-count="5"
            />
            <div class="mt-2 flex justify-end">
              <AButton
                type="primary"
                :loading="commentLoading"
                @click="handleAddComment"
              >
                发送评论
              </AButton>
            </div>
          </div>

          <!-- 撤销按钮 -->
          <div
            v-if="detail.status === 'PENDING'"
            class="mt-4 border-t border-border pt-4"
          >
            <APopconfirm
              title="确定要撤销这条反馈吗？"
              @confirm="handleCancel(detail.id)"
            >
              <AButton danger block>撤销反馈</AButton>
            </APopconfirm>
          </div>
        </div>
      </ASpin>
    </ADrawer>

    <GlobalFloatBtn @click="handleAdd" />
  </div>
</template>

<style scoped>
.apple-card {
  transition: all 0.2s ease;
}
.apple-card:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
  transform: translateY(-1px);
}
.line-clamp-1 {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
}
.line-clamp-2 {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
