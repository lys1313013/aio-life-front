<script setup lang="ts">
import { computed, onMounted, reactive, ref, toRaw } from 'vue';
import { query as queryThink, save as saveThink, update as updateThink } from '#/api/core/think';
import { Button, Card, Modal, Input, Form, Empty, Space, message, Tag } from 'ant-design-vue';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue';

interface Event {
  id: number;
  content: string;
  create_time: string;
}

interface Thought {
  id: number;
  content: string;
  events: Event[];
  likes: number;
  createTime: string;
}

const thoughts = ref<Thought[]>([]);

const showModal = ref(false);
const currentEditId = ref<null | number>(null);

const form = reactive({
  content: '',
  events: [
    {
      id: 1,
      content: '',
      create_time: new Date().toISOString(),
    },
  ],
});

// 计算属性
const modalTitle = computed(() =>
  currentEditId.value === null ? '添加新思考' : '编辑思考',
);

// 方法
const openAddModal = () => {
  form.content = '';
  form.events = [
    {
      id: 1,
      content: '',
      create_time: new Date().toISOString(),
    },
  ];
  currentEditId.value = null;
  showModal.value = true;
};

const openEditModal = (id: number) => {
  const thought = thoughts.value.find((t) => t.id === id);
  if (thought) {
    form.content = thought.content;
    const evs = Array.isArray(thought.events) ? thought.events : [];
    form.events =
      evs.length > 0
        ? evs.map((e) => ({
            ...e,
            create_time: (e as any)?.create_time ?? (e as any)?.createTime ?? new Date().toISOString(),
          }))
        : [
            {
              id: 1,
              content: '',
              create_time: new Date().toISOString(),
            },
          ];
    currentEditId.value = id;
    showModal.value = true;
  }
};

const closeCardModal = () => {
  showModal.value = false;
};

const addEvent = () => {
  const newEventId =
    form.events.length > 0 ? Math.max(...form.events.map((e) => e.id)) + 1 : 1;
  form.events.push({
    id: newEventId,
    content: '',
    create_time: new Date().toISOString(),
  });
};

const removeEvent = (index: number) => {
  form.events.splice(index, 1);
};

const removeEventById = (id: number) => {
  const idx = form.events.findIndex((e) => e.id === id);
  if (idx !== -1) form.events.splice(idx, 1);
};

const saveCard = async () => {
  if (!form.content.trim()) {
    message.warning('思考内容不能为空');
    return;
  }

  const validEvents = form.events.filter((event) => event.content.trim() !== '');

  const payload = {
    id: currentEditId.value,
    content: form.content.trim(),
    events: validEvents.map((e) => ({ ...e })),
  };

  try {
    const saved =
      currentEditId.value === null
        ? await saveThink(toRaw(payload))
        : await updateThink(toRaw(payload));

    const normalized = {
      ...saved,
      content: saved?.content ?? saved?.text ?? saved?.title ?? saved?.summary ?? form.content.trim(),
      events: Array.isArray(saved?.events)
        ? (saved as any).events.map((e: any) => ({
            ...e,
            create_time: e?.create_time ?? e?.createTime ?? new Date().toISOString(),
          }))
        : validEvents.map((e) => ({
            ...e,
            create_time: e?.create_time ?? new Date().toISOString(),
          })),
      date: saved?.date ?? new Date().toISOString(),
    };

    if (currentEditId.value === null) {
      thoughts.value.push(normalized);
    } else {
      const idx = thoughts.value.findIndex((t) => t.id === currentEditId.value);
      if (idx !== -1) thoughts.value[idx] = normalized;
    }

    closeCardModal();
  } catch (e) {
    message.error('保存失败');
  }
};

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return new Date(dateString).toLocaleDateString('zh-CN', options);
};

// 生命周期
const loadThoughts = async () => {
  const res = await queryThink({ page: 1, pageSize: 50, condition: {} });
  const list = (res && (res.items ?? res)) || [];
  thoughts.value = list.map((t: any) => ({
    ...t,
    content: t?.content ?? t?.text ?? t?.title ?? t?.summary ?? '',
    events: Array.isArray(t?.events)
      ? t.events.map((e: any) => ({
          ...e,
          create_time: e?.create_time ?? e?.createTime ?? new Date().toISOString(),
        }))
      : [],
    date: t?.date ?? new Date().toISOString(),
  }));
};

onMounted(async () => {
  await loadThoughts();
});
</script>

<template>
  <div class="think-page">
    <div class="header">
      <div class="header-left">
        <div class="title">每日思考</div>
        <div class="subtitle">记录每日思考，捕捉灵感瞬间。</div>
      </div>
      <div class="header-right">
        <Button type="primary" @click="openAddModal">
          <template #icon><PlusOutlined /></template>
          添加新思考
        </Button>
      </div>
    </div>

    <template v-if="thoughts.length === 0">
      <div class="empty-wrap">
        <Empty description="还没有任何思考记录">
          <Button type="primary" @click="openAddModal">
            <template #icon><PlusOutlined /></template>
            添加新思考
          </Button>
        </Empty>
      </div>
    </template>

    <div v-else class="cards-grid">
      <Card
        v-for="thought in thoughts"
        :key="thought.id"
        hoverable
        class="thought-card"
        @dblclick="openEditModal(thought.id)"
      >
        <div class="card-content">{{ thought.content }}</div>
        <div class="card-footer">
          <span class="card-date">{{ formatDate(thought.createTime) }}</span>
          <Tag color="blue">事件 {{ (thought.events || []).length }}</Tag>
        </div>
      </Card>
    </div>

    <Modal v-model:open="showModal" :title="modalTitle" :footer="null" @cancel="closeCardModal">
      <Form layout="vertical">
        <Form.Item label="思考内容" required>
          <Input.TextArea v-model:value="form.content" :rows="4" placeholder="写下你的思考..." />
        </Form.Item>

        <Form.Item label="关联事件">
          <div v-for="event in [...form.events].reverse()" :key="event.id" class="event-item">
            <div class="event-row">
              <Input v-model:value="event.content" placeholder="事件..." />
              <Button type="text" danger @click="removeEventById(event.id)" v-if="form.events.length > 1">
                <template #icon><DeleteOutlined /></template>
              </Button>
            </div>
            <div class="event-time">{{ formatDate(event.create_time) }}</div>
          </div>
          <Button type="dashed" block @click="addEvent">
            <template #icon><PlusOutlined /></template>
            添加事件
          </Button>
        </Form.Item>

        <div class="form-actions">
          <Space>
            <Button @click="closeCardModal">取消</Button>
            <Button type="primary" @click="saveCard">保存</Button>
          </Space>
        </div>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.think-page {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f0f5ff 0%, #fff 60%);
  border: 1px solid #e6f4ff;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f1f1f;
}

.subtitle {
  color: #8c8c8c;
}

.empty-wrap {
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 40px 20px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.thought-card :deep(.ant-card-body) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.card-content {
  flex: 1;
  font-size: 14px;
  color: #1f1f1f;
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.card-date {
  font-size: 12px;
  color: #8c8c8c;
}

.event-item {
  margin-bottom: 12px;
}

.event-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.event-time {
  margin-top: 6px;
  font-size: 12px;
  color: #8c8c8c;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

@media (max-width: 768px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
