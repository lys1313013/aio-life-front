<script setup lang="ts">
import type { Memo } from '#/api/core/memo';

import { onMounted, reactive, ref } from 'vue';

import { usePreferences } from '@vben/preferences';

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Empty,
  Input,
  message,
  Modal,
  Popconfirm,
  Spin,
  Tooltip,
} from 'ant-design-vue';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import {
  createMemoApi,
  deleteMemoApi,
  getMemoListApi,
  updateMemoApi,
} from '#/api/core/memo';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';

const memos = ref<Memo[]>([]);
const loading = ref(false);
const modalOpen = ref(false);
const modalTitle = ref('新建');
const confirmLoading = ref(false);
const { isMobile } = usePreferences();

const formState = reactive({
  id: '',
  title: '',
  content: '',
});

const fetchMemos = async () => {
  loading.value = true;
  try {
    const res = await getMemoListApi();
    // Use res as it is an array now based on previous fix
    memos.value = res || [];
  } finally {
    loading.value = false;
  }
};

const handleAdd = () => {
  modalTitle.value = '新建';
  formState.id = '';
  formState.title = '';
  formState.content = '';
  modalOpen.value = true;
};

const handleEdit = (item: Memo) => {
  modalTitle.value = '编辑';
  formState.id = item.id;
  formState.title = item.title;
  formState.content = item.content;
  modalOpen.value = true;
};

const handleDelete = async (id: string) => {
  try {
    await deleteMemoApi(id);
    message.success('删除成功');
    fetchMemos();
  } catch {
    // Error is handled by request interceptor usually
  }
};

const handleOk = async () => {
  if (!formState.content && !formState.title) {
    message.warning('请输入内容');
    return;
  }
  confirmLoading.value = true;
  try {
    await (formState.id
      ? updateMemoApi({ ...formState })
      : createMemoApi({ ...formState }));
    modalOpen.value = false;
    fetchMemos();
  } finally {
    confirmLoading.value = false;
  }
};

// 格式化时间
const formatTime = (time: string) => {
  try {
    return formatDistanceToNow(new Date(time), {
      addSuffix: true,
      locale: zhCN,
    });
  } catch {
    return time;
  }
};

onMounted(() => {
  fetchMemos();
});
</script>

<template>
  <div class="memo-page">
    <Spin :spinning="loading">
      <template v-if="memos.length === 0 && !loading">
        <div class="empty-wrap">
          <Empty description="暂无笔记，点击右下角或下方按钮添加">
            <Button
              type="primary"
              shape="round"
              size="large"
              @click="handleAdd"
            >
              <template #icon><PlusOutlined /></template>
              新建笔记
            </Button>
          </Empty>
        </div>
      </template>

      <div v-else class="cards-grid">
        <Card
          v-for="item in memos"
          :key="item.id"
          hoverable
          :bordered="false"
          class="memo-card group relative"
          @click="handleEdit(item)"
        >
          <div class="card-content">
            <h3
              v-if="item.title"
              class="mb-1 truncate text-lg font-bold text-slate-800 dark:text-slate-200"
            >
              {{ item.title }}
            </h3>
            {{ item.content }}
          </div>

          <div class="card-footer">
            <span class="card-date">{{ formatTime(item.updateTime) }}</span>
            <div
              class="flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            >
              <Popconfirm
                title="确定要删除这条记录吗？"
                ok-text="是"
                cancel-text="否"
                @confirm="handleDelete(item.id)"
                @click.stop
              >
                <Tooltip title="删除">
                  <Button
                    type="text"
                    size="small"
                    shape="circle"
                    class="!text-slate-500 hover:bg-white/50 hover:!text-red-500 dark:hover:bg-black/20"
                  >
                    <template #icon><DeleteOutlined /></template>
                  </Button>
                </Tooltip>
              </Popconfirm>
            </div>
          </div>
        </Card>
      </div>
    </Spin>

    <Modal
      v-model:open="modalOpen"
      :title="modalTitle"
      :confirm-loading="confirmLoading"
      :mask-closable="false"
      @ok="handleOk"
      :width="isMobile ? '90%' : '70%'"
      :centered="true"
      :body-style="{
        height: isMobile ? '50vh' : '60vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }"
      class="memo-modal"
    >
      <Input
        v-model:value="formState.title"
        placeholder="标题"
        class="!mb-2 !border-0 !px-0 !text-lg !font-bold focus:!shadow-none"
        :bordered="false"
      />
      <Input.TextArea
        v-model:value="formState.content"
        placeholder="记下你的想法..."
        class="flex-1 !resize-none !border-0 !px-0 !text-base !leading-relaxed focus:!shadow-none"
        :bordered="false"
        style="height: 100%"
      />
    </Modal>

    <GlobalFloatBtn @click="handleAdd" />
  </div>
</template>

<style scoped>
.memo-page {
  max-width: 1400px;
  padding: 24px;
  margin: 0 auto;
}

.empty-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 60px 20px;
  background: transparent;
}

.cards-grid {
  columns: 1;
  gap: 24px;
}

.memo-card {
  margin-bottom: 24px;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  break-inside: avoid;
  overflow: hidden;
  box-shadow: 0 2px 8px rgb(0, 0, 0, 0.04);
}

/* Mobile Adaptation */
@media (max-width: 768px) {
  .memo-page {
    padding: 12px;
  }

  .cards-grid {
    columns: 2;
    column-gap: 12px;
  }

  .memo-card :deep(.ant-card-body) {
    padding: 12px;
  }

  .memo-card {
    margin-bottom: 12px;
  }
}

@media (min-width: 640px) {
  .cards-grid {
    columns: 2;
  }
}

@media (min-width: 1024px) {
  .cards-grid {
    columns: 3;
  }
}

@media (min-width: 1280px) {
  .cards-grid {
    columns: 4;
  }
}

.memo-card:hover {
  box-shadow: 0 4px 16px rgb(0 0 0 / 8%);
}

.memo-card :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
}

.card-content {
  display: -webkit-box;
  flex: 1;
  margin-bottom: 20px;
  overflow: hidden;
  font-size: 15px;
  line-height: 1.7;
  -webkit-line-clamp: 10;
  -webkit-box-orient: vertical;
  word-break: break-word;
  white-space: pre-wrap;
  opacity: 0.85;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
}

.card-date {
  font-size: 13px;
  opacity: 0.45;
}
</style>
