<script setup lang="ts">
import type {
  ReadingMode,
  ReadingStats,
  WereadBook,
  WereadConnection,
  WereadProgress,
  WereadSnapshot,
} from '#/api/core/weread';

import { onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useAccessStore } from '@vben/stores';

import { ReloadOutlined } from '@ant-design/icons-vue';
import {
  Alert,
  Button,
  Empty,
  InputPassword,
  message,
  Modal,
  Popconfirm,
  Spin,
  Tabs,
} from 'ant-design-vue';

import {
  disconnectWeread,
  getWereadConnection,
  getWereadProgress,
  getWereadStats,
  saveWereadConnection,
  syncWeread,
} from '#/api/core/weread';

import Dashboard from './dashboard.vue';
import { readingDate, readingTime, safeLink } from './format';
import Notes from './notes.vue';
import Shelf from './shelf.vue';

import './weread.css';

defineOptions({ name: 'Weread' });
const access = useAccessStore();
const connection = ref<WereadConnection>({ connected: false });
const snapshot = ref<WereadSnapshot>();
const stats = ref<ReadingStats>({});
const mode = ref<ReadingMode>('annually');
const baseTime = ref(0);
const tab = ref('dashboard');
const initialBookId = ref<string>();
const initialLoading = ref(true);
const syncing = ref(false);
const statsLoading = ref(false);
const error = ref('');
const settingsOpen = ref(false);
const keyInput = ref('');
const saving = ref(false);
const disconnecting = ref(false);
const revision = ref(0);
const detailBook = ref<WereadBook>();
const detailOpen = ref(false);
const detailLoading = ref(false);
const detailFailed = ref(false);
const progress = ref<WereadProgress>();
let generation = 0;
let statsVersion = 0;
let detailVersion = 0;
function resetData() {
  generation++;
  statsVersion++;
  detailVersion++;
  snapshot.value = undefined;
  stats.value = {};
  initialBookId.value = undefined;
  detailOpen.value = false;
  progress.value = undefined;
  detailBook.value = undefined;
  syncing.value = false;
  statsLoading.value = false;
  detailLoading.value = false;
  keyInput.value = '';
  error.value = '';
  revision.value++;
}
async function refresh() {
  const version = generation;
  const requestedMode = mode.value;
  syncing.value = true;
  error.value = '';
  try {
    const result = await syncWeread(requestedMode, baseTime.value);
    if (version !== generation) return;
    snapshot.value = result;
    stats.value = result.stats;
    connection.value.lastSyncTime = result.lastSyncTime;
    initialBookId.value = undefined;
    revision.value++;
  } catch {
    if (version === generation)
      error.value = '同步失败，请检查同步设置后重试。现有数据未更新。';
  } finally {
    if (version === generation) syncing.value = false;
  }
}
async function initialize() {
  const version = generation;
  initialLoading.value = true;
  try {
    const result = await getWereadConnection();
    if (version !== generation) return;
    connection.value = result;
    if (result.connected) await refresh();
  } catch {
    if (version === generation) error.value = '连接状态加载失败，请重试。';
  } finally {
    if (version === generation) initialLoading.value = false;
  }
}
async function changeMode(value: ReadingMode, selectedTime = baseTime.value) {
  const version = ++statsVersion;
  statsLoading.value = true;
  error.value = '';
  try {
    const result = await getWereadStats(
      value,
      value === 'overall' ? 0 : selectedTime,
    );
    if (version !== statsVersion) return;
    mode.value = value;
    baseTime.value = value === 'overall' ? 0 : selectedTime;
    stats.value = result;
  } catch {
    if (version === statsVersion)
      error.value = '统计加载失败，仍显示上一次成功读取的周期。';
  } finally {
    if (version === statsVersion) statsLoading.value = false;
  }
}
async function saveConnection() {
  const key = keyInput.value.trim();
  if (!/^wrk-[\w-]+$/.test(key)) {
    message.warning('请输入有效的微信读书 Key');
    return;
  }
  saving.value = true;
  const version = generation;
  try {
    const result = await saveWereadConnection(key);
    if (version !== generation) return;
    resetData();
    connection.value = result;
    settingsOpen.value = false;
    message.success('连接成功');
    await refresh();
  } catch {
    /* 请求层展示错误，保留原连接。 */
  } finally {
    saving.value = false;
  }
}
async function disconnect() {
  disconnecting.value = true;
  const version = generation;
  try {
    await disconnectWeread();
    if (version !== generation) return;
    resetData();
    connection.value = { connected: false };
    settingsOpen.value = false;
    message.success('已断开连接');
  } catch {
    /* 请求层展示错误。 */
  } finally {
    disconnecting.value = false;
  }
}
async function showBook(book: WereadBook) {
  const version = ++detailVersion;
  detailBook.value = book;
  detailOpen.value = true;
  detailLoading.value = true;
  detailFailed.value = false;
  progress.value = undefined;
  try {
    const result = await getWereadProgress(book.bookId);
    if (version === detailVersion) progress.value = result;
  } catch {
    if (version === detailVersion) detailFailed.value = true;
  } finally {
    if (version === detailVersion) detailLoading.value = false;
  }
}
function showNotes() {
  initialBookId.value = detailBook.value?.bookId;
  detailOpen.value = false;
  tab.value = 'notes';
}
watch(settingsOpen, (open) => {
  if (!open) keyInput.value = '';
});
watch(
  () => access.accessToken,
  () => {
    resetData();
    connection.value = { connected: false };
    if (access.accessToken) initialize();
  },
);
onMounted(initialize);
onBeforeUnmount(() => {
  resetData();
});
</script>
<template>
  <div class="weread-page">
    <Spin :spinning="initialLoading">
      <Alert v-if="error" :message="error" type="error" show-icon class="mb-4">
        <template #action>
          <Button
            size="small"
            :loading="syncing || initialLoading"
            @click="initialize"
          >
            重试
          </Button>
        </template>
      </Alert>
      <section
        v-if="!connection.connected && !initialLoading"
        class="wr-panel wr-connect"
      >
        <Empty description="连接微信读书，查看阅读看板、书架和笔记">
          <Button type="primary" @click="settingsOpen = true">
            连接微信读书
          </Button>
        </Empty>
      </section>
      <template v-if="snapshot">
        <Tabs v-model:active-key="tab">
          <template #rightExtra>
            <Button
              type="text"
              size="small"
              aria-label="刷新数据"
              title="刷新数据"
              :loading="syncing"
              :disabled="
                saving || disconnecting || statsLoading || initialLoading
              "
              @click="refresh"
            >
              <template #icon><ReloadOutlined /></template>
            </Button>
          </template>
          <Tabs.TabPane key="dashboard" tab="阅读看板" />
          <Tabs.TabPane key="shelf" tab="我的书架" />
          <Tabs.TabPane key="notes" tab="阅读笔记" />
        </Tabs>
        <Dashboard
          v-if="tab === 'dashboard'"
          :stats="stats"
          :mode="mode"
          :base-time="baseTime"
          :loading="statsLoading || syncing"
          @mode="changeMode"
        />
        <Spin v-else-if="tab === 'shelf'" :spinning="syncing">
          <Shelf
            :books="snapshot.shelf.books"
            :notebooks="snapshot.notebooks.books"
            @book="showBook"
          />
        </Spin>
        <Notes
          v-else
          :key="revision"
          :notebooks="snapshot.notebooks.books"
          :initial-book-id="initialBookId"
          :revision="revision"
        />
      </template>
    </Spin>
    <Modal
      v-model:open="settingsOpen"
      title="同步设置"
      centered
      :confirm-loading="saving"
      :closable="!saving && !disconnecting"
      :mask-closable="!saving && !disconnecting"
      :keyboard="!saving && !disconnecting"
      :cancel-button-props="{ disabled: saving || disconnecting }"
      :ok-button-props="{ disabled: disconnecting }"
      ok-text="验证并保存"
      @ok="saveConnection"
    >
      <p class="mb-4 text-muted-foreground">
        {{
          connection.connected
            ? '已连接。输入新的 Key 可更换连接，原有数据会重新加载。'
            : '使用你自己的微信读书 Key 连接当前账号。'
        }}
      </p>
      <InputPassword
        v-model:value="keyInput"
        :maxlength="256"
        autocomplete="off"
        placeholder="请输入微信读书 Key"
        aria-label="微信读书 Key"
        :disabled="saving || disconnecting"
      />
      <p class="my-4 text-muted-foreground">
        凭证保存在账号绑定中，仅用于读取你的微信读书数据。
      </p>
      <a
        href="https://weread.qq.com/r/weread-skills"
        target="_blank"
        rel="noopener noreferrer"
        >获取微信读书 Key ↗</a
      >
      <Popconfirm
        v-if="connection.connected"
        title="断开连接并清除保存的 Key？"
        placement="topRight"
        @confirm="disconnect"
      >
        <Button danger class="ml-4" :loading="disconnecting" :disabled="saving">
          断开连接
        </Button>
      </Popconfirm>
    </Modal>
    <Modal v-model:open="detailOpen" title="书籍详情" centered :footer="null">
      <template v-if="detailBook">
        <div class="wr-detail-head">
          <img
            v-if="safeLink(detailBook.cover)"
            :src="safeLink(detailBook.cover)"
            alt="封面"
          />
          <div>
            <h3>{{ detailBook.title }}</h3>
            <p class="text-muted-foreground">{{ detailBook.author }}</p>
          </div>
        </div>
        <Spin :spinning="detailLoading">
          <Alert v-if="detailFailed" message="进度加载失败" type="error">
            <template #action>
              <Button size="small" @click="showBook(detailBook)"> 重试 </Button>
            </template>
          </Alert>
          <div v-else class="wr-details">
            <div>
              阅读进度<strong>{{
                progress?.book?.progress == null
                  ? '—'
                  : `${progress.book.progress}%`
              }}</strong>
            </div>
            <div>
              累计阅读<strong>{{
                readingTime(progress?.book?.readingTime)
              }}</strong>
            </div>
            <div>
              最近阅读<strong>{{
                readingDate(progress?.book?.updateTime)
              }}</strong>
            </div>
            <div>
              阅读状态<strong>{{
                detailBook.finishReading === 1 ? '已读完' : '未读完'
              }}</strong>
            </div>
          </div>
        </Spin>
        <div class="mt-4 flex flex-wrap items-center gap-4">
          <Button @click="showNotes">查看笔记 </Button>
          <a
            v-if="safeLink(detailBook.deepLink)"
            :href="safeLink(detailBook.deepLink)"
            target="_blank"
            rel="noopener noreferrer"
            >在微信读书打开 ↗</a
          >
        </div>
      </template>
    </Modal>
  </div>
</template>
