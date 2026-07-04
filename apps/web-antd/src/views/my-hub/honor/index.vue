<script setup lang="ts">
import type { Rule } from 'ant-design-vue/es/form';

import type { HonorCategoryEntity, HonorRecordEntity } from '#/api/core/honor';

import { computed, onMounted, ref } from 'vue';

import { CalendarOutlined, SearchOutlined } from '@ant-design/icons-vue';
import {
  Button as AButton,
  DatePicker as ADatePicker,
  Empty as AEmpty,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  Modal as AModal,
  Select as ASelect,
  SelectOption as ASelectOption,
  Spin as ASpin,
  Switch as ASwitch,
  Tag as ATag,
  Textarea as ATextarea,
  message,
} from 'ant-design-vue';
import dayjs, { Dayjs } from 'dayjs';

import { fetchAuthImageUrl } from '#/utils/file';
import {
  createHonorRecord,
  deleteHonorRecords,
  queryHonorCategories,
  queryHonorRecords,
  updateHonorRecord,
  uploadHonorAttachment,
} from '#/api/core/honor';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';
import ImageUpload from '#/components/ImageUpload.vue';

// Types
interface Honor {
  id: number;
  title: string;
  description: string;
  honorDate: string;
  issuer: string;
  level: string;
  categoryId?: number;
  categoryName: string;
  customCategory?: string;
  tags: string[];
  attachments: string[];
  fileIds: string[];
  isTop: boolean;
  isPublic: boolean;
}

interface FormState {
  id?: number;
  title: string;
  description: string;
  honorDate?: Dayjs;
  issuer: string;
  level?: string;
  categoryId?: number;
  customCategory: string;
  tags: string;
  fileIds: string[];
  isPublic: boolean;
}

// Data
const honors = ref<Honor[]>([]);
const categories = ref<HonorCategoryEntity[]>([]);
const loading = ref(false);

// Filters
const filters = ref({
  keyword: '',
  categoryId: undefined as number | undefined,
  level: undefined as string | undefined,
});

// Modal & Form
const modalVisible = ref(false);
const formRef = ref();
const modalTitle = ref('添加荣誉');
const submitLoading = ref(false);

const formState = ref<FormState>({
  title: '',
  description: '',
  honorDate: undefined,
  issuer: '',
  level: undefined,
  categoryId: undefined,
  customCategory: '',
  tags: '',
  fileIds: [],
  isPublic: true,
});

const rules: Record<string, Rule[]> = {
  title: [{ required: true, message: '请输入荣誉标题', trigger: 'blur' }],
  honorDate: [{ required: true, message: '请选择获得日期', trigger: 'change' }],
};

// Computed
const filteredHonors = computed(() => {
  return honors.value
    .filter((item) => {
      if (filters.value.keyword) {
        const kw = filters.value.keyword.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(kw);
        const matchDesc = item.description?.toLowerCase().includes(kw);
        const matchIssuer = item.issuer?.toLowerCase().includes(kw);
        const matchTags = item.tags.some((t) => t.toLowerCase().includes(kw));
        if (!matchTitle && !matchDesc && !matchIssuer && !matchTags)
          return false;
      }

      if (
        filters.value.categoryId &&
        item.categoryId !== filters.value.categoryId
      )
        return false;

      if (filters.value.level && item.level !== filters.value.level)
        return false;

      return true;
    })
    .toSorted((a, b) => {
      if (a.isTop !== b.isTop) return b.isTop ? 1 : -1;
      return dayjs(b.honorDate).valueOf() - dayjs(a.honorDate).valueOf();
    });
});

