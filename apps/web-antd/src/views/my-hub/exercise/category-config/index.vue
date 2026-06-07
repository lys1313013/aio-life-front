<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';

import { IconPicker, Page } from '@vben/common-ui';
import { useSortable } from '@vben/hooks';

import {
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Switch,
  Table,
  TabPane,
  Tabs,
  Tooltip,
} from 'ant-design-vue';

import { deleteData, insert, query, update } from '#/api/core/userDictData';
import { getDictTypeEnum } from '#/api/core/userDictType';

import {
  CATEGORY_COLOR_PRESETS,
  extractIconSet,
  getCategoryIcon,
  PRESET_ICONS,
} from './config';

// 状态
const loading = ref(false);
const categories = ref<any[]>([]);
const activeTab = ref('');
const tabList = ref<any[]>([]);

// 表格列配置
const columns = [
  { title: '', dataIndex: 'drag', key: 'drag', width: 50, align: 'center' },
  { title: '图标', dataIndex: 'icon', key: 'icon', width: 80, align: 'center' },
  {
    title: '名称',
    dataIndex: 'dictLabel',
    key: 'dictLabel',
    width: 140,
    align: 'center',
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    align: 'center',
  },
  { title: '操作', key: 'actions', width: 120, align: 'center' },
];

// 表单相关
const formRef = ref();
const showEditModal = ref(false);
const showIconPickerModal = ref(false);
const submitLoading = ref(false);
const editingCategory = ref<any>(null);
const selectedIconSet = ref('lucide');

const handleIconSelect = (icon: string) => {
  formState.value.icon = icon;
  showIconPickerModal.value = false;
};

const formState = ref<any>({
  dictLabel: '',
  color: CATEGORY_COLOR_PRESETS[0] || '#1890ff',
  icon: '',
  dictSort: 0,
  status: 1,
});

const rules = {
  dictLabel: [{ required: true, message: '请输入分类名称' }],
  color: [{ required: true, message: '请选择颜色' }],
};

const modalTitle = computed(() => {
  return editingCategory.value ? '编辑分类' : '添加分类';
});

// 方法
const fetchTabs = async () => {
  try {
    const res = await getDictTypeEnum();
    tabList.value = res || [];
    if (tabList.value.length > 0 && !activeTab.value) {
      activeTab.value = tabList.value[0].value;
    }
  } catch (error) {
    console.error('Failed to fetch tabs:', error);
    message.error('获取分类选项卡失败');
  }
};

const fetchCategories = async () => {
  if (!activeTab.value) return;
  loading.value = true;
  try {
    const res = await query({
      page: 1,
      pageSize: 500, // 假设数据量不大
      condition: { dictType: activeTab.value },
    });
    // @ts-ignore
    categories.value = res.items || [];
    // 按 dictSort 排序
    categories.value.sort((a, b) => (a.dictSort || 0) - (b.dictSort || 0));
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    message.error('获取分类列表失败');
  } finally {
    loading.value = false;
  }
};

const handleTabChange = () => {
  fetchCategories().then(() => {
    nextTick(() => {
      setTimeout(initSortable, 100);
    });
  });
};

const handleAddCategory = () => {
  editingCategory.value = null;
  selectedIconSet.value = 'ant-design';
  formState.value = {
    dictLabel: '',
    color: CATEGORY_COLOR_PRESETS[0] || '#1890ff',
    icon: '',
    status: 1,
    dictSort: categories.value.length * 10,
  };
  showEditModal.value = true;
};

const handleEditClick = (record: any) => {
  editingCategory.value = { ...record };
  selectedIconSet.value = extractIconSet(record.icon);
  formState.value = { ...record };
  showEditModal.value = true;
};

const handleToggleStatus = async (record: any, checked: boolean) => {
  try {
    await update({
      ...record,
      status: checked ? 1 : 0,
    });
    fetchCategories();
  } catch {
    message.error('操作失败');
  }
};

const handleDelete = async (record: any) => {
  try {
    await deleteData(record.id);
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

    const payload = {
      ...formState.value,
      dictType: activeTab.value,
    };

    if (editingCategory.value?.id) {
      // 更新
      await update(payload);
      message.success('更新成功');
    } else {
      // 新增
      await insert(payload);
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

        const list = [...categories.value];
        const [movedItem] = list.splice(oldIndex, 1);
        list.splice(newIndex, 0, movedItem!);

        try {
          // 这里如果是单条更新，需要循环调用更新；或者如果后端支持批量重排最好
          // 暂时采用逐条更新的方式更新所有的排序字段
          const updatePromises = list.map((item, index) => {
            const newSort = index * 10;
            if (item.dictSort !== newSort) {
              return update({ ...item, dictSort: newSort });
            }
            return Promise.resolve();
          });
          await Promise.all(updatePromises);
          fetchCategories();
        } catch {
          message.error('排序失败');
        }
      },
    });
    initializeSortable();
  }
};

onMounted(async () => {
  await fetchTabs();
  fetchCategories().then(() => {
    nextTick(() => {
      setTimeout(initSortable, 100);
    });
  });
});
</script>

<template>
  <Page>
    <div class="space-y-4">
      <Card :bordered="false" :body-style="{ padding: '0 16px' }">
        <Tabs v-model:active-key="activeTab" @change="handleTabChange">
          <TabPane v-for="tab in tabList" :key="tab.value" :tab="tab.label" />
        </Tabs>
      </Card>

      <Card
        title="分类列表"
        :bordered="false"
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
          :data-source="categories"
          :columns="columns as any"
          :loading="loading"
          :pagination="false"
          row-key="id"
          :scroll="{ x: 560 }"
          size="middle"
        >
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
            <template v-else-if="column.key === 'dictLabel'">
              <div
                class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
                :style="{
                  backgroundColor: `${record.color || '#1890ff'}10`,
                  color: record.color || '#1890ff',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: `${record.color || '#1890ff'}20`,
                }"
              >
                {{ record.dictLabel }}
              </div>
            </template>
            <template v-else-if="column.key === 'status'">
              <Switch
                :checked="record.status === 1"
                size="small"
                @change="(checked: any) => handleToggleStatus(record, checked)"
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
                <Popconfirm
                  title="确定要删除这个分类吗？"
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
      </Card>
    </div>

    <!-- 分类编辑模态框 -->
    <Modal
      v-model:open="showEditModal"
      :title="modalTitle"
      :confirm-loading="submitLoading"
      centered
      @ok="handleSaveCategory"
    >
      <Form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
        class="mt-4"
      >
        <Form.Item label="分类名称" name="dictLabel">
          <Input
            v-model:value="formState.dictLabel"
            placeholder="请输入分类名称"
          />
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
              <div
                class="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10"
              >
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
                  <component :is="getCategoryIcon(item.icon)" class="size-6" />
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
                placeholder="输入图标名称，如 lucide:run"
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

        <Form.Item label="状态" name="status">
          <Switch
            v-model:checked="formState.status"
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
      centered
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
