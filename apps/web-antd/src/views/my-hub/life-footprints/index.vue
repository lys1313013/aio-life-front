<script setup lang="ts">
import type {
  Coordinate,
  Draft,
  Footprint,
  FootprintMapRecord,
  LocationGroup,
  LocationResult,
  MapConfig,
} from './model';
import type { DetailDraft, FootprintPeriod } from './periods';

import type { SystemRegion } from '#/api/core/system-region';

import {
  computed,
  nextTick,
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
  AutoComplete,
  Button,
  Checkbox,
  DatePicker,
  Input,
  Spin,
} from 'ant-design-vue';

import {
  getFootprintMapConfig,
  getFootprints,
  reverseFootprintLocation,
  saveFootprintBatch,
  searchFootprintLocations,
} from '#/api/core/life-footprints';
import { AppModal, AppModalDelete } from '#/components/app-modal';

import FootprintMap from './FootprintMap.vue';
import { resolveLocationRegion } from './location-region';
import {
  emptyDraft,
  PRESENT_DATE,
  sortFootprints,
  timeLabel,
  validateDraft,
  validCoordinate,
} from './model';
import {
  batchPayload,
  groupPeriods,
  mergeBatchResult,
  periodKey,
} from './periods';
import RegionPicker from './RegionPicker.vue';
import { regionCity, regionName } from './regions';

