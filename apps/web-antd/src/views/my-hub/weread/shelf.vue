<script setup lang="ts">
import type { WereadBook, WereadNotebook } from '#/api/core/weread';

import { computed, ref } from 'vue';

import { Empty, Input, Select } from 'ant-design-vue';

import { safeLink } from './format';

const props = defineProps<{
  books: WereadBook[];
  notebooks: WereadNotebook[];
}>();
const emit = defineEmits<{ book: [value: WereadBook] }>();
const query = ref('');
const filter = ref('all');
const sort = ref('recent');
const noteMap = computed(
  () => new Map(props.notebooks.map((n) => [n.bookId, n])),
);
const filtered = computed(() =>
  props.books
    .filter((b) => {
      if (
        !`${b.title} ${b.author ?? ''}`
          .toLowerCase()
          .includes(query.value.trim().toLowerCase())
      )
        return false;
      if (filter.value === 'finished') return b.finishReading === 1;
      if (filter.value === 'unfinished') return b.finishReading !== 1;
      if (filter.value === 'notes') return noteMap.value.has(b.bookId);
      return true;
    })
    .sort(
      sort.value === 'title'
        ? (a, b) => a.title.localeCompare(b.title, 'zh-CN')
        : (a, b) => (b.readUpdateTime ?? 0) - (a.readUpdateTime ?? 0),
    ),
);
</script>
<template>
  <div class="wr-filters">
    <Input
      v-model:value="query"
      allow-clear
      placeholder="搜索书名、作者"
      aria-label="搜索书架"
    />
    <Select
      v-model:value="filter"
      aria-label="阅读状态"
      :options="[
        { label: '全部图书', value: 'all' },
        { label: '已读完', value: 'finished' },
        { label: '未读完', value: 'unfinished' },
        { label: '有笔记', value: 'notes' },
      ]"
    />
    <Select
      v-model:value="sort"
      aria-label="排序"
      :options="[
        { label: '最近阅读', value: 'recent' },
        { label: '书名排序', value: 'title' },
      ]"
    />
  </div>
  <p class="wr-muted">共 {{ filtered.length }} 本</p>
  <div class="wr-shelf">
    <button
      v-for="book in filtered"
      :key="book.bookId"
      class="wr-book"
      @click="emit('book', book)"
    >
      <div class="wr-cover">
        <span class="wr-book-status">{{
          book.finishReading === 1 ? '已读完' : '未读完'
        }}</span>
        <img
          v-if="safeLink(book.cover)"
          :src="safeLink(book.cover)"
          :alt="`${book.title}封面`"
          loading="lazy"
        />
        <span v-else class="wr-muted">暂无封面</span>
      </div>
      <div class="wr-book-body">
        <h3 class="wr-clamp" :title="book.title">{{ book.title }}</h3>
        <p class="wr-ellipsis">{{ book.author || '作者未知' }}</p>
        <div class="wr-book-meta">
          <small>{{
            noteMap.has(book.bookId)
              ? `${noteMap.get(book.bookId)?.noteCount ?? 0} 划线 · ${noteMap.get(book.bookId)?.reviewCount ?? 0} 点评`
              : '暂无笔记'
          }}</small>
          <small>{{
            noteMap.get(book.bookId)?.readingProgress == null
              ? '查看详情'
              : `${noteMap.get(book.bookId)?.readingProgress}%`
          }}</small>
        </div>
      </div>
    </button>
  </div>
  <Empty v-if="filtered.length === 0" description="没有匹配的图书" />
</template>
