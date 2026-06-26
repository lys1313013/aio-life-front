<script setup lang="ts">
import { computed, reactive, ref, toRaw, watch } from 'vue';

import {
  DeleteOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Tooltip,
} from 'ant-design-vue';

import {
  deleteData as deleteThink,
  query as queryThink,
  save as saveThink,
  update as updateThink,
} from '#/api/core/think';

interface Event {
  id: number | string;
  content: string;
  create_time: string;
}

interface ThoughtForm {
  content: string;
  events: Event[];
  isPinned: number;
  hiddenContent: boolean;
}

const props = defineProps<{
  visible: boolean;
  thoughtId: null | number | string;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  saved: [thought: any];
  deleted: [id: number | string];
}>();

const form = reactive<ThoughtForm>({
  content: '',
  isPinned: 0,
  hiddenContent: false,
  events: [
    {
      id: 1,
      content: '',
      create_time: new Date().toISOString(),
    },
  ],
});

const saving = ref(false);
const currentEditId = ref<null | number | string>(null);

const modalTitle = computed(() => '');

function resetForm() {
  form.content = '';
  form.isPinned = 0;
  form.hiddenContent = false;
  form.events = [
    {
      id: Date.now(),
      content: '',
      create_time: new Date().toISOString(),
    },
  ];
  currentEditId.value = null;
}

async function loadThought(id: number | string) {
  try {
    const res = await queryThink({ page: 1, pageSize: 1, condition: { id } });
    const list = res?.items || [];
    if (list.length > 0) {
      const thought = list[0];
      form.content = thought.content || '';
      form.isPinned = thought.isPinned ?? 0;
      form.hiddenContent = thought.hiddenContent ?? false;
      const evs = Array.isArray(thought.events) ? thought.events : [];
      form.events =
        evs.length > 0
          ? evs.map((e: any) => ({
              ...e,
              create_time:
                e?.create_time ?? e?.createTime ?? new Date().toISOString(),
            }))
          : [
              {
                id: Date.now(),
                content: '',
                create_time: new Date().toISOString(),
              },
            ];
      currentEditId.value = id;
    }
  } catch {
    message.error('加载闪念失败');
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.thoughtId) {
        loadThought(props.thoughtId);
      } else {
        resetForm();
      }
    }
  },
);

function close() {
  emit('update:visible', false);
}

function addEvent() {
  form.events.push({
    id: Date.now(),
    content: '',
    create_time: new Date().toISOString(),
  });
}

function removeEventById(id: number | string) {
  const idx = form.events.findIndex((e) => e.id === id);
  if (idx !== -1) form.events.splice(idx, 1);
}

