<script setup lang="ts">
import type {
  Coordinate,
  Draft,
  Footprint,
  LocationGroup,
  LocationResult,
  MapConfig,
} from './model';

import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  watch,
} from 'vue';

import { IconifyIcon } from '@vben/icons';
import { useAccessStore } from '@vben/stores';

import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Input,
  Spin,
} from 'ant-design-vue';

import {
  createFootprint,
  deleteFootprint,
  geocodeFootprintAddress,
  getFootprintMapConfig,
  getFootprints,
  reverseFootprintLocation,
  searchFootprintLocations,
  updateFootprint,
} from '#/api/core/life-footprints';
import { AppModal, AppModalDelete } from '#/components/app-modal';

import FootprintMap from './FootprintMap.vue';
import {
  draftPayload,
  emptyDraft,
  PRESENT_DATE,
  sortFootprints,
  timeLabel,
} from './model';

const access = useAccessStore();
const choices = ref<Footprint[]>([]);
const records = ref<Footprint[]>([]);
const selected = ref<Footprint | null>(null);
const config = ref<MapConfig>({
  browserKey: '',
  searchEnabled: false,
  coordinateSystem: 'GCJ02',
});
const failed = ref(false);
const loading = ref(false);
const ready = ref(false);
const resolving = ref(false);
const saving = ref(false);
const searching = ref(false);
const draft = ref<Draft>(emptyDraft());
const editorOpen = ref(false);
const error = ref('');
const reloadAvailable = ref(false);
const mapHint = ref('');
const candidate = ref<LocationResult | null>(null);
const candidates = ref<LocationResult[]>([]);
const editorMap = ref<InstanceType<typeof FootprintMap> | null>(null);
const mainMap = ref<InstanceType<typeof FootprintMap> | null>(null);
const point = computed<Coordinate | null>(() =>
  draft.value.longitude === null || draft.value.latitude === null
    ? null
    : { longitude: draft.value.longitude, latitude: draft.value.latitude },
);
const samePosition = (items: Footprint[]) =>
  items.every(
    (r) =>
      r.longitude === items[0]?.longitude && r.latitude === items[0]?.latitude,
  );
let active = true;
let pageRevision = 0;
let editRevision = 0;
let searchRevision = 0;
let debounce: ReturnType<typeof setTimeout> | undefined;
const validPage = (revision: number, token: null | string) =>
  active && revision === pageRevision && token === access.accessToken;

async function load() {
  if (!active || loading.value || saving.value) return;
  const revision = ++pageRevision;
  const token = access.accessToken;
  loading.value = true;
  failed.value = false;
  const result = await Promise.allSettled([
    getFootprints(),
    getFootprintMapConfig(),
  ]);
  if (!validPage(revision, token)) return;
  if (result[0].status === 'fulfilled') {
    records.value = sortFootprints(result[0].value);
    ready.value = true;
    choices.value = [];
    if (selected.value)
      selected.value =
        records.value.find((r) => r.id === selected.value?.id) || null;
  } else failed.value = true;
  if (result[1].status === 'fulfilled') config.value = result[1].value;
  loading.value = false;
}
function invalidateSearch() {
  clearTimeout(debounce);
  searchRevision++;
  candidates.value = [];
  searching.value = false;
  resolving.value = false;
  candidate.value = null;
}
function openEditor(record?: Footprint) {
  reloadAvailable.value = false;
  editRevision++;
  invalidateSearch();
  error.value = '';
  mapHint.value = '';
  draft.value = record ? { ...record, confirmed: true } : emptyDraft();
  editorOpen.value = true;
}
function closeEditor() {
  if (!saving.value) {
    editRevision++;
    invalidateSearch();
    editorOpen.value = false;
  }
}
function choose(record: Footprint) {
  choices.value = [];
  selected.value = record;
  mainMap.value?.focus([record], 16);
}
function selectGroup(group: LocationGroup) {
  if (group.records.length === 1) {
    choose(group.records[0]!);
    return;
  }
  selected.value = null;
  choices.value = group.records;
  if (!samePosition(group.records)) mainMap.value?.focus(group.records);
}
function dismiss() {
  selected.value = null;
  choices.value = [];
}

