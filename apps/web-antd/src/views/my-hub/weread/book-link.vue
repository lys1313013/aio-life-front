<script setup lang="ts">
import type { WereadBook } from '#/api/core/weread';

import { computed, onBeforeUnmount, onDeactivated, ref, watch } from 'vue';

import { Spin } from 'ant-design-vue';

import { getWereadBookLink } from '#/api/core/weread';

import { isMobileBrowser, wereadBrowserLink } from './app-link';
import { safeBookLink } from './format';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  book?: Pick<WereadBook, 'bookId' | 'deepLink' | 'title'>;
  compact?: boolean;
}>();
const mobile = isMobileBrowser(navigator.userAgent, navigator.maxTouchPoints);
const attempted = ref(false);
const resolvedLink = ref('');
const loading = ref(false);
const error = ref('');
const webHref = computed(
  () => safeBookLink(props.book?.deepLink) || resolvedLink.value,
);
const appHref = computed(() =>
  mobile
    ? wereadBrowserLink(props.book?.bookId, navigator.userAgent, webHref.value)
    : undefined,
);
const href = computed(() => appHref.value || webHref.value);
let pendingWindow: null | Window = null;
let revision = 0;
function cancelPending() {
  revision++;
  pendingWindow?.close();
  pendingWindow = null;
  loading.value = false;
}
onBeforeUnmount(cancelPending);
onDeactivated(cancelPending);
watch(
  () => props.book?.bookId,
  () => {
    cancelPending();
    resolvedLink.value = '';
    error.value = '';
    attempted.value = false;
  },
);
async function resolveLink() {
  if (!props.book?.bookId || loading.value) return;
  const current = ++revision;
  loading.value = true;
  error.value = '';
  // 在点击事件内预先打开，避免等待接口后被浏览器拦截。
  pendingWindow = window.open('about:blank', '_blank');
  if (pendingWindow) pendingWindow.opener = null;
  try {
    const result = await getWereadBookLink(props.book.bookId);
    if (current !== revision) return;
    const link = safeBookLink(result.deepLink);
    if (!link) {
      error.value = '暂无可用链接，点击重试';
      return;
    }
    resolvedLink.value = link;
    if (pendingWindow && !pendingWindow.closed) {
      pendingWindow.location.replace(link);
      pendingWindow = null;
    } else {
      error.value = '链接已就绪，请再次点击打开';
    }
  } catch {
    if (current !== revision) return;
    // 请求层负责 API 错误提示；此处保留行内重试状态。
    error.value = '打开失败，点击重试';
  } finally {
    if (current === revision) {
      pendingWindow?.close();
      pendingWindow = null;
      loading.value = false;
    }
  }
}
</script>
<template>
  <component
    v-bind="$attrs"
    :is="href ? 'a' : book?.bookId ? 'button' : 'div'"
    :class="
      compact
        ? undefined
        : { 'wr-rank': true, 'wr-rank-link': href || book?.bookId }
    "
    :href="href || undefined"
    :target="href && !appHref ? '_blank' : undefined"
    :rel="href ? 'noopener noreferrer' : undefined"
    :type="!href && book?.bookId ? 'button' : undefined"
    :disabled="loading || undefined"
    :aria-busy="loading || undefined"
    :aria-label="
      href || book?.bookId ? `在微信读书打开：${book?.title}` : undefined
    "
    @click="appHref ? (attempted = true) : !href && resolveLink()"
  >
    <slot></slot>
    <Spin v-if="loading" size="small" />
    <small v-if="error" role="alert">{{ error }}</small>
  </component>
  <template v-if="appHref && attempted">
    <a
      v-if="webHref"
      :href="webHref"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex min-h-11 items-center text-sm text-primary"
      >网页版阅读</a
    >
    <button
      v-else
      type="button"
      class="inline-flex min-h-11 items-center text-sm text-primary"
      :disabled="loading"
      @click="resolveLink"
    >
      网页版阅读
    </button>
  </template>
</template>
