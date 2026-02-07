<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';

import { PlusOutlined, 
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue';
import {
  Button as AButton,
  DatePicker as ADatePicker,
  Empty as AEmpty,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  Modal as AModal,
  RangePicker as ARangePicker,
  Select as ASelect,
  SelectOption as ASelectOption,
  Textarea as ATextarea,
  Tag as ATag,
  message,
  Popconfirm as APopconfirm,
} from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';
import dayjs, { Dayjs } from 'dayjs';
import { 
  queryMilestone, 
  createMilestone, 
  updateMilestone, 
  deleteMilestone,
  type MilestoneEntity 
} from '#/api/core/milestone';

// Types
// Frontend Milestone interface (transformed from backend entity)
interface Milestone {
  id: number;
  title: string;
  date: string;
  endDate?: string;
  description: string;
  type: string; // Backend is string, flexible
  tags: string[];
}

interface FormState {
  id?: number;
  title: string;
  date?: Dayjs;
  endDate?: Dayjs;
  description: string;
  type: string;
  tags: string; // Changed from string[] to string for Input
}

// Data
const milestones = ref<Milestone[]>([]);
const loading = ref(false);

// Filters
const filters = ref({
  keyword: '',
  type: undefined as string | undefined,
  tag: undefined as string | undefined,
  dateRange: undefined as [Dayjs, Dayjs] | undefined,
});

// Modal & Form
const modalVisible = ref(false);
const formRef = ref();
const modalTitle = ref('添加里程碑');
const submitLoading = ref(false);

const formState = ref<FormState>({
  title: '',
  date: undefined,
  endDate: undefined,
  description: '',
  type: 'life',
  tags: '',
});

const rules: Record<string, Rule[]> = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
};

// Computed
const allTags = computed(() => {
  const tags = new Set<string>();
  milestones.value.forEach((m) => m.tags.forEach((t) => tags.add(t)));
  return [...tags];
});

const filteredMilestones = computed(() => {
  return milestones.value
    .filter((item) => {
      // Keyword
      if (filters.value.keyword) {
        const kw = filters.value.keyword.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(kw);
        const matchDesc = item.description.toLowerCase().includes(kw);
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(kw));
        if (!matchTitle && !matchDesc && !matchTags) return false;
      }

      // Type
      if (filters.value.type && item.type !== filters.value.type) return false;

      // Tag
      if (filters.value.tag && !item.tags.includes(filters.value.tag))
        return false;

      // Date Range
      if (filters.value.dateRange) {
        const [start, end] = filters.value.dateRange;
        const itemDate = dayjs(item.date);
        if (itemDate.isBefore(start, 'day') || itemDate.isAfter(end, 'day')) {
          return false;
        }
      }

      return true;
    })
    .toSorted((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
});

const groupedMilestones = computed(() => {
  const groups: { items: Milestone[]; yearMonth: string }[] = [];

  filteredMilestones.value.forEach((item) => {
    const yearMonth = dayjs(item.date).format('YYYY年MM月');
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.yearMonth === yearMonth) {
      lastGroup.items.push(item);
    } else {
      groups.push({ yearMonth, items: [item] });
    }
  });

  return groups;
});

