<script setup lang="ts">
import type { MergedCategory } from '../types';

import type { TimeTrackerCategoryEntity } from '#/api/core/time-tracker-category';

import { computed, nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { IconPicker, Page } from '@vben/common-ui';
import { useSortable } from '@vben/hooks';

import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  HolderOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  UndoOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Collapse,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import {
  deleteCategory,
  listCategories,
  listHiddenCategories,
  reSortCategories,
  saveCategory,
  updateCategory,
} from '#/api/core/time-tracker-category';

import {
  CATEGORY_COLOR_PRESETS,
  extractIconSet,
  getCategoryIcon,
  PRESET_ICONS,
} from '../config';

const router = useRouter();

// 状态
const loading = ref(false);
const loadingCategoryId = ref<null | string>(null);
const categories = ref<TimeTrackerCategoryEntity[]>([]);
const mergedCategories = ref<MergedCategory[]>([]);
const showGuide = ref(
  localStorage.getItem('time-tracker-category-guide') !== 'false',
);

// 分类数据计算
const visibleCategories = computed(() =>
  mergedCategories.value.filter((c) => !c.isHidden),
);
const hiddenCategories = computed(() =>
  mergedCategories.value.filter((c) => c.isHidden),
);

// 表格列配置
const columns = [
  { title: '', dataIndex: 'drag', key: 'drag', width: 50, align: 'center' },
  { title: '图标', dataIndex: 'icon', key: 'icon', width: 80, align: 'center' },
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    width: 180,
    align: 'center',
  },
  {
    title: '卡片统计',
    dataIndex: 'isTrackTime',
    key: 'isTrackTime',
    width: 100,
    align: 'center',
  },
  { title: '操作', key: 'actions', width: 150, align: 'center' },
];

// 表单相关
const formRef = ref();
const showEditModal = ref(false);
const showIconPickerModal = ref(false);
const submitLoading = ref(false);
const editingCategory = ref<null | TimeTrackerCategoryEntity>(null);
const isOverrideMode = ref(false);
const selectedIconSet = ref('lucide');

const openIconPicker = () => {
  showIconPickerModal.value = true;
};

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
});

const rules = {
  name: [{ required: true, message: '请输入分类名称' }],
  color: [{ required: true, message: '请选择颜色' }],
};

const modalTitle = computed(() => {
  if (isOverrideMode.value) return '修改默认分类';
  return editingCategory.value ? '编辑自定义分类' : '添加分类';
});

// 方法
const handleCloseGuide = () => {
  localStorage.setItem('time-tracker-category-guide', 'false');
  showGuide.value = false;
};

const fetchCategories = async () => {
  loading.value = true;
  try {
    const [visibleList, hiddenList] = await Promise.all([
      listCategories(),
      listHiddenCategories(),
    ]);
    categories.value = visibleList;

    const merged: MergedCategory[] = [];

    visibleList.forEach((item) => {
      const isPublic = Number(item.userId) === 0;
      const isOverride = !!item.templateId;
      merged.push({
        id: item.id as string,
        realId: item.id as string,
        name: item.name,
        color: item.color,
        icon: item.icon,
        description: item.description,
        isTrackTime: item.isTrackTime === 1,
        categoryType: isPublic ? 'public' : isOverride ? 'public' : 'private',
        isOverridden: isOverride,
        isHidden: false,
        originalId: item.templateId?.toString() || item.id,
        sort: item.sort,
      } as MergedCategory);
    });

    hiddenList.forEach((item) => {
      merged.push({
        id: item.id as string,
        realId: (item.templateId as string) || item.id,
        name: item.name,
        color: item.color,
        icon: item.icon,
        description: item.description,
        isTrackTime: item.isTrackTime === 1,
        categoryType: 'public',
        isOverridden: false,
        isHidden: true,
        originalId: item.templateId?.toString() || item.id,
        sort: item.sort,
      } as MergedCategory);
    });

    mergedCategories.value = merged;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    message.error('获取分类列表失败');
  } finally {
    loading.value = false;
  }
};

const handleAddCategory = () => {
  editingCategory.value = null;
  isOverrideMode.value = false;
  selectedIconSet.value = 'ant-design';
  formState.value = {
    name: '',
    color: CATEGORY_COLOR_PRESETS[0] || '#1890ff',
    icon: '',
    description: '',
    isTrackTime: 1,
    isEnabled: 1,
    sort: visibleCategories.value.length * 10,
  };
  showEditModal.value = true;
};

const handleEditClick = (record: MergedCategory) => {
  if (record.categoryType === 'public') {
    handleOverride(record);
  } else {
    handleEdit(record);
  }
};

