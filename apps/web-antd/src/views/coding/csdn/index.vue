<script lang="ts" setup>
import type { CsdnArticle, CsdnStats } from '#/api/core/csdn';

import { onMounted, ref } from 'vue';

import {
  EditOutlined,
  EyeOutlined,
  LikeOutlined,
  MessageOutlined,
  StarOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import { List, message } from 'ant-design-vue';

import { getCsdnArticlesApi, getCsdnStatsApi } from '#/api/core/csdn';
import { getUserBindListApi } from '#/api/core/user-bind';

import CodingDashboardLayout from '../components/CodingDashboardLayout.vue';
import DataListCard from '../components/DataListCard.vue';
import StatCard from '../components/StatCard.vue';

defineOptions({ name: 'CsdnDashboard' });

const username = ref('');
const loading = ref(false);
const error = ref(false);
const errorMessage = ref('');

const statsLoading = ref(false);
const articlesLoading = ref(false);

const stats = ref<CsdnStats | null>(null);
const articles = ref<CsdnArticle[]>([]);

async function fetchStats() {
  statsLoading.value = true;
  try {
    stats.value = await getCsdnStatsApi(username.value);
  } catch (error_: any) {
    console.error(error_);
    error.value = true;
    errorMessage.value = error_.message || '获取 CSDN 统计数据失败';
  } finally {
    statsLoading.value = false;
  }
}

async function fetchArticles() {
  articlesLoading.value = true;
  try {
    articles.value = await getCsdnArticlesApi(username.value);
  } catch (error_: any) {
    console.error(error_);
  } finally {
    articlesLoading.value = false;
  }
}

async function fetchData() {
  loading.value = true;
  error.value = false;

  await Promise.all([fetchStats(), fetchArticles()]);

  loading.value = false;
}

onMounted(async () => {
  try {
    loading.value = true;
    const binds = await getUserBindListApi();
    const csdnBind = binds.find((item) => item.platform === 'csdn');
    if (csdnBind && csdnBind.platformUsername) {
      username.value = csdnBind.platformUsername;
      await fetchData();
    } else {
      loading.value = false;
      message.warning('未绑定 CSDN 账号，请在个人中心绑定');
    }
  } catch (error_) {
    loading.value = false;
    console.error('获取绑定信息失败', error_);
  }
});
</script>

<template>
  <CodingDashboardLayout
    :loading="loading"
    :error="error"
    :error-message="errorMessage"
  >
    <div
      class="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-5"
    >
      <StatCard
        title="总访问量"
        :value="stats?.viewCount?.toLocaleString()"
        color="blue"
      >
        <template #icon><EyeOutlined /></template>
      </StatCard>

      <StatCard
        title="原创数"
        :value="stats?.originalCount?.toLocaleString()"
        color="green"
      >
        <template #icon><EditOutlined /></template>
      </StatCard>

      <StatCard
        title="全站排名"
        :value="stats?.rank?.toLocaleString()"
        color="orange"
      >
        <template #icon><TrophyOutlined /></template>
      </StatCard>

      <StatCard
        title="粉丝数"
        :value="stats?.fansCount?.toLocaleString()"
        color="cyan"
      >
        <template #icon><UserOutlined /></template>
      </StatCard>

      <StatCard
        title="获赞数"
        :value="stats?.likeCount?.toLocaleString()"
        color="red"
      >
        <template #icon><LikeOutlined /></template>
      </StatCard>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="lg:col-span-2">
        <DataListCard
          title="近期文章"
          :loading="articlesLoading"
          :is-empty="articles.length === 0"
          empty-text="暂无近期文章"
        >
          <List item-layout="horizontal" :data-source="articles">
            <template #renderItem="{ item }">
              <List.Item
                class="!px-4 !py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div class="w-full">
                  <div class="mb-1 flex items-center justify-between">
                    <a
                      :href="item.url"
                      target="_blank"
                      class="max-w-[80%] truncate font-medium text-blue-500 hover:underline md:max-w-[90%]"
                      :title="item.title"
                    >
                      {{ item.title }}
                    </a>
                    <span class="shrink-0 text-xs text-gray-400">
                      {{ item.postTime }}
                    </span>
                  </div>
                  <div
                    class="mb-2 line-clamp-2 text-xs text-gray-500 dark:text-gray-400"
                    :title="item.description"
                  >
                    {{ item.description }}
                  </div>
                  <div class="flex items-center gap-4 text-xs text-gray-400">
                    <span
                      v-if="item.viewCount !== undefined"
                      class="flex items-center gap-1"
                      title="阅读"
                    >
                      <EyeOutlined /> {{ item.viewCount }}
                    </span>
                    <span
                      v-if="item.likeCount !== undefined"
                      class="flex items-center gap-1"
                      title="点赞"
                    >
                      <LikeOutlined /> {{ item.likeCount }}
                    </span>
                    <span
                      v-if="item.commentCount !== undefined"
                      class="flex items-center gap-1"
                      title="评论"
                    >
                      <MessageOutlined /> {{ item.commentCount }}
                    </span>
                    <span
                      v-if="item.collectCount !== undefined"
                      class="flex items-center gap-1"
                      title="收藏"
                    >
                      <StarOutlined /> {{ item.collectCount }}
                    </span>
                  </div>
                </div>
              </List.Item>
            </template>
          </List>
        </DataListCard>
      </div>
    </div>
  </CodingDashboardLayout>
</template>
