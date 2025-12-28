<script>
import {
  PlusOutlined,
  DeleteOutlined,
  VideoCameraOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  CaretRightOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Tag,
  Tabs,
} from 'ant-design-vue';

import {
  deleteBilibiliVideo,
  insertOrUpdateBilibiliVideo,
  parseBilibiliUrl,
  query,
  getStatusCount,
  statistics,
} from '#/api/core/bilibili-video';

export default {
  components: {
    AButton: Button,
    AModal: Modal,
    AForm: Form,
    AFormItem: Form.Item,
    AInput: Input,
    AInputNumber: InputNumber,
    ASelect: Select,
    ASelectOption: Select.Option,
    ACard: Card,
    APopconfirm: Popconfirm,
    ATag: Tag,
    AProgress: Progress,
    ATabs: Tabs,
    ATabPane: Tabs.TabPane,
    PlusOutlined,
    DeleteOutlined,
    VideoCameraOutlined,
    HistoryOutlined,
    ClockCircleOutlined,
    CaretRightOutlined,
  },
  data() {
    return {
      videos: [],
      visible: false,
      isParsing: false,
      newVideo: {
        title: '',
        url: '',
        bvid: '',
        cover: '',
        duration: 0,
        episodes: 1,
        currentEpisode: 1,
        progress: 0,
        status: 2,
        notes: '',
        ownerName: '',
        watchedDuration: 0,
      },
      tabList: [
        { key: 1, tab: '未开始' },
        { key: 2, tab: '进行中' },
        { key: 3, tab: '已暂停' },
        { key: 4, tab: '部分完成' },
        { key: 5, tab: '已完成' },
        { key: 0, tab: '全部' },
      ],
      tabKey: 2,
      videoCounts: {
        0: 0,
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
      statusOptions: [
        { value: 1, label: '未开始' },
        { value: 2, label: '进行中' },
        { value: 3, label: '已暂停' },
        { value: 4, label: '部分完成' },
        { value: 5, label: '已完成' },
      ],
      learningStats: {
        studiedSeconds: 0,
        unstudiedSeconds: 0,
        totalSeconds: 0,
        studiedCount: 0,
        unstudiedCount: 0,
        notStartedCount: 0,
        totalCount: 0,
        progressPercentage: 0,
      },
    };
  },
  async mounted() {
    await this.query();
  },
  methods: {
    async query() {
      const res = await query({
        page: 1,
        pageSize: 50,
        condition: {
          status: this.tabKey === 0 ? undefined : this.tabKey,
        },
      });
      this.videos = res.items || [];
      await this.updateVideoCounts();
    },

    async updateVideoCounts() {
      const res = await getStatusCount({});
      if (res) {
        let sum = 0;
        Object.keys(this.videoCounts).forEach((key) => {
          const numKey = Number(key);
          this.videoCounts[numKey] = res[numKey] || 0;
          if (numKey !== 0) {
            sum += this.videoCounts[numKey];
          }
        });
        this.videoCounts[0] = sum;
      }
      this.calculateLearningStats();
    },

    async calculateLearningStats() {
      const res = await statistics({});
      if (res) {
        this.learningStats = {
          ...res,
          notStartedCount: this.videoCounts[1] || 0,
          studiedCount: this.videoCounts[5] || 0,
          unstudiedCount:
            (this.videoCounts[2] || 0) +
            (this.videoCounts[3] || 0) +
            (this.videoCounts[4] || 0),
          totalCount: this.videoCounts[0] || 0,
        };

        if (this.learningStats.totalCount > 0) {
          this.learningStats.progressPercentage = Math.round(
            (this.learningStats.studiedCount / this.learningStats.totalCount) *
              100,
          );
        }
      }
    },

    getImageUrl(coverUrl) {
      if (!coverUrl) return '';
      if (coverUrl.includes('bilibili.com') || coverUrl.includes('hdslb.com')) {
        return `https://images.weserv.nl/?url=${encodeURIComponent(coverUrl)}&w=300&h=200&fit=cover`;
      }
      return coverUrl;
    },

    handleImageError(event) {
      event.target.style.display = 'none';
      const fallback = event.target.parentElement.querySelector('.fallback-icon');
      if (fallback) fallback.style.display = 'flex';
    },

    handleImageLoad(event) {
      event.target.style.display = 'block';
      const fallback = event.target.parentElement.querySelector('.fallback-icon');
      if (fallback) fallback.style.display = 'none';
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
      if (!this.newVideo.url) {
        message.error('请输入B站视频URL');
        return;
      }
      await insertOrUpdateBilibiliVideo(this.newVideo);
      message.success('保存成功');
      this.query();
      this.visible = false;
      this.resetForm();
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
        status: 2,
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
            this.newVideo.status = 5;
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
        await deleteBilibiliVideo({ id: video.id });
        message.success('删除成功');
        await this.query();
      } catch (error) {
        console.error('删除失败:', error);
        message.error('删除失败');
      }
    },

    getStatusText(status) {
      const statusMap = {
        1: '未开始',
        2: '进行中',
        3: '已暂停',
        4: '部分完成',
        5: '已完成',
      };
      return statusMap[status] || '未知';
    },

    getStatusBgClass(status) {
      const classMap = {
        1: 'bg-muted text-muted-foreground',
        2: 'bg-primary text-primary-foreground',
        3: 'bg-warning text-warning-foreground',
        4: 'bg-purple-500 text-white',
        5: 'bg-success text-success-foreground',
      };
      return classMap[status] || 'bg-muted text-muted-foreground';
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
        this.newVideo.status = 5;
      } else if (this.newVideo.progress > 0) {
        this.newVideo.status = 2;
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
      if (newStatus === 5 && this.newVideo.episodes) {
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
      if (!seconds || seconds <= 0) return '0秒';
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      if (hours > 0) return `${hours}小时${minutes}分`;
      if (minutes > 0) return `${minutes}分${secs}秒`;
      return `${secs}秒`;
    },

    getActualProgress(video) {
      if (video.status === 5) return 100;
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
  <div class="p-0 sm:p-4 min-h-full bg-background/50">
    <!-- 学习进度统计卡片 -->
    <div class="px-2 sm:px-0 py-4 sm:py-0 mb-2 sm:mb-6">
      <div class="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-6">
        <!-- 数量统计卡片 -->
        <div class="group bg-card hover:bg-accent/5 p-3 sm:p-6 rounded-xl border border-border/60 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/20">
          <div class="flex items-center sm:items-start justify-between mb-0 sm:mb-4">
            <div class="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg bg-primary/10 text-primary text-lg sm:text-2xl group-hover:scale-110 transition-transform duration-300">
              <VideoCameraOutlined />
            </div>
            <div class="text-right">
              <div class="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0 sm:mb-1">学习总数</div>
              <div class="text-xl sm:text-3xl font-bold text-foreground tabular-nums leading-tight">{{ learningStats.totalCount }}</div>
            </div>
          </div>
          <div class="hidden sm:flex flex-wrap gap-2 pt-4 border-t border-border/40">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-success/10 text-success">
              <span class="w-1.5 h-1.5 rounded-full bg-success mr-1.5"></span>
              {{ learningStats.studiedCount }} 已完成
            </span>
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
              <span class="bg-primary mr-1.5 h-1.5 w-1.5 rounded-full"></span>
              {{ learningStats.unstudiedCount }} 进行中
            </span>
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground">
              <span class="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mr-1.5"></span>
              {{ learningStats.notStartedCount }} 未开始
            </span>
          </div>
        </div>

        <!-- 时长统计卡片 -->
        <div class="group bg-card hover:bg-accent/5 p-3 sm:p-6 rounded-xl border border-border/60 shadow-sm transition-all duration-300 hover:shadow-md hover:border-orange-500/20">
          <div class="flex items-center sm:items-start justify-between mb-0 sm:mb-4">
            <div class="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg bg-orange-500/10 text-orange-500 text-lg sm:text-2xl group-hover:scale-110 transition-transform duration-300">
              <ClockCircleOutlined />
            </div>
            <div class="text-right">
              <div class="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0 sm:mb-1">已学时长</div>
              <div class="text-xl sm:text-2xl font-bold text-foreground tabular-nums leading-tight">{{ formatLearningTime(learningStats.studiedSeconds) }}</div>
            </div>
          </div>
          <div class="hidden sm:flex items-center justify-between pt-4 border-t border-border/40 text-[11px]">
            <span class="text-muted-foreground font-medium">剩余预估</span>
            <span class="text-orange-600 dark:text-orange-400 font-bold tabular-nums">{{ formatLearningTime(learningStats.unstudiedSeconds) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="px-0 sm:px-0">
      <ATabs
        v-model:activeKey="tabKey"
        @change="onTabChange"
        type="line"
        class="custom-tabs"
      >
        <ATabPane
          v-for="tab in tabList"
          :key="tab.key"
        >
          <template #tab>
            <span class="flex items-center gap-0.5 sm:gap-2 px-0 sm:px-1">
              <span class="text-[13px] sm:text-sm">{{ tab.tab }}</span>
              <span class="inline-flex items-center justify-center min-w-[16px] sm:min-w-[20px] h-3.5 sm:h-5 bg-muted px-1 sm:px-1.5 rounded-full text-[8px] sm:text-[10px] text-muted-foreground font-bold tabular-nums">
                {{ videoCounts[tab.key] || 0 }}
              </span>
            </span>
          </template>

          <div class="mt-2 sm:mt-6 px-2 sm:px-0 pb-6">
            <!-- 视频列表 -->
            <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-5">
              <div
                v-for="(video, index) in videos"
                :key="index"
                class="group relative bg-card border border-border rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-0.1 hover:shadow-lg hover:border-primary/30 cursor-pointer"
                @click="showEditModal(video)"
              >
                <!-- 封面图区域 -->
                <div class="relative aspect-[16/10] overflow-hidden">
                  <img
                    v-if="video.cover"
                    :src="getImageUrl(video.cover)"
                    :alt="video.title"
                    class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    @error="handleImageError"
                    @load="handleImageLoad"
                    @click.stop="goToBilibiliVideo(video)"
                  />
                  <div class="fallback-icon w-full h-full flex items-center justify-center bg-muted/30" @click.stop="goToBilibiliVideo(video)">
                    <VideoCameraOutlined class="text-3xl sm:text-4xl text-muted-foreground opacity-20" />
                  </div>

                  <!-- 时长标签 -->
                  <div class="absolute bottom-1 sm:bottom-1.5 right-1 sm:right-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-black/40 text-white text-[9px] sm:text-[10px] font-medium rounded-md backdrop-blur-md border border-white/10 tabular-nums z-20">
                    {{ formatDuration(video.duration) || '未知' }}
                  </div>

                  <!-- 状态角标 -->
                  <div
                    class="absolute top-1.5 sm:top-2.5 left-1.5 sm:left-2.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-bold rounded shadow-md backdrop-blur-sm z-20"
                    :class="getStatusBgClass(video.status)"
                  >
                    {{ getStatusText(video.status) }}
                  </div>

                  <!-- 删除按钮 (悬浮显示) -->
                  <div class="absolute top-1.5 sm:top-2.5 right-1.5 sm:right-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 z-30">
                    <APopconfirm
                      title="确定要删除这个视频吗？"
                      @confirm="handleDelete(video)"
                    >
                      <AButton
                        size="small"
                        danger
                        shape="circle"
                        class="bg-background/80 dark:bg-black/60 backdrop-blur-md border-none shadow-lg hover:scale-110 active:scale-90"
                        @click.stop
                      >
                        <template #icon><DeleteOutlined /></template>
                      </AButton>
                    </APopconfirm>
                  </div>

                  <!-- 悬浮播放按钮 -->
                  <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 z-10" @click.stop="goToBilibiliVideo(video)">
                    <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-transparent text-white flex items-center justify-center border-2 border-white transition-all duration-300">
                      <CaretRightOutlined class="text-3xl sm:text-4xl ml-1" />
                    </div>
                  </div>
                </div>

                <!-- 内容区域 -->
                <div class="p-2 sm:p-3">
                  <h3 class="text-xs sm:text-sm font-bold text-foreground line-clamp-2 mb-2 sm:mb-2.5 leading-5 h-10 group-hover:text-primary transition-colors duration-300 overflow-hidden">
                    {{ video.title || '未命名视频' }}
                  </h3>

                  <div class="flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground mb-2 sm:mb-3">
                    <span class="inline-flex items-center max-w-[65%]">
                      <span class="truncate font-medium">{{ video.owner?.name || video.ownerName || '未知UP主' }}</span>
                    </span>
                    <span class="inline-flex items-center font-bold tabular-nums text-primary/80">
                      <ClockCircleOutlined class="mr-1 text-[9px] sm:text-[10px]" />
                      {{ video.currentEpisode }}/{{ video.episodes }}
                    </span>
                  </div>

                  <!-- 进度条 -->
                  <div class="relative pt-0.5 sm:pt-1">
                    <div class="flex items-center justify-between mb-1 sm:mb-1 text-[9px] sm:text-[10px] text-muted-foreground tabular-nums">
                      <span>{{ formatDuration(video.watchedDuration) }} / {{ formatDuration(video.duration) }}</span>
                      <span class="font-black text-primary tracking-tighter">{{ getActualProgress(video) }}%</span>
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
    <div
      class="fixed right-4 sm:right-8 bottom-4 sm:bottom-8 w-12 sm:w-14 h-12 sm:h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-2xl hover:shadow-primary/40 hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer z-50 group"
      @click="showModal"
    >
      <PlusOutlined class="text-xl sm:text-2xl transition-transform duration-300 group-hover:rotate-90" />
    </div>

    <!-- 弹窗部分 -->
    <AModal
      v-model:open="visible"
      :title="newVideo.id ? '编辑视频' : '新增视频'"
      :width="700"
      :maskClosable="true"
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
            <AButton :loading="isParsing" type="primary" @click="parseBilibiliUrl">
              解析
            </AButton>
          </div>
        </AFormItem>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AFormItem label="视频标题">
            <AInput v-model:value="newVideo.title" placeholder="视频标题" />
          </AFormItem>

          <AFormItem label="BV号">
            <AInput v-model:value="newVideo.bvid" readonly placeholder="BV号 (自动解析)" class="bg-muted/50" />
          </AFormItem>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AFormItem label="UP主名称">
            <AInput v-model:value="newVideo.ownerName" placeholder="UP主名称" />
          </AFormItem>

          <AFormItem label="封面链接">
            <AInput v-model:value="newVideo.cover" placeholder="封面图片链接" />
          </AFormItem>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AFormItem label="总集数">
            <AInputNumber v-model:value="newVideo.episodes" :min="1" class="w-full" />
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
            <ASelect v-model:value="newVideo.status" class="w-full" @change="handleStatusChange">
              <ASelectOption v-for="option in statusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </ASelectOption>
            </ASelect>
          </AFormItem>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AFormItem label="总时长">
            <AInput :value="formatDuration(newVideo.duration)" readonly class="bg-muted/50 w-full" />
          </AFormItem>

          <AFormItem label="已看时长">
            <AInput v-model:value="newVideo.watchedDurationFormatted" readonly class="bg-muted/50 w-full" />
          </AFormItem>

          <AFormItem label="进度">
            <div class="flex items-center h-8">
              <AProgress :percent="newVideo.progress" size="small" />
            </div>
          </AFormItem>
        </div>

        <AFormItem label="学习笔记">
          <AInput v-model:value="newVideo.notes" type="textarea" :rows="3" placeholder="记录学习心得或笔记" />
        </AFormItem>
      </AForm>
    </AModal>
  </div>
</template>

<style scoped>
.custom-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 0;
  padding: 0;
}

.custom-tabs :deep(.ant-tabs-nav-wrap) {
  padding: 0;
}

.custom-tabs :deep(.ant-tabs-tab) {
  padding: 8px 6px !important;
  margin: 0 4px 0 0 !important;
  transition: all 0.3s;
}

@media (min-width: 640px) {
  .custom-tabs :deep(.ant-tabs-tab) {
    padding: 12px 16px !important;
    margin: 0 32px 0 0 !important;
  }

  .custom-tabs :deep(.ant-tabs-nav-wrap) {
    padding: 0 8px;
  }
}

.custom-tabs :deep(.ant-tabs-tab-active) {
  font-weight: 600;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
