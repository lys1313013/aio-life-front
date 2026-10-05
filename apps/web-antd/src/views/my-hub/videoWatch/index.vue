<script>
import {
  CaretRightOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Progress,
  Select,
  Spin,
  Tabs,
} from 'ant-design-vue';

import {
  deleteBilibiliVideo,
  getStatusCount,
  insertBVideo,
  parseBilibiliUrl,
  query,
  queryVideoCovers,
  retryVideoCover,
  statistics,
  updateBiVideo,
} from '#/api/core/bilibili-video';
import { PROGRESS_STATUS } from '#/api/core/progress-status';
import { AppModal as Modal } from '#/components/app-modal';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';

import VideoCover from './VideoCover.vue';

export default {
  components: {
    VideoCover,
    AButton: Button,
    AModal: Modal,
    AForm: Form,
    AFormItem: Form.Item,
    AInput: Input,
    AInputNumber: InputNumber,
    ASelect: Select,
    ASelectOption: Select.Option,
    APopconfirm: Popconfirm,
    ASpin: Spin,
    AProgress: Progress,
    ATabs: Tabs,
    ATabPane: Tabs.TabPane,
    DeleteOutlined,
    ReloadOutlined,
    CaretRightOutlined,
    GlobalFloatBtn,
  },
  data() {
    return {
      videos: [],
      statsLoading: true,
      statsLoaded: false,
      statsFailed: false,
      statsRevision: 0,
      coverTimer: null,
      coverRevision: 0,
      queryRevision: 0,
      coverActive: true,
      visible: false,
      isParsing: false,
      saving: false,
      newVideo: {
        title: '',
        url: '',
        bvid: '',
        cover: '',
        duration: 0,
        episodes: 1,
        currentEpisode: 1,
        progress: 0,
        status: PROGRESS_STATUS.IN_PROGRESS,
        notes: '',
        ownerName: '',
        watchedDuration: 0,
      },
      tabList: [
        { key: PROGRESS_STATUS.NOT_STARTED, tab: '未开始' },
        { key: PROGRESS_STATUS.IN_PROGRESS, tab: '进行中' },
        { key: PROGRESS_STATUS.ON_HOLD, tab: '已暂停' },
        { key: PROGRESS_STATUS.COMPLETED, tab: '已完成' },
        { key: 'all', tab: '全部' },
      ],
      tabKey: PROGRESS_STATUS.IN_PROGRESS,
      videoCounts: {
        [PROGRESS_STATUS.NOT_STARTED]: 0,
        [PROGRESS_STATUS.IN_PROGRESS]: 0,
        [PROGRESS_STATUS.ON_HOLD]: 0,
        [PROGRESS_STATUS.COMPLETED]: 0,
        all: 0,
      },
      statusOptions: [
        { value: PROGRESS_STATUS.NOT_STARTED, label: '未开始' },
        { value: PROGRESS_STATUS.IN_PROGRESS, label: '进行中' },
        { value: PROGRESS_STATUS.ON_HOLD, label: '已暂停' },
        { value: PROGRESS_STATUS.COMPLETED, label: '已完成' },
      ],
      learningStats: {
        studiedSeconds: 0,
        unstudiedSeconds: 0,
        totalCount: 0,
      },
    };
  },
  async mounted() {
    await this.query();
  },
  activated() {
    this.coverActive = true;
    this.pollCovers();
    if (!this.statsLoaded && !this.statsLoading) this.updateVideoCounts();
  },
  deactivated() {
    this.coverActive = false;
    this.stopCovers();
    this.queryRevision++;
    this.statsRevision++;
    this.statsLoading = false;
  },
  beforeUnmount() {
    this.coverActive = false;
    this.stopCovers();
    this.queryRevision++;
    this.statsRevision++;
    this.statsLoading = false;
  },
  methods: {
    stopCovers() {
      this.coverRevision++;
      clearTimeout(this.coverTimer);
    },
    pollCovers() {
      clearTimeout(this.coverTimer);
      const ids = this.videos
        .filter((v) => v.coverState === 'PENDING')
        .map((v) => v.id);
      if (!this.coverActive || ids.length === 0) return;
      const revision = this.coverRevision;
      this.coverTimer = setTimeout(async () => {
        try {
          const covers = await queryVideoCovers(ids);
          if (!this.coverActive || revision !== this.coverRevision) return;
          for (const cover of covers) {
            const video = this.videos.find((v) => v.id === cover.id);
            if (video) {
              video.coverFileId = cover.coverFileId;
              video.coverState = cover.coverState;
            }
          }
          this.pollCovers();
        } catch {
          /* 保留已显示的封面，重新进入时恢复轮询。 */
        }
      }, 3000);
    },
    async retryCover(video) {
      if (video.coverState !== 'FAILED') return;
      video.coverState = 'PENDING';
      try {
        await retryVideoCover(video.id);
        this.pollCovers();
      } catch {
        video.coverState = 'FAILED';
      }
    },
    async query() {
      this.stopCovers();
      const revision = ++this.queryRevision;
      const statsRequest = this.updateVideoCounts();
      const res = await query({
        page: 1,
        pageSize: 50,
        condition: {
          status: this.tabKey === 'all' ? undefined : this.tabKey,
        },
      });
      if (revision !== this.queryRevision) return;
      this.videos = res.items || [];
      this.pollCovers();
      await statsRequest;
    },

    async updateVideoCounts() {
      const revision = ++this.statsRevision;
      this.statsLoading = true;
      this.statsFailed = false;
      try {
        const [counts, stats] = await Promise.all([
          getStatusCount({}),
          statistics({}),
        ]);
        if (revision !== this.statsRevision) return;
        let total = 0;
        for (const key of Object.keys(this.videoCounts)) {
          if (key === 'all') continue;
          this.videoCounts[key] = counts?.[key] ?? 0;
          total += this.videoCounts[key];
        }
        this.videoCounts.all = total;
        this.learningStats = { ...stats, totalCount: total };
        this.statsLoaded = true;
      } catch {
        if (revision === this.statsRevision) this.statsFailed = true;
      } finally {
        if (revision === this.statsRevision) this.statsLoading = false;
      }
    },

    showModal() {
      this.resetForm();
      this.visible = true;
    },

    showEditModal(video) {
      this.newVideo = {
        ...video,
        bvid: video.bvid || '',
        ownerName: video.owner?.name || video.ownerName || '',
        watchedDurationFormatted: this.formatDuration(video.watchedDuration),
      };
      this.visible = true;
    },

    async handleOk() {
      if (this.saving || this.isParsing) return;
      if (!this.newVideo.url) {
        message.error('请输入B站视频URL');
        return;
      }
      this.saving = true;
      try {
        await (this.newVideo.id
          ? updateBiVideo(this.newVideo.id, this.newVideo)
          : insertBVideo(this.newVideo));
        message.success('保存成功');
        this.query();
        this.visible = false;
        this.resetForm();
      } finally {
        this.saving = false;
      }
    },

    handleCancel() {
      this.visible = false;
      this.resetForm();
    },

    resetForm() {
      this.newVideo = {
        title: '',
        url: '',
        bvid: '',
        cover: '',
        duration: 0,
        episodes: 1,
        currentEpisode: 1,
        progress: 0,
        status: PROGRESS_STATUS.IN_PROGRESS,
        notes: '',
        ownerName: '',
        watchedDuration: 0,
        watchedDurationFormatted: '00:00:00',
      };
    },

    async parseBilibiliUrl() {
      if (!this.newVideo.url) {
        message.error('请输入B站视频URL');
        return;
      }
      this.isParsing = true;
      try {
        const res = await parseBilibiliUrl(this.newVideo.url);
        if (res.success) {
          this.newVideo = {
            ...this.newVideo,
            url: res.data.url || this.newVideo.url,
            bvid: res.data.bvid || '',
            title: res.data.title || '',
            cover: res.data.cover || '',
            duration: res.data.duration || 0,
            episodes: res.data.episodes || 1,
            currentEpisode: res.data.currentEpisode || 1,
            progress: res.data.progress || 0,
            ownerName: res.data.owner?.name || '',
            watchedDuration: res.data.watchedDuration || 0,
            watchedDurationFormatted:
              res.data.watchedDurationFormatted || '00:00:00',
            pages: res.data.pages || [],
          };
          if (this.newVideo.currentEpisode === this.newVideo.episodes) {
            this.newVideo.status = PROGRESS_STATUS.COMPLETED;
          }
          message.success('解析成功');
        } else {
          message.error(`解析失败：${res.message}`);
        }
      } catch {
        message.error('解析失败，请检查URL格式');
      } finally {
        this.isParsing = false;
      }
    },

    async handleDelete(video) {
      try {
        await deleteBilibiliVideo(video.id);
        message.success('删除成功');
        await this.query();
      } catch (error) {
        // 全局拦截器已提示
        console.error('删除失败:', error);
      }
    },

    getStatusText(status) {
      const statusMap = {
        [PROGRESS_STATUS.NOT_STARTED]: '未开始',
        [PROGRESS_STATUS.IN_PROGRESS]: '进行中',
        [PROGRESS_STATUS.ON_HOLD]: '已暂停',
        [PROGRESS_STATUS.COMPLETED]: '已完成',
      };
      return statusMap[status] || '未知';
    },

    onTabChange(key) {
      this.tabKey = key;
      this.query();
    },

    updateProgressFromEpisode() {
      this.calculateWatchedDuration();
      if (this.newVideo.duration > 0) {
        const progress =
          (this.newVideo.watchedDuration / this.newVideo.duration) * 100;
        this.newVideo.progress = Math.min(
          100,
          Math.max(0, Math.round(progress)),
        );
      }
      if (this.newVideo.progress >= 100) {
        this.newVideo.status = PROGRESS_STATUS.COMPLETED;
      } else if (this.newVideo.progress > 0) {
        this.newVideo.status = PROGRESS_STATUS.IN_PROGRESS;
      }
    },

    calculateWatchedDuration() {
      if (
        this.newVideo.currentEpisode &&
        this.newVideo.episodes &&
        this.newVideo.duration
      ) {
        const totalSeconds = this.newVideo.duration;
        let watchedSeconds = 0;
        if (this.newVideo.pages && this.newVideo.pages.length > 0) {
          for (
            let i = 0;
            i <
            Math.min(
              this.newVideo.currentEpisode - 1,
              this.newVideo.pages.length,
            );
            i++
          ) {
            watchedSeconds += this.newVideo.pages[i].duration;
          }
        } else {
          watchedSeconds =
            ((this.newVideo.currentEpisode - 1) / this.newVideo.episodes) *
            totalSeconds;
        }
        this.newVideo.watchedDurationFormatted =
          this.formatDuration(watchedSeconds);
        this.newVideo.watchedDuration = Math.round(watchedSeconds);
      }
    },

    handleStatusChange(newStatus) {
      if (newStatus === PROGRESS_STATUS.COMPLETED && this.newVideo.episodes) {
        this.newVideo.currentEpisode = this.newVideo.episodes;
        this.newVideo.progress = 100;
      }
    },

    formatDuration(seconds) {
      if (!seconds || seconds <= 0) return '00:00:00';
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    formatLearningTime(seconds) {
      if (!seconds || seconds <= 0) return { value: 0, unit: '秒' };
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      if (hours > 0) return { value: hours, unit: `小时${minutes}分` };
      if (minutes > 0) return { value: minutes, unit: `分${secs}秒` };
      return { value: secs, unit: '秒' };
    },

    getActualProgress(video) {
      if (video.status === PROGRESS_STATUS.COMPLETED) return 100;
      if (video.duration > 0) {
        const progress = (video.watchedDuration / video.duration) * 100;
        return Math.min(100, Math.max(0, Math.round(progress)));
      }
      return video.progress || 0;
    },

    goToBilibiliVideo(video) {
      if (!video.url) {
        message.error('视频链接不存在');
        return;
      }
      try {
        const urlObj = new URL(video.url);
        const params = new URLSearchParams(urlObj.search);
        params.set('p', (video.currentEpisode || 1).toString());
        urlObj.search = params.toString();
        window.open(urlObj.toString(), '_blank');
      } catch {
        message.error('跳转失败，请检查视频链接格式');
      }
    },
  },
};
</script>

<template>
  <div class="video-watch min-h-full bg-background/50 p-3 sm:p-4">
    <section
      class="video-summary relative"
      aria-label="观看统计"
      :aria-busy="statsLoading"
    >
      <dl class="video-summary-values">
        <div>
          <dt>视频</dt>
          <dd>
            <span class="video-summary-number">{{
              statsLoaded ? learningStats.totalCount : '—'
            }}</span>
            <span class="video-summary-unit">{{
              statsLoaded ? '部' : '\u00a0'
            }}</span>
          </dd>
        </div>
        <div>
          <dt>已看时长</dt>
          <dd>
            <span class="video-summary-number">{{
              statsLoaded
                ? formatLearningTime(learningStats.studiedSeconds).value
                : '—'
            }}</span>
            <span class="video-summary-unit">{{
              statsLoaded
                ? formatLearningTime(learningStats.studiedSeconds).unit
                : '\u00a0'
            }}</span>
          </dd>
        </div>
        <div>
          <dt>剩余预估</dt>
          <dd>
            <span class="video-summary-number">{{
              statsLoaded
                ? formatLearningTime(learningStats.unstudiedSeconds).value
                : '—'
            }}</span>
            <span class="video-summary-unit">{{
              statsLoaded
                ? formatLearningTime(learningStats.unstudiedSeconds).unit
                : '\u00a0'
            }}</span>
          </dd>
        </div>
      </dl>
      <ASpin
        v-if="statsLoading"
        size="small"
        class="absolute right-2 top-2"
        aria-label="加载统计"
      />
      <AButton
        v-else-if="statsFailed"
        type="text"
        class="absolute right-1 top-1 !h-11 !w-11"
        aria-label="重试统计"
        @click="updateVideoCounts"
      >
        <template #icon><ReloadOutlined /></template>
      </AButton>
    </section>

    <div class="px-0 sm:px-0">
      <ATabs
        v-model:active-key="tabKey"
        @change="onTabChange"
        type="line"
        class="custom-tabs"
      >
        <ATabPane v-for="tab in tabList" :key="tab.key">
          <template #tab>
            <span class="flex items-center gap-1.5">
              <span class="text-[13px] sm:text-sm">{{ tab.tab }}</span>
              <span
                class="video-tab-count text-xs font-normal tabular-nums text-muted-foreground"
              >
                {{ statsLoaded ? videoCounts[tab.key] : '—' }}
              </span>
            </span>
          </template>

          <div class="mt-4 pb-6">
            <!-- 视频列表 -->
            <div class="video-grid">
              <div
                v-for="video in videos"
                :key="video.id"
                class="group relative cursor-pointer"
                @click="showEditModal(video)"
              >
                <!-- 封面图区域 -->
                <div class="relative aspect-video overflow-hidden rounded-md">
                  <VideoCover
                    :file-id="video.coverFileId"
                    :state="video.coverState"
                    :title="video.title"
                    @retry="retryCover(video)"
                    @click.stop="goToBilibiliVideo(video)"
                  />

                  <!-- 底部渐变遮罩 -->
                  <div
                    class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/5 bg-gradient-to-t from-black/50 via-black/30 to-transparent"
                  ></div>

                  <!-- 时长标签 -->
                  <div
                    class="absolute bottom-1 right-1 z-20 text-[10px] font-medium tabular-nums text-white sm:text-[11px]"
                  >
                    {{ formatDuration(video.duration) || '未知' }}
                  </div>

                  <!-- 状态角标 -->
                  <div
                    v-if="tabKey === 'all'"
                    class="absolute left-2 top-2 z-20 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white"
                  >
                    {{ getStatusText(video.status) }}
                  </div>

                  <!-- 删除按钮 (悬浮显示) -->
                  <div
                    class="absolute right-1 top-1 z-30 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
                  >
                    <APopconfirm
                      title="确定要删除吗？"
                      @confirm="handleDelete(video)"
                    >
                      <AButton
                        size="small"
                        danger
                        shape="circle"
                        class="!h-11 !w-11 border-none bg-background/90"
                        :aria-label="`删除${video.title || '视频'}`"
                        @click.stop
                      >
                        <template #icon><DeleteOutlined /></template>
                      </AButton>
                    </APopconfirm>
                  </div>

                  <!-- 悬浮播放按钮 -->
                  <div
                    class="absolute inset-0 z-10 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                    @click.stop="goToBilibiliVideo(video)"
                  >
                    <div
                      class="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white"
                    >
                      <CaretRightOutlined class="ml-0.5 text-2xl" />
                    </div>
                  </div>
                </div>

                <!-- 内容区域 -->
                <div class="pt-2.5">
                  <h3
                    class="mb-2 line-clamp-2 h-10 overflow-hidden text-sm font-medium leading-5 text-foreground group-hover:text-primary"
                  >
                    {{ video.title || '未命名视频' }}
                  </h3>

                  <div
                    class="mb-2 flex items-center justify-between text-[10px] text-muted-foreground sm:mb-3 sm:text-[11px]"
                  >
                    <span class="inline-flex max-w-[65%] items-center">
                      <span class="truncate font-medium">{{
                        video.owner?.name || video.ownerName || '未知UP主'
                      }}</span>
                    </span>
                    <span class="inline-flex items-center tabular-nums">
                      {{ video.currentEpisode }}/{{ video.episodes }}
                    </span>
                  </div>

                  <!-- 进度条 -->
                  <div class="relative pt-0.5 sm:pt-1">
                    <div
                      class="mb-1 flex items-center justify-between text-[9px] tabular-nums text-muted-foreground sm:mb-1 sm:text-[10px]"
                    >
                      <span
                        >{{ formatDuration(video.watchedDuration) }} /
                        {{ formatDuration(video.duration) }}</span
                      >
                      <span class="font-normal"
                        >{{ getActualProgress(video) }}%</span
                      >
                    </div>
                    <AProgress
                      :percent="getActualProgress(video)"
                      size="small"
                      :show-info="false"
                      class="mb-0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ATabPane>
      </ATabs>
    </div>

    <!-- 新增悬浮按钮 -->
    <GlobalFloatBtn @click="showModal" />

    <!-- 弹窗部分 -->
    <AModal
      v-model:open="visible"
      :confirm-loading="saving"
      :busy="isParsing"
      :title="newVideo.id ? '编辑视频' : '新增视频'"
      :width="700"
      :mask-closable="true"
      @ok="handleOk"
      @cancel="handleCancel"
    >
      <AForm :model="newVideo" layout="vertical" class="mt-2">
        <AFormItem label="B站视频URL" required>
          <div class="flex gap-2">
            <AInput
              v-model:value="newVideo.url"
              placeholder="请输入B站视频链接，如：https://www.bilibili.com/video/BV1xxx"
              class="flex-1"
            />
            <AButton
              :loading="isParsing"
              type="primary"
              @click="parseBilibiliUrl"
            >
              解析
            </AButton>
          </div>
        </AFormItem>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AFormItem label="视频标题">
            <AInput v-model:value="newVideo.title" placeholder="视频标题" />
          </AFormItem>

          <AFormItem label="BV号">
            <AInput
              v-model:value="newVideo.bvid"
              readonly
              placeholder="BV号 (自动解析)"
              class="bg-muted/50"
            />
          </AFormItem>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AFormItem label="UP主名称">
            <AInput v-model:value="newVideo.ownerName" placeholder="UP主名称" />
          </AFormItem>

          <AFormItem label="封面链接">
            <AInput v-model:value="newVideo.cover" placeholder="封面图片链接" />
          </AFormItem>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AFormItem label="总集数">
            <AInputNumber
              v-model:value="newVideo.episodes"
              :min="1"
              class="w-full"
            />
          </AFormItem>

          <AFormItem label="当前集数">
            <AInputNumber
              v-model:value="newVideo.currentEpisode"
              :min="1"
              :max="newVideo.episodes"
              class="w-full"
              @change="updateProgressFromEpisode"
            />
          </AFormItem>

          <AFormItem label="学习状态">
            <ASelect
              v-model:value="newVideo.status"
              class="w-full"
              @change="handleStatusChange"
            >
              <ASelectOption
                v-for="option in statusOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </ASelectOption>
            </ASelect>
          </AFormItem>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AFormItem label="总时长">
            <AInput
              :value="formatDuration(newVideo.duration)"
              readonly
              class="w-full bg-muted/50"
            />
          </AFormItem>

          <AFormItem label="已看时长">
            <AInput
              v-model:value="newVideo.watchedDurationFormatted"
              readonly
              class="w-full bg-muted/50"
            />
          </AFormItem>

          <AFormItem label="进度">
            <div class="flex h-8 items-center">
              <AProgress :percent="newVideo.progress" size="small" />
            </div>
          </AFormItem>
        </div>

        <AFormItem label="学习笔记">
          <AInput
            v-model:value="newVideo.notes"
            type="textarea"
            :rows="3"
            placeholder="记录学习心得或笔记"
          />
        </AFormItem>
      </AForm>
    </AModal>
  </div>
</template>

<style scoped>
.video-summary {
  padding: 16px 24px;
  margin-bottom: 16px;
  color: hsl(var(--card-foreground));
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border) / 45%);
  border-radius: 14px;
  box-shadow: 0 3px 14px hsl(var(--foreground) / 4%);
}

