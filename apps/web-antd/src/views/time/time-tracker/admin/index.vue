<script setup lang="ts">
import type { TimeTrackerCategoryEntity } from '#/api/core/time-tracker-category';

import { computed, onMounted, ref } from 'vue';

import { IconPicker, Page } from '@vben/common-ui';

import {
  DeleteOutlined,
  EditOutlined,
  InfoCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Radio,
  Select,
  Switch,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  adminDeleteCategory,
  adminListCategories,
  adminSaveCategory,
  adminUpdateCategory,
} from '#/api/core/time-tracker-category';

import {
  CATEGORY_COLOR_PRESETS,
  getCategoryIcon,
  PRESET_ICONS,
} from '../config';
import { TIME_TYPE_CONFIG, TimeType } from '../types';

const loading = ref(false);
const submitting = ref(false);
const loadingCategoryId = ref<null | string>(null);
const publicCategories = ref<TimeTrackerCategoryEntity[]>([]);

const columns = [
  { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
  { title: '图标', dataIndex: 'icon', key: 'icon', width: 80, align: 'center' },
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    width: 140,
    align: 'center',
  },
  { title: '时间类型', key: 'timeType', width: 100, align: 'center' },
  {
    title: '卡片统计',
    dataIndex: 'isTrackTime',
    key: 'isTrackTime',
    width: 100,
    align: 'center',
  },
  {
    title: '是否启用',
    dataIndex: 'isEnabled',
    key: 'isEnabled',
    width: 100,
    align: 'center',
  },
  { title: '操作', key: 'action', width: 150, align: 'center' },
];

