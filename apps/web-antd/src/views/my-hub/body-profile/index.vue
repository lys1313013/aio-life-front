<script setup lang="ts">
import type { BodyProfile, MeasurementKey } from './model';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { VbenIcon } from '@vben/common-ui';
import { useAccessStore } from '@vben/stores';

import {
  Alert,
  Button,
  Form,
  FormItem,
  Input,
  InputNumber,
  Select,
  Spin,
  Tooltip,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getBodyProfile, saveBodyProfile } from '#/api/core/body-profile';
import { AppModal } from '#/components/app-modal';

import BodyFigure from './BodyFigure.vue';
import {
  calculateBmi,
  emptyProfile,
  measurements,
  measurementText,
  profilePayload,
  shoeText,
} from './model';

const access = useAccessStore();
const profile = ref<BodyProfile>(emptyProfile());
const loading = ref(false);
const ready = ref(false);
const saving = ref(false);
const draft = ref<BodyProfile | null>(null);
const error = ref('');
const formError = ref('');
const editing = ref('all');
const primary = measurements.slice(0, 3);
const dimensions = measurements.filter((field) => 'side' in field);
const clothing = [
  { key: 'topSize', label: '上衣' },
  { key: 'trousersSize', label: '裤子' },
  { key: 'shoeSize', label: '鞋码' },
] as const;
const editingFields = computed(() =>
  measurements.filter(
    (field) => editing.value === 'all' || editing.value === field.key,
  ),
);
const bmi = computed(() =>
  calculateBmi(profile.value.heightCm, profile.value.weightKg),
);
const limbContext = computed(
  () =>
    editing.value === 'all' ||
    ['calfCm', 'forearmCm', 'thighCm', 'upperArmCm'].includes(editing.value),
);
const showClothing = computed(
  () =>
    editing.value === 'all' ||
    clothing.some((field) => field.key === editing.value),
);
const sexOptions = [
  { label: '未设置', value: '' },
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
];
const sideOptions = [
  { label: '未设置', value: '' },
  { label: '左侧', value: 'left' },
  { label: '右侧', value: 'right' },
];
const armOptions = [
  { label: '未设置', value: '' },
  { label: '自然放松', value: 'relaxed' },
  { label: '屈臂收缩', value: 'flexed' },
];
const shoeOptions = [
  { label: '欧码（常见的38、42码）', value: 'EU' },
  { label: '中国码（毫米）', value: 'CN' },
  { label: '美码', value: 'US' },
  { label: '英码', value: 'UK' },
];
let active = true;
let generation = 0;

function reset() {
  generation++;
  profile.value = emptyProfile();
  ready.value = loading.value = saving.value = false;
  error.value = formError.value = '';
  draft.value = null;
}
watch(
  () => access.accessToken,
  () => {
    reset();
    if (access.accessToken) void load();
  },
  { flush: 'sync' },
);
onUnmounted(() => {
  active = false;
  reset();
});
onMounted(load);

async function load() {
  if (loading.value || saving.value || draft.value) return;
  const version = ++generation;
  loading.value = true;
  error.value = '';
  try {
    const data = await getBodyProfile();
    if (!active || version !== generation) return;
    profile.value = { ...emptyProfile(), ...data };
    ready.value = true;
  } catch (error_) {
    if (active && version === generation)
      error.value = (error_ as Error).message || '读取失败，请重试';
  } finally {
    if (active && version === generation) loading.value = false;
  }
}
function edit(key = 'all') {
  if (!ready.value || loading.value || saving.value) return;
  editing.value = key;
  formError.value = '';
  draft.value = { ...profile.value };
}
function close() {
  if (!saving.value) draft.value = null;
}
async function reload() {
  if (saving.value) return;
  draft.value = null;
  await load();
}
async function save() {
  if (!draft.value || saving.value) return;
  let payload;
  try {
    payload = profilePayload(draft.value);
  } catch (error_) {
    formError.value = (error_ as Error).message;
    return;
  }
  const version = ++generation;
  saving.value = true;
  formError.value = '';
  try {
    const data = await saveBodyProfile(payload);
    if (!active || version !== generation) return;
    profile.value = { ...emptyProfile(), ...data };
    draft.value = null;
  } catch (error_) {
    if (active && version === generation)
      formError.value = (error_ as Error).message || '保存失败，请重试';
  } finally {
    if (active && version === generation) saving.value = false;
  }
}
function setNullable(
  key: 'armState' | 'gender' | 'measurementSide' | 'shoeSystem',
  value: unknown,
) {
  if (draft.value) Object.assign(draft.value, { [key]: value || null });
}
function metricLabel(key: MeasurementKey) {
  const value = profile.value[key];
  return `编辑${measurements.find((field) => field.key === key)!.label}，当前${value === null ? '未填写' : value}`;
}
</script>