function searchName() {
  invalidateSearch();
  const keyword = draft.value.placeName.trim();
  if (!config.value.searchEnabled || !keyword || saving.value) return;
  const editing = editRevision;
  const revision = searchRevision;
  const token = access.accessToken;
  debounce = setTimeout(async () => {
    searching.value = true;
    try {
      const result = await searchFootprintLocations(keyword);
      if (
        active &&
        editorOpen.value &&
        token === access.accessToken &&
        editing === editRevision &&
        revision === searchRevision
      ) {
        candidates.value = result;
        mapHint.value =
          result.length > 0 ? '' : '未找到可选地点，可补充城市名称或在地图选点';
      }
    } catch {
      /* 请求客户端统一提示；保留输入和原选点。 */
    } finally {
      if (editing === editRevision && revision === searchRevision)
        searching.value = false;
    }
  }, 350);
}
function selectCandidate(location: LocationResult) {
  invalidateSearch();
  candidate.value = location;
  mapHint.value = location.precise ? '' : '请确认地图位置，必要时点选调整';
  draft.value = {
    ...draft.value,
    placeName: location.placeName,
    address: location.address || null,
    city: location.city || null,
    longitude: location.longitude,
    latitude: location.latitude,
    providerUid: location.providerUid,
    confirmed: false,
  };
  editorMap.value?.focus([location], 16);
}
function confirmPosition() {
  if (point.value) {
    invalidateSearch();
    draft.value.confirmed = true;
    mapHint.value = '';
  }
}
async function pickPosition(location: Coordinate) {
  if (saving.value) return;
  invalidateSearch();
  draft.value = {
    ...draft.value,
    ...location,
    providerUid: null,
    confirmed: true,
  };
  mapHint.value = '';
  if (!config.value.searchEnabled) return;
  const editing = editRevision;
  const revision = searchRevision;
  const token = access.accessToken;
  resolving.value = true;
  try {
    const result = await reverseFootprintLocation(
      location.longitude,
      location.latitude,
    );
    if (
      !active ||
      !editorOpen.value ||
      token !== access.accessToken ||
      revision !== searchRevision ||
      editing !== editRevision
    )
      return;
    // 只补空值，不覆盖已填的门牌、房号或自定义名称。
    if (!draft.value.placeName.trim()) draft.value.placeName = result.placeName;
    if (!draft.value.address) draft.value.address = result.address;
    draft.value.city = result.city || draft.value.city;
  } catch {
    /* 选点仍有效，允许手填地址。 */
  } finally {
    if (editing === editRevision && revision === searchRevision)
      resolving.value = false;
  }
}
async function geocode() {
  if (!config.value.searchEnabled || resolving.value) return;
  invalidateSearch();
  const editing = editRevision;
  const revision = searchRevision;
  const token = access.accessToken;
  resolving.value = true;
  try {
    const result = await geocodeFootprintAddress(
      draft.value.address?.trim() || draft.value.placeName.trim(),
    );
    if (
      active &&
      editorOpen.value &&
      token === access.accessToken &&
      revision === searchRevision &&
      editing === editRevision
    ) {
      const name = draft.value.placeName;
      selectCandidate(result);
      if (name) draft.value.placeName = name;
    }
  } catch {
    /* 保留表单和旧坐标。 */
  } finally {
    if (editing === editRevision) resolving.value = false;
  }
}
async function save() {
  reloadAvailable.value = false;
  if (saving.value) return;
  let payload;
  try {
    payload = draftPayload(draft.value);
  } catch (error_) {
    error.value = (error_ as Error).message;
    return;
  }
  const id = draft.value.id;
  const revision = editRevision;
  const token = access.accessToken;
  saving.value = true;
  error.value = '';
  invalidateSearch();
  try {
    const record = id
      ? await updateFootprint(id, payload)
      : await createFootprint(payload);
    if (!active || revision !== editRevision || token !== access.accessToken)
      return;
    pageRevision++;
    loading.value = false;
    records.value = sortFootprints([
      ...records.value.filter((r) => r.id !== record.id),
      record,
    ]);
    selected.value = record;
    choices.value = [];
    editorOpen.value = false;
    mainMap.value?.focus([record], 16);
  } catch {
    if (revision === editRevision) reloadAvailable.value = true;
    error.value = '保存未完成，请重新读取确认后重试';
  } finally {
    if (revision === editRevision) saving.value = false;
  }
}
async function remove() {
  const id = draft.value.id;
  if (!id || saving.value) return;
  const editing = editRevision;
  const token = access.accessToken;
  saving.value = true;
  invalidateSearch();
  try {
    await deleteFootprint(id);
    if (!active || editing !== editRevision || token !== access.accessToken)
      return;
    pageRevision++;
    loading.value = false;
    records.value = records.value.filter((r) => r.id !== id);
    dismiss();
    editorOpen.value = false;
  } catch {
    if (editing === editRevision) reloadAvailable.value = true;
    error.value = '删除未完成，请重试或重新读取记录';
  } finally {
    if (editing === editRevision) saving.value = false;
  }
}
function suspend() {
  active = false;
  pageRevision++;
  editRevision++;
  invalidateSearch();
  loading.value = saving.value = false;
  editorOpen.value = false;
}
onMounted(load);
onActivated(() => {
  active = true;
  if (ready.value) void load();
});
onDeactivated(suspend);
onBeforeUnmount(suspend);
watch(
  () => access.accessToken,
  () => {
    suspend();
    records.value = [];
    dismiss();
    ready.value = false;
    active = true;
    void load();
  },
);
</script>

