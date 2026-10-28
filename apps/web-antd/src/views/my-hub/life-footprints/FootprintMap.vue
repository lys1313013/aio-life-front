<script setup lang="ts">
import type { FootprintMapHandle } from './map-handle';
import type { FootprintMapRecord, LocationGroup } from './model';

import type { Coordinate, TencentMapConfig } from '#/api/core/life-footprints';

import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { usePreferences } from '@vben/preferences';

import { Button, Spin } from 'ant-design-vue';

import { mountTencentFootprintMap } from './tencent-map';

import './map-dots.css';

const props = withDefaults(
  defineProps<{
    height?: number;
    numbered?: boolean;
    overview?: boolean;
    pending?: boolean;
    picking?: boolean;
    point?: Coordinate | null;
    records?: FootprintMapRecord[];
    selectedId?: null | string;
    small?: boolean;
    tencent?: TencentMapConfig;
  }>(),
  {
    tencent: undefined,
    records: () => [],
    selectedId: null,
    point: null,
    picking: false,
    pending: false,
    small: false,
    numbered: false,
    overview: false,
    height: undefined,
  },
);
const emit = defineEmits<{
  pick: [point: Coordinate];
  ready: [];
  select: [group: LocationGroup];
}>();
const { isDark } = usePreferences();
const container = ref<HTMLElement>();
const loading = ref(false);
const failed = ref(false);
const tilesLoading = ref(false);
const tilesFailed = ref(false);
const tilted = ref(false);
let disposed = false;
let handle: FootprintMapHandle | null = null;
let revision = 0;
let pendingFocus: null | { points: Coordinate[]; zoom?: number } = null;

function focus(points: Coordinate[], zoom?: number) {
  if (handle) handle.focus(points, zoom);
  else pendingFocus = { points, zoom };
}
async function start() {
  if (!container.value || disposed) return;
  if (props.pending) {
    loading.value = true;
    return;
  }
  const current = ++revision;
  handle?.destroy();
  handle = null;
  loading.value = true;
  failed.value = false;
  tilesFailed.value = false;
  tilesLoading.value = false;
  try {
    const tileState = (state: 'error' | 'loading' | 'ready') => {
      if (disposed || current !== revision) return;
      tilesLoading.value = state === 'loading';
      tilesFailed.value = state === 'error';
    };
    tilted.value = false;
    const map = await mountTencentFootprintMap(container.value, {
      picking: props.picking,
      initialPoint: props.point,
      onPick: (point) => emit('pick', point),
      config: props.tencent ?? {
        enabled: false,
        serviceHost: '',
        mapStyleId: 'style1',
      },
      cancelled: () => disposed || current !== revision,
      small: props.small,
      numbered: props.numbered,
      onSelect: (group) => emit('select', group),
      onTileState: tileState,
    });
    if (disposed || current !== revision) {
      map.destroy();
      return;
    }
    handle = map;
    map.setRecords(props.records, props.selectedId);
    map.setPick(props.point);
    map.setDark(isDark.value);
    if (pendingFocus) {
      map.focus(pendingFocus.points, pendingFocus.zoom);
      pendingFocus = null;
    } else if (props.point) map.focus([props.point], 16);
    emit('ready');
  } catch {
    if (current === revision) failed.value = true;
  } finally {
    if (current === revision) loading.value = false;
  }
}
onMounted(start);
onBeforeUnmount(() => {
  disposed = true;
  revision++;
  handle?.destroy();
});
watch(() => [props.tencent, props.pending], start, {
  deep: true,
});
watch(
  () => props.picking,
  (enabled) => handle?.setPicking?.(enabled),
);
watch(
  () => [props.records, props.selectedId] as const,
  () => handle?.setRecords(props.records, props.selectedId),
  { deep: true },
);
watch(
  () => props.point,
  (point) => handle?.setPick(point),
  { deep: true },
);
watch(isDark, (dark) => handle?.setDark(dark));
function china() {
  if (props.overview && props.records.length > 0) focus(props.records);
  else handle?.china();
}
function toggle3D() {
  tilted.value = !tilted.value;
  handle?.toggle3D?.();
}
function retryTiles() {
  void start();
}
defineExpose({ focus, china: () => handle?.china() });
</script>

<template>
  <div
    class="footprint-map"
    :style="height ? { height: `${height}px` } : undefined"
    :aria-busy="loading"
  >
    <div
      ref="container"
      class="footprint-map-canvas"
      aria-label="生活足迹地图"
    ></div>
    <div v-if="loading" class="map-cover"><Spin /></div>
    <div v-else-if="failed" class="map-cover" role="alert">
      <span>{{
        !tencent?.enabled ? '请在系统配置填写腾讯地图 Key' : '地图暂不可用'
      }}</span>
      <Button aria-label="重试地图" @click="start">
        <IconifyIcon class="size-5" icon="mdi:reload" />
      </Button>
    </div>
    <template v-else>
      <div v-if="tilesLoading" class="map-progress" aria-label="底图加载中">
        <Spin size="small" />
      </div>
      <div v-else-if="tilesFailed" class="map-tile-error" role="alert">
        <span>底图加载失败</span>
        <Button aria-label="重试底图" @click="retryTiles">
          <IconifyIcon class="size-5" icon="mdi:reload" />
        </Button>
      </div>
      <div class="map-controls">
        <Button
          class="map-country"
          :aria-label="overview ? '查看全部地点' : '返回中国地图'"
          @click="china"
        >
          <IconifyIcon
            class="size-5"
            :icon="overview ? 'mdi:fit-to-screen-outline' : 'mdi:map-outline'"
          />
        </Button>
        <Button
          v-if="!picking"
          class="map-3d"
          aria-label="切换3D视角"
          :aria-pressed="tilted"
          @click="toggle3D"
        >
          <IconifyIcon class="size-5" icon="mdi:cube-outline" />
        </Button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.footprint-map {
  position: relative;
  height: clamp(420px, 68vh, 700px);
  overflow: hidden;
  isolation: isolate;
  background: hsl(var(--muted));
  border-radius: 8px;
}

.footprint-map-canvas {
  position: relative;
  z-index: 0;
  width: 100%;
  height: 100%;
}

.map-cover {
  position: absolute;
  inset: 0;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--muted));
  z-index: 2;
}

.map-progress,
.map-tile-error {
  position: absolute;
  top: 12px;
  left: 50%;
  z-index: 1;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 4px 8px;
  color: hsl(var(--muted-foreground));
  background: hsl(var(--background) / 90%);
  border-radius: 6px;
  transform: translateX(-50%);
}

.map-progress {
  pointer-events: none;
}

.footprint-map :deep(.ant-btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  border-color: hsl(var(--border));
}

.map-controls {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
  display: flex;
  gap: 6px;
}

.map-3d[aria-pressed='true'] {
  color: hsl(var(--primary));
}
</style>