<template>
  <section class="body-profile text-foreground" aria-label="身体数据">
    <header class="profile-heading">
      <h2>身体数据</h2>
      <Button
        type="text"
        aria-label="编辑身体数据"
        :disabled="!ready || loading"
        @click="edit()"
      >
        <VbenIcon icon="lucide:pencil" />
      </Button>
    </header>
    <Alert v-if="error" type="error" :message="error" class="mb-3">
      <template #action>
        <Button size="small" aria-label="重试" :loading="loading" @click="load">
          重试
        </Button>
      </template>
    </Alert>
    <Spin :spinning="loading" :delay="100">
      <div class="profile-data" :aria-busy="loading">
        <div class="profile-primary">
          <button
            v-for="field in primary.slice(0, 2)"
            :key="field.key"
            type="button"
            class="metric"
            :aria-label="metricLabel(field.key)"
            :disabled="!ready || loading"
            @click="edit(field.key)"
          >
            <span class="metric-label">{{ field.label }}</span
            ><span class="metric-number">{{
              measurementText(profile[field.key])
            }}</span
            ><span class="metric-unit">{{ field.unit }}</span>
          </button>
          <div class="metric">
            <span class="metric-label bmi-label"
              >BMI<Tooltip
                trigger="click"
                title="体重（kg）÷ 身高（m）的平方，自动计算"
                ><button
                  type="button"
                  aria-label="BMI计算方式"
                  class="help-button"
                >
                  <VbenIcon
                    icon="lucide:circle-help"
                  /></button></Tooltip></span
            ><span
              class="metric-number"
              aria-live="polite"
              data-testid="body-bmi"
              >{{ measurementText(bmi) }}</span
            >
          </div>
          <button
            type="button"
            class="metric"
            :disabled="!ready || loading"
            :aria-label="metricLabel('bodyFatPercent')"
            @click="edit('bodyFatPercent')"
          >
            <span class="metric-label">体脂率</span
            ><span class="metric-number">{{
              measurementText(profile.bodyFatPercent)
            }}</span
            ><span class="metric-unit">%</span>
          </button>
        </div>
        <div class="profile-anatomy">
          <BodyFigure :gender="profile.gender" class="profile-figure" />
          <button
            v-for="field in dimensions"
            :key="field.key"
            type="button"
            class="measure"
            :class="'side' in field ? field.side : ''"
            :style="{ top: `${'top' in field ? field.top : 0}%` }"
            :aria-label="metricLabel(field.key)"
            :disabled="!ready || loading"
            @click="edit(field.key)"
          >
            <span class="metric-label">{{ field.label }}</span
            ><span class="measure-number">{{
              measurementText(profile[field.key])
            }}</span
            ><span class="metric-unit">cm</span>
          </button>
        </div>
        <details class="profile-extra">
          <summary>穿戴尺码与身体长度</summary>
          <div class="clothing-grid">
            <button
              v-for="field in clothing"
              :key="field.key"
              type="button"
              :disabled="!ready || loading"
              :aria-label="`编辑${field.label}`"
              @click="edit(field.key)"
            >
              <span class="metric-label">{{ field.label }}</span
              ><span>{{
                field.key === 'shoeSize'
                  ? shoeText(profile)
                  : profile[field.key] || '—'
              }}</span>
            </button>

            <button
              type="button"
              :disabled="!ready || loading"
              aria-label="编辑腿内侧长"
              @click="edit('inseamCm')"
            >
              <span class="metric-label">腿内侧长</span
              ><span
                >{{ measurementText(profile.inseamCm)
                }}<span class="metric-unit">cm</span></span
              >
            </button>
          </div>
        </details>
        <footer v-if="profile.updateTime">
          {{ dayjs(profile.updateTime).format('更新于 YYYY.MM.DD HH:mm') }}
        </footer>
      </div>
    </Spin>
    <AppModal
      :open="!!draft"
      :title="editing === 'all' ? '编辑身体数据' : undefined"
      aria-label="编辑身体数据"
      :width="editing === 'all' ? 580 : 400"
      :confirm-loading="saving"
      @cancel="close"
      @ok="save"
    >
      <Form
        v-if="draft"
        name="body-profile-editor"
        :model="draft"
        layout="vertical"
        :disabled="saving"
      >
        <FormItem v-if="editing === 'all'" name="gender" label="性别">
          <Select
            :value="draft.gender || ''"
            :options="sexOptions"
            aria-label="性别"
            @change="setNullable('gender', $event)"
          />
        </FormItem>
        <div class="editor-grid" :class="{ single: editing !== 'all' }">
          <FormItem
            v-for="field in editingFields"
            :key="field.key"
            :name="field.key"
            :label="`${field.label}（${field.unit}）`"
          >
            <InputNumber
              :value="draft[field.key] ?? undefined"
              @change="
                draft[field.key] = $event == null ? null : Number($event)
              "
              :aria-label="field.label"
              :min="0.1"
              :max="field.key === 'bodyFatPercent' ? 99.9 : 999.9"
              :precision="1"
              :step="0.1"
              :controls="false"
              placeholder="未填写"
              class="w-full"
            />
          </FormItem>
        </div>
        <div v-if="limbContext" class="editor-grid">
          <FormItem name="measurementSide" label="四肢围度测量侧别">
            <Select
              :value="draft.measurementSide || ''"
              :options="sideOptions"
              aria-label="测量侧别"
              @change="setNullable('measurementSide', $event)"
            />
          </FormItem>

          <FormItem name="armState" label="上臂测量状态">
            <Select
              :value="draft.armState || ''"
              :options="armOptions"
              aria-label="上臂测量状态"
              @change="setNullable('armState', $event)"
            />
          </FormItem>
        </div>
        <div v-if="showClothing" class="editor-grid">
          <FormItem
            v-if="editing === 'all' || editing === 'topSize'"
            name="topSize"
            label="上衣尺码"
          >
            <Input
              :value="draft.topSize ?? ''"
              @update:value="draft.topSize = $event || null"
              aria-label="上衣尺码"
              :maxlength="32"
              placeholder="例如 L"
              allow-clear
            />
          </FormItem>

          <FormItem
            v-if="editing === 'all' || editing === 'trousersSize'"
            name="trousersSize"
            label="裤子尺码"
          >
            <Input
              :value="draft.trousersSize ?? ''"
              @update:value="draft.trousersSize = $event || null"
              aria-label="裤子尺码"
              :maxlength="32"
              placeholder="例如 W30 / L32"
              allow-clear
            />
          </FormItem>

          <FormItem
            v-if="editing === 'all' || editing === 'shoeSize'"
            name="shoeSystem"
            label="鞋码类型"
          >
            <Select
              :value="draft.shoeSystem || 'EU'"
              @change="setNullable('shoeSystem', $event)"
              :options="shoeOptions"
              aria-label="鞋码类型"
              placeholder="欧码（常见的38、42码）"
            />
          </FormItem>

          <FormItem
            v-if="editing === 'all' || editing === 'shoeSize'"
            name="shoeSize"
            label="鞋码"
          >
            <Input
              :value="draft.shoeSize ?? ''"
              @update:value="draft.shoeSize = $event || null"
              aria-label="鞋码"
              :maxlength="5"
              placeholder="例如 42"
              allow-clear
            />
          </FormItem>
        </div>
        <Alert
          v-if="formError"
          type="error"
          :message="formError"
          role="alert"
        />
      </Form>
      <template v-if="formError" #footer-leading>
        <Button type="link" :disabled="saving" @click="reload">
          关闭并重新读取
        </Button>
      </template>
    </AppModal>
  </section>
