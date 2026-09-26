<script setup lang="ts">
import type { VNode } from 'vue';

import { computed, ref, useAttrs, watch, watchEffect } from 'vue';

import { usePagination } from '@vben/hooks';
import {
  EmptyIcon,
  Grip,
  listIcons,
  LoaderCircle,
  RotateCw,
} from '@vben/icons';
import { $t } from '@vben/locales';

import {
  Button,
  Input,
  Pagination,
  PaginationEllipsis,
  PaginationFirst,
  PaginationLast,
  PaginationList,
  PaginationListItem,
  PaginationNext,
  PaginationPrev,
  VbenIcon,
  VbenIconButton,
  VbenPopover,
} from '@vben-core/shadcn-ui';
import { isFunction } from '@vben-core/shared/utils';

import { objectOmit, refDebounced } from '@vueuse/core';

import { fetchIconsData } from './icons';

interface Props {
  pageSize?: number;
  /** 图标集的名字 */
  prefix?: string;
  /** 是否自动请求API以获得图标集的数据.提供prefix时有效 */
  autoFetchApi?: boolean;
  /**
   * 图标列表
   */
  icons?: string[];
  /** Input组件 */
  inputComponent?: VNode;
  /** 图标插槽名，预览图标将被渲染到此插槽中 */
  iconSlot?: string;
  /** input组件的值属性名称 */
  modelValueProp?: string;
  /** 图标样式 */
  iconClass?: string;
  type?: 'icon' | 'input';
}

const props = withDefaults(defineProps<Props>(), {
  prefix: 'ant-design',
  pageSize: 36,
  icons: () => [],
  iconSlot: 'default',
  iconClass: 'size-4',
  autoFetchApi: true,
  modelValueProp: 'modelValue',
  inputComponent: undefined,
  type: 'input',
});

const emit = defineEmits<{
  change: [string];
}>();

const attrs = useAttrs();

const modelValue = defineModel({ default: '', type: String });

const visible = ref(false);
const currentSelect = ref('');
const keyword = ref('');
const keywordDebounce = refDebounced(keyword, 300);
const innerIcons = ref<string[]>([]);
const loading = ref(false);
const loadFailed = ref(false);
let requestVersion = 0;
const needsFetch = computed(() =>
  Boolean(
    props.prefix &&
    props.prefix !== 'svg' &&
    props.autoFetchApi &&
    props.icons.length === 0,
  ),
);

