<script setup lang="ts">
import type { FootprintMapHandle } from './baidu-map';
import type { Coordinate, Footprint, LocationGroup } from './model';

import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { usePreferences } from '@vben/preferences';

import { Button, Spin } from 'ant-design-vue';

import { mountFootprintMap } from './baidu-map';

import './map-dots.css';

const props = withDefaults(
  defineProps<{
    browserKey: string;
    height?: number;
    picking?: boolean;
    point?: Coordinate | null;
    records?: Footprint[];
    selectedId?: null | string;
    small?: boolean;
  }>(),
  {
    records: () => [],
    selectedId: null,
    point: null,
    picking: false,
    small: false,
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
  const current = ++revision;
  handle?.destroy();
  handle = null;
  loading.value = true;
  failed.value = false;
  try {
    const map = await mountFootprintMap(container.value, {
      key: props.browserKey,
      picking: props.picking,
      small: props.small,
      onSelect: (group) => emit('select', group),
      onPick: (point) => emit('pick', point),
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
watch(() => props.browserKey, start);
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
      <span>地图暂不可用</span
      ><Button aria-label="重试地图" @click="start">
        <IconifyIcon class="size-5" icon="mdi:reload" />
      </Button>
    </div>
    <template v-else>
      <Button class="map-country" aria-label="返回中国地图" @click="china">
        <IconifyIcon class="size-5" icon="mdi:map-outline" />
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
  </div>
</template>

<style scoped>
.footprint-map {
  position: relative;
  height: clamp(420px, 68vh, 700px);
  overflow: hidden;
  background: hsl(var(--muted));
  border-radius: 8px;
}

.footprint-map-canvas {
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
}

.footprint-map :deep(.ant-btn) {
  width: 44px;
  height: 44px;
  color: hsl(var(--foreground));
  background: hsl(var(--background));
  border-color: hsl(var(--border));
}

.map-country {
  position: absolute;
  top: 12px;
  left: 12px;
}

.map-zoom {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  gap: 4px;
}
</style>
