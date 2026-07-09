<script setup lang="ts">
import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { onMounted, ref } from 'vue';

import { IconPicker, Page } from '@vben/common-ui';

import { ColumnWidthOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons-vue';
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
  TabPane,
  Tabs,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  adminDelete,
  adminInsert,
  adminQuery,
  adminUpdate,
} from '#/api/core/userDictData';
import { getDictTypeEnum } from '#/api/core/userDictType';
import {
  CATEGORY_COLOR_PRESETS,
  extractIconSet,
  getCategoryIcon,
  PRESET_ICONS,
} from '#/views/my-hub/exercise/category-config/config';

// 枚举数据
const dictTypeOptions = ref<{ label: string; value: string }[]>([]);
const activeTab = ref<string>('');

onMounted(async () => {
  try {
    const res = await getDictTypeEnum();
    dictTypeOptions.value = res || [];
    if (dictTypeOptions.value.length > 0) {
      activeTab.value = dictTypeOptions.value[0]?.value || '';
      // 等待 Tab 渲染后查询表格
      setTimeout(() => {
        gridApi.query();
      }, 100);
    }
  } catch (error) {
    console.error('Failed to load dict type enum', error);
  }
});

const handleTabChange = () => {
  gridApi.query();
};

const showEditModal = ref(false);
const showIconPickerModal = ref(false);
const submitLoading = ref(false);
const editingRecord = ref<any>(null);
const selectedIconSet = ref('lucide');
const formRef = ref();

const formState = ref<any>({
  dictType: '',
  dictLabel: '',
  color: CATEGORY_COLOR_PRESETS[0] || '#1890ff',
  icon: '',
  dictSort: 0,
  status: '0',
  isReadonly: 'N',
});

const rules = {
  dictType: [{ required: true, message: '请输入字典类型' }],
  dictLabel: [{ required: true, message: '请输入字典名称' }],
};

const formOptions: VbenFormProps = {
  // 默认展开
  collapsed: false,
  // 控制表单是否显示折叠按钮
  showCollapseButton: false,
  submitButtonOptions: {
    content: '查询',
  },
  schema: [
    {
      fieldName: 'dictLabel',
      component: 'Input',
      label: '字典名称',
    },
    {
      fieldName: 'status',
      component: 'Select',
      label: '状态',
      componentProps: {
        placeholder: '请选择状态',
        options: [
          { label: '启用', value: '0' },
          { label: '禁用', value: '1' },
        ],
        allowClear: true,
      },
    },
  ],
};

const gridOptions: VxeGridProps<any> = {
  toolbarConfig: {
    custom: false,
    refresh: true,
    zoom: true,
    // @ts-ignore 正式环境时有完整的类型声明
    search: true,
  },
  checkboxConfig: {
    highlight: true,
  },
  columns: [
    { type: 'seq', width: 60, title: '序号', align: 'center' },
    {
      title: '字典名称',
      field: 'dictLabel',
      minWidth: 140,
      align: 'center',
      slots: { default: 'dictLabelSlot' },
    },
    {
      field: 'icon',
      title: '图标',
      width: 80,
      align: 'center',
      slots: { default: 'iconColorSlot' },
    },
    { field: 'dictSort', title: '排序', width: 80, align: 'center' },
    {
      field: 'status',
      title: '状态',
      width: 80,
      align: 'center',
      slots: { default: 'statusSlot' },
    },
    {
      field: 'isReadonly',
      title: '是否只读',
      width: 90,
      align: 'center',
      slots: { default: 'readonlySlot' },
    },
    {
      title: '操作',
      width: 120,
      align: 'center',
      fixed: 'right',
      slots: { default: 'actionSlot' },
    },
  ],
  keepSource: true,
  pagerConfig: {
    enabled: true,
    pageSize: 20,
    pageSizes: [10, 20, 50, 100],
  },
  proxyConfig: {
    autoLoad: false,
    ajax: {
      query: async ({ page }, formValues) => {
        if (!activeTab.value && dictTypeOptions.value.length === 0) {
          return { items: [], total: 0 };
        }
        const res = await adminQuery({
          page: page.currentPage,
          pageSize: page.pageSize,
          condition: {
            dictType: activeTab.value || undefined,
            dictLabel: formValues.dictLabel || undefined,
            status: formValues.status || undefined,
          },
        });
        return {
          items: res.items || [],
          total: res.total || 0,
        };
      },
    },
  },
};

const [Grid, gridApi] = useVbenVxeGrid({ formOptions, gridOptions } as any);

const openColumnConfig = () => {
  gridApi.grid?.openCustom();
};

const handleDelete = async (row: any) => {
  try {
    await adminDelete(row.id);
    message.success('删除成功');
    gridApi.query();
  } catch (error) {
    console.error(error);
  }
};

const handleAdd = () => {
  editingRecord.value = null;
  selectedIconSet.value = 'ant-design';
  formState.value = {
    dictType: activeTab.value,
    dictLabel: '',
    color: CATEGORY_COLOR_PRESETS[0] || '#1890ff',
    icon: '',
    dictSort: 0,
    status: '0',
  };
  showEditModal.value = true;
};

