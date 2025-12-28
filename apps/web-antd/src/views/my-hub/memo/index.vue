<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { usePreferences } from '@vben/preferences';
import { Button, Modal, Input, message, Popconfirm, Tooltip, Spin, Empty } from 'ant-design-vue';
import { EditOutlined, DeleteOutlined, ClockCircleOutlined } from '@ant-design/icons-vue';
import { getMemoListApi, createMemoApi, updateMemoApi, deleteMemoApi, type Memo } from '#/api/core/memo';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import MemoFab from './MemoFab.vue';

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
  } catch (error) {
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
    if (formState.id) {
      await updateMemoApi({ ...formState });
    } else {
      await createMemoApi({ ...formState });
    }
    modalOpen.value = false;
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
  <div class="p-2 h-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto overflow-x-hidden">
      <Spin :spinning="loading">
        <div v-if="memos.length > 0" class="columns-2 md:columns-3 lg:columns-4 gap-2 mx-auto">
          <div 
            v-for="item in memos" 
            :key="item.id" 
            class="break-inside-avoid mb-2"
          >
            <div 
              class="group relative flex flex-col p-3 rounded-xl transition-all duration-300 hover:-translate-y-0.3 hover:shadow-lg border border-transparent dark:border-slate-700"
              :class="getBgColor(item.id)"
            >
              <!-- Content Area -->
              <div class="flex-1 overflow-hidden cursor-pointer" @click="handleEdit(item)">
                <h3 v-if="item.title" class="font-bold text-lg mb-1 truncate text-slate-800 dark:text-slate-200">
                  {{ item.title }}
                </h3>
                <p class="whitespace-pre-wrap text-slate-700 dark:text-slate-300 text-base leading-relaxed break-words line-clamp-[10]">
                  {{ item.content }}
                </p>
              </div>
              
              <!-- Footer Area -->
              <div class="mt-3 flex justify-between items-center text-xs text-slate-400">
                <div class="flex items-center gap-1">
                  <ClockCircleOutlined />
                  <Tooltip :title="new Date(item.updateTime).toLocaleString()">
                    <span>{{ formatTime(item.updateTime) }}</span>
                  </Tooltip>
                </div>
                
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
                        class="!text-slate-500 hover:!text-red-500 hover:bg-white/50 dark:hover:bg-black/20"
                      >
                        <template #icon><DeleteOutlined /></template>
                      </Button>
                    </Tooltip>
                  </Popconfirm>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Empty v-else-if="!loading" description="暂无笔记" class="mt-20" />
      </Spin>
    </div>

    <Modal
      v-model:open="modalOpen"
      :title="modalTitle"
      :confirm-loading="confirmLoading"
      :maskClosable="false"
      @ok="handleOk"
      :width="isMobile ? '100%' : '70%'"
      :centered="true"
      :body-style="{ height: isMobile ? 'calc(100vh - 110px)' : '60vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }"
      class="memo-modal"
    >
      <Input
        v-model:value="formState.title"
        placeholder="标题"
        class="!text-lg !font-bold !mb-2 !border-0 focus:!shadow-none !px-0"
        :bordered="false"
      />
      <Input.TextArea
        v-model:value="formState.content"
        placeholder="记下你的想法..."
        class="!text-base !leading-relaxed !resize-none !border-0 focus:!shadow-none flex-1 !px-0"
        :bordered="false"
        style="height: 100%;"
      />
    </Modal>
    
    <MemoFab @click="handleAdd" />
  </div>
</template>

<style scoped>
/* Custom scrollbar for memo content if needed */
</style>
