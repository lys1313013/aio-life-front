<script setup lang="ts">
import { ref, watch } from 'vue';
import { Upload, message } from 'ant-design-vue';
import { UploadOutlined } from '@ant-design/icons-vue';
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
    hint: '支持 Ctrl+V 粘贴图片',
    fileId: undefined,
    fileIds: undefined,
  },
);

const emit = defineEmits<{
  'update:fileId': [value: string | number | null];
  'update:fileIds': [value: (string | number)[]];
}>();

const fileList = ref<any[]>([]);
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
    onProgress({ percent: 50 });
    const res = await props.uploadFn(file);
    onProgress({ percent: 100 });
    onSuccess(res);
  } catch (error) {
    onError(error);
  }
};

const handlePaste = async (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) continue;
      try {
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
      }
      return;
    }
  }
};
</script>

<template>
  <div @paste="handlePaste">
    <Upload
      v-model:file-list="fileList"
      list-type="picture-card"
      accept="image/*"
      :max-count="maxCount"
      :custom-request="customRequest"
      @change="handleChange"
    >
      <div v-if="fileList.length < maxCount">
        <UploadOutlined />
        <div style="margin-top: 8px">上传</div>
      </div>
    </Upload>
    <div v-if="hint" class="mt-1 text-xs text-gray-400">{{ hint }}</div>
  </div>
</template>