// 加载数据
const loadData = async () => {
  try {
    loading.value = true;
    const res = await queryMilestone();
    // Transform backend entity to frontend interface
    milestones.value = res.map((item) => {
      let tags: string[] = [];
      try {
        if (item.tags) {
          tags = JSON.parse(item.tags);
        }
      } catch {
        // Fallback if not JSON
        tags = item.tags ? [item.tags] : [];
      }

      return {
        id: item.id!,
        title: item.title,
        date: item.date,
        endDate: item.end_date,
        description: item.description || '',
        type: item.type,
        tags,
      };
    });
  } catch (error) {
    console.error('Failed to load milestones:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});

// Methods
const handleAdd = () => {
  modalTitle.value = '添加里程碑';
  formState.value = {
    title: '',
    date: dayjs(),
    endDate: undefined,
    description: '',
    type: 'life',
    tags: '',
  };
  modalVisible.value = true;
};

const handleEdit = (item: Milestone) => {
  modalTitle.value = '编辑里程碑';
  formState.value = {
    id: item.id,
    title: item.title,
    date: dayjs(item.date),
    endDate: item.endDate ? dayjs(item.endDate) : undefined,
    description: item.description,
    type: item.type,
    tags: item.tags.join(', '),
  };
  modalVisible.value = true;
};

const handleDelete = async (id: number) => {
  try {
    await deleteMilestone([id]);
    loadData();
  } catch (error) {
    console.error('Failed to delete milestone:', error);
  }
};

const handleSave = async () => {
  try {
    await formRef.value.validate();
    submitLoading.value = true;

    const payload: MilestoneEntity = {
      id: formState.value.id,
      title: formState.value.title,
      date: formState.value.date!.format('YYYY-MM-DD'),
      end_date: formState.value.endDate?.format('YYYY-MM-DD'),
      description: formState.value.description,
      type: formState.value.type,
      tags: JSON.stringify(
        formState.value.tags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
      ),
    };

    if (formState.value.id) {
      await updateMilestone(payload);
    } else {
      await createMilestone(payload);
    }

    modalVisible.value = false;
    loadData();
  } catch (error) {
    console.error('Validate Failed:', error);
  } finally {
    submitLoading.value = false;
  }
};

const clearFilters = () => {
  filters.value = {
    keyword: '',
    type: undefined,
    tag: undefined,
    dateRange: undefined,
  };
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'life': {
      return 'bg-orange-500';
    }
    case 'study': {
      return 'bg-blue-500';
    }
    case 'work': {
      return 'bg-green-500';
    }
    default: {
      return 'bg-gray-400';
    }
  }
};

const getTypeTagColor = (type: string) => {
  switch (type) {
    case 'life': {
      return 'orange';
    }
    case 'study': {
      return 'blue';
    }
    case 'work': {
      return 'green';
    }
    default: {
      return 'default';
    }
  }
};

const getTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    work: '工作',
    study: '学业',
    life: '生活',
    other: '其他',
  };
  return map[type] || type;
};
</script>