// 加载数据
const loadData = async () => {
  try {
    loading.value = true;
    const [honorsRes, categoriesRes] = await Promise.all([
      queryHonorRecords(),
      queryHonorCategories(),
    ]);

    // 加载分类
    categories.value = categoriesRes;

    // Transform backend entity to frontend interface
    // 预加载所有认证图片 URL
    const authUrlPromises: Promise<string>[] = [];
    const allFileIds: number[][] = [];

    honorsRes.forEach((item) => {
      if (item.files) {
        const ids = item.files.map((f: any) => f.id);
        allFileIds.push(ids);
        ids.forEach((id) => authUrlPromises.push(fetchAuthImageUrl(id)));
      } else {
        allFileIds.push([]);
      }
    });

    const authUrls = await Promise.all(authUrlPromises);
    let urlIdx = 0;

    honors.value = honorsRes.map((item, i) => {
      let tags: string[] = [];
      let attachments: string[] = [];
      let fileIds: number[] = [];

      try {
        if (item.tags) {
          tags = JSON.parse(item.tags);
        }
      } catch {
        tags = item.tags ? [item.tags] : [];
      }

      if (item.files) {
        fileIds = item.files.map((f: any) => f.id);
        attachments = allFileIds[i].map(() => authUrls[urlIdx++]);
      }

      // 获取分类名称
      let categoryName = item.customCategory || '';
      if (item.categoryId) {
        const category = categories.value.find((c) => c.id === item.categoryId);
        if (category) {
          categoryName = category.name || '';
        }
      }

      return {
        id: item.id!,
        title: item.title,
        description: item.description || '',
        honorDate: item.honorDate,
        issuer: item.issuer || '',
        level: item.level || '',
        categoryId: item.categoryId,
        categoryName,
        customCategory: item.customCategory,
        tags,
        attachments,
        fileIds,
        isTop: item.isTop === 1,
        isPublic: item.isPublic === 1,
      };
    });
  } catch (error) {
    console.error('Failed to load honors:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadData();
});

// Methods
const handleAdd = () => {
  modalTitle.value = '添加荣誉';
  formState.value = {
    title: '',
    description: '',
    honorDate: undefined,
    issuer: '',
    level: undefined,
    categoryId: undefined,
    customCategory: '',
    tags: '',
    fileIds: [],
    isPublic: true,
  };
  modalVisible.value = true;
};

const handleEdit = (item: Honor) => {
  modalTitle.value = '编辑荣誉';
  formState.value = {
    id: item.id,
    title: item.title,
    description: item.description,
    honorDate: item.honorDate ? dayjs(item.honorDate) : undefined,
    issuer: item.issuer,
    level: item.level || undefined,
    categoryId: item.categoryId,
    customCategory: item.customCategory || '',
    tags: item.tags.join(', '),
    fileIds: item.fileIds || [],
    isPublic: item.isPublic,
  };
  modalVisible.value = true;
};

const handleDelete = async (id: number) => {
  try {
    await deleteHonorRecords([id]);
    message.success('删除成功');
    loadData();
  } catch (error) {
    console.error('Failed to delete honor:', error);
    message.error('删除失败');
  }
};

const handleSave = async () => {
  try {
    await formRef.value.validate();
    submitLoading.value = true;

    const payload: HonorRecordEntity = {
      id: formState.value.id,
      title: formState.value.title,
      description: formState.value.description,
      honorDate: formState.value.honorDate!.format('YYYY-MM-DD'),
      issuer: formState.value.issuer,
      level: formState.value.level,
      categoryId: formState.value.categoryId,
      customCategory: formState.value.customCategory || undefined,
      tags: JSON.stringify(
        formState.value.tags
          .split(/[,，]/)
          .map((t) => t.trim())
          .filter(Boolean),
      ),
      fileIds: formState.value.fileIds,
      isPublic: formState.value.isPublic ? 1 : 0,
    };

    if (formState.value.id) {
      await updateHonorRecord(payload);
      message.success('更新成功');
    } else {
      await createHonorRecord(payload);
      message.success('添加成功');
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
    categoryId: undefined,
    level: undefined,
  };
};

// 荣誉级别：英文键 → 中文标签
const levelLabels: Record<string, string> = {
  school: '校级',
  district: '区级',
  city: '市级',
  province: '省级',
  national: '国家级',
  international: '国际级',
  other: '其他',
};

// 荣誉级别：英文键 → 颜色
const levelColors: Record<string, string> = {
  school: 'green',
  district: 'cyan',
  city: 'blue',
  province: 'purple',
  national: 'volcano',
  international: 'gold',
  other: 'default',
};

const getLevelColor = (level: string) => {
  return levelColors[level] || 'default';
};

const getLevelLabel = (level: string) => {
  return levelLabels[level] || level || '';
};
</script>

<template>
  <div class="min-h-full bg-background/50 p-4">
    <!-- Header -->
    <div class="mb-6">
      <div>
        <p class="text-gray-500">记录世俗标准下的荣誉与成就</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-8 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div class="flex flex-wrap items-center gap-4">
        <AInput
          v-model:value="filters.keyword"
          placeholder="搜索标题、描述、机构..."
          class="w-64"
          allow-clear
        >
          <template #prefix><SearchOutlined class="text-gray-400" /></template>
        </AInput>

        <ASelect
          v-model:value="filters.categoryId"
          placeholder="分类筛选"
          class="w-40"
          allow-clear
        >
          <ASelectOption
            v-for="cat in categories"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.icon }} {{ cat.name }}
          </ASelectOption>
        </ASelect>

        <ASelect
          v-model:value="filters.level"
          placeholder="级别筛选"
          class="w-32"
          allow-clear
        >
          <ASelectOption value="school">校级</ASelectOption>
          <ASelectOption value="district">区级</ASelectOption>
          <ASelectOption value="city">市级</ASelectOption>
          <ASelectOption value="province">省级</ASelectOption>
          <ASelectOption value="national">国家级</ASelectOption>
          <ASelectOption value="international">国际级</ASelectOption>
          <ASelectOption value="other">其他</ASelectOption>
        </ASelect>

        <AButton @click="clearFilters">重置</AButton>
      </div>
    </div>

    <!-- Card Grid -->
    <ASpin :spinning="loading">
      <div
        v-if="filteredHonors.length === 0 && !loading"
        class="py-20 text-center text-gray-400"
      >
        <AEmpty description="暂无荣誉记录" />
      </div>

      <div
        v-else
        class="grid grid-cols-2 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <div
          v-for="item in filteredHonors"
          :key="item.id"
          class="apple-card group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border bg-card p-4 sm:p-6"
          @click="handleEdit(item)"
          @contextmenu.prevent="handleDelete(item.id)"
        >
          <!-- Card Header -->
          <div>
            <div class="mb-3 flex items-start justify-between">
              <div class="flex flex-wrap items-center gap-1.5">
                <ATag
                  v-if="item.level"
                  :color="getLevelColor(item.level)"
                  class="m-0 border-0 font-medium"
                >
                  {{ getLevelLabel(item.level) }}
                </ATag>
                <ATag
                  v-if="item.categoryName"
                  color="processing"
                  class="m-0 border-0 font-medium"
                >
                  {{ item.categoryName }}
                </ATag>
              </div>
              <div v-if="item.isTop" class="flex items-center gap-1">
                <span class="text-xs text-yellow-500">🏆 置顶</span>
              </div>
            </div>

            <h3
              class="mb-2 line-clamp-2 text-lg font-bold text-card-foreground"
              :title="item.title"
            >
              {{ item.title }}
            </h3>

            <!-- Tags -->
            <div
              class="mb-3 flex flex-wrap gap-1.5"
              v-if="item.tags && item.tags.length > 0"
            >
              <span
                v-for="tag in item.tags"
                :key="tag"
                class="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                #{{ tag }}
              </span>
            </div>

            <p
              class="mb-4 line-clamp-3 text-sm text-muted-foreground"
              v-if="item.description"
            >
              {{ item.description }}
            </p>
          </div>

          <!-- Card Footer -->
          <div class="mt-4">
            <div
              class="flex items-center justify-between text-xs text-muted-foreground"
            >
              <div class="flex items-center gap-1">
                <CalendarOutlined />
                <span>
                  {{ item.honorDate }}
                </span>
              </div>
              <div v-if="!item.isPublic" class="flex items-center">
                <ATag color="warning" class="m-0 text-xs">私密</ATag>
              </div>
            </div>
            <div
              v-if="item.issuer"
              class="mt-1 truncate text-xs text-muted-foreground"
            >
              🏢 {{ item.issuer }}
            </div>
          </div>
        </div>
      </div>
    </ASpin>

    <!-- Add/Edit Modal -->
    <AModal
      v-model:open="modalVisible"
      :confirm-loading="submitLoading"
      @ok="handleSave"
      width="600px"
    >
      <template #footer>
        <div class="flex justify-between">
          <AButton
            v-if="modalTitle === '编辑荣誉'"
            danger
            @click="handleDelete(formState.id!)"
          >
            删除
          </AButton>
          <div></div>
          <div class="flex gap-2">
            <AButton @click="modalVisible = false">取消</AButton>
            <AButton
              type="primary"
              :loading="submitLoading"
              @click="handleSave"
            >
              确定
            </AButton>
          </div>
        </div>
      </template>
      <AForm
        ref="formRef"
        :model="formState"
        :rules="rules"
        layout="horizontal"
      >
        <AFormItem label="标题" name="title">
          <AInput
            v-model:value="formState.title"
            placeholder="标题"
            allow-clear
          />
        </AFormItem>

        <div class="flex gap-4">
          <AFormItem label="获得日期" name="honorDate" class="flex-1">
            <ADatePicker
              v-model:value="formState.honorDate"
              class="w-full"
              placeholder="选择日期"
            />
          </AFormItem>

          <AFormItem label="荣誉级别" name="level" class="flex-1">
            <ASelect
              v-model:value="formState.level"
              placeholder="请选择级别"
              allow-clear
            >
              <ASelectOption value="school">校级</ASelectOption>
              <ASelectOption value="district">区级</ASelectOption>
              <ASelectOption value="city">市级</ASelectOption>
              <ASelectOption value="province">省级</ASelectOption>
              <ASelectOption value="national">国家级</ASelectOption>
              <ASelectOption value="international">国际级</ASelectOption>
              <ASelectOption value="other">其他</ASelectOption>
            </ASelect>
          </AFormItem>
        </div>

        <div class="flex gap-4">
          <AFormItem label="颁发机构" name="issuer" class="flex-1">
            <AInput
              v-model:value="formState.issuer"
              placeholder="颁发机构/组织"
              allow-clear
            />
          </AFormItem>

          <AFormItem label="分类" name="categoryId" class="flex-1">
            <ASelect
              v-model:value="formState.categoryId"
              placeholder="选择预设分类"
              allow-clear
            >
              <ASelectOption
                v-for="cat in categories"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.icon }} {{ cat.name }}
              </ASelectOption>
            </ASelect>
          </AFormItem>
        </div>

        <AFormItem label="自定义分类" name="customCategory">
          <AInput
            v-model:value="formState.customCategory"
            placeholder="不选择预设分类时可输入"
            allow-clear
          />
        </AFormItem>

        <AFormItem label="标签" name="tags">
          <AInput
            v-model:value="formState.tags"
            placeholder="多个标签用逗号分隔"
            allow-clear
          />
        </AFormItem>

        <AFormItem label="描述" name="description">
          <ATextarea
            v-model:value="formState.description"
            :rows="2"
            placeholder="详细描述..."
            allow-clear
          />
        </AFormItem>

        <AFormItem label="附件" name="fileIds">
          <ImageUpload
            v-model:file-ids="formState.fileIds"
            :upload-fn="uploadHonorAttachment"
            :max-count="5"
          />
        </AFormItem>

        <AFormItem label="公开" name="isPublic">
          <div class="flex items-center gap-2">
            <ASwitch v-model:checked="formState.isPublic" />
            <span class="text-sm text-gray-500">
              {{
                formState.isPublic ? '公开 - 其他用户可见' : '私密 - 仅自己可见'
              }}
            </span>
          </div>
        </AFormItem>
      </AForm>
    </AModal>

    <GlobalFloatBtn @click="handleAdd" />
  </div>
</template>

<style scoped>
.apple-card {
  border: 1px solid transparent;
  box-shadow:
    0 1px 3px rgb(0 0 0 / 8%),
    0 2px 6px rgb(0 0 0 / 4%);
  transform: scale(1);
  transition:
    transform 0.35s cubic-bezier(0.25, 0.1, 0.25, 1),
    box-shadow 0.35s cubic-bezier(0.25, 0.1, 0.25, 1),
    border-color 0.35s cubic-bezier(0.25, 0.1, 0.25, 1);
  will-change: transform, box-shadow;
}

.apple-card:hover {
  border-color: rgb(0 0 0 / 6%);
  box-shadow:
    0 4px 12px rgb(0 0 0 / 10%),
    0 8px 24px rgb(0 0 0 / 6%),
    0 16px 48px rgb(0 0 0 / 4%);
  transform: scale(1.005);
}

.line-clamp-2 {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.line-clamp-3 {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
}
</style>
