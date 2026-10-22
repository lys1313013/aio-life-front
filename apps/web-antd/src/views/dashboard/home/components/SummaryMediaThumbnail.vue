<script setup lang="ts">
import {
  onActivated,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue';

import { useAccessStore } from '@vben/stores';

import { DesktopOutlined, ReloadOutlined } from '@ant-design/icons-vue';

import { queryVideoCovers, retryVideoCover } from '#/api/core/bilibili-video';
import { useAuthImageUrl } from '#/composables/useAuthImageUrl';
import { clearImageCache } from '#/utils/file';
import VideoCover from '#/views/my-hub/videoWatch/VideoCover.vue';

const props = defineProps<{
  fileId?: null | string;
  kind: 'device' | 'video';
  recordId: string;
  state?: null | string;
  title: string;
}>();
const access = useAccessStore();
const active = ref(true);
const localFileId = ref(props.fileId);
const localState = ref(props.state);
const retrying = ref(false);
const pollFailed = ref(false);
const imageFailed = ref(false);
const imageRevision = ref(0);
let timer: ReturnType<typeof setTimeout> | undefined;
let generation = 0;
let attempts = 0;

const { blobUrl, loading, error } = useAuthImageUrl(() => {
  void imageRevision.value;
  return active.value && access.accessToken && props.kind === 'device'
    ? props.fileId
    : undefined;
});

function stopPolling() {
  generation++;
  clearTimeout(timer);
  timer = undefined;
}

function schedulePoll() {
  clearTimeout(timer);
  if (
    !active.value ||
    !access.accessToken ||
    document.hidden ||
    props.kind !== 'video' ||
    localState.value !== 'PENDING'
  )
    return;
  if (attempts >= 20) {
    pollFailed.value = true;
    return;
  }
  const current = generation;
  timer = setTimeout(async () => {
    attempts++;
    try {
      const records = await queryVideoCovers([props.recordId]);
      if (current !== generation || !active.value) return;
      const record = records.find((item) => item.id === props.recordId);
      if (!record) {
        pollFailed.value = true;
        return;
      }
      localFileId.value = record.coverFileId;
      localState.value = record.coverState;
      schedulePoll();
    } catch {
      if (current === generation) pollFailed.value = true;
    }
  }, 3000);
}

async function retryVideo() {
  if (retrying.value || !active.value || !access.accessToken) return;
  stopPolling();
  const current = generation;
  retrying.value = true;
  pollFailed.value = false;
  attempts = 0;
  try {
    if (localState.value === 'FAILED') {
      await retryVideoCover(props.recordId);
      if (current !== generation) return;
      localState.value = 'PENDING';
    }
    schedulePoll();
  } catch {
    // API errors already use the shared request interceptor; allow an explicit retry.
  } finally {
    if (current === generation) retrying.value = false;
  }
}

function retryDevice() {
  if (loading.value) return;
  clearImageCache(props.fileId);
  imageFailed.value = false;
  imageRevision.value++;
}

watch(
  () => access.accessToken,
  () => {
    if (props.kind === 'device') clearImageCache(props.fileId);
  },
  { flush: 'sync' },
);
watch(
  () => [
    props.kind,
    props.recordId,
    props.fileId,
    props.state,
    access.accessToken,
  ],
  () => {
    stopPolling();
    localFileId.value = props.fileId;
    localState.value = props.state;
    retrying.value = false;
    pollFailed.value = false;
    imageFailed.value = false;
    attempts = 0;
    schedulePoll();
  },
  { immediate: true },
);
function suspend() {
  active.value = false;
  retrying.value = false;
  stopPolling();
}
function resume() {
  active.value = true;
  pollFailed.value = false;
  attempts = 0;
  schedulePoll();
}
function visibilityChanged() {
  if (document.hidden) stopPolling();
  else if (active.value) schedulePoll();
}
onMounted(() =>
  document.addEventListener('visibilitychange', visibilityChanged),
);
onActivated(resume);
onDeactivated(suspend);
onUnmounted(() => {
  suspend();
  document.removeEventListener('visibilitychange', visibilityChanged);
});
</script>

<template>
  <div
    class="relative shrink-0 overflow-hidden rounded-md bg-muted/30"
    :style="{ width: kind === 'video' ? '72px' : '44px', height: '44px' }"
    :aria-busy="
      kind === 'device' ? loading : retrying || localState === 'PENDING'
    "
  >
    <template v-if="kind === 'video'">
      <VideoCover
        v-if="active && access.accessToken"
        :file-id="localFileId ?? undefined"
        :state="localState ?? undefined"
        :title="title"
        @retry="retryVideo"
      />
      <div
        v-if="retrying"
        class="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80 text-foreground"
        aria-label="处理中"
      >
        <ReloadOutlined spin />
      </div>
      <button
        v-if="pollFailed"
        type="button"
        aria-label="重试封面状态"
        class="absolute inset-0 flex items-center justify-center bg-background/80 text-foreground"
        :disabled="retrying"
        @click.stop="retryVideo"
      >
        <ReloadOutlined :spin="retrying" />
      </button>
    </template>
    <template v-else>
      <img
        v-if="blobUrl && !imageFailed && active && access.accessToken"
        :src="blobUrl"
        :alt="title"
        class="h-full w-full object-cover"
        @error="imageFailed = true"
      />
      <div
        v-else
        class="absolute inset-0 flex items-center justify-center text-muted-foreground"
        :class="{ 'animate-pulse': loading }"
      >
        <DesktopOutlined v-if="!error && !imageFailed" />
        <button
          v-else
          type="button"
          aria-label="重试设备图片"
          class="flex h-full w-full items-center justify-center"
          @click.stop="retryDevice"
        >
          <ReloadOutlined />
        </button>
      </div>
    </template>
  </div>
</template>
