<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

import { PictureOutlined, UndoOutlined } from '@ant-design/icons-vue';
import {
  Button,
  message,
  Modal,
  Radio,
  RadioGroup,
  Slider,
} from 'ant-design-vue';

import { uploadCover } from '#/api/bank-card';

const props = defineProps<{ fileId?: string }>();
const emit = defineEmits<{ busy: [value: boolean]; change: [id?: string] }>();
const input = ref<HTMLInputElement>();
const source = ref('');
const cropOpen = ref(false);
const busy = ref(false);
const mode = ref<'contain' | 'cover'>('contain');
const zoom = ref(1);
const imageStyle = computed(() => ({
  objectFit: mode.value,
  transform: `scale(${mode.value === 'cover' ? zoom.value : 1})`,
}));
function cleanup() {
  if (source.value) URL.revokeObjectURL(source.value);
  source.value = '';
}
function selectFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (input.value) input.value.value = '';
  if (!file) return;
  if (
    !['image/jpeg', 'image/png'].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  ) {
    message.error('请选择不超过5MB的PNG或JPEG图片');
    return;
  }
  cleanup();
  source.value = URL.createObjectURL(file);
  mode.value = 'contain';
  zoom.value = 1;
  cropOpen.value = true;
}
async function confirm() {
  busy.value = true;
  emit('busy', true);
  try {
    const img = new Image();
    img.src = source.value;
    await img.decode();
    if (img.naturalWidth * img.naturalHeight > 16_000_000)
      throw new Error('图片不能超过1600万像素');
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 605;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法处理图片');
    const scale =
      mode.value === 'cover'
        ? Math.max(960 / img.width, 605 / img.height) * zoom.value
        : Math.min(960 / img.width, 605 / img.height);
    const width = img.width * scale;
    const height = img.height * scale;
    context.drawImage(
      img,
      (960 - width) / 2,
      (605 - height) / 2,
      width,
      height,
    );
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error('图片处理失败'))),
        'image/png',
      ),
    );
    const result = await uploadCover(
      new File([blob], 'card-cover.png', { type: 'image/png' }),
    );
    emit('change', result.id);
    cropOpen.value = false;
    cleanup();
  } catch (error) {
    if (error instanceof Error && !('response' in error))
      message.error(error.message);
  } finally {
    busy.value = false;
    emit('busy', false);
  }
}
onBeforeUnmount(cleanup);
</script>
<template>
  <div class="cover-actions">
    <input
      ref="input"
      type="file"
      accept="image/png,image/jpeg"
      hidden
      @change="selectFile"
    />
    <Button size="small" :loading="busy" @click="input?.click()">
      <template #icon><PictureOutlined /></template
      >{{ props.fileId ? '更换卡面' : '上传卡面' }}
    </Button>
    <Button
      v-if="props.fileId"
      size="small"
      type="text"
      aria-label="恢复默认卡面"
      :disabled="busy"
      @click="emit('change', undefined)"
    >
      <UndoOutlined />
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
    @after-close="cleanup"
  >
    <div class="crop-stage">
      <img :src="source" alt="卡面预览" :style="imageStyle" />
    </div>
    <div class="crop-options">
      <RadioGroup v-model:value="mode">
        <Radio value="contain">完整显示</Radio
        ><Radio value="cover">居中裁剪</Radio>
      </RadioGroup>
    </div>
    <Slider
      v-if="mode === 'cover'"
      v-model:value="zoom"
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
  aspect-ratio: 1.586;
  overflow: hidden;
  border-radius: 14px;
  background: hsl(var(--muted));
}
.crop-stage img {
  width: 100%;
  height: 100%;
}
.crop-options {
  margin-top: 18px;
  text-align: center;
}
</style>