<template>
  <section class="footprints text-foreground" aria-label="生活足迹">
    <header class="footprint-heading">
      <h1>生活足迹</h1>
      <Button
        type="text"
        aria-label="新增生活足迹"
        :disabled="!ready || loading"
        @click="openEditor()"
      >
        <IconifyIcon class="size-5" icon="mdi:plus" />
      </Button>
    </header>
    <div class="footprint-layout">
      <aside class="footprint-list" :aria-busy="loading">
        <Spin v-if="loading" class="list-loading" />
        <button
          v-for="record in records"
          :key="record.id"
          type="button"
          class="footprint-row"
          :class="{ selected: selected?.id === record.id }"
          @click="choose(record)"
        >
          <span class="footprint-time">{{ timeLabel(record) }}</span
          ><span>{{ record.placeName }}</span>
        </button>
        <span v-if="ready && records.length === 0" class="footprint-empty"
          >暂无记录</span
        >
      </aside>
      <div class="footprint-map-area">
        <Alert
          v-if="failed"
          type="error"
          message="读取失败"
          class="footprint-read-error"
        >
          <template #action>
            <Button :loading="loading" @click="load">重试</Button>
          </template>
        </Alert>

        <FootprintMap
          ref="mainMap"
          :browser-key="config.browserKey"
          :records="records"
          :selected-id="selected?.id"
          small
          @select="selectGroup"
        />
        <div v-if="selected || choices.length > 0" class="footprint-detail">
          <div class="detail-heading">
            <span>{{ selected?.placeName || `${choices.length} 条记录` }}</span>
            <div class="detail-actions">
              <Button
                v-if="selected"
                type="text"
                aria-label="编辑生活足迹"
                @click="openEditor(selected)"
              >
                <IconifyIcon class="size-5" icon="mdi:pencil-outline" />
              </Button>
              <Button type="text" aria-label="关闭详情" @click="dismiss">
                <IconifyIcon class="size-5" icon="mdi:close" />
              </Button>
            </div>
          </div>
          <template v-if="selected">
            <div class="footprint-time">{{ timeLabel(selected) }}</div>
            <p v-if="selected.address">{{ selected.address }}</p>
            <p v-if="selected.note" class="detail-note">
              {{ selected.note }}
            </p>
          </template>
          <div v-else class="group-records">
            <button
              v-for="record in choices"
              :key="record.id"
              type="button"
              class="group-record"
              @click="choose(record)"
            >
              <span>{{ record.placeName }}</span
              ><span class="footprint-time">{{ timeLabel(record) }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <AppModal
      :open="editorOpen"
      :width="560"
      :busy="saving"
      :confirm-loading="saving"
      @ok="save"
      @cancel="closeEditor"
      @update:open="
        (value) => {
          if (!value) closeEditor();
        }
      "
    >
      <div class="footprint-editor">
        <div class="date-fields">
          <label
            >开始<DatePicker
              :value="draft.startDate || undefined"
              @update:value="
                (value) => {
                  draft.startDate = value == null ? '' : String(value);
                }
              "
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              placeholder="选择日期"
              class="w-full"
              :disabled="saving"
          /></label>
          <div>
            <div class="end-label">
              <label for="footprint-end">结束</label
              ><Checkbox
                :checked="draft.endDate === PRESENT_DATE"
                :disabled="saving"
                @change="
                  draft.endDate = $event.target.checked ? PRESENT_DATE : ''
                "
              >
                至今
              </Checkbox>
            </div>
            <DatePicker
              id="footprint-end"
              :value="
                draft.endDate === PRESENT_DATE
                  ? undefined
                  : draft.endDate || undefined
              "
              @update:value="
                (value) => {
                  draft.endDate = value == null ? '' : String(value);
                }
              "
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              placeholder="选择日期"
              class="w-full"
              :disabled="saving || draft.endDate === PRESENT_DATE"
            />
          </div>
        </div>
        <label
          >地点<Input
            v-model:value="draft.placeName"
            aria-label="地点"
            placeholder="搜索地点或填写名称"
            :maxlength="100"
            :disabled="saving"
            @input="searchName"
            ><template #suffix
              ><Spin v-if="searching" size="small" /></template></Input
        ></label>
        <div
          v-if="candidates.length > 0"
          class="location-results"
          data-enter-submit="ignore"
        >
          <button
            v-for="(location, index) in candidates"
            :key="location.providerUid || String(index)"
            type="button"
            @click="selectCandidate(location)"
          >
            <span>{{ location.placeName }}</span
            ><span class="footprint-time"
              >{{ location.city }} {{ location.address }}</span
            >
          </button>
        </div>
        <FootprintMap
          ref="editorMap"
          :browser-key="config.browserKey"
          :point="point"
          picking
          small
          :height="210"
          @pick="pickPosition"
        />
        <div class="position-actions">
          <span class="footprint-time" aria-live="polite">{{
            draft.confirmed
              ? '位置已确认'
              : point
                ? '请确认所选位置'
                : '请选择地图位置'
          }}</span>
          <Button
            v-if="point && !draft.confirmed"
            type="link"
            :disabled="saving"
            @click="confirmPosition"
          >
            确认位置
          </Button>
          <Spin v-if="resolving" size="small" />
        </div>
        <span v-if="mapHint" class="footprint-time">{{ mapHint }}</span>
        <label
          >地址<Input
            :value="draft.address ?? undefined"
            @update:value="
              (value) => {
                draft.address = value == null ? null : String(value);
              }
            "
            aria-label="地址"
            :maxlength="500"
            :disabled="saving"
            placeholder="详细地址（选填）"
            @input="invalidateSearch"
            ><template #suffix
              ><Button
                v-if="config.searchEnabled"
                type="text"
                aria-label="解析地址到地图"
                :loading="resolving"
                :disabled="saving || !(draft.address || draft.placeName)"
                @click="geocode"
                ><IconifyIcon
                  icon="mdi:map-search-outline" /></Button></template></Input
        ></label>
        <label
          >备注<Input.TextArea
            :value="draft.note ?? undefined"
            @update:value="
              (value) => {
                draft.note = value == null ? null : String(value);
              }
            "
            aria-label="备注"
            :maxlength="5000"
            :rows="2"
            :disabled="saving"
        /></label>
        <Alert v-if="error" :message="error" type="error">
          <template v-if="reloadAvailable" #action>
            <Button
              :disabled="saving"
              size="small"
              @click="
                closeEditor();
                load();
              "
            >
              关闭并重新读取
            </Button>
          </template>
        </Alert>
      </div>
      <template v-if="draft.id" #footer-leading>
        <AppModalDelete :loading="saving" :action="remove" />
      </template>
    </AppModal>
  </section>
</template>

<style scoped>
.footprints {
  padding: 16px;
}

.footprint-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.footprint-heading :deep(.ant-btn),
.detail-actions :deep(.ant-btn) {
  width: 44px;
  height: 44px;
  color: hsl(var(--foreground));
}

.footprint-heading h1 {
  font-size: 18px;
  font-weight: 500;
}

.footprint-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.footprint-list {
  position: relative;
  min-height: 120px;
}

.list-loading {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
}

.footprint-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 12px;
  text-align: left;
  border-radius: 6px;
}

