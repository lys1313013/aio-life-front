<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Button, Modal, Card, Tag, Image, Spin, Empty } from 'ant-design-vue';
import { ReadRecordApi } from '#/api/readRecord';
import { MovieApi } from '#/api/movie';

const props = defineProps<{
  relateId?: string;
  relateType?: number; // 1-阅读，2-观影
}>();

const emit = defineEmits<{
  (e: 'update:relateId', val?: string): void;
  (e: 'update:relateType', val?: number): void;
  (e: 'change', item?: any): void;
}>();

const visible = ref(false);
const loading = ref(false);
const recordList = ref<any[]>([]);
const selectedItem = ref<any>(null);

const isMobile = computed(() => window.innerWidth < 1024);

const loadData = async () => {
  if (!props.relateType) return;
  loading.value = true;
  try {
    let data: any[] = [];
    if (props.relateType === 1) {
      data = await ReadRecordApi.listActive();
    } else if (props.relateType === 2) {
      data = await MovieApi.listActive();
    }
    recordList.value = data;

    // 如果已经有关联ID，找到它并回显
    if (props.relateId) {
      const item = data.find(d => d.id === props.relateId);
      if (item) {
        selectedItem.value = item;
      }
    }
  } catch (error) {
    console.error('获取关联数据失败', error);
  } finally {
    loading.value = false;
  }
};

const openModal = () => {
  visible.value = true;
  loadData();
};

const handleSelect = (item: any) => {
  selectedItem.value = item;
  visible.value = false;
  emit('update:relateId', item.id);
  emit('change', item);
};

const handleClear = () => {
  selectedItem.value = null;
  emit('update:relateId', undefined);
  emit('change', null);
};

const getStatusText = (status: number) => {
  if (status === 0) return '未开始';
  if (status === 1) return '进行中';
  return '未知';
};

const getStatusColor = (status: number) => {
  if (status === 0) return 'default';
  if (status === 1) return 'processing';
  return 'default';
};

// 监听 props.relateType 的变化，如果类型变了，清空当前选择
watch(() => props.relateType, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    if (oldVal !== undefined) {
      handleClear();
    }
    if (newVal && props.relateId) {
      loadData();
    }
  }
}, { immediate: true });

watch(() => props.relateId, (newVal) => {
  if (newVal && !selectedItem.value && props.relateType) {
    loadData();
  } else if (!newVal) {
    selectedItem.value = null;
  }
});
</script>

<template>
  <div class="relate-record-selector">
    <div v-if="selectedItem" class="selected-card" @click="openModal" style="cursor: pointer;">
      <div class="card-content">
        <Image :src="selectedItem.coverImg" :width="60" :height="80" style="object-fit: cover; border-radius: 4px;" :preview="false" />
        <div class="info">
          <div class="title">{{ selectedItem.title }}</div>
          <div class="progress">
            <Tag :color="getStatusColor(selectedItem.status)">{{ getStatusText(selectedItem.status) }}</Tag>
          </div>
        </div>
        <div class="actions" @click.stop>
          <Button type="link" danger @click="handleClear">清除</Button>
        </div>
      </div>
    </div>
    <div v-else class="empty-select">
      <Button type="dashed" block @click="openModal" style="height: 60px;">
        <span class="icon-plus">+</span>
      </Button>
    </div>

    <Modal
      v-model:open="visible"
      :closable="true"
      :width="isMobile ? '95vw' : 600"
      :footer="null"
      :centered="true"
      destroyOnClose
    >
      <Spin :spinning="loading">
        <div v-if="recordList.length > 0" class="record-grid">
          <Card
            v-for="item in recordList"
            :key="item.id"
            hoverable
            class="record-card"
            :class="{ 'is-selected': relateId === item.id }"
            @click="handleSelect(item)"
          >
            <div class="card-inner aspect-[3/4]">
              <Image :src="item.coverImg" style="width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 4px;" :preview="false" />
            </div>
          </Card>
        </div>
        <Empty v-else description="暂无未开始或进行中的记录" />
      </Spin>
    </Modal>
  </div>
</template>

<style scoped>
.relate-record-selector {
  width: 100%;
}
.selected-card {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 8px;
  background-color: #fafafa;
  transition: all 0.3s;
}
.selected-card:hover {
  border-color: #1890ff;
  background-color: #f0f7ff;
}
.card-content {
  display: flex;
  align-items: center;
  gap: 12px;
}
.info {
  flex: 1;
  min-width: 0;
}
.title {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.progress {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
}
.actions {
  display: flex;
  flex-direction: column;
}
.actions .ant-btn {
  padding: 0;
  height: auto;
  line-height: 1.5;
}

.empty-select .icon-plus {
  margin-right: 4px;
  font-size: 16px;
}

.record-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  max-height: 60vh;
  overflow-y: auto;
  padding: 4px;
}

@media (max-width: 768px) {
  .record-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.record-card {
  cursor: pointer;
  transition: all 0.3s;
  padding: 0 !important;
  border-radius: 4px;
}
.record-card :deep(.ant-card-body) {
  padding: 0;
}
.record-card.is-selected {
  border-color: #d9d9d9;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  transform: scale(0.98);
}
.card-inner {
  display: block;
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
}
</style>
