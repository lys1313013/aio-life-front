<script setup lang="ts">
import type { FootprintMapHandle } from './footprint-map';
import type { MapTileSource, TencentMapConfig } from './map-config';
import type { Coordinate, Footprint, LocationGroup } from './model';

import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { usePreferences } from '@vben/preferences';

import { Button, Spin } from 'ant-design-vue';

import leafletLicenseUrl from './assets/leaflet-license.txt?url';
import { mountFootprintMap } from './footprint-map';
import { DEFAULT_MAP_SOURCE } from './map-config';
import { mountTencentFootprintMap } from './tencent-map';

import 'leaflet/dist/leaflet.css';
import './map-dots.css';

const props = withDefaults(
  defineProps<{
    height?: number;
    pending?: boolean;
    picking?: boolean;
    point?: Coordinate | null;
    records?: Footprint[];
    selectedId?: null | string;
    small?: boolean;
    source?: MapTileSource;
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
    height: undefined,
    source: () => ({ ...DEFAULT_MAP_SOURCE }),
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
const attributionUrl = computed(() => {
  try {
    const url = new URL(props.source.attributionUrl);
    return url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
});
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
    const map = props.picking
      ? mountFootprintMap(container.value, {
          source: props.source,
          picking: props.picking,
          small: props.small,
          onSelect: (group) => emit('select', group),
          onPick: (point) => emit('pick', point),
          onTileState: tileState,
        })
      : await mountTencentFootprintMap(container.value, {
          config: props.tencent ?? { key: '', mapStyleId: 'style1' },
          cancelled: () => disposed || current !== revision,
          small: props.small,
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
watch(() => [props.source, props.tencent, props.pending], start, {
  deep: true,
});
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
  handle?.china();
}
function zoomIn() {
  handle?.zoomIn();
}
function zoomOut() {
  handle?.zoomOut();
}
function toggle3D() {
  tilted.value = !tilted.value;
  handle?.toggle3D?.();
}
function retryTiles() {
  if (props.picking) handle?.retryTiles();
  else void start();
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
        !picking && !tencent?.key
          ? '请在系统配置填写腾讯地图 Key'
          : '地图暂不可用'
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
      <Button class="map-country" aria-label="返回中国地图" @click="china">
        <IconifyIcon class="size-5" icon="mdi:map-outline" />
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
      <div class="map-zoom">
        <Button aria-label="放大地图" @click="zoomIn">
          <IconifyIcon class="size-5" icon="mdi:plus" />
        </Button>
        <Button aria-label="缩小地图" @click="zoomOut">
          <IconifyIcon class="size-5" icon="mdi:minus" />
        </Button>
      </div>
    </template>
    <div v-if="picking" class="map-attribution">
      <a
        :href="leafletLicenseUrl"
        download="Leaflet-LICENSE.txt"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Leaflet 开源许可"
        >Leaflet</a
      >
      ·
      <a
        v-if="attributionUrl"
        :href="attributionUrl"
        target="_blank"
        rel="noopener noreferrer"
        >{{ source.attribution }}</a
      >
      <span v-else>{{ source.attribution }}</span>
    </div>
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

.map-attribution {
  position: absolute;
  right: 0;
  bottom: 0;
  z-index: 1;
  max-width: 100%;
  overflow-wrap: anywhere;
  padding: 2px 6px;
  font-size: 11px;
  color: hsl(var(--foreground));
  background: hsl(var(--background) / 90%);
}

.footprint-map :deep(.leaflet-container) {
  background: hsl(var(--muted));
}

.footprint-map :deep(.footprint-map-dark .leaflet-tile-pane) {
  filter: invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.65);
}

.footprint-map :deep(.ant-btn) {
  width: 44px;
  height: 44px;
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  border-color: hsl(var(--border));
}

.map-3d {
  position: absolute;
  top: 12px;
  left: 62px;
  z-index: 1;
}

.map-3d[aria-pressed='true'] {
  color: hsl(var(--primary));
}

.map-country {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
}

.map-zoom {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  z-index: 1;
  gap: 4px;
}
</style>
