<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

import { LoadingOutlined, UploadOutlined } from '@ant-design/icons-vue';
import { message, Upload } from 'ant-design-vue';

import { fetchAuthImageUrl } from '#/utils/file';

interface UploadResult {
  id: number | string;
  [key: string]: any;
}

const props = withDefaults(
  defineProps<{
    fileId?: null | number | string;
    fileIds?: (number | string)[];
    hint?: string;
    maxCount?: number;
    uploadFn: (file: File) => Promise<UploadResult>;
  }>(),
  {
    maxCount: 1,
    hint: 'ctrl + v 上传图片',
    fileId: undefined,
    fileIds: undefined,
  },
);

const emit = defineEmits<{
  'update:fileId': [value: null | number | string];
  'update:fileIds': [value: (number | string)[]];
}>();

const fileList = ref<any[]>([]);
const uploading = ref(false);
const previewLoading = ref(false);
const isMulti = props.maxCount > 1;
let previewRequestId = 0;

const buildFileItem = async (id: number | string) => {
  const url = await fetchAuthImageUrl(id);
  return {
    uid: String(id),
    name: `image-${id}`,
    status: 'done',
    url,
    response: { id },
  };
};

const syncExistingFiles = async (ids: (number | string)[]) => {
  const requestId = ++previewRequestId;
  if (ids.length === 0) {
    fileList.value = [];
    previewLoading.value = false;
    return;
  }

  fileList.value = [];
  previewLoading.value = true;
  try {
    const items = await Promise.all(ids.map((id) => buildFileItem(id)));
    if (requestId === previewRequestId) fileList.value = items;
  } catch {
    if (requestId === previewRequestId) fileList.value = [];
  } finally {
    if (requestId === previewRequestId) previewLoading.value = false;
  }
};

const syncSingle = async (id?: null | number | string) => {
  await syncExistingFiles(id ? [id] : []);
};

const syncMulti = async (ids?: (number | string)[]) => {
  await syncExistingFiles(ids ?? []);
};

watch(
  () => props.fileId,
  (id) => !isMulti && syncSingle(id),
  { immediate: true },
);
watch(
  () => props.fileIds,
  (ids) => isMulti && syncMulti(ids),
  { immediate: true },
);

const emitFromFileList = (list: any[]) => {
  if (isMulti) {
    const ids = list
      .filter((f) => f.status === 'done')
      .map((f) => f.response?.id)
      .filter(Boolean);
    emit('update:fileIds', ids);
  } else {
    const done = list.find((f) => f.status === 'done');
    emit('update:fileId', done?.response?.id ?? null);
  }
};

const handleChange = (info: { file: any; fileList: any[] }) => {
  fileList.value = info.fileList;
  if (info.file.status === 'done') {
    emitFromFileList(info.fileList);
  } else if (info.file.status === 'removed') {
    emitFromFileList(info.fileList);
  }
};

const customRequest = async (options: any) => {
  const { file, onSuccess, onError, onProgress } = options;
  try {
    uploading.value = true;
    onProgress({ percent: 50 });
    const res = await props.uploadFn(file);
    onProgress({ percent: 100 });
    onSuccess(res);
  } catch (error) {
    onError(error);
  } finally {
    uploading.value = false;
  }
};

const rootRef = ref<HTMLElement>();

const handlePaste = async (e: ClipboardEvent) => {
  if (!rootRef.value || rootRef.value.offsetParent === null) return;

  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) continue;
      try {
        uploading.value = true;
        const res = await props.uploadFn(file);
        const newItem = await buildFileItem(res.id);
        if (isMulti) {
          fileList.value = [...fileList.value, newItem];
          emitFromFileList(fileList.value);
        } else {
          fileList.value = [newItem];
          emit('update:fileId', res.id);
        }
        message.success('上传成功');
      } catch {
        // 全局拦截器已提示
      } finally {
        uploading.value = false;
      }
      return;
    }
  }
};

onMounted(() => document.addEventListener('paste', handlePaste));
onUnmounted(() => document.removeEventListener('paste', handlePaste));
</script>

<template>
  <div ref="rootRef">
    <Upload
      v-model:file-list="fileList"
      list-type="picture-card"
      accept="image/*"
      :max-count="maxCount"
      :custom-request="customRequest"
      :disabled="previewLoading"
      @change="handleChange"
    >
      <div
        v-if="fileList.length < maxCount"
        class="flex h-full flex-col items-center"
      >
        <div class="flex flex-1 items-center justify-center">
          <LoadingOutlined
            v-if="uploading || previewLoading"
            spin
            class="text-lg"
          />
          <UploadOutlined v-else class="text-lg" />
        </div>
        <div
          v-if="fileList.length === 0 && hint && !previewLoading"
          class="pb-0.5 text-[10px] text-gray-400"
        >
          {{ hint }}
        </div>
      </div>
    </Upload>
  </div>
</template>

<style scoped>
:deep(.ant-upload-list-item-thumbnail img) {
  animation: image-preview-fade-in 0.2s ease-out;
}

@keyframes image-preview-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  :deep(.ant-upload-list-item-thumbnail img) {
    animation: none;
  }
}
</style>