async function save() {
  if (!form.content.trim()) {
    message.warning('思考内容不能为空');
    return;
  }

  saving.value = true;

  const validEvents = form.events.filter((event) => event.content.trim() !== '');

  const payload: any = {
    content: form.content.trim(),
    isPinned: form.isPinned,
    hiddenContent: form.hiddenContent,
    events: validEvents.map((e) => ({ ...e })),
  };

  if (currentEditId.value !== null) {
    payload.id = currentEditId.value;
  }

  try {
    const saved =
      currentEditId.value === null
        ? await saveThink(toRaw(payload))
        : await updateThink(toRaw(payload));

    const normalized = {
      ...saved,
      id: saved?.id ?? currentEditId.value,
      isPinned: saved?.isPinned ?? form.isPinned,
      hiddenContent: saved?.hiddenContent ?? form.hiddenContent,
      content:
        saved?.content ??
        saved?.text ??
        saved?.title ??
        saved?.summary ??
        form.content.trim(),
      events: Array.isArray(saved?.events)
        ? (saved as any).events.map((e: any) => ({
            ...e,
            create_time:
              e?.create_time ?? e?.createTime ?? new Date().toISOString(),
          }))
        : validEvents.map((e) => ({
            ...e,
            create_time: e?.create_time ?? new Date().toISOString(),
          })),
      date: saved?.date ?? new Date().toISOString(),
      createTime:
        saved?.createTime ?? saved?.create_time ?? new Date().toISOString(),
    };

    emit('saved', normalized);
    close();
    message.success('保存成功');
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}

async function handleDelete() {
  if (currentEditId.value === null) return;
  try {
    await deleteThink({ idList: [currentEditId.value] });
    emit('deleted', currentEditId.value);
    close();
    message.success('删除成功');
  } catch {
    message.error('删除失败');
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const padZero = (num: number) => num.toString().padStart(2, '0');

  const year = date.getFullYear();
  const month = padZero(date.getMonth() + 1);
  const day = padZero(date.getDate());
  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
</script>

<template>
  <Modal
    :open="visible"
    :title="modalTitle"
    :footer="null"
    :mask-closable="false"
    :destroy-on-close="true"
    centered
    @cancel="close"
  >
    <Form layout="vertical" class="modern-form">
      <Form.Item required>
        <Input.TextArea
          v-model:value="form.content"
          :auto-size="{ minRows: 4, maxRows: 12 }"
          placeholder="这一刻的想法..."
          class="content-textarea"
          :bordered="false"
        />
      </Form.Item>

      <Form.Item>
        <div class="events-section">
          <div class="events-header">
            <span class="events-title">关联事件流</span>
          </div>
          <div
            v-for="event in [...form.events].reverse()"
            :key="event.id"
            class="event-item"
          >
            <div class="event-row">
              <Input
                v-model:value="event.content"
                placeholder="记录相关事件..."
                :bordered="false"
                class="event-input"
              />
              <Button
                type="text"
                danger
                shape="circle"
                @click="removeEventById(event.id)"
                v-if="form.events.length > 1"
              >
                <template #icon><DeleteOutlined /></template>
              </Button>
            </div>
            <div class="event-time">{{ formatDate(event.create_time) }}</div>
          </div>
          <Button type="dashed" block @click="addEvent" class="add-event-btn">
            <template #icon><PlusOutlined /></template>
            补充事件
          </Button>
        </div>
      </Form.Item>

      <div
        class="form-actions"
        :style="{
          justifyContent: 'space-between',
          alignItems: 'center',
        }"
      >
        <div>
          <Popconfirm
            v-if="currentEditId"
            title="确定要删除这条思考吗？"
            ok-text="确定"
            cancel-text="取消"
            @confirm="handleDelete"
          >
            <Button danger type="text">
              <template #icon><DeleteOutlined /></template>
              删除
            </Button>
          </Popconfirm>
        </div>
        <Space>
          <div style="display: flex; align-items: center">
            <Tooltip :title="form.hiddenContent ? '显示内容' : '隐藏内容'">
              <Button
                type="text"
                shape="circle"
                @click="form.hiddenContent = !form.hiddenContent"
                :class="
                  form.hiddenContent
                    ? '!text-slate-400'
                    : '!text-slate-600 dark:!text-slate-300'
                "
              >
                <template #icon>
                  <EyeOutlined v-if="form.hiddenContent" />
                  <EyeInvisibleOutlined v-else />
                </template>
              </Button>
            </Tooltip>
          </div>
          <div
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              margin-right: 16px;
              margin-left: 8px;
            "
          >
            <span style="font-size: 14px; opacity: 0.85">添加到首页</span>
            <Switch
              v-model:checked="form.isPinned"
              :checked-value="1"
              :un-checked-value="0"
              size="small"
            />
          </div>
          <Button @click="close" shape="round">取消</Button>
          <Button type="primary" @click="save" shape="round" :loading="saving">
            保存
          </Button>
        </Space>
      </div>
    </Form>
  </Modal>
</template>

<style scoped>
.modern-form .content-textarea {
  padding: 12px 16px;
  font-size: 16px;
  line-height: 1.6;
  resize: none;
  background: rgb(128 128 128 / 4%);
  border-radius: 12px;
}

.modern-form .content-textarea:focus {
  background: rgb(128 128 128 / 8%);
}

.events-section {
  margin-top: 8px;
}

.events-header {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 500;
  opacity: 0.65;
}

.event-item {
  padding: 12px 16px;
  margin-bottom: 12px;
  background: rgb(128 128 128 / 4%);
  border-radius: 12px;
  transition: background 0.3s;
}

.event-item:hover {
  background: rgb(128 128 128 / 8%);
}

.event-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.event-input {
  padding: 4px 8px;
  font-size: 14px;
  background: transparent !important;
}

.event-time {
  margin-top: 6px;
  margin-left: 8px;
  font-size: 12px;
  opacity: 0.45;
}

.add-event-btn {
  border-radius: 12px;
  opacity: 0.8;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}

textarea::-webkit-scrollbar {
  width: 4px;
}

textarea::-webkit-scrollbar-thumb {
  background: rgb(128 128 128 / 20%);
  border-radius: 4px;
}

textarea:hover::-webkit-scrollbar-thumb {
  background: rgb(128 128 128 / 40%);
}
</style>
