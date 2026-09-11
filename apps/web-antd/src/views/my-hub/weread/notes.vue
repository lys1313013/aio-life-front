<script setup lang="ts">
import type { WereadNotebook, WereadNotes } from '#/api/core/weread';

import { computed, onBeforeUnmount, ref, watch } from 'vue';

import {
  Alert,
  Button,
  Empty,
  Input,
  message,
  Spin,
  Tabs,
} from 'ant-design-vue';

import { getWereadNotes } from '#/api/core/weread';

import { readingDate, safeLink } from './format';

const props = defineProps<{
  initialBookId?: string;
  notebooks: WereadNotebook[];
  revision: number;
}>();
const selected = ref('');
const filter = ref('');
const query = ref('');
const activeTab = ref('highlights');
const loading = ref(false);
const failed = ref(false);
const data = ref<WereadNotes>();
const cache = new Map<string, WereadNotes>();
let requestVersion = 0;
const books = computed(() =>
  props.notebooks.filter((n) =>
    `${n.book.title} ${n.book.author ?? ''}`
      .toLowerCase()
      .includes(filter.value.trim().toLowerCase()),
  ),
);
const current = computed(() =>
  props.notebooks.find((n) => n.bookId === selected.value),
);
const items = computed(() => {
  const notes = data.value;
  if (!notes) return [];
  const chapterMap = new Map(
    notes.marks.chapters?.map((c) => [c.chapterUid, c.title]),
  );
  const rows =
    activeTab.value === 'highlights'
      ? (notes.marks.updated ?? []).map((m) => ({
          id: m.bookmarkId,
          text: m.markText,
          chapter: chapterMap.get(m.chapterUid) ?? '划线',
          time: m.createTime,
          thought: notes.reviews
            .filter(
              (r) =>
                r.review.type === 1 &&
                m.range != null &&
                r.review.chapterUid === m.chapterUid &&
                r.review.range === m.range,
            )
            .map((r) => r.review.content)
            .join('\n'),
        }))
      : notes.reviews
          .filter((r) =>
            activeTab.value === 'thoughts'
              ? r.review.type === 1
              : r.review.type !== 1,
          )
          .map(({ review: r }) => ({
            id: r.reviewId,
            text: r.abstract ?? '',
            thought: r.content ?? '',
            chapter: r.chapterName ?? '书评',
            time: r.createTime,
          }));
  return rows.filter((r) =>
    `${r.text} ${r.thought}`
      .toLowerCase()
      .includes(query.value.trim().toLowerCase()),
  );
});
async function selectBook(id: string, force = false) {
  selected.value = id;
  query.value = '';
  const version = ++requestVersion;
  failed.value = false;
  data.value = undefined;
  if (!props.notebooks.some((n) => n.bookId === id)) {
    loading.value = false;
    return;
  }
  if (!force && cache.has(id)) {
    data.value = cache.get(id);
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const result = await getWereadNotes(id);
    if (version !== requestVersion) return;
    cache.set(id, result);
    data.value = result;
  } catch {
    if (version === requestVersion) failed.value = true;
  } finally {
    if (version === requestVersion) loading.value = false;
  }
}
async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success('已复制');
  } catch {
    message.warning('复制失败，请手动选择文字复制');
  }
}
watch(
  () => [props.initialBookId, props.revision],
  () => {
    cache.clear();
    selectBook(props.initialBookId || props.notebooks[0]?.bookId || '');
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  requestVersion++;
  cache.clear();
});
</script>
<template>
  <div class="wr-heading">
    <p>{{ notebooks.length }} 本笔记本</p>
  </div>
  <div class="wr-notes-layout">
    <aside>
      <Input
        v-model:value="filter"
        allow-clear
        placeholder="搜索笔记本"
        aria-label="搜索笔记本"
      />
      <div class="wr-notebook-list">
        <button
          v-for="n in books"
          :key="n.bookId"
          class="wr-notebook"
          :class="{ active: n.bookId === selected }"
          @click="selectBook(n.bookId)"
        >
          <img
            v-if="safeLink(n.book.cover)"
            :src="safeLink(n.book.cover)"
            alt="封面"
          />
          <div>
            <h3 class="wr-clamp">{{ n.book.title }}</h3>
            <small
              >{{ n.noteCount ?? 0 }} 划线 ·
              {{ n.reviewCount ?? 0 }} 点评</small
            >
          </div>
        </button>
        <Empty v-if="books.length === 0" description="暂无笔记本" />
      </div>
    </aside>
    <section class="wr-panel">
      <Spin :spinning="loading">
        <template v-if="current">
          <div class="wr-detail-head">
            <img
              v-if="safeLink(current.book.cover)"
              :src="safeLink(current.book.cover)"
              alt="封面"
            />
            <div>
              <h3>{{ current.book.title }}</h3>
              <p class="wr-muted">{{ current.book.author }}</p>
            </div>
          </div>
          <Tabs v-model:active-key="activeTab">
            <Tabs.TabPane
              key="highlights"
              :tab="`划线 ${data?.marks.updated?.length ?? 0}`"
            />
            <Tabs.TabPane
              key="thoughts"
              :tab="`想法 ${data?.reviews.filter((r) => r.review.type === 1).length ?? 0}`"
            />
            <Tabs.TabPane
              key="reviews"
              :tab="`书评 ${data?.reviews.filter((r) => r.review.type !== 1).length ?? 0}`"
            />
          </Tabs>
          <Alert v-if="failed" type="error" message="笔记加载失败">
            <template #action>
              <Button size="small" @click="selectBook(selected, true)">
                重试
              </Button>
            </template>
          </Alert>
          <template v-else-if="data">
            <Input
              v-model:value="query"
              allow-clear
              placeholder="搜索本书划线或想法"
              aria-label="搜索本书笔记"
            />
            <article v-for="item in items" :key="item.id" class="wr-note">
              <small>{{ item.chapter }}</small>
              <blockquote v-if="item.text">{{ item.text }}</blockquote>
              <p v-if="item.thought" class="wr-thought">{{ item.thought }}</p>
              <footer>
                <small>{{ readingDate(item.time) }}</small>
                <Button
                  size="small"
                  type="text"
                  @click="
                    copy([item.text, item.thought].filter(Boolean).join('\n\n'))
                  "
                >
                  复制
                </Button>
              </footer>
            </article>
            <Empty v-if="items.length === 0" description="暂无匹配的内容" />
          </template>
        </template>
        <Empty v-else description="这本书暂无笔记，可选择其他笔记本" />
      </Spin>
    </section>
  </div>
</template>