</template>

<style scoped>
.body-profile {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 12px 20px 20px;
}

.profile-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;
}

h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
}

.profile-data {
  position: relative;
}

.profile-primary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric {
  text-align: left;
  background: transparent;
  border: 0;
  padding: 0;
  min-height: 68px;
  border-radius: 6px;
}

.metric-label {
  display: block;
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  min-height: 20px;
}

.metric-number {
  font-size: 30px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}

.metric-unit {
  font-size: 11px;
  color: hsl(var(--muted-foreground));
  margin-left: 4px;
}

.bmi-label {
  display: flex;
  align-items: center;
  gap: 4px;
}

.help-button {
  display: inline-flex;
  padding: 2px;
  font-size: 12px;
  color: inherit;
}

.profile-anatomy {
  height: 370px;
  position: relative;
  margin-top: 10px;
}

.profile-figure {
  position: absolute;
  left: 50%;
  top: 4px;
  height: 350px;
  width: 180px;
  transform: translateX(-50%);
}

.measure {
  position: absolute;
  min-width: 70px;
  min-height: 50px;
  border: 0;
  background: transparent;
  padding: 2px 0;
  text-align: left;
  border-radius: 6px;
}

.measure::after {
  content: '';
  position: absolute;
  top: 25px;
  height: 1px;
  width: clamp(10px, 4vw, 48px);
  background: hsl(var(--border));
}

.measure.left {
  left: 0;
}

.measure.right {
  right: 0;
  text-align: right;
}

.measure.left::after {
  left: calc(100% + 8px);
}

.measure.right::after {
  right: calc(100% + 8px);
}

.measure-number {
  font-size: 20px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}

button:enabled {
  cursor: pointer;
}

.metric:hover:enabled,
.measure:hover:enabled,
.clothing-grid button:hover:enabled {
  background: hsl(var(--muted) / 45%);
}

button:disabled {
  cursor: default;
}

.profile-extra {
  border-top: 1px solid hsl(var(--border));
  margin-top: 12px;
  padding-top: 14px;
}

summary {
  color: hsl(var(--muted-foreground));
  font-size: 12px;
  cursor: pointer;
  padding: 8px 0;
}

.clothing-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px 12px;
  margin-top: 12px;
}

.clothing-grid button {
  text-align: left;
  overflow-wrap: anywhere;
  min-height: 44px;
}

footer {
  margin-top: 18px;
  text-align: right;
  color: hsl(var(--muted-foreground));
  font-size: 11px;
}

.editor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

.editor-grid.single {
  grid-template-columns: 1fr;
}

@media (max-width: 480px) {
  .body-profile {
    padding: 8px 0 16px;
  }

  .profile-primary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 28px;
  }

  .profile-figure {
    width: 152px;
  }

  .measure {
    min-width: 56px;
  }

  .measure::after {
    width: 12px;
  }

  .metric-number {
    font-size: 28px;
  }

  .clothing-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