const access = useAccessStore();
const choices = ref<Footprint[]>([]);
const records = ref<Footprint[]>([]);
const selected = ref<Footprint | null>(null);
const config = ref<MapConfig>({
  searchEnabled: false,
  coordinateSystem: 'GCJ02',
});
const failed = ref(false);
const mapConfigReady = ref(false);
const loading = ref(false);
const ready = ref(false);
const resolving = ref(false);
const saving = ref(false);
const searching = ref(false);
const details = ref<DetailDraft[]>([]);
const activeDetailKey = ref('');
const period = ref({ startDate: '', endDate: '' });
const deletedIds = ref<string[]>([]);
const selectedPeriodKey = ref<null | string>(null);
const periods = computed(() => groupPeriods(records.value));
const picking = ref(false);
const editorChoices = ref<Footprint[]>([]);
const saveUncertain = ref(false);
const fallbackDraft = ref<Draft>(emptyDraft());
let detailSequence = 0;
const draft = computed<Draft>({
  get: () =>
    details.value.find((item) => item.key === activeDetailKey.value)?.value ||
    fallbackDraft.value,
  set: (value) => {
    const item = details.value.find(
      (item) => item.key === activeDetailKey.value,
    );
    if (item) item.value = value;
  },
});
const editorRecords = computed<FootprintMapRecord[]>(() =>
  details.value
    .filter(({ value }) => validCoordinate(value))
    .map(({ key, value }) => ({
      ...value,
      ...period.value,
      id: key,
      markerNumber: details.value.findIndex((item) => item.key === key) + 1,
      longitude: value.longitude!,
      latitude: value.latitude!,
    })),
);
const activeDetailIndex = computed(() =>
  details.value.findIndex((item) => item.key === activeDetailKey.value),
);
const editorOpen = ref(false);
const regionPath = ref<SystemRegion[]>([]);
function regionChanged(path: SystemRegion[]) {
  const extending =
    regionPath.value.length > 0 &&
    path.length > regionPath.value.length &&
    regionPath.value.every((item, index) => item.code === path[index]?.code);
  regionRevision++;
  resolving.value = false;
  regionPath.value = path;
  invalidateSearch();
  draft.value.city = regionCity(path);
  if (!extending) {
    draft.value.longitude = draft.value.latitude = null;
    draft.value.providerUid = null;
    draft.value.confirmed = false;
  }
  mapHint.value = '';
}
const error = ref('');
const validationAttempted = ref(false);
const fieldErrors = computed<ReturnType<typeof validateDraft>>(() =>
  validationAttempted.value
    ? validateDraft({ ...draft.value, ...period.value })
    : {},
);
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
let regionRevision = 0;
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
  mapConfigReady.value = true;
  loading.value = false;
}
function invalidateSearch() {
  clearTimeout(debounce);
  searchRevision++;
  candidates.value = [];
  searching.value = false;
  candidate.value = null;
}
function dismissLocationSearch(event: KeyboardEvent) {
  if (candidates.value.length > 0 || searching.value) {
    event.stopPropagation();
    invalidateSearch();
  }
}
function resetDetailAsync() {
  editRevision++;
  regionRevision++;
  resolving.value = false;
  invalidateSearch();
  regionPath.value = [];
  mapHint.value = '';
  editorChoices.value = [];
}
function openEditor(record?: Footprint) {
  validationAttempted.value = false;
  reloadAvailable.value = false;
  saveUncertain.value = false;
  resetDetailAsync();
  error.value = '';
  deletedIds.value = [];
  period.value = record
    ? { startDate: record.startDate, endDate: record.endDate }
    : { startDate: '', endDate: '' };
  const group = record
    ? records.value.filter((r) => periodKey(r) === periodKey(record))
    : [];
  details.value = group.map((r) => ({
    key: r.id,
    value: { ...r, confirmed: true },
  }));
  if (details.value.length === 0)
    details.value.push({
      key: `draft-${++detailSequence}`,
      value: emptyDraft(),
    });
  activeDetailKey.value = record?.id || details.value[0]!.key;
  picking.value = !record;
  editorOpen.value = true;
  void nextTick(focusEditor);
}
function choosePeriod(group: FootprintPeriod) {
  selectedPeriodKey.value = group.key;
  selected.value = group.records.length === 1 ? group.records[0]! : null;
  choices.value = group.records.length === 1 ? [] : group.records;
  mainMap.value?.focus(group.records);
}
function selectDetail(key: string) {
  if (saving.value || key === activeDetailKey.value) return;
  resetDetailAsync();
  activeDetailKey.value = key;
  picking.value = false;
}
function addDetail() {
  if (saving.value || saveUncertain.value) return;
  if (details.value.length >= 200) {
    error.value = '一次最多保存200条明细';
    return;
  }
  const value = emptyDraft();
  const key = `draft-${++detailSequence}`;
  details.value.push({ key, value });
  selectDetail(key);
  picking.value = true;
}
function selectEditorGroup(group: LocationGroup) {
  if (saving.value) return;
  if (group.records.length === 1) selectDetail(group.records[0]!.id);
  else editorChoices.value = group.records;
}
function focusEditor() {
  if (editorRecords.value.length > 0)
    editorMap.value?.focus(editorRecords.value);
}
function closeEditor() {
  if (!saving.value) {
    editRevision++;
    resetDetailAsync();
    editorOpen.value = false;
  }
}
function choose(record: Footprint) {
  selectedPeriodKey.value = periodKey(record);
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
  selectedPeriodKey.value = null;
  choices.value = group.records;
  if (!samePosition(group.records)) mainMap.value?.focus(group.records);
}
function dismiss() {
  selectedPeriodKey.value = null;
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
      const result = await searchFootprintLocations(
        keyword,
        regionName(regionPath.value) || '全国',
      );
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
  picking.value = true;
  editorMap.value?.focus([...editorRecords.value, location]);
  void completeLocation(location);
}
function confirmPosition() {
  if (point.value) {
    invalidateSearch();
    draft.value.confirmed = true;
    picking.value = false;
    mapHint.value = '';
  }
}
async function pickPosition(location: Coordinate) {
  if (saving.value || !picking.value) return;
  invalidateSearch();
  picking.value = false;
  draft.value = {
    ...draft.value,
    ...location,
    providerUid: null,
    confirmed: true,
  };
  mapHint.value = '';
  await completeLocation(location, true);
}
async function completeLocation(location: Coordinate, fillName = false) {
  const revision = ++regionRevision;
  const editing = editRevision;
  const token = access.accessToken;
  const current = () =>
    active &&
    editorOpen.value &&
    token === access.accessToken &&
    editing === editRevision &&
    revision === regionRevision;
  if (!config.value.searchEnabled) return;
  // 换点后先清除旧地区，自动回填不会触发手选地区的坐标失效逻辑。
  draft.value.regionCode = null;
  regionPath.value = [];
  draft.value.city = null;
  resolving.value = true;
  try {
    const result = await reverseFootprintLocation(
      location.longitude,
      location.latitude,
    );
    if (!current()) return;
    if (fillName && !draft.value.placeName.trim())
      draft.value.placeName = result.placeName;
    draft.value.city = result.city || null;
    const path = await resolveLocationRegion(result.region);
    if (!current()) return;
    regionPath.value = path;
    draft.value.regionCode = path.at(-1)?.code || null;
    draft.value.city = regionCity(path) || result.city || null;
    mapHint.value =
      path.at(-1)?.level === 4 ? '' : '未完整识别地区，可手动补充';
  } catch {
    if (current()) mapHint.value = '地区自动补全失败，可手动选择';
  } finally {
    if (current()) resolving.value = false;
  }
}
async function save() {
  if (saving.value || resolving.value || saveUncertain.value) return;
  reloadAvailable.value = false;
  validationAttempted.value = true;
  error.value = '';
  const invalid = details.value.find(
    ({ value }) =>
      Object.keys(validateDraft({ ...value, ...period.value })).length > 0,
  );
  if (invalid) {
    selectDetail(invalid.key);
    return;
  }
  let payload;
  try {
    payload = batchPayload(period.value, details.value, deletedIds.value);
  } catch (error_) {
    error.value = (error_ as Error).message;
    return;
  }
  const revision = editRevision;
  const token = access.accessToken;
  saving.value = true;
  invalidateSearch();
  try {
    const saved = await saveFootprintBatch(payload);
    if (!active || revision !== editRevision || token !== access.accessToken)
      return;
    pageRevision++;
    loading.value = false;
    records.value = mergeBatchResult(
      records.value,
      saved,
      payload.deletedIds || [],
    );
    const first = saved[0];
    dismiss();
    editorOpen.value = false;
    if (first) {
      const group = groupPeriods(records.value).find(
        (g) => g.key === periodKey(first),
      );
      if (group) choosePeriod(group);
    }
  } catch (error_) {
    if (revision !== editRevision) return;
    const status = (error_ as { response?: { status?: number } })?.response
      ?.status;
    saveUncertain.value = !status || status >= 500;
    reloadAvailable.value = true;
    error.value = saveUncertain.value
      ? '保存结果未确认，请重新读取后再操作，避免重复新增'
      : '保存失败，输入已保留，可修改后重试';
  } finally {
    if (revision === editRevision) saving.value = false;
  }
}
function remove() {
  if (saving.value || saveUncertain.value) return;
  const current = details.value.find(
    (item) => item.key === activeDetailKey.value,
  );
  if (!current) return;
  if (current.value.id) deletedIds.value.push(current.value.id);
  details.value = details.value.filter((item) => item.key !== current.key);
  resetDetailAsync();
  activeDetailKey.value = details.value[0]?.key || '';
  picking.value = false;
}
function suspend() {
  active = false;
  pageRevision++;
  editRevision++;
  regionRevision++;
  resolving.value = false;
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
    <div class="footprint-layout">
      <aside class="footprint-list" :aria-busy="loading">
        <Button
          type="dashed"
          class="footprint-add"
          aria-label="新增生活足迹"
          :disabled="!ready || loading"
          @click="openEditor()"
        >
          <IconifyIcon class="size-5" icon="mdi:plus" />
        </Button>
        <Spin v-if="loading" class="list-loading" />
        <div
          v-for="group in periods"
          :key="group.key"
          class="footprint-row"
          :class="{ selected: selectedPeriodKey === group.key }"
        >
          <div class="footprint-period-heading">
            <button
              type="button"
              class="footprint-period-time footprint-time"
              :aria-pressed="selectedPeriodKey === group.key"
              @click="choosePeriod(group)"
            >
              {{ timeLabel(group) }}
            </button>
            <Button
              type="text"
              class="footprint-edit"
              aria-label="编辑生活足迹"
              @click="
                openEditor(
                  selected && periodKey(selected) === group.key
                    ? selected
                    : group.records[0],
                )
              "
            >
              <IconifyIcon class="size-4" icon="mdi:pencil-outline" />
            </Button>
          </div>
          <button
            v-for="record in group.records"
            :key="record.id"
            type="button"
            class="footprint-place"
            :class="{
              selected:
                selected?.id === record.id ||
                choices.some((item) => item.id === record.id),
            }"
            :aria-pressed="
              selected?.id === record.id ||
              choices.some((item) => item.id === record.id)
            "
            @click="choose(record)"
          >
            <span>{{ record.placeName }}</span>
            <span v-if="record.note" class="footprint-time detail-note">{{
              record.note
            }}</span>
          </button>
        </div>
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
          :tencent="config.tencent"
          :pending="!mapConfigReady"
          :records="records"
          :selected-id="selected?.id"
          small
          @select="selectGroup"
        />
      </div>
    </div>
    <AppModal
      :open="editorOpen"
      :width="980"
      :busy="saving"
      :confirm-loading="saving"
      :ok-button-props="{ disabled: resolving || saveUncertain }"
      ok-text="保存全部"
      @ok="save"
      @cancel="closeEditor"
      @update:open="
        (value) => {
          if (!value) closeEditor();
        }
      "
    >
      <div v-if="editorOpen" class="footprint-editor">
        <div class="date-fields">
          <div class="editor-field">
            <div class="date-label">
              <span class="required-mark" aria-hidden="true">*</span
              ><label for="footprint-start">开始</label>
            </div>
            <DatePicker
              id="footprint-start"
              aria-label="开始"
              aria-required="true"
              :aria-invalid="!!fieldErrors.startDate"
              :aria-describedby="
                fieldErrors.startDate ? 'footprint-start-error' : undefined
              "
              :status="fieldErrors.startDate ? 'error' : undefined"
              :value="period.startDate || undefined"
              @update:value="
                (value) => {
                  period.startDate = value == null ? '' : String(value);
                }
              "
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              placeholder="选择日期"
              class="w-full"
              :disabled="saving"
            />
            <span
              v-if="fieldErrors.startDate"
              id="footprint-start-error"
              class="field-error"
              role="alert"
              >{{ fieldErrors.startDate }}</span
            >
          </div>
          <div class="editor-field">
            <div class="end-label">
              <span class="date-label"
                ><span
                  v-if="period.endDate !== PRESENT_DATE"
                  class="required-mark"
                  aria-hidden="true"
                  >*</span
                ><label for="footprint-end">结束</label></span
              ><Checkbox
                :checked="period.endDate === PRESENT_DATE"
                :disabled="saving"
                @change="
                  period.endDate = $event.target.checked ? PRESENT_DATE : ''
                "
              >
                至今
              </Checkbox>
            </div>
            <DatePicker
              id="footprint-end"
              aria-label="结束"
              :aria-required="period.endDate !== PRESENT_DATE"
              :aria-invalid="!!fieldErrors.endDate"
              :aria-describedby="
                fieldErrors.endDate ? 'footprint-end-error' : undefined
              "
              :status="fieldErrors.endDate ? 'error' : undefined"
              :value="
                period.endDate === PRESENT_DATE
                  ? undefined
                  : period.endDate || undefined
              "
              @update:value="
                (value) => {
                  period.endDate = value == null ? '' : String(value);
                }
              "
              value-format="YYYY-MM-DD"
              format="YYYY-MM-DD"
              placeholder="选择日期"
              class="w-full"
              :disabled="saving || period.endDate === PRESENT_DATE"
            />
            <span
              v-if="fieldErrors.endDate"
              id="footprint-end-error"
              class="field-error"
              role="alert"
              >{{ fieldErrors.endDate }}</span
            >
          </div>
        </div>
        <div class="editor-workspace">
          <aside class="editor-sidebar">
            <div class="detail-heading">
              <span>地点明细</span>
            </div>
            <div class="editor-detail-list">
              <button
                v-for="(item, index) in details"
                :key="item.key"
                type="button"
                class="editor-detail-row"
                :class="{ selected: item.key === activeDetailKey }"
                :aria-pressed="item.key === activeDetailKey"
                :disabled="saving"
                @click="selectDetail(item.key)"
              >
                <span class="detail-number">{{ index + 1 }}</span
                ><span class="detail-copy"
                  >{{ item.value.placeName || '新地点'
                  }}<small>{{
                    item.value.note ||
                    (item.value.confirmed ? '已定位' : '待确认位置')
                  }}</small></span
                >
              </button>
            </div>
            <Button
              class="editor-add"
              type="dashed"
              aria-label="添加明细"
              :disabled="saving || saveUncertain || details.length >= 200"
              @click="addDetail"
            >
              <IconifyIcon class="size-5" icon="mdi:plus" />
            </Button>
          </aside>
          <div class="editor-main">
            <div v-if="details.length > 0" class="position-actions">
              <Button
                v-if="draft.confirmed || !point"
                type="text"
                :disabled="saving"
                :aria-pressed="picking"
                :aria-label="picking ? '取消选点' : '调整位置'"
                @click="picking = !picking"
              >
                <IconifyIcon
                  class="size-5"
                  :icon="
                    picking ? 'mdi:close' : 'mdi:map-marker-radius-outline'
                  "
                />
              </Button>
              <span
                class="footprint-time"
                :class="{ 'field-error': fieldErrors.position }"
                :role="fieldErrors.position ? 'alert' : undefined"
                aria-live="polite"
                ><span class="required-mark" aria-hidden="true">*</span
                >{{
                  fieldErrors.position ||
                  (draft.confirmed
                    ? '位置已确认'
                    : point
                      ? '请确认所选位置'
                      : '请选择地图位置')
                }}</span
              >
              <Button
                v-if="point && !draft.confirmed"
                type="link"
                :disabled="saving"
                @click="confirmPosition"
              >
                确认位置
              </Button>
            </div>
            <span v-if="details.length > 0 && mapHint" class="footprint-time">{{
              mapHint
            }}</span>
            <div class="editor-shared-map">
              <FootprintMap
                ref="editorMap"
                :records="editorRecords"
                :selected-id="activeDetailKey"
                :point="draft.confirmed ? null : point"
                :tencent="config.tencent"
                :pending="!mapConfigReady"
                :picking="picking && !saving"
                numbered
                overview
                :height="330"
                @pick="pickPosition"
                @select="selectEditorGroup"
                @ready="focusEditor"
              />
              <div v-if="editorChoices.length > 0" class="editor-map-choices">
                <div class="detail-heading">
                  <span>此处有 {{ editorChoices.length }} 条明细</span
                  ><Button
                    type="text"
                    aria-label="关闭地点明细"
                    @click="editorChoices = []"
                  >
                    <IconifyIcon class="size-4" icon="mdi:close" />
                  </Button>
                </div>
                <button
                  v-for="record in editorChoices"
                  :key="record.id"
                  type="button"
                  class="group-record"
                  @click="
                    selectDetail(record.id);
                    editorChoices = [];
                  "
                >
                  <span
                    >{{
                      details.findIndex((item) => item.key === record.id) + 1
                    }}
                    · {{ record.placeName }}</span
                  ><span class="footprint-time">{{ record.note }}</span>
                </button>
              </div>
            </div>
            <div v-if="details.length > 0" class="editor-fields">
              <div class="detail-heading">
                <span
                  ><span class="detail-number">{{
                    activeDetailIndex + 1
                  }}</span>
                  当前明细</span
                ><AppModalDelete
                  :disabled="saving || saveUncertain"
                  :action="remove"
                  title="移除这条明细？保存全部后生效"
                />
              </div>
              <div class="editor-field">
                <span>所在地区 <Spin v-if="resolving" size="small" /></span>
                <RegionPicker
                  v-if="editorOpen"
                  :key="activeDetailKey"
                  v-model:value="draft.regionCode"
                  :disabled="saving"
                  @change="regionChanged"
                  @restored="regionPath = $event"
                />
              </div>
              <label
                class="editor-field"
                data-enter-submit="ignore"
                @keydown.esc="dismissLocationSearch"
              >
                <span
                  ><span class="required-mark" aria-hidden="true">*</span
                  >地点</span
                >
                <AutoComplete
                  v-model:value="draft.placeName"
                  :status="fieldErrors.placeName ? 'error' : undefined"
                  aria-label="地点"
                  :disabled="saving"
                  :options="
                    candidates.map((location, index) => ({
                      value: String(index),
                      label: location.placeName,
                      location,
                    }))
                  "
                  :list-height="180"
                  :virtual="false"
                  popup-class-name="location-results"
                  @search="searchName"
                  @blur="invalidateSearch"
                  @select="
                    (value: unknown) => {
                      const location = candidates[Number(value)];
                      if (location) selectCandidate(location);
                    }
                  "
                >
                  <Input
                    aria-label="地点"
                    aria-required="true"
                    :status="fieldErrors.placeName ? 'error' : undefined"
                    :aria-invalid="!!fieldErrors.placeName"
                    :aria-describedby="
                      fieldErrors.placeName
                        ? 'footprint-place-error'
                        : undefined
                    "
                    placeholder="搜索地点或填写名称"
                    :maxlength="100"
                  >
                    <template #suffix>
                      <Spin v-if="searching" size="small" />
                    </template>
                  </Input>
                  <template #option="{ location }">
                    <div class="location-result">
                      <span>{{ location.placeName }}</span>
                      <span class="footprint-time">
                        {{ location.city }} {{ location.address }}
                      </span>
                    </div>
                  </template>
                </AutoComplete>
                <span
                  v-if="fieldErrors.placeName"
                  id="footprint-place-error"
                  class="field-error"
                  role="alert"
                  >{{ fieldErrors.placeName }}</span
                >
              </label>
              <label class="editor-field"
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
                /><span
                  v-if="fieldErrors.note"
                  class="field-error"
                  role="alert"
                  >{{ fieldErrors.note }}</span
                ></label
              >
            </div>
            <p v-else class="footprint-time editor-deleted">
              本时间段的全部明细将在保存后删除，也可继续添加明细。
            </p>
          </div>
        </div>
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
      <template #footer-leading>
        <span class="footprint-time"
          >{{ details.length }} 条明细，共用 1 个时间段</span
        >
      </template>
    </AppModal>
  </section>