<template>
  <div class="min-h-full p-4">
    <!-- Header -->
    <div class="mb-6 flex items-end justify-between">
      <div>
        <p class="mt-1 text-gray-500">记录人生旅途中的关键节点与成就</p>
      </div>
      <AButton type="primary" size="large" @click="handleAdd">
        <template #icon><PlusOutlined /></template>
        添加里程碑
      </AButton>
    </div>

    <!-- Filters -->
    <div
      class="mb-8 rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#151515]"
    >
      <div class="flex flex-wrap items-center gap-4">
        <AInput
          v-model:value="filters.keyword"
          placeholder="搜索标题、描述、标签..."
          class="w-64"
          allow-clear
        >
          <template #prefix><SearchOutlined class="text-gray-400" /></template>
        </AInput>

        <ASelect
          v-model:value="filters.type"
          placeholder="事件类型"
          class="w-32"
          allow-clear
        >
          <ASelectOption value="work">工作</ASelectOption>
          <ASelectOption value="study">学业</ASelectOption>
          <ASelectOption value="life">生活</ASelectOption>
          <ASelectOption value="other">其他</ASelectOption>
        </ASelect>

        <ASelect
          v-model:value="filters.tag"
          placeholder="标签筛选"
          class="w-32"
          allow-clear
        >
          <ASelectOption v-for="tag in allTags" :key="tag" :value="tag">
            {{ tag }}
          </ASelectOption>
        </ASelect>

        <ARangePicker v-model:value="filters.dateRange" class="w-64" />

        <AButton @click="clearFilters">清除筛选</AButton>
      </div>
    </div>

    <!-- Timeline -->
    <div v-if="groupedMilestones.length > 0">
      <div
        v-for="group in groupedMilestones"
        :key="group.yearMonth"
        class="relative mb-8"
      >
        <!-- Month Header -->
        <div class="mb-6 flex items-center pl-3">
          <div class="mr-3 h-6 w-1 rounded-full bg-blue-500"></div>
          <h2 class="text-lg font-bold text-gray-700 dark:text-gray-200">
            {{ group.yearMonth }}
          </h2>
        </div>

        <!-- Items -->
        <div class="space-y-4 border-l-2 border-gray-200 dark:border-gray-700 ml-3">
          <div
            v-for="item in group.items"
            :key="item.id"
            class="relative pl-8 py-2 group"
          >
            <!-- Dot -->
            <div
              class="absolute left-[-9px] top-6 w-4 h-4 rounded-full border-2 border-white dark:border-[#151515] shadow-sm z-10"
              :class="getTypeColor(item.type)"
            ></div>

            <!-- Card -->
            <div
              class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-[#151515]"
            >
              <div class="mb-2 flex items-start justify-between">
                <div class="flex items-center gap-2">
                  <h3
                    class="text-lg font-bold text-gray-800 dark:text-gray-100"
                  >
                    {{ item.title }}
                  </h3>
                  <ATag :color="getTypeTagColor(item.type)">
                    {{ getTypeLabel(item.type) }}
                  </ATag>
                </div>
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <AButton 
                    type="text" 
                    size="small" 
                    @click.stop="handleEdit(item)"
                  >
                    <template #icon><EditOutlined /></template>
                  </AButton>
                  <APopconfirm
                    title="确定要删除这条记录吗？"
                    @confirm="handleDelete(item.id)"
                  >
                    <AButton 
                      type="text" 
                      danger 
                      size="small"
                    >
                      <template #icon><DeleteOutlined /></template>
                    </AButton>
                  </APopconfirm>
                </div>
              </div>

              <div class="mb-3 font-mono text-sm text-gray-400">
                {{ item.date }}
                <span v-if="item.endDate"> - {{ item.endDate }}</span>
              </div>

              <div
                class="mb-3 flex gap-2"
                v-if="item.tags && item.tags.length > 0"
              >
                <span
                  v-for="tag in item.tags"
                  :key="tag"
                  class="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800"
                >
                  {{ tag }}
                </span>
              </div>

              <p class="leading-relaxed text-gray-600 dark:text-gray-400">
                {{ item.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="py-20 text-center text-gray-400">
      <AEmpty description="暂无相关大事记" />
    </div>

    <!-- Add/Edit Modal -->
    <AModal
      v-model:open="modalVisible"
      :title="modalTitle"
      :confirm-loading="submitLoading"
      @ok="handleSave"
    >
      <AForm
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="vertical"
        class="mt-4"
      >
        <AFormItem label="标题" name="title">
          <AInput
            v-model:value="formState.title"
            placeholder="请输入里程碑标题"
            allow-clear
          />
        </AFormItem>

        <div class="flex gap-4">
          <AFormItem label="日期" name="date" class="flex-1">
            <ADatePicker
              v-model:value="formState.date"
              class="w-full"
              placeholder="选择日期"
            />
          </AFormItem>

          <AFormItem label="结束日期" name="endDate" class="flex-1">
            <ADatePicker
              v-model:value="formState.endDate"
              class="w-full"
              placeholder="可选"
            />
          </AFormItem>
        </div>

        <AFormItem label="类型" name="type">
          <ASelect v-model:value="formState.type" placeholder="请选择类型">
            <ASelectOption value="work">工作</ASelectOption>
            <ASelectOption value="study">学业</ASelectOption>
            <ASelectOption value="life">生活</ASelectOption>
            <ASelectOption value="other">其他</ASelectOption>
          </ASelect>
        </AFormItem>

        <AFormItem label="标签" name="tags">
          <AInput
            v-model:value="formState.tags"
            placeholder="请输入标签，多个标签请用逗号分隔"
            allow-clear
          />
        </AFormItem>

        <AFormItem label="描述" name="description">
          <ATextarea
            v-model:value="formState.description"
            :rows="4"
            placeholder="请输入详细描述..."
            allow-clear
          />
        </AFormItem>
      </AForm>
    </AModal>
  </div>
</template>

<style scoped>
/* Custom timeline styling if needed */
</style>