async function loadIcons() {
  if (!needsFetch.value || loading.value) return;
  const version = ++requestVersion;
  loading.value = true;
  loadFailed.value = false;
  try {
    const icons = await fetchIconsData(props.prefix);
    if (version === requestVersion) innerIcons.value = icons;
  } catch {
    if (version === requestVersion) loadFailed.value = true;
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}

watch([() => props.prefix, needsFetch], () => {
  requestVersion++;
  innerIcons.value = [];
  loading.value = false;
  loadFailed.value = false;
  if (visible.value) void loadIcons();
});

watch(visible, (opened) => {
  if (opened && innerIcons.value.length === 0) void loadIcons();
});

const currentList = computed(() => {
  try {
    if (props.icons.length > 0) return props.icons;
    if (props.prefix) {
      if (
        props.prefix !== 'svg' &&
        props.autoFetchApi &&
        props.icons.length === 0
      ) {
        return innerIcons.value;
      }
      const icons = listIcons('', props.prefix);
      if (icons.length === 0) {
        console.warn(`No icons found for prefix: ${props.prefix}`);
      }
      return icons;
    } else {
      return props.icons;
    }
  } catch (error) {
    console.error('Failed to load icons:', error);
    return [];
  }
});

const showList = computed(() => {
  return currentList.value.filter((item) =>
    item.includes(keywordDebounce.value),
  );
});

const { paginationList, total, setCurrentPage, currentPage } = usePagination(
  showList,
  props.pageSize,
);

watchEffect(() => {
  currentSelect.value = modelValue.value;
});

watch(
  () => currentSelect.value,
  (v) => {
    emit('change', v);
  },
);

const handleClick = (icon: string) => {
  currentSelect.value = icon;
  modelValue.value = icon;
  close();
};

const handlePageChange = (page: number) => {
  setCurrentPage(page);
};

function toggleOpenState() {
  visible.value = !visible.value;
}

function open() {
  visible.value = true;
}

function close() {
  visible.value = false;
}

function onKeywordChange(v: string) {
  keyword.value = v;
}

const searchInputProps = computed(() => {
  return {
    placeholder: $t('ui.iconPicker.search'),
    [props.modelValueProp]: keyword.value,
    [`onUpdate:${props.modelValueProp}`]: onKeywordChange,
    class: 'mx-2',
  };
});

function updateCurrentSelect(v: string) {
  currentSelect.value = v;
  const eventKey = `onUpdate:${props.modelValueProp}`;
  if (attrs[eventKey] && isFunction(attrs[eventKey])) {
    attrs[eventKey](v);
  }
}
const getBindAttrs = computed(() => {
  return objectOmit(attrs, [`onUpdate:${props.modelValueProp}`]);
});

defineExpose({ toggleOpenState, open, close });
</script>
<template>
  <VbenPopover
    v-model:open="visible"
    :content-props="{ align: 'end', alignOffset: -11, sideOffset: 8 }"
    content-class="p-0 pt-3 w-full"
    trigger-class="w-full"
  >
    <template #trigger>
      <template v-if="props.type === 'input'">
        <component
          v-if="props.inputComponent"
          :is="inputComponent"
          :[modelValueProp]="currentSelect"
          :placeholder="$t('ui.iconPicker.placeholder')"
          role="combobox"
          :aria-label="$t('ui.iconPicker.placeholder')"
          aria-expanded="visible"
          :[`onUpdate:${modelValueProp}`]="updateCurrentSelect"
          v-bind="getBindAttrs"
        >
          <template #[iconSlot]>
            <VbenIcon
              :icon="currentSelect || Grip"
              class="size-4"
              aria-hidden="true"
            />
          </template>
        </component>
        <div class="relative w-full" v-else>
          <Input
            v-bind="$attrs"
            v-model="currentSelect"
            :placeholder="$t('ui.iconPicker.placeholder')"
            class="h-8 w-full pr-8"
            role="combobox"
            :aria-label="$t('ui.iconPicker.placeholder')"
            aria-expanded="visible"
          />
          <VbenIcon
            :icon="currentSelect || Grip"
            class="absolute right-1 top-1 size-6"
            aria-hidden="true"
          />
        </div>
      </template>
      <VbenIcon
        :icon="currentSelect || Grip"
        v-else
        class="size-4"
        v-bind="$attrs"
      />
    </template>
    <div class="mb-2 flex w-full">
      <component
        v-if="inputComponent"
        :is="inputComponent"
        v-bind="searchInputProps"
      />
      <Input
        v-else
        class="mx-2 h-8 w-full"
        :placeholder="$t('ui.iconPicker.search')"
        v-model="keyword"
      />
    </div>

    <div
      v-if="loading"
      class="flex-center min-h-[150px] w-full"
      role="status"
      :aria-label="$t('ui.iconPicker.loading')"
    >
      <LoaderCircle class="size-5 animate-spin" />
    </div>
    <div
      v-else-if="loadFailed"
      class="flex-col-center text-muted-foreground min-h-[150px] w-full gap-2"
    >
      <span class="text-sm" role="alert">{{
        $t('ui.iconPicker.loadFailed')
      }}</span>
      <VbenIconButton
        :aria-label="$t('ui.iconPicker.retry')"
        :tooltip="$t('ui.iconPicker.retry')"
        @click="loadIcons"
      >
        <RotateCw class="size-4" />
      </VbenIconButton>
    </div>
    <template v-else-if="paginationList.length > 0">
      <div class="grid max-h-[360px] w-full grid-cols-6 justify-items-center">
        <VbenIconButton
          v-for="(item, index) in paginationList"
          :key="index"
          :tooltip="item"
          tooltip-side="top"
          @click="handleClick(item)"
        >
          <VbenIcon
            :class="{
              'text-primary transition-all': currentSelect === item,
            }"
            :icon="item"
          />
        </VbenIconButton>
      </div>
      <div
        v-if="total >= pageSize"
        class="flex-center flex justify-end overflow-hidden border-t py-2 pr-3"
      >
        <Pagination
          :items-per-page="36"
          :sibling-count="1"
          :total="total"
          show-edges
          size="small"
          @update:page="handlePageChange"
        >
          <PaginationList
            v-slot="{ items }"
            class="flex w-full items-center gap-1"
          >
            <PaginationFirst class="size-5" />
            <PaginationPrev class="size-5" />
            <template v-for="(item, index) in items">
              <PaginationListItem
                v-if="item.type === 'page'"
                :key="index"
                :value="item.value"
                as-child
              >
                <Button
                  :variant="item.value === currentPage ? 'default' : 'outline'"
                  class="size-5 p-0 text-sm"
                >
                  {{ item.value }}
                </Button>
              </PaginationListItem>
              <PaginationEllipsis
                v-else
                :key="item.type"
                :index="index"
                class="size-5"
              />
            </template>
            <PaginationNext class="size-5" />
            <PaginationLast class="size-5" />
          </PaginationList>
        </Pagination>
      </div>
    </template>

    <template v-else>
      <div class="flex-col-center text-muted-foreground min-h-[150px] w-full">
        <EmptyIcon class="size-10" />
        <div class="mt-1 text-sm">{{ $t('common.noData') }}</div>
      </div>
    </template>
  </VbenPopover>
</template>