</template>

<style scoped>
.footprints {
  padding: 16px;
}

.footprint-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 44px;
  padding: 0;
  color: hsl(var(--foreground));
  background: hsl(var(--card));
  border-color: hsl(var(--border));
  border-radius: 12px;
}

.footprint-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.footprint-list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
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
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  transition:
    border-color 0.2s,
    background-color 0.2s;
}

.footprint-row:hover {
  border-color: hsl(var(--primary) / 40%);
}

.footprint-row.selected {
  background: hsl(var(--primary) / 5%);
  border-color: hsl(var(--primary) / 60%);
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

.detail-heading,
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

.footprint-period-heading {
  display: flex;
  align-items: center;
  gap: 4px;
}

.footprint-period-time {
  flex: 1;
  min-width: 0;
  padding: 6px 4px;
  text-align: left;
  overflow-wrap: anywhere;
}

.footprint-edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 0;
  color: hsl(var(--muted-foreground));
}

.footprint-place {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  padding: 6px 4px;
  border-radius: 4px;
  text-align: left;
  overflow-wrap: anywhere;
}

.footprint-place:hover,
.footprint-place.selected {
  color: hsl(var(--primary));
  background: hsl(var(--accent));
}

.detail-note {
  white-space: pre-wrap;
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
  gap: 18px;
  align-items: start;
}

