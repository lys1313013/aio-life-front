<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import {
  CloseOutlined,
  PictureOutlined,
  ReloadOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
} from '@ant-design/icons-vue';
import { Button, message, Radio, RadioGroup, Slider } from 'ant-design-vue';

import { uploadCover } from '#/api/bank-card';
import { AppModal as Modal } from '#/components/app-modal';
import { fetchAuthImageUrl } from '#/utils/file';

const props = defineProps<{
  active: boolean;
  fileId?: string;
  publicUrl?: null | string;
  uploadFn?: (file: File) => Promise<{ id: string }>;
}>();
const emit = defineEmits<{
  change: [id?: string];
  pending: [value: boolean];
}>();
const input = ref<HTMLInputElement>();
const source = ref('');
const cropOpen = ref(false);
const busy = ref(false);
const failed = ref(false);
const loadingExisting = ref(false);
let ownsSource = false;
let pendingFile: File | undefined;
let generation = 0;
function resetUpload() {
  generation++;
  pendingFile = undefined;
  busy.value = false;
  loadingExisting.value = false;
  failed.value = false;
  cropOpen.value = false;
  emit('pending', false);
  cleanup();
}
watch(
  () => props.active,
  (active) => {
    if (!active) resetUpload();
  },
  { flush: 'sync' },
);
watch(() => props.fileId, resetUpload);
const mode = ref<'contain' | 'cover'>('contain');
const zoom = ref(1);
const rotation = ref(0);
const sideways = computed(() => rotation.value % 180 !== 0);
const imageStyle = computed(() => ({
  objectFit: mode.value,
  width: sideways.value ? `${(605 / 960) * 100}%` : '100%',
  height: sideways.value ? `${(960 / 605) * 100}%` : '100%',
  transform: `translate(-50%, -50%) rotate(${rotation.value}deg) scale(${mode.value === 'cover' ? zoom.value : 1})`,
}));
function rotate(direction: number) {
  if (busy.value) return;
  rotation.value = (rotation.value + direction + 360) % 360;
}
function cleanup() {
  if (ownsSource && source.value) URL.revokeObjectURL(source.value);
  ownsSource = false;
  source.value = '';
}
function selectFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (input.value) input.value.value = '';
  if (!file) return;
  openFile(file);
}
function openFile(file: File) {
  if (!props.active || busy.value || failed.value || cropOpen.value) return;
  if (
    !['image/jpeg', 'image/png'].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  ) {
    message.error('请选择不超过5MB的PNG或JPEG图片');
    return;
  }
  startAdjustment(URL.createObjectURL(file), true);
}
function startAdjustment(url: string, owned: boolean) {
  cleanup();
  ownsSource = owned;
  source.value = url;
  mode.value = 'contain';
  zoom.value = 1;
  rotation.value = 0;
  cropOpen.value = true;
  emit('pending', true);
}
async function editExisting() {
  if (
    !props.active ||
    busy.value ||
    failed.value ||
    cropOpen.value ||
    !props.fileId
  )
    return;
  const request = ++generation;
  busy.value = true;
  loadingExisting.value = true;
  emit('pending', true);
  try {
    const url = props.publicUrl || (await fetchAuthImageUrl(props.fileId));
    if (request !== generation) return;
    if (!url) throw new Error('卡面加载失败');
    // 鉴权图片 URL 由共享缓存管理，关闭调整窗不能撤销它。
    startAdjustment(url, false);
  } catch {
    if (request === generation) {
      message.error('卡面加载失败，请重试');
      emit('pending', false);
    }
  } finally {
    if (request === generation) {
      busy.value = false;
      loadingExisting.value = false;
    }
  }
}
function handlePaste(event: ClipboardEvent) {
  if (
    !props.active ||
    busy.value ||
    failed.value ||
    cropOpen.value ||
    event.defaultPrevented
  )
    return;
  const items = event.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (!item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (!file) continue;
    event.preventDefault();
    openFile(file);
    return;
  }
}
async function confirm() {
  if (!props.active || busy.value || !source.value) return;
  const request = ++generation;
  const selectedMode = mode.value;
  const selectedZoom = zoom.value;
  const selectedRotation = rotation.value;
  busy.value = true;
  emit('pending', true);
  let file: File;
  try {
    const img = new Image();
    if (props.publicUrl && source.value === props.publicUrl)
      img.crossOrigin = 'anonymous';
    img.src = source.value;
    await img.decode();
    if (img.naturalWidth * img.naturalHeight > 16_000_000)
      throw new Error('图片不能超过1600万像素');
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 605;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法处理图片');
    const swapped = selectedRotation % 180 !== 0;
    const imageWidth = swapped ? img.naturalHeight : img.naturalWidth;
    const imageHeight = swapped ? img.naturalWidth : img.naturalHeight;
    const scale =
      selectedMode === 'cover'
        ? Math.max(960 / imageWidth, 605 / imageHeight) * selectedZoom
        : Math.min(960 / imageWidth, 605 / imageHeight);
    const width = img.naturalWidth * scale;
    const height = img.naturalHeight * scale;
    context.translate(960 / 2, 605 / 2);
    context.rotate((selectedRotation * Math.PI) / 180);
    context.drawImage(img, -width / 2, -height / 2, width, height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('图片处理失败'))),
        'image/png',
      ),
    );
    // 校验自动缩放后的实际文件大小，原图仍允许最大 5MB。
    if (blob.size > 3 * 1024 * 1024)
      throw new Error('处理后的卡面不能超过3MB，请选择更小的图片');
    file = new File([blob], 'card-cover.png', { type: 'image/png' });
  } catch (error) {
    if (request !== generation) return;
    if (error instanceof Error) message.error(error.message);
    busy.value = false;
    emit('pending', false);
    return;
  }
  if (request !== generation) return;
  pendingFile = file;
  // 本地处理完成就返回表单，网络上传只占用卡面操作区域。
  cropOpen.value = false;
  await sendFile(file, request);
}
async function sendFile(file: File, request: number) {
  busy.value = true;
  failed.value = false;
  emit('pending', true);
  try {
    const result = await (props.uploadFn || uploadCover)(file);
    if (request !== generation) return;
    pendingFile = undefined;
    emit('change', result.id);
    emit('pending', false);
  } catch {
    // API 错误由请求层提示；保留处理好的文件供重试，避免保存旧卡面。
    if (request === generation) failed.value = true;
  } finally {
    if (request === generation) busy.value = false;
  }
}
function retryUpload() {
  if (!props.active || busy.value || !pendingFile) return;
  void sendFile(pendingFile, ++generation);
}
function afterClose() {
  if (!cropOpen.value) {
    cleanup();
    if (!busy.value && !failed.value) emit('pending', false);
  }
}
onMounted(() => document.addEventListener('paste', handlePaste));
onBeforeUnmount(() => {
  document.removeEventListener('paste', handlePaste);
  resetUpload();
});
</script>
<template>
  <div class="cover-actions">
    <input
      ref="input"
      type="file"
      accept="image/png,image/jpeg"
      hidden
      style="display: none"
      @change="selectFile"
    />
    <Button
      size="small"
      :loading="busy && !loadingExisting"
      :disabled="!active || busy || cropOpen"
      @click="failed ? retryUpload() : input?.click()"
    >
      <template #icon>
        <ReloadOutlined v-if="failed" />
        <PictureOutlined v-else />
      </template>
      {{ failed ? '上传失败，重试' : props.fileId ? '更换卡面' : '上传卡面' }}
    </Button>
    <Button
      v-if="props.fileId && !failed"
      class="adjust-existing"
      type="text"
      aria-label="旋转已有卡面"
      :loading="loadingExisting"
      :disabled="!active || busy || cropOpen"
      @click="editExisting"
    >
      <RotateRightOutlined />
    </Button>
    <Button
      v-if="failed"
      size="small"
      type="text"
      aria-label="放弃本次上传"
      :disabled="!active || busy"
      @click="resetUpload"
    >
      <CloseOutlined />
    </Button>
  </div>
  <Modal
    v-model:open="cropOpen"
    title="调整卡面"
    centered
    :width="440"
    :confirm-loading="busy"
    :closable="!busy"
    :mask-closable="!busy"
    :keyboard="!busy"
    :cancel-button-props="{ disabled: busy }"
    @ok="confirm"
    @after-close="afterClose"
  >
    <div class="crop-stage">
      <img :src="source" alt="卡面预览" :style="imageStyle" />
    </div>
    <div class="crop-options">
      <div class="crop-rotation">
        <Button
          type="text"
          aria-label="向左旋转90度"
          :disabled="busy"
          @click="rotate(-90)"
        >
          <RotateLeftOutlined />
        </Button>
        <Button
          type="text"
          aria-label="向右旋转90度"
          :disabled="busy"
          @click="rotate(90)"
        >
          <RotateRightOutlined />
        </Button>
      </div>
      <RadioGroup v-model:value="mode" :disabled="busy">
        <Radio value="contain">完整显示</Radio
        ><Radio value="cover">居中裁剪</Radio>
      </RadioGroup>
    </div>
    <Slider
      v-if="mode === 'cover'"
      v-model:value="zoom"
      :disabled="busy"
      :min="1"
      :max="2"
      :step="0.01"
      aria-label="卡面缩放"
    />
  </Modal>
</template>
<style scoped>
.cover-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
}
.crop-stage {
  position: relative;
  aspect-ratio: 960 / 605;
  overflow: hidden;
  border-radius: 14px;
  background: hsl(var(--muted));
}
.crop-stage img {
  position: absolute;
  top: 50%;
  left: 50%;
  max-width: none;
}
.crop-options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}
.crop-rotation {
  display: flex;
}
.adjust-existing,
.crop-rotation .ant-btn {
  width: 44px;
  height: 44px;
}
</style>
