<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Upload, message } from 'ant-design-vue';
import { LoadingOutlined, UploadOutlined } from '@ant-design/icons-vue';
import { fetchAuthImageUrl } from '#/utils/file';

interface UploadResult {
  id: string | number;
  [key: string]: any;
}

const props = withDefaults(
  defineProps<{
    uploadFn: (file: File) => Promise<UploadResult>;
    fileId?: string | number | null;
    fileIds?: (string | number)[];
    maxCount?: number;
    hint?: string;
  }>(),
  {
    maxCount: 1,
    hint: 'ctrl + v 上传图片',
    fileId: undefined,
    fileIds: undefined,
  },
);

const emit = defineEmits<{
  'update:fileId': [value: string | number | null];
  'update:fileIds': [value: (string | number)[]];
}>();

const fileList = ref<any[]>([]);
const uploading = ref(false);
const isMulti = props.maxCount > 1;

const buildFileItem = async (id: string | number) => {
  const url = await fetchAuthImageUrl(id);
  return {
    uid: String(id),
    name: `image-${id}`,
    status: 'done',
    url,
    response: { id },
  };
};

const syncSingle = async (id?: string | number | null) => {
  if (id) {
    fileList.value = [await buildFileItem(id)];
  } else {
    fileList.value = [];
  }
};

const syncMulti = async (ids?: (string | number)[]) => {
  if (ids?.length) {
    fileList.value = await Promise.all(ids.map(buildFileItem));
  } else {
    fileList.value = [];
  }
};

watch(() => props.fileId, syncSingle, { immediate: true });
watch(() => props.fileIds, syncMulti, { immediate: true });

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
        message.error('上传失败');
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
      @change="handleChange"
    >
      <div v-if="fileList.length < maxCount" class="flex h-full flex-col items-center">
        <div class="flex flex-1 items-center justify-center">
          <LoadingOutlined v-if="uploading" spin class="text-lg" />
          <UploadOutlined v-else class="text-lg" />
        </div>
        <div
          v-if="fileList.length === 0 && hint"
          class="pb-0.5 text-[10px] text-gray-400"
        >
          {{ hint }}
        </div>
      </div>
    </Upload>
  </div>
</template>