.editor-fields {
  padding-top: 14px;
  display: grid;
  gap: 14px;
  min-width: 0;
}

.editor-map-panel {
  min-width: 0;
}

.footprint-editor > :deep(.ant-alert) {
  grid-column: 1 / -1;
}

.editor-field {
  display: grid;
  gap: 6px;
}

.required-mark {
  margin-right: 4px;
  color: hsl(var(--destructive));
}

.field-error {
  display: block;
  color: hsl(var(--destructive));
  font-size: 12px;
}

.date-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: start;
}

.end-label {
  min-height: 22px;
  margin-bottom: 0;
}

.position-actions {
  min-height: 24px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.location-result {
  display: flex;
  flex-direction: column;
  gap: 4px;
  white-space: normal;
  overflow-wrap: anywhere;
}

@media (max-width: 1000px) {
  .footprint-layout {
    grid-template-columns: 240px minmax(0, 1fr);
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

  .required-mark {
    margin-right: 4px;
    color: hsl(var(--destructive));
  }

  .field-error {
    display: block;
    color: hsl(var(--destructive));
    font-size: 12px;
  }

  .date-fields {
    gap: 8px;
  }

  .footprint-editor {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }
}

.editor-workspace {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.editor-sidebar {
  border-right: 1px solid hsl(var(--border));
  padding-right: 14px;
  min-width: 0;
}

.editor-main,
.editor-shared-map {
  min-width: 0;
}

.editor-shared-map {
  position: relative;
}

.editor-detail-list {
  display: grid;
  gap: 4px;
  margin-top: 12px;
}

.editor-detail-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 8px;
  text-align: left;
  border-radius: 8px;
  width: 100%;
}

.editor-detail-row.selected {
  background: hsl(var(--accent));
  color: hsl(var(--primary));
}

.detail-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 24px;
  height: 24px;
  background: hsl(var(--muted));
  border-radius: 6px;
  font-size: 12px;
}

.selected .detail-number {
  color: hsl(var(--primary-foreground));
  background: hsl(var(--primary));
}

.detail-copy {
  min-width: 0;
  overflow-wrap: anywhere;
}

.detail-copy small {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  margin-top: 3px;
}

.editor-add {
  margin-top: 12px;
  width: 100%;
}

.editor-map-choices {
  position: absolute;
  bottom: 24px;
  left: 12px;
  z-index: 3;
  width: min(300px, calc(100% - 24px));
  max-height: 200px;
  overflow: auto;
  padding: 10px 12px;
  border-radius: 8px;
  background: hsl(var(--background));
  box-shadow: 0 2px 14px #0002;
}

.editor-map-choices .group-record {
  width: 100%;
  overflow-wrap: anywhere;
}

.editor-map-choices .group-record span {
  min-width: 0;
}

.editor-deleted {
  padding: 16px 0;
}

@media (max-width: 760px) {
  .editor-workspace {
    grid-template-columns: 155px minmax(0, 1fr);
    gap: 14px;
  }
}

@media (max-width: 600px) {
  .editor-workspace {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }

  .editor-sidebar {
    border-right: 0;
    padding-right: 0;
  }

  .editor-detail-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .editor-shared-map :deep(.footprint-map) {
    height: 300px !important;
  }
}
</style>
