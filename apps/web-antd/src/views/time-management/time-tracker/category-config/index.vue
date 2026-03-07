<template>
  <Page header-sticky>
    <template #title>
      <div class="flex items-center gap-2">
        <Button type="link" @click="router.back()">
          <template #icon><ArrowLeftOutlined /></template>
        </Button>
        <span class="text-lg font-bold">分类配置管理</span>
      </div>
    </template>
    <template #extra>
      <Button type="primary" @click="handleAddCategory">
        <template #icon><PlusOutlined /></template>
        添加分类
      </Button>
    </template>

    <div class="p-4">
      <Card :bordered="false">
        <Table
          ref="tableRef"
          :data-source="categories"
          :columns="columns"
          :loading="loading"
          :pagination="false"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'drag'">
              <HolderOutlined class="drag-handle cursor-move text-gray-400" />
            </template>

            <template v-else-if="column.key === 'color'">
              <div class="flex items-center justify-center gap-2">
                <div
                  class="h-5 w-5 rounded border"
                  :style="{ backgroundColor: record.color }"
                ></div>
                <span class="font-mono text-xs">{{ record.color }}</span>
              </div>
            </template>

            <template v-else-if="column.key === 'isTrackTime'">
              <Badge
                :status="record.isTrackTime ? 'processing' : 'default'"
                :text="record.isTrackTime ? '是' : '否'"
              />
            </template>

            <template v-else-if="column.key === 'actions'">
              <div class="flex justify-center gap-2">
                <Button type="link" size="small" @click="handleEdit(record)">
                  <EditOutlined />
                  编辑
                </Button>
                <Popconfirm
                  title="确定要删除这个分类吗？"
                  @confirm="handleDelete(record.id)"
                >
                  <Button type="link" size="small" danger>
                    <DeleteOutlined />
                    删除
                  </Button>
                </Popconfirm>
              </div>
            </template>
          </template>
        </Table>
      </Card>
    </div>

    <Modal
      v-model:open="showEditModal"
      :title="editingCategory ? '编辑分类' : '添加分类'"
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
            <div class="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded border transition-transform hover:scale-110">
              <input
                type="color"
                :value="formState.color"
                class="absolute -inset-1 h-[200%] w-[200%] cursor-pointer opacity-0"
                @input="(e: any) => formState.color = e.target.value"
              />
              <div
                class="h-full w-full"
                :style="{ backgroundColor: formState.color }"
              ></div>
            </div>
          </div>
          <div class="mt-2 flex flex-wrap gap-1">
            <div
              v-for="preset in colorPresets"
              :key="preset"
              class="h-5 w-5 cursor-pointer rounded border transition-transform hover:scale-110"
              :style="{ backgroundColor: preset }"
              @click="formState.color = preset"
            ></div>
          </div>
        </Form.Item>

        <Form.Item label="关注" name="isTrackTime">
          <div class="flex items-center gap-2">
            <Switch v-model:checked="formState.isTrackTime" />
            <span class="text-xs text-gray-400">开启后将在仪表盘显示对比统计卡片</span>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  HolderOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Table,
  Modal,
  Form,
  Input,
  message,
  Switch,
  Badge,
  Card,
  Popconfirm,
} from 'ant-design-vue';
import type { FormInstance, TableColumnType, FormProps } from 'ant-design-vue';
import { Page } from '@vben/common-ui';
import { useSortable } from '@vben/hooks';
import {
  listCategories,
  saveCategory,
  updateCategory,
  deleteCategory,
  reSortCategories,
  type TimeTrackerCategoryEntity,
} from '#/api/core/time-tracker-category';

const router = useRouter();
const loading = ref(false);
const submitLoading = ref(false);
const categories = ref<TimeTrackerCategoryEntity[]>([]);
const showEditModal = ref(false);
const editingCategory = ref<TimeTrackerCategoryEntity | null>(null);
const formRef = ref<FormInstance>();
const tableRef = ref();

const formState = reactive({
  name: '',
  color: '#1890ff',
  isTrackTime: false,
});

const columns: TableColumnType<TimeTrackerCategoryEntity>[] = [
  {
    title: '',
    key: 'drag',
    width: 60,
    align: 'center',
  },
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    width: 300,
  },
  {
    title: '颜色',
    key: 'color',
    width: 250,
    align: 'center',
  },
  {
    title: '追踪',
    key: 'isTrackTime',
    width: 150,
    align: 'center',
  },
  {
    title: '操作',
    key: 'actions',
    width: 250,
    align: 'center',
  },
];

const handleDragEnd = async () => {
  const sortedData = categories.value.map((item, index) => ({
    id: item.id,
    sort: (index + 1) * 10,
  }));
  try {
    await reSortCategories(sortedData);
  } catch (error) {
    console.error('排序失败:', error);
    message.error('排序更新失败');
    fetchCategories();
  }
};

const colorPresets = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#eb2f96',
  '#fa541c',
  '#13c2c2',
  '#2f54eb',
  '#fa8c16',
];

const rules: FormProps['rules'] = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  color: [
    { required: true, message: '请选择颜色', trigger: 'blur' },
    {
      pattern: /^#[0-9A-Fa-f]{6}$/,
      message: '格式应为 #RRGGBB',
      trigger: 'blur',
    },
  ],
};

const fetchCategories = async () => {
  loading.value = true;
  try {
    categories.value = await listCategories();
  } catch (error) {
    console.error('获取分类失败:', error);
    message.error('获取分类失败');
  } finally {
    loading.value = false;
  }
};

const handleAddCategory = () => {
  editingCategory.value = null;
  Object.assign(formState, {
    name: '',
    color: '#1890ff',
    isTrackTime: false,
  });
  showEditModal.value = true;
};

const handleEdit = (category: any) => {
  editingCategory.value = category as TimeTrackerCategoryEntity;
  Object.assign(formState, {
    name: category.name,
    color: category.color,
    isTrackTime: !!category.isTrackTime,
  });
  showEditModal.value = true;
};

const handleDelete = async (id: string) => {
  try {
    await deleteCategory(id);
    message.success('删除成功');
    fetchCategories();
  } catch (error) {
    console.error('删除失败:', error);
    message.error('删除失败');
  }
};

const handleSaveCategory = async () => {
  try {
    await formRef.value?.validate();
    submitLoading.value = true;

    const data: TimeTrackerCategoryEntity = {
      ...formState,
      isTrackTime: formState.isTrackTime ? 1 : 0,
      sort: editingCategory.value?.sort ?? categories.value.length * 10,
    };

    if (editingCategory.value) {
      await updateCategory({
        ...data,
        id: editingCategory.value.id,
        code: editingCategory.value.code, // 保留原有的 code
      });
      message.success('更新成功');
    } else {
      await saveCategory(data);
      message.success('添加成功');
    }

    showEditModal.value = false;
    fetchCategories();
  } catch (error) {
    console.error('保存失败:', error);
  } finally {
    submitLoading.value = false;
  }
};

onMounted(async () => {
  await fetchCategories();
  await nextTick();

  const el = tableRef.value?.$el?.querySelector('tbody');
  if (el) {
    const { initializeSortable } = useSortable(el, {
      handle: '.drag-handle',
      onEnd: (evt) => {
        const { oldIndex, newIndex } = evt;
        if (
          oldIndex !== undefined &&
          newIndex !== undefined &&
          oldIndex !== newIndex
        ) {
          const item = categories.value.splice(oldIndex, 1)[0];
          if (item) {
            categories.value.splice(newIndex, 0, item);
            handleDragEnd();
          }
        }
      },
    });
    initializeSortable();
  }
});
</script>