const fetchCategories = async () => {
  loading.value = true;
  try {
    const list = await adminListCategories();
    publicCategories.value = list;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    message.error('获取分类列表失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchCategories();
});

const editModalVisible = ref(false);
const showIconPickerModal = ref(false);
const formRef = ref();
const isEdit = ref(false);
const selectedIconSet = ref('lucide');

const handleIconSelect = (icon: string) => {
  formState.value.icon = icon;
  showIconPickerModal.value = false;
};

const formState = ref<TimeTrackerCategoryEntity>({
  name: '',
  color: CATEGORY_COLOR_PRESETS[0] || '#1890ff',
  icon: '',
  description: '',
  isTrackTime: 1,
  isEnabled: 1,
  sort: 0,
  timeType: TimeType.REQUIRED,
});

const rules = {
  name: [{ required: true, message: '请输入分类名称' }],
  color: [{ required: true, message: '请选择颜色' }],
};

const modalTitle = computed(() =>
  isEdit.value ? '编辑公共分类' : '新增公共分类',
);

const handleAddCategory = () => {
  isEdit.value = false;
  selectedIconSet.value = 'lucide';
  formState.value = {
    name: '',
    color: CATEGORY_COLOR_PRESETS[0] || '#1890ff',
    icon: '',
    description: '',
    isTrackTime: 1,
    isEnabled: 1,
    sort: publicCategories.value.length * 10,
  };
  editModalVisible.value = true;
};

const handleEditCategory = (record: any) => {
  isEdit.value = true;
  if (record.icon?.includes(':')) {
    const parts = record.icon.split(':');
    selectedIconSet.value = parts[0] || 'lucide';
  } else {
    selectedIconSet.value = 'lucide';
  }
  formState.value = { ...record };
  editModalVisible.value = true;
};

const handleDeleteCategory = async (record: any) => {
  if (!record.id) return;
  try {
    await adminDeleteCategory(record.id);
    message.success('删除成功');
    fetchCategories();
  } catch (error) {
    console.error('Failed to delete category:', error);
    message.error('删除失败');
  }
};

const handleToggleEnable = async (record: any, checked: any) => {
  if (!record.id) return;
  try {
    loadingCategoryId.value = record.id;
    const newVal = checked ? 1 : 0;
    await adminUpdateCategory({ ...record, isEnabled: newVal });
    fetchCategories();
  } catch (error) {
    console.error('Failed to toggle enable:', error);
    message.error('操作失败');
  } finally {
    loadingCategoryId.value = null;
  }
};

const handleToggleTrackTime = async (record: any, checked: any) => {
  if (!record.id) return;
  try {
    loadingCategoryId.value = record.id;
    const newVal = checked ? 1 : 0;
    await adminUpdateCategory({ ...record, isTrackTime: newVal });
    fetchCategories();
  } catch (error) {
    console.error('Failed to toggle track time:', error);
  } finally {
    loadingCategoryId.value = null;
  }
};

const handleSubmitCategory = async () => {
  try {
    await formRef.value.validate();
    submitting.value = true;

    if (isEdit.value) {
      await adminUpdateCategory(formState.value);
      message.success('更新成功');
    } else {
      await adminSaveCategory(formState.value);
      message.success('新增成功');
    }

    editModalVisible.value = false;
    fetchCategories();
  } catch (error) {
    console.error('Failed to save category:', error);
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <Page header-sticky>
    <template #title>
      <span class="text-lg font-bold">公共分类管理</span>
    </template>

    <div class="space-y-4">
      <Card title="公共分类列表" :bordered="false">
        <template #extra>
          <Button type="primary" @click="handleAddCategory">
            <template #icon><PlusOutlined /></template>
            新增公共分类
          </Button>
        </template>

        <Table
          :data-source="publicCategories"
          :columns="columns as any"
          :loading="loading"
          :pagination="false"
          row-key="id"
        >
          <template #headerCell="{ column }">
            <template v-if="column.key === 'isTrackTime'">
              <span>
                卡片统计
                <Tooltip title="开启后，将在卡片上展示统计数据">
                  <InfoCircleOutlined class="ml-1 cursor-help text-gray-400" />
                </Tooltip>
              </span>
            </template>
            <template v-else>
              {{ column.title }}
            </template>
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'icon'">
              <div class="flex items-center justify-center">
                <component
                  v-if="record.icon"
                  :is="getCategoryIcon(record.icon)"
                  class="size-5"
                />
                <span v-else class="text-xs text-gray-400">无</span>
              </div>
            </template>
            <template v-else-if="column.key === 'name'">
              <div
                class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                :style="{
                  backgroundColor: `${record.color}10`,
                  color: record.color,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: `${record.color}20`,
                }"
              >
                {{ record.name }}
              </div>
            </template>
            <template v-else-if="column.key === 'timeType'">
              <Tag
                :color="
                  TIME_TYPE_CONFIG[record.timeType as 1 | 2 | 3]?.color ||
                  '#8c8c8c'
                "
                class="text-xs"
              >
                {{
                  TIME_TYPE_CONFIG[record.timeType as 1 | 2 | 3]?.label ||
                  '未设置'
                }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'isTrackTime'">
              <Switch
                :checked="record.isTrackTime === 1"
                :loading="loadingCategoryId === record.id"
                size="small"
                @change="
                  (checked: any) => handleToggleTrackTime(record, checked)
                "
              />
            </template>
            <template v-else-if="column.key === 'isEnabled'">
              <Switch
                :checked="record.isEnabled === 1"
                :loading="loadingCategoryId === record.id"
                size="small"
                @change="(checked: any) => handleToggleEnable(record, checked)"
              />
            </template>
            <template v-else-if="column.key === 'action'">
              <div class="flex justify-center gap-2">
                <Tooltip title="编辑">
                  <Button
                    type="link"
                    size="small"
                    @click="handleEditCategory(record)"
                  >
                    <template #icon><EditOutlined /></template>
                  </Button>
                </Tooltip>
                <Popconfirm
                  title="确定要删除此分类吗？删除后所有用户的覆盖设置将失效，原始分类将消失。"
                  @confirm="handleDeleteCategory(record)"
                >
                  <Tooltip title="删除">
                    <Button type="link" size="small" danger>
                      <template #icon><DeleteOutlined /></template>
                    </Button>
                  </Tooltip>
                </Popconfirm>
              </div>
            </template>
          </template>
        </Table>
      </Card>
    </div>

    <!-- 分类编辑模态框 -->
    <Modal
      v-model:open="editModalVisible"
      :title="modalTitle"
      :confirm-loading="submitting"
      centered
      @ok="handleSubmitCategory"
    >
      <Form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
        class="mt-4"
      >
        <Form.Item label="分类名称" name="name">
          <Input v-model:value="formState.name" placeholder="请输入分类名称" />
        </Form.Item>

        <Form.Item label="颜色" name="color">
          <div class="flex items-center gap-2">
            <Input
              v-model:value="formState.color"
              placeholder="请输入颜色值（如 #1890ff）"
            />
            <div
              class="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded border transition-transform hover:scale-110"
              :style="{ backgroundColor: formState.color }"
            >
              <input
                type="color"
                :value="formState.color"
                class="absolute -inset-1 h-[200%] w-[200%] cursor-pointer opacity-0"
                @input="(e: any) => (formState.color = e.target.value)"
              />
            </div>
          </div>
          <div class="mt-2 flex flex-wrap gap-2">
            <div
              v-for="color in CATEGORY_COLOR_PRESETS"
              :key="color"
              class="h-6 w-6 cursor-pointer rounded border border-gray-200 transition-transform hover:scale-110"
              :style="{ backgroundColor: color }"
              @click="formState.color = color"
            ></div>
          </div>
        </Form.Item>

        <Form.Item label="图标" name="icon">
          <div class="space-y-3">
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div class="mb-2 text-xs text-gray-500">常用图标（点击选择）</div>
              <div class="grid grid-cols-8 gap-1">
                <div
                  v-for="item in PRESET_ICONS"
                  :key="item.icon"
                  class="flex cursor-pointer flex-col items-center justify-center rounded p-2 transition-all hover:bg-white hover:shadow-sm"
                  :class="{
                    'bg-blue-50 ring-2 ring-blue-500':
                      formState.icon === item.icon,
                  }"
                  @click="formState.icon = item.icon"
                >
                  <component
                    :is="getCategoryIcon(item.icon)"
                    class="mb-1 size-5"
                  />
                  <span
                    class="w-full truncate text-center text-xs text-gray-600"
                    >{{ item.label }}</span
                  >
                </div>
              </div>
            </div>

            <Button
              type="link"
              size="small"
              @click="showIconPickerModal = true"
            >
              📋 选择更多图标...
            </Button>

            <div
              v-if="formState.icon"
              class="flex items-center gap-2 rounded bg-gray-50 p-2"
            >
              <component
                :is="getCategoryIcon(formState.icon)"
                class="size-6 shrink-0"
              />
              <Input
                v-model:value="formState.icon"
                placeholder="输入图标名称，如 lucide:code"
                class="flex-1"
                size="small"
              />
              <Button
                type="link"
                size="small"
                danger
                @click="formState.icon = ''"
              >
                清除
              </Button>
            </div>
          </div>
        </Form.Item>

        <Form.Item label="描述" name="description">
          <Input.TextArea
            v-model:value="formState.description"
            placeholder="请输入描述"
            :rows="3"
          />
        </Form.Item>

        <Form.Item label="卡片统计" name="isTrackTime">
          <Switch
            v-model:checked="formState.isTrackTime"
            :checked-value="1"
            :un-checked-value="0"
          />
        </Form.Item>

        <Form.Item label="是否启用" name="isEnabled">
          <Switch
            v-model:checked="formState.isEnabled"
            :checked-value="1"
            :un-checked-value="0"
          />
        </Form.Item>

        <Form.Item label="排序" name="sort">
          <InputNumber v-model:value="formState.sort" :min="0" class="w-full" />
        </Form.Item>

        <Form.Item label="时间类型" name="timeType">
          <Radio.Group v-model:value="formState.timeType">
            <Radio.Button
              v-for="(config, type) in TIME_TYPE_CONFIG"
              :key="type"
              :value="Number(type)"
            >
              {{ config.label }}
            </Radio.Button>
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>

    <!-- 图标选择器模态框 -->
    <Modal
      v-model:open="showIconPickerModal"
      title="选择图标"
      :footer="null"
      width="800px"
      centered
    >
      <div class="flex flex-col gap-4">
        <Select
          v-model:value="selectedIconSet"
          style="width: 200px"
          placeholder="选择图标集"
        >
          <Select.Option value="lucide">Lucide Icons</Select.Option>
          <Select.Option value="ant-design">Ant Design Icons</Select.Option>
          <Select.Option value="mdi">Material Design Icons</Select.Option>
          <Select.Option value="fluent-emoji">
            Fluent Emoji（彩色）
          </Select.Option>
          <Select.Option value="noto-color">Noto Emoji（彩色）</Select.Option>
        </Select>
        <IconPicker :prefix="selectedIconSet" @select="handleIconSelect" />
      </div>
    </Modal>
  </Page>
</template>