.video-summary-values {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
}

.video-summary-values > div {
  position: relative;
  min-width: 0;
  padding-inline: 24px;
}

.video-summary-values > div:first-child {
  padding-left: 0;
}

.video-summary-values > div:last-child {
  padding-right: 0;
}

.video-summary-values > div + div::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: 1px;
  height: 28px;
  content: '';
  background: hsl(var(--border) / 55%);
  transform: translateY(-50%);
}

.video-summary dt {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 400;
  color: hsl(var(--muted-foreground));
}

.video-summary dd {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 4px;
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.video-summary-number {
  font-size: 22px;
  font-weight: 400;
  line-height: 28px;
  color: hsl(var(--card-foreground) / 85%);
  overflow-wrap: anywhere;
}

.video-summary-unit {
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: hsl(var(--muted-foreground));
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 24px 20px;
}

.custom-tabs :deep(.ant-tabs-nav) {
  padding: 0;
  margin-bottom: 0;
}

.custom-tabs :deep(.ant-tabs-nav::before) {
  border-bottom: none;
}

.custom-tabs :deep(.ant-tabs-tab) {
  min-height: 44px;
  padding: 10px 0;
  margin: 0 24px 0 0;
}

.custom-tabs :deep(.ant-tabs-tab-active) {
  font-weight: 500;
}

.custom-tabs :deep(.ant-tabs-tab-active .video-tab-count) {
  color: hsl(var(--primary));
}

@media (max-width: 639px) {
  .video-summary {
    padding: 14px;
    margin-bottom: 12px;
    border-radius: 12px;
  }

  .video-summary-values {
    grid-template-columns: minmax(0, 0.65fr) repeat(2, minmax(0, 1fr));
  }

  .video-summary-values > div {
    padding-inline: 12px;
  }

  .video-summary dt {
    margin-bottom: 6px;
    font-size: 11px;
  }

  .video-summary dd {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .video-summary-number {
    font-size: 20px;
    line-height: 26px;
  }

  .video-summary-unit {
    font-size: 12px;
    line-height: 18px;
  }

  .video-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 20px 12px;
  }

  .custom-tabs :deep(.ant-tabs-tab) {
    margin-right: 8px;
  }
}

.line-clamp-2 {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