const handleEdit = (record: MergedCategory) => {
  editingCategory.value = {
    id: record.realId,
    name: record.name,
    color: record.color,
    icon: record.icon,
    description: record.description,
    isTrackTime: record.isTrackTime ? 1 : 0,
    isEnabled: record.isHidden ? 0 : 1,
    sort: record.sort,
  };
  isOverrideMode.value = false;
  selectedIconSet.value = extractIconSet(record.icon);
  formState.value = { ...editingCategory.value };
  showEditModal.value = true;
};

const handleOverride = (record: MergedCategory) => {
  editingCategory.value = {
    id: record.realId,
    templateId: record.originalId,
    name: record.name,
    color: record.color,
    icon: record.icon,
    description: record.description,
    isTrackTime: record.isTrackTime ? 1 : 0,
    isEnabled: record.isHidden ? 0 : 1,
    sort: record.sort,
  };
  isOverrideMode.value = true;
  selectedIconSet.value = extractIconSet(record.icon);
  formState.value = { ...editingCategory.value };
  showEditModal.value = true;
};

const handleHide = async (record: MergedCategory) => {
  try {
    loadingCategoryId.value = record.realId!;
    await updateCategory({
      id: record.realId!,
      templateId: record.originalId,
      isEnabled: 0,
    } as TimeTrackerCategoryEntity);
    message.success('已隐藏');
    fetchCategories();
  } catch {
    message.error('隐藏失败');
  } finally {
    loadingCategoryId.value = null;
  }
};

const handleToggleEnable = async (record: MergedCategory, checked: boolean) => {
  await (checked ? handleUnhide(record) : handleHide(record));
};

const handleToggleTrackTime = async (
  record: MergedCategory,
  checked: boolean,
) => {
  try {
    loadingCategoryId.value = record.realId!;
    await updateCategory({
      id: record.realId!,
      templateId: record.originalId,
      isTrackTime: checked ? 1 : 0,
    } as TimeTrackerCategoryEntity);
    fetchCategories();
  } catch {
    message.error('操作失败');
  } finally {
    loadingCategoryId.value = null;
  }
};

const handleUnhide = async (record: MergedCategory) => {
  try {
    loadingCategoryId.value = record.realId!;
    await updateCategory({
      id: record.realId!,
      templateId: record.originalId,
      isEnabled: 1,
    } as TimeTrackerCategoryEntity);
    message.success('已恢复');
    fetchCategories();
  } catch {
    message.error('恢复失败');
  } finally {
    loadingCategoryId.value = null;
  }
};

const handleDelete = async (record: MergedCategory) => {
  try {
    await deleteCategory(record.realId!);
    message.success('删除成功');
    fetchCategories();
  } catch (error) {
    console.error('Failed to delete category:', error);
    message.error('删除失败');
  }
};

const handleSaveCategory = async () => {
  try {
    await formRef.value.validate();
    submitLoading.value = true;

    if (isOverrideMode.value) {
      // 覆盖默认分类
      const data = {
        ...formState.value,
        id: editingCategory.value?.templateId || editingCategory.value?.id,
      };
      await updateCategory(data);
      message.success('设置已保存');
    } else if (editingCategory.value?.id) {
      // 更新私有分类
      await updateCategory({
        ...formState.value,
        id: editingCategory.value.id,
      });
      message.success('更新成功');
    } else {
      // 新增私有分类
      await saveCategory(formState.value);
      message.success('添加成功');
    }

    showEditModal.value = false;
    fetchCategories();
  } catch (error) {
    console.error('Failed to save category:', error);
  } finally {
    submitLoading.value = false;
  }
};

// 拖拽排序初始化
const initSortable = () => {
  const tables = document.querySelectorAll('.ant-table-tbody');

  if (tables.length > 0) {
    const { initializeSortable } = useSortable(tables[0] as HTMLElement, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: async ({ oldIndex, newIndex }: any) => {
        if (
          oldIndex === newIndex ||
          oldIndex === undefined ||
          newIndex === undefined
        )
          return;

        const list = [...visibleCategories.value];
        const [movedItem] = list.splice(oldIndex, 1);
        list.splice(newIndex, 0, movedItem!);

        const sortData = list.map((item, index) => ({
          id: item.realId,
          templateId: item.originalId,
          sort: index * 10,
        }));

        try {
          await reSortCategories(sortData);
          fetchCategories();
        } catch {
          message.error('排序失败');
        }
      },
    });
    initializeSortable();
  }
};

onMounted(() => {
  fetchCategories().then(() => {
    nextTick(() => {
      setTimeout(initSortable, 100);
    });
  });
});
</script>