.footprint-row.selected {
  background: hsl(var(--accent));
}

.footprint-time,
.footprint-empty {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
}

.footprint-read-error {
  position: absolute;
  top: 68px;
  right: 12px;
  left: 12px;
  z-index: 3;
}

.footprint-map-area {
  position: relative;
  min-width: 0;
}

.footprint-detail {
  position: absolute;
  right: 12px;
  bottom: 32px;
  left: 12px;
  max-height: 42%;
  padding: 12px;
  overflow: auto;
  background: hsl(var(--background));
  border-radius: 8px;
  box-shadow: 0 2px 14px #0002;
}

.detail-heading,
.detail-actions,
.end-label,
.position-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.detail-heading {
  font-weight: 500;
}

.footprint-detail p {
  margin: 6px 0 0;
  overflow-wrap: anywhere;
}

.detail-note {
  white-space: pre-wrap;
  color: hsl(var(--muted-foreground));
}

.group-records {
  display: grid;
  gap: 4px;
}

.group-record {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  padding: 8px 0;
  text-align: left;
}

.footprint-editor {
  display: grid;
  gap: 14px;
}

.footprint-editor label {
  display: grid;
  gap: 6px;
}

.date-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.end-label {
  margin-bottom: 6px;
}

.position-actions {
  min-height: 24px;
}

.location-results {
  display: grid;
  gap: 4px;
  max-height: 180px;
  overflow: auto;
}

.location-results button {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  text-align: left;
  background: hsl(var(--muted));
  border-radius: 6px;
}

@media (max-width: 1000px) {
  .footprint-layout {
    grid-template-columns: 180px minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .footprints {
    padding: 12px;
  }

  .footprint-layout {
    display: flex;
    flex-direction: column-reverse;
    gap: 12px;
  }

  .footprint-map-area,
  .footprint-list {
    width: 100%;
  }

  .date-fields {
    gap: 8px;
  }
}
</style>
