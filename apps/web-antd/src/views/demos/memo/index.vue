<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { Card, Button, List, Modal, Input, message, Popconfirm, Tooltip } from 'ant-design-vue';
import { PlusOutlined, EditOutlined, DeleteOutlined, ClockCircleOutlined } from '@ant-design/icons-vue';
import { getMemoListApi, createMemoApi, updateMemoApi, deleteMemoApi, type Memo } from '#/api/core/memo';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const memos = ref<Memo[]>([]);
const loading = ref(false);
const modalVisible = ref(false);
const modalTitle = ref('新建备忘录');
const confirmLoading = ref(false);

const formState = reactive({
  id: '',
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
  modalTitle.value = '新建备忘录';
  formState.id = '';
  formState.content = '';
  modalVisible.value = true;
};

const handleEdit = (item: Memo) => {
  modalTitle.value = '编辑备忘录';
  formState.id = item.id;
  formState.content = item.content;
  modalVisible.value = true;
};

const handleDelete = async (id: string) => {
  try {
    await deleteMemoApi(id);
    message.success('删除成功');
    fetchMemos();
  } catch (error) {
    // Error is handled by request interceptor usually
  }
};

const handleOk = async () => {
  if (!formState.content) {
    message.warning('请输入内容');
    return;
  }
  confirmLoading.value = true;
  try {
    if (formState.id) {
      await updateMemoApi(formState.id, formState.content);
      message.success('更新成功');
    } else {
      await createMemoApi(formState.content);
      message.success('创建成功');
    }
    modalVisible.value = false;
    fetchMemos();
  } finally {
    confirmLoading.value = false;
  }
};

const formatTime = (time: string) => {
  try {
    return formatDistanceToNow(new Date(time), { addSuffix: true, locale: zhCN });
  } catch (e) {
    return time;
  }
};

// 预设背景色
const bgColors = [
  'bg-amber-50 dark:bg-amber-900/20',
  'bg-blue-50 dark:bg-blue-900/20',
  'bg-green-50 dark:bg-green-900/20',
  'bg-rose-50 dark:bg-rose-900/20',
  'bg-purple-50 dark:bg-purple-900/20',
  'bg-indigo-50 dark:bg-indigo-900/20',
];

const getBgColor = (id: string | number) => {
  const strId = String(id);
  const index = strId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % bgColors.length;
  return bgColors[index];
};

onMounted(() => {
  fetchMemos();
});
</script>

<template>
  <div class="p-4 h-full flex flex-col">
    <div class="mb-4 flex justify-between items-center">
      <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100">备忘录</h2>
      <Button type="primary" shape="round" size="large" @click="handleAdd">
        <template #icon><PlusOutlined /></template>
        新建备忘录
      </Button>
    </div>

    <div class="flex-1 overflow-auto">
      <List
        :grid="{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 6 }"
        :data-source="memos"
        :loading="loading"
        :row-key="(item: any) => item.id"
      >
        <template #renderItem="{ item }">
          <List.Item>
            <div 
              class="group relative flex flex-col h-[200px] p-5 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg border border-transparent dark:border-slate-700"
              :class="getBgColor(item.id)"
            >
              <!-- Content Area -->
              <div class="flex-1 overflow-hidden cursor-pointer" @click="handleEdit(item)">
                <p class="whitespace-pre-wrap text-slate-700 dark:text-slate-300 text-base leading-relaxed break-words line-clamp-6">
                  {{ item.content }}
                </p>
              </div>
              
              <!-- Footer Area -->
              <div class="mt-4 flex justify-between items-center text-xs text-slate-400">
                <div class="flex items-center gap-1">
                  <ClockCircleOutlined />
                  <Tooltip :title="new Date(item.createTime).toLocaleString()">
                    <span>{{ formatTime(item.createTime) }}</span>
                  </Tooltip>
                </div>
                
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Tooltip title="编辑">
                    <Button 
                      type="text" 
                      size="small" 
                      shape="circle" 
                      class="!text-slate-500 hover:!text-blue-500 hover:bg-white/50 dark:hover:bg-black/20"
                      @click.stop="handleEdit(item)"
                    >
                      <template #icon><EditOutlined /></template>
                    </Button>
                  </Tooltip>
                  <Popconfirm
                    title="确定要删除这条备忘录吗？"
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
                        class="!text-slate-500 hover:!text-red-500 hover:bg-white/50 dark:hover:bg-black/20"
                      >
                        <template #icon><DeleteOutlined /></template>
                      </Button>
                    </Tooltip>
                  </Popconfirm>
                </div>
              </div>
            </div>
          </List.Item>
        </template>
      </List>
    </div>

    <Modal
      v-model:open="modalVisible"
      :title="modalTitle"
      :confirm-loading="confirmLoading"
      @ok="handleOk"
      :width="600"
      class="memo-modal"
    >
      <Input.TextArea
        v-model:value="formState.content"
        :rows="8"
        placeholder="记下你的想法..."
        class="!text-base !leading-relaxed !resize-none !border-0 focus:!shadow-none"
        :bordered="false"
      />
    </Modal>
  </div>
</template>

<style scoped>
/* Custom scrollbar for memo content if needed */
.line-clamp-6 {
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