<template>
  <Page header-sticky>
    <template #title>
      <div class="flex items-center gap-2">
        <Button type="link" @click="router.back()">
          <template #icon><ArrowLeftOutlined /></template>
        </Button>
        <span class="text-lg font-bold">我的分类</span>
      </div>
    </template>

    <div class="space-y-4">
      <!-- 分类列表区域 -->
      <Card
        title="我的分类"
        :bordered="false"
        class="category-section"
        :head-style="{ padding: '0 12px' }"
        :body-style="{ padding: '12px' }"
      >
        <template #extra>
          <Button
            type="primary"
            size="small"
            class="sm:hidden"
            @click="handleAddCategory"
          >
            <template #icon><PlusOutlined /></template>
            添加
          </Button>
          <Button
            type="primary"
            class="hidden sm:inline-flex"
            @click="handleAddCategory"
          >
            <template #icon><PlusOutlined /></template>
            添加分类
          </Button>
        </template>

        <Table
          :data-source="visibleCategories"
          :columns="columns"
          :loading="loading"
          :pagination="false"
          row-key="id"
          :scroll="{ x: 560 }"
          size="middle"
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
            <template v-if="column.key === 'drag'">
              <HolderOutlined class="drag-handle cursor-move text-gray-400" />
            </template>
            <template v-else-if="column.key === 'icon'">
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
            <template v-else-if="column.key === 'isTrackTime'">
              <Switch
                :checked="record.isTrackTime"
                :loading="loadingCategoryId === record.realId"
                size="small"
                @change="
                  (checked: boolean) => handleToggleTrackTime(record, checked)
                "
              />
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="flex justify-center gap-2">
                <Tooltip title="编辑">
                  <Button
                    type="link"
                    size="small"
                    @click="handleEditClick(record)"
                  >
                    <template #icon><EditOutlined /></template>
                  </Button>
                </Tooltip>
                <Tooltip title="隐藏" v-if="record.categoryType === 'public'">
                  <Button
                    type="link"
                    size="small"
                    danger
                    :loading="loadingCategoryId === record.realId"
                    @click="handleHide(record)"
                  >
                    <template #icon><EyeInvisibleOutlined /></template>
                  </Button>
                </Tooltip>
                <Popconfirm
                  v-if="record.categoryType !== 'public'"
                  title="确定要删除这个分类吗？删除后相关的时间记录将保留但分类信息将丢失。"
                  @confirm="handleDelete(record)"
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

        <!-- 已隐藏的分类 -->
        <Collapse
          v-if="hiddenCategories.length > 0"
          class="mt-4"
          :bordered="false"
        >
          <Collapse.Panel key="1" header="已隐藏的分类">
            <div class="flex flex-wrap gap-2">
              <Tag
                v-for="cat in hiddenCategories"
                :key="cat.id"
                class="inline-flex cursor-pointer items-center gap-1 py-1 hover:opacity-80"
                :style="{
                  backgroundColor: cat.color ? `${cat.color}10` : undefined,
                  borderColor: cat.color ? `${cat.color}20` : undefined,
                  color: cat.color || undefined,
                }"
                @click="handleUnhide(cat)"
              >
                <component
                  v-if="cat.icon"
                  :is="getCategoryIcon(cat.icon)"
                  class="size-3.5"
                />
                <span>{{ cat.originalName || cat.name }}</span>
                <span
                  class="ml-1 inline-flex items-center gap-0.5 text-blue-500"
                >
                  <UndoOutlined />恢复
                </span>
              </Tag>
            </div>
          </Collapse.Panel>
        </Collapse>
      </Card>
    </div>

    <!-- 分类编辑模态框 -->
    <Modal
      v-model:open="showEditModal"
      :title="modalTitle"
      :confirm-loading="submitLoading"
      @ok="handleSaveCategory"
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
              <div class="grid grid-cols-4 gap-1 sm:grid-cols-6 md:grid-cols-8">
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

        <Form.Item label="卡片统计" name="isTrackTime">
          <Switch
            v-model:checked="formState.isTrackTime"
            :checked-value="1"
            :un-checked-value="0"
          />
        </Form.Item>
      </Form>
    </Modal>

    <!-- 图标选择器模态框 -->
    <Modal
      v-model:open="showIconPickerModal"
      title="选择图标"
      :footer="null"
      :width="800"
      style="max-width: 100%"
    >
      <div class="flex flex-col gap-4">
        <Select
          v-model:value="selectedIconSet"
          class="w-full sm:w-[200px]"
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

<style scoped>
.public-category-section :deep(.ant-card-head) {
  border-bottom: 2px solid #1890ff;
}

.private-category-section :deep(.ant-card-head) {
  border-bottom: 2px solid #52c41a;
}
</style>
