<template>
  <div class="category-manager">
    <div class="header">
      <a-button type="primary" @click="handleAddCategory">
        <template #icon><PlusOutlined /></template>
        添加分类
      </a-button>
    </div>

    <a-table
      :data-source="categories"
      :columns="columns"
      :pagination="false"
      row-key="id"
      class="category-table"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'color'">
          <div class="color-cell">
            <div class="color-preview" :style="{ backgroundColor: record.color }"></div>
            <span>{{ record.color }}</span>
          </div>
        </template>

        <template v-else-if="column.key === 'actions'">
          <div class="action-buttons">
            <a-button type="link" size="small" @click="handleEdit(record)">
              <EditOutlined />
              编辑
            </a-button>
            <a-button
              type="link"
              size="small"
              danger
              @click="handleDelete(record)"
              :disabled="categories.length <= 1"
            >
              <DeleteOutlined />
              删除
            </a-button>
          </div>
        </template>
      </template>
    </a-table>

    <!-- 分类编辑模态框 -->
    <a-modal
      v-model:open="showEditModal"
      :title="editingCategory ? '编辑分类' : '添加分类'"
      :width="500"
      @ok="handleSaveCategory"
      @cancel="handleCancelEdit"
    >
      <a-form
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
      >
        <a-form-item label="分类名称" name="name">
          <a-input v-model:value="formState.name" placeholder="请输入分类名称" />
        </a-form-item>

        <a-form-item label="颜色" name="color">
          <div class="color-picker-container">
            <a-input
              v-model:value="formState.color"
              placeholder="请输入颜色值（如 #1890ff）"
              style="flex: 1"
            />
            <div class="color-preview" :style="{ backgroundColor: formState.color }"></div>
          </div>
          <div class="color-presets">
            <div
              v-for="preset in colorPresets"
              :key="preset"
              class="color-preset"
              :style="{ backgroundColor: preset }"
              @click="formState.color = preset"
            ></div>
          </div>
        </a-form-item>

        <a-form-item label="描述" name="description">
          <a-textarea
            v-model:value="formState.description"
            placeholder="请输入分类描述（可选）"
            :rows="3"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import type { FormInstance } from 'ant-design-vue';
import type { TimeSlotCategory } from '../types';
import { generateId } from '../utils';

interface Props {
  categories: TimeSlotCategory[];
}

interface Emits {
  (e: 'update', categories: TimeSlotCategory[]): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const formRef = ref<FormInstance>();
const showEditModal = ref(false);
const editingCategory = ref<TimeSlotCategory | null>(null);

const formState = reactive({
  name: '',
  color: '#1890ff',
  description: ''
});

// 表格列定义
const columns = [
  {
    title: '分类名称',
    dataIndex: 'name',
    key: 'name'
  },
  {
    title: '颜色',
    key: 'color',
    width: '150px'
  },
  {
    title: '描述',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true
  },
  {
    title: '操作',
    key: 'actions',
    width: '200px'
  }
];

// 颜色预设
const colorPresets = [
  '#1890ff', '#52c41a', '#faad14', '#f50', '#722ed1',
  '#eb2f96', '#fa541c', '#13c2c2', '#2f54eb', '#fa8c16'
];

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { max: 20, message: '分类名称不能超过20个字符', trigger: 'blur' }
  ],
  color: [
    { required: true, message: '请选择颜色', trigger: 'blur' },
    {
      pattern: /^#[0-9A-Fa-f]{6}$/,
      message: '颜色格式不正确，应为 #RRGGBB 格式',
      trigger: 'blur'
    }
  ],
  description: [
    { max: 100, message: '描述不能超过100个字符', trigger: 'blur' }
  ]
};

// 处理添加分类
const handleAddCategory = () => {
  editingCategory.value = null;
  formState.name = '';
  formState.color = '#1890ff';
  formState.description = '';
  showEditModal.value = true;
};

// 处理编辑分类
const handleEdit = (category: TimeSlotCategory) => {
  editingCategory.value = category;
  formState.name = category.name;
  formState.color = category.color;
  formState.description = category.description || '';
  showEditModal.value = true;
};

// 处理删除分类
const handleDelete = (category: TimeSlotCategory) => {
  if (props.categories.length <= 1) {
    message.error('至少需要保留一个分类');
    return;
  }
  
  const newCategories = props.categories.filter(cat => cat.id !== category.id);
  emit('update', newCategories);
  message.success('分类删除成功');
};

// 处理保存分类
const handleSaveCategory = async () => {
  try {
    await formRef.value?.validate();
    
    let newCategories: TimeSlotCategory[];
    
    if (editingCategory.value) {
      // 编辑现有分类
      newCategories = props.categories.map(cat => 
        cat.id === editingCategory.value!.id
          ? { ...cat, ...formState }
          : cat
      );
    } else {
      // 添加新分类
      const newCategory: TimeSlotCategory = {
        id: generateId(),
        name: formState.name,
        color: formState.color,
        description: formState.description
      };
      newCategories = [...props.categories, newCategory];
    }
    
    emit('update', newCategories);
    showEditModal.value = false;
    message.success(editingCategory.value ? '分类更新成功' : '分类添加成功');
  } catch (error) {
    console.error('表单验证失败:', error);
  }
};

// 处理取消编辑
const handleCancelEdit = () => {
  showEditModal.value = false;
  editingCategory.value = null;
};
</script>

<style scoped>
.category-manager {
  padding: 10px 0;
}

.header {
  margin-bottom: 20px;
}

.category-table {
  margin-top: 20px;
}

.color-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-preview {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid #d9d9d9;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.color-picker-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-presets {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.color-preset {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #d9d9d9;
  transition: transform 0.2s;
}

.color-preset:hover {
  transform: scale(1.1);
}
</style>