const handleEdit = (row: any) => {
  if (row.userId !== '0' && row.userId !== 0) {
    message.warning('只能编辑基础值 (用户ID为0的数据)');
    return;
  }
  editingRecord.value = { ...row };
  selectedIconSet.value = extractIconSet(row.icon);
  formState.value = { ...row };
  showEditModal.value = true;
};

const handleIconSelect = (icon: string) => {
  formState.value.icon = icon;
  showIconPickerModal.value = false;
};

const handleSave = async () => {
  try {
    await formRef.value.validate();
    submitLoading.value = true;

    if (editingRecord.value?.id) {
      await adminUpdate(formState.value);
      message.success('更新基础值成功');
    } else {
      await adminInsert(formState.value);
      message.success('添加基础值成功');
    }

    showEditModal.value = false;
    gridApi.query();
  } catch (error) {
    console.error(error);
  } finally {
    submitLoading.value = false;
  }
};
</script>

<template>
  <Page auto-content-height>
    <div class="flex h-full flex-col space-y-4">
      <Card
        :bordered="false"
        :body-style="{ padding: '0 16px', paddingTop: '12px' }"
      >
        <Tabs v-model:active-key="activeTab" @change="handleTabChange">
          <TabPane
            v-for="tab in dictTypeOptions"
            :key="tab.value"
            :tab="tab.label"
          />
        </Tabs>
      </Card>

      <div class="flex-1 overflow-hidden bg-white">
        <Grid>
          <!-- 表格顶部操作按钮 -->
          <template #toolbar-actions>
            <Button type="primary" @click="handleAdd"> 添加基础值 </Button>
            <Button class="ml-auto" type="text" @click="openColumnConfig">
              <ColumnWidthOutlined />
            </Button>
          </template>

          <!-- 字典名称 插槽 -->
          <template #dictLabelSlot="{ row }">
            <div
              class="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium"
              :style="{
                backgroundColor: `${row.color || '#1890ff'}10`,
                color: row.color || '#1890ff',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: `${row.color || '#1890ff'}20`,
              }"
            >
              {{ row.dictLabel }}
            </div>
          </template>

          <!-- 图标/颜色 插槽 -->
          <template #iconColorSlot="{ row }">
            <div class="flex items-center justify-center">
              <component
                v-if="row.icon"
                :is="getCategoryIcon(row.icon)"
                class="size-5"
                :style="{ color: row.color }"
              />
              <span v-else class="text-xs text-gray-400">无</span>
            </div>
          </template>

          <!-- 状态 插槽 -->
          <template #statusSlot="{ row }">
            <Tag :color="row.status === '0' ? 'green' : 'red'">
              {{ row.status === '0' ? '启用' : '禁用' }}
            </Tag>
          </template>

          <!-- 是否只读 插槽 -->
          <template #readonlySlot="{ row }">
            <Tag :color="row.isReadonly === 'Y' ? 'blue' : 'default'">
              {{ row.isReadonly === 'Y' ? '是' : '否' }}
            </Tag>
          </template>

          <!-- 操作 插槽 -->
          <template #actionSlot="{ row }">
            <div class="flex items-center justify-center gap-2">
              <Tooltip title="编辑">
                <Button
                  v-if="row.userId === '0' || row.userId === 0"
                  type="link"
                  size="small"
                  @click="handleEdit(row)"
                >
                  <template #icon><EditOutlined /></template>
                </Button>
              </Tooltip>
              <Popconfirm
                title="确定要强制删除该用户的字典数据吗？"
                @confirm="handleDelete(row)"
              >
                <Tooltip title="删除">
                  <Button type="link" danger size="small">
                    <template #icon><DeleteOutlined /></template>
                  </Button>
                </Tooltip>
              </Popconfirm>
            </div>
          </template>
        </Grid>
      </div>
    </div>
    <!-- 添加/编辑基础值模态框 -->
    <Modal
      v-model:open="showEditModal"
      :title="editingRecord ? '编辑基础值' : '添加基础值'"
      :confirm-loading="submitLoading"
      centered
      @ok="handleSave"
    >
      <Form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
        class="mt-4"
      >
        <Form.Item label="字典类型" name="dictType">
          <Select
            v-model:value="formState.dictType"
            placeholder="请选择字典类型"
          >
            <Select.Option
              v-for="item in dictTypeOptions"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }} ({{ item.value }})
            </Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="字典名称" name="dictLabel">
          <Input
            v-model:value="formState.dictLabel"
            placeholder="请输入分类名称"
          />
        </Form.Item>
        <Form.Item label="排序" name="dictSort">
          <Input type="number" v-model:value="formState.dictSort" />
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
            checked-value="0"
            un-checked-value="1"
            checked-children="启用"
            un-checked-children="停用"
          />
        </Form.Item>
        <Form.Item label="是否只读" name="isReadonly">
          <Switch
            v-model:checked="formState.isReadonly"
            checked-value="Y"
            un-checked-value="N"
            checked-children="是"
            un-checked-children="否"
          />
          <div class="mt-1 text-xs text-gray-400">
            开启后，普通用户无法修改该分类的名称、颜色和图标，只能修改启用状态。
          </div>
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
