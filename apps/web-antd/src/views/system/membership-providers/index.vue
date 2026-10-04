<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';

import type {
  MembershipProviderIcon,
  MembershipProviderRequest,
  MembershipProviderVO,
} from '#/api/membership/providers';

import { computed, nextTick, onMounted, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Empty,
  Form,
  FormItem,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  SelectOption,
  Switch,
} from 'ant-design-vue';

import {
  createMembershipProvider,
  deleteMembershipProvider,
  queryManagedMembershipProviders,
  queryMembershipProviderIcons,
  updateMembershipProvider,
} from '#/api/membership/providers';
import { AppModal } from '#/components/app-modal';
import ContentLoading from '#/components/ContentLoading.vue';
import { CATEGORIES } from '#/views/membership/constants';
import MembershipLogo from '#/views/membership/MembershipLogo.vue';

const providers = ref<MembershipProviderVO[]>([]);
const icons = ref<MembershipProviderIcon[]>([]);
const loading = ref(false);
const failed = ref(false);
const iconsLoading = ref(false);
const iconsFailed = ref(false);
const keyword = ref('');
const category = ref<string>();
const busyIds = ref(new Set<string>());
const editorOpen = ref(false);
const saving = ref(false);
const editingId = ref<string>();
const formRef = ref<FormInstance>();
const emptyForm = (): MembershipProviderRequest => ({
  name: '',
  code: '',
  category: 'other',
  iconKey: null,
  sortOrder: 0,
  isEnabled: 1,
});
const form = ref(emptyForm());
const selectedIcon = computed({
  get: () => form.value.iconKey || undefined,
  set: (key: string | undefined) => {
    form.value.iconKey = key || null;
  },
});
const rules: Record<string, Rule[]> = {
  name: [{ required: true, whitespace: true, message: '请输入平台名称' }],
  code: [
    { required: true, message: '请输入平台编码' },
    {
      pattern: /^[a-z][a-z0-9_]{0,49}$/,
      message: '使用小写字母开头，可包含数字和下划线',
    },
  ],
  category: [{ required: true, message: '请选择分类' }],
  sortOrder: [{ required: true, message: '请输入排序' }],
};
const filtered = computed(() =>
  providers.value
    .filter(
      (item) =>
        (!category.value || item.category === category.value) &&
        (!keyword.value ||
          `${item.name} ${item.code}`
            .toLowerCase()
            .includes(keyword.value.toLowerCase())),
    )
    .toSorted(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    ),
);
const categoryLabel = (value: string) =>
  CATEGORIES.find((item) => item.value === value)?.label || '其他';

async function loadProviders() {
  if (loading.value) return;
  loading.value = true;
  failed.value = false;
  try {
    providers.value = await queryManagedMembershipProviders();
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}
async function loadIcons() {
  if (iconsLoading.value) return;
  iconsLoading.value = true;
  iconsFailed.value = false;
  try {
    icons.value = await queryMembershipProviderIcons();
  } catch {
    iconsFailed.value = true;
  } finally {
    iconsLoading.value = false;
  }
}
onMounted(loadProviders);

async function edit(provider?: MembershipProviderVO) {
  editingId.value = provider?.id;
  form.value = provider ? { ...provider } : emptyForm();
  editorOpen.value = true;
  if (icons.value.length === 0) void loadIcons();
  await nextTick();
  formRef.value?.clearValidate();
}
function replaceProvider(saved: MembershipProviderVO) {
  const index = providers.value.findIndex((item) => item.id === saved.id);
  if (index === -1) providers.value.push(saved);
  else providers.value.splice(index, 1, saved);
}
async function save() {
  if (!formRef.value || saving.value) return;
  saving.value = true;
  try {
    await formRef.value.validate();
    const saved = editingId.value
      ? await updateMembershipProvider(editingId.value, form.value)
      : await createMembershipProvider(form.value);
    replaceProvider(saved);
    editorOpen.value = false;
  } catch {
    /* 请求错误由全局拦截器处理，保留表单。 */
  } finally {
    saving.value = false;
  }
}
async function toggle(provider: MembershipProviderVO) {
  if (busyIds.value.has(provider.id)) return;
  busyIds.value.add(provider.id);
  try {
    const saved = await updateMembershipProvider(provider.id, {
      ...provider,
      isEnabled: provider.isEnabled === 1 ? 0 : 1,
    });
    replaceProvider(saved);
  } catch {
    /* 保留原启用状态。 */
  } finally {
    busyIds.value.delete(provider.id);
  }
}
async function remove(provider: MembershipProviderVO) {
  if (busyIds.value.has(provider.id)) return;
  busyIds.value.add(provider.id);
  try {
    await deleteMembershipProvider(provider.id);
    providers.value = providers.value.filter((item) => item.id !== provider.id);
  } catch {
    /* 后端校验引用关系，失败时保留原行。 */
  } finally {
    busyIds.value.delete(provider.id);
  }
}
</script>

<template>
  <div class="min-h-full bg-background/50 p-4">
    <div class="mx-auto max-w-5xl">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <Input
          v-model:value="keyword"
          class="min-w-0 flex-1 sm:max-w-72"
          placeholder="搜索平台"
          allow-clear
        />
        <Select
          v-model:value="category"
          class="w-28 sm:w-36"
          placeholder="分类"
          :options="CATEGORIES"
          allow-clear
        />
        <Button
          aria-label="刷新会员平台"
          :loading="loading"
          :disabled="loading"
          class="!h-11 !w-11"
          @click="loadProviders"
        >
          <template #icon>
            <IconifyIcon class="text-lg" icon="mdi:refresh" />
          </template>
        </Button>
        <Button
          type="primary"
          aria-label="新增会员平台"
          class="!h-11 !w-11"
          @click="edit()"
        >
          <template #icon>
            <IconifyIcon class="text-lg" icon="mdi:plus" />
          </template>
        </Button>
      </div>
      <ContentLoading v-if="loading" min-height="240px" />
      <div
        v-else-if="failed"
        class="flex items-center justify-center gap-2 py-12"
        role="alert"
      >
        加载失败<Button @click="loadProviders">重试</Button>
      </div>
      <Empty
        v-else-if="filtered.length === 0"
        description="暂无平台"
        class="py-12"
      />
      <ul v-else class="overflow-hidden rounded-xl bg-card px-3 sm:px-4">
        <li
          v-for="provider in filtered"
          :key="provider.id"
          class="flex items-center gap-3 py-3"
        >
          <MembershipLogo
            :icon-key="provider.iconKey"
            :category="provider.category"
            :name="provider.name"
          />
          <div class="min-w-0 flex-1">
            <div class="truncate font-medium text-card-foreground">
              {{ provider.name }}
            </div>
            <div class="truncate text-xs text-muted-foreground">
              {{ categoryLabel(provider.category) }} · {{ provider.code }}
            </div>
          </div>
          <Switch
            :checked="provider.isEnabled === 1"
            :loading="busyIds.has(provider.id)"
            :aria-label="`${provider.isEnabled === 1 ? '停用' : '启用'}${provider.name}`"
            @change="toggle(provider)"
          />
          <Button
            type="text"
            :aria-label="`编辑${provider.name}`"
            :disabled="busyIds.has(provider.id)"
            class="!h-11 !w-11"
            @click="edit(provider)"
          >
            <template #icon>
              <IconifyIcon class="text-lg" icon="mdi:pencil-outline" />
            </template>
          </Button>
          <Popconfirm
            :title="`确定删除「${provider.name}」？已被引用的平台只能停用。`"
            placement="topRight"
            :disabled="busyIds.has(provider.id)"
            @confirm="remove(provider)"
          >
            <Button
              type="text"
              danger
              :aria-label="`删除${provider.name}`"
              :loading="busyIds.has(provider.id)"
              class="!h-11 !w-11"
            >
              <template #icon>
                <IconifyIcon class="text-lg" icon="mdi:delete-outline" />
              </template>
            </Button>
          </Popconfirm>
        </li>
      </ul>
    </div>
    <AppModal
      v-model:open="editorOpen"
      :width="560"
      centered
      :confirm-loading="saving"
      @ok="save"
    >
      <Form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <FormItem label="平台名称" name="name">
            <Input v-model:value="form.name" :maxlength="100" />
          </FormItem>
          <FormItem label="平台编码" name="code">
            <Input
              v-model:value="form.code"
              placeholder="例如 tencent_video"
              :maxlength="50"
            />
          </FormItem>
          <FormItem label="分类" name="category">
            <Select v-model:value="form.category" :options="CATEGORIES" />
          </FormItem>
          <FormItem label="排序" name="sortOrder">
            <InputNumber
              v-model:value="form.sortOrder"
              class="!w-full"
              :min="0"
              :max="999999"
              :precision="0"
            />
          </FormItem>
        </div>
        <FormItem label="Logo" name="iconKey">
          <div class="flex items-center gap-3">
            <MembershipLogo
              :icon-key="form.iconKey"
              :category="form.category"
              :name="form.name"
            />
            <Select
              class="min-w-0 flex-1"
              v-model:value="selectedIcon"
              placeholder="分类默认图标"
              :loading="iconsLoading"
              :disabled="iconsLoading || iconsFailed"
              show-search
              option-filter-prop="label"
              allow-clear
            >
              <SelectOption
                v-for="icon in icons"
                :key="icon.key"
                :value="icon.key"
                :label="icon.name"
              >
                <span class="inline-flex items-center gap-2"
                  ><MembershipLogo
                    :icon-key="icon.key"
                    :name="icon.name"
                    class="!h-6 !w-6"
                  />{{ icon.name }}</span
                >
              </SelectOption>
            </Select>
          </div>
          <div
            v-if="iconsFailed"
            role="alert"
            class="mt-1 text-sm text-destructive"
          >
            图标加载失败<Button
              type="link"
              size="small"
              :loading="iconsLoading"
              @click="loadIcons"
            >
              重试
            </Button>
          </div>
        </FormItem>
        <FormItem label="启用" name="isEnabled">
          <Switch
            :checked="form.isEnabled === 1"
            aria-label="启用平台"
            @change="(checked) => (form.isEnabled = checked ? 1 : 0)"
          />
        </FormItem>
      </Form>
    </AppModal>
  </div>
</template>